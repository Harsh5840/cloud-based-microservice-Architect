const axios = require('axios');
const crypto = require('crypto');

class ThreatIntelClient {
  constructor(config) {
    this.config = config;
    this.rateLimitDelay = 5000; // 5 seconds between calls
    this.lastCallTime = 0;
    this.threatCache = new Map(); // For deduplication
  }

  /**
   * Rate limiting to respect API limits
   */
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCallTime;
    
    if (timeSinceLastCall < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastCall;
      console.log(`Rate limiting: waiting ${waitTime}ms before next API call`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastCallTime = Date.now();
  }

  /**
   * Fetch threat intelligence from VirusTotal API
   */
  async getVirusTotalIntel() {
    if (!this.config.virusTotalApiKey) {
      throw new Error('VirusTotal API key not configured');
    }

    await this.waitForRateLimit();
    
    try {
      // Get recent malicious files
      const response = await axios.get('https://www.virustotal.com/api/v3/intelligence/search', {
        headers: {
          'x-apikey': this.config.virusTotalApiKey
        },
        params: {
          query: 'type:file positives:5+',
          limit: 10
        },
        timeout: 15000
      });

      return this.normalizeVirusTotalData(response.data);
    } catch (error) {
      console.error('Error fetching VirusTotal data:', error.message);
      throw error;
    }
  }

  /**
   * Fetch threat intelligence from MISP instance
   */
  async getMISPIntel() {
    if (!this.config.mispUrl || !this.config.mispApiKey) {
      throw new Error('MISP configuration not complete');
    }

    await this.waitForRateLimit();
    
    try {
      const response = await axios.get(`${this.config.mispUrl}/events/restSearch`, {
        headers: {
          'Authorization': this.config.mispApiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        data: {
          returnFormat: 'json',
          limit: 50,
          published: true,
          timestamp: Math.floor(Date.now() / 1000) - 86400 // Last 24 hours
        },
        timeout: 15000
      });

      return this.normalizeMISPData(response.data);
    } catch (error) {
      console.error('Error fetching MISP data:', error.message);
      throw error;
    }
  }

  /**
   * Fetch threat intelligence from STIX/TAXII server
   */
  async getSTIXIntel() {
    if (!this.config.taxiiUrl || !this.config.taxiiUsername || !this.config.taxiiPassword) {
      throw new Error('STIX/TAXII configuration not complete');
    }

    await this.waitForRateLimit();
    
    try {
      // Get collections first
      const collectionsResponse = await axios.get(`${this.config.taxiiUrl}/collections/`, {
        auth: {
          username: this.config.taxiiUsername,
          password: this.config.taxiiPassword
        },
        headers: {
          'Accept': 'application/vnd.oasis.taxii+json; version=2.1'
        },
        timeout: 15000
      });

      if (!collectionsResponse.data.collections || collectionsResponse.data.collections.length === 0) {
        throw new Error('No TAXII collections available');
      }

      // Get objects from first collection
      const collectionId = collectionsResponse.data.collections[0].id;
      const objectsResponse = await axios.get(`${this.config.taxiiUrl}/collections/${collectionId}/objects/`, {
        auth: {
          username: this.config.taxiiUsername,
          password: this.config.taxiiPassword
        },
        headers: {
          'Accept': 'application/vnd.oasis.stix+json; version=2.1'
        },
        params: {
          limit: 100,
          added_after: new Date(Date.now() - 86400000).toISOString() // Last 24 hours
        },
        timeout: 15000
      });

      return this.normalizeSTIXData(objectsResponse.data);
    } catch (error) {
      console.error('Error fetching STIX/TAXII data:', error.message);
      throw error;
    }
  }

  /**
   * Fetch threat intelligence from custom JSON feeds
   */
  async getJSONFeedIntel() {
    const results = [];
    
    for (const feed of this.config.jsonFeeds || []) {
      try {
        await this.waitForRateLimit();
        
        const response = await axios.get(feed.url, {
          headers: feed.headers || {},
          timeout: 15000
        });

        const normalizedData = this.normalizeJSONFeedData(response.data, feed.name);
        results.push(...normalizedData);
      } catch (error) {
        console.error(`Error fetching JSON feed ${feed.name}:`, error.message);
      }
    }
    
    return results;
  }

  /**
   * Normalize VirusTotal data to standard format
   */
  normalizeVirusTotalData(data) {
    if (!data.data) return [];
    
    return data.data.map(item => {
      const attributes = item.attributes || {};
      const stats = attributes.last_analysis_stats || {};
      const malicious = stats.malicious || 0;
      const total = Object.values(stats).reduce((sum, val) => sum + val, 0);
      
      return this.createThreatIndicator({
        id: item.id,
        type: 'hash',
        value: attributes.sha256 || attributes.md5 || attributes.sha1,
        confidence: Math.min(100, (malicious / Math.max(total, 1)) * 100),
        severity: malicious > 10 ? 'high' : malicious > 5 ? 'medium' : 'low',
        first_seen: attributes.first_submission_date ? new Date(attributes.first_submission_date * 1000).toISOString() : new Date().toISOString(),
        last_seen: attributes.last_analysis_date ? new Date(attributes.last_analysis_date * 1000).toISOString() : new Date().toISOString(),
        tags: attributes.tags || ['malware'],
        source: 'virustotal',
        tlp: 'white',
        metadata: {
          detections: malicious,
          total_engines: total,
          file_type: attributes.type_description,
          size: attributes.size
        }
      });
    });
  }

  /**
   * Normalize MISP data to standard format
   */
  normalizeMISPData(data) {
    if (!data.response) return [];
    
    const indicators = [];
    
    for (const event of data.response) {
      if (!event.Event || !event.Event.Attribute) continue;
      
      for (const attribute of event.Event.Attribute) {
        if (attribute.to_ids === '1') { // Only IoCs marked for detection
          indicators.push(this.createThreatIndicator({
            id: `misp_${attribute.uuid}`,
            type: this.mapMISPTypeToStandard(attribute.type),
            value: attribute.value,
            confidence: this.calculateMISPConfidence(attribute),
            severity: this.mapMISPThreatLevel(event.Event.threat_level_id),
            first_seen: new Date(attribute.timestamp * 1000).toISOString(),
            last_seen: new Date().toISOString(),
            tags: attribute.Tag ? attribute.Tag.map(tag => tag.name) : [],
            source: 'misp',
            tlp: this.extractTLP(attribute.Tag),
            metadata: {
              event_id: event.Event.id,
              event_info: event.Event.info,
              category: attribute.category,
              comment: attribute.comment
            }
          }));
        }
      }
    }
    
    return indicators;
  }

  /**
   * Normalize STIX data to standard format
   */
  normalizeSTIXData(data) {
    if (!data.objects) return [];
    
    const indicators = [];
    
    for (const obj of data.objects) {
      if (obj.type === 'indicator') {
        const pattern = obj.pattern || '';
        const { type, value } = this.parseSTIXPattern(pattern);
        
        if (type && value) {
          indicators.push(this.createThreatIndicator({
            id: obj.id,
            type: type,
            value: value,
            confidence: obj.confidence || 50,
            severity: this.mapSTIXLabelsToSeverity(obj.labels),
            first_seen: obj.created || new Date().toISOString(),
            last_seen: obj.modified || new Date().toISOString(),
            tags: obj.labels || [],
            source: 'stix',
            tlp: this.extractSTIXTLP(obj.object_marking_refs),
            metadata: {
              kill_chain_phases: obj.kill_chain_phases,
              description: obj.description
            }
          }));
        }
      }
    }
    
    return indicators;
  }

  /**
   * Normalize JSON feed data to standard format
   */
  normalizeJSONFeedData(data, feedName) {
    if (!Array.isArray(data)) {
      data = [data];
    }
    
    return data.map(item => {
      return this.createThreatIndicator({
        id: item.id || this.generateId(item),
        type: item.type || 'unknown',
        value: item.value || item.indicator,
        confidence: item.confidence || 50,
        severity: item.severity || 'medium',
        first_seen: item.first_seen || new Date().toISOString(),
        last_seen: item.last_seen || new Date().toISOString(),
        tags: item.tags || [feedName],
        source: feedName,
        tlp: item.tlp || 'white',
        metadata: item.metadata || {}
      });
    });
  }

  /**
   * Create standardized threat indicator object
   */
  createThreatIndicator(data) {
    const indicator = {
      id: data.id,
      indicator_type: data.type,
      indicator_value: data.value,
      confidence_score: Math.min(100, Math.max(0, data.confidence)),
      severity_level: data.severity,
      first_seen: data.first_seen,
      last_seen: data.last_seen,
      tags: data.tags || [],
      source_feeds: [data.source],
      tlp_marking: data.tlp,
      metadata: data.metadata || {},
      timestamp: new Date().toISOString(),
      hash: this.generateIndicatorHash(data.type, data.value)
    };

    // Validate indicator
    if (this.validateIndicator(indicator)) {
      return indicator;
    }
    
    return null;
  }

  /**
   * Validate threat indicator
   */
  validateIndicator(indicator) {
    // Check required fields
    if (!indicator.indicator_value || !indicator.indicator_type) {
      return false;
    }

    // Validate indicator types and values
    switch (indicator.indicator_type) {
      case 'ip':
        return this.isValidIP(indicator.indicator_value);
      case 'domain':
        return this.isValidDomain(indicator.indicator_value);
      case 'hash':
        return this.isValidHash(indicator.indicator_value);
      case 'url':
        return this.isValidURL(indicator.indicator_value);
      case 'email':
        return this.isValidEmail(indicator.indicator_value);
      default:
        return true; // Allow unknown types for flexibility
    }
  }

  /**
   * Deduplicate indicators based on hash
   */
  deduplicateIndicators(indicators) {
    const unique = new Map();
    
    for (const indicator of indicators) {
      if (!indicator) continue;
      
      const hash = indicator.hash;
      if (unique.has(hash)) {
        // Merge sources if duplicate found
        const existing = unique.get(hash);
        existing.source_feeds = [...new Set([...existing.source_feeds, ...indicator.source_feeds])];
        existing.last_seen = indicator.last_seen; // Update to latest
      } else {
        unique.set(hash, indicator);
      }
    }
    
    return Array.from(unique.values());
  }

  /**
   * Fetch all threat intelligence sources
   */
  async getAllThreatIntel() {
    const results = [];
    
    // Fetch from all configured sources
    const sources = [
      { name: 'VirusTotal', method: () => this.getVirusTotalIntel() },
      { name: 'MISP', method: () => this.getMISPIntel() },
      { name: 'STIX/TAXII', method: () => this.getSTIXIntel() },
      { name: 'JSON Feeds', method: () => this.getJSONFeedIntel() }
    ];

    for (const source of sources) {
      try {
        console.log(`Fetching threat intelligence from ${source.name}...`);
        const data = await source.method();
        results.push(...data);
        console.log(`✓ Fetched ${data.length} indicators from ${source.name}`);
      } catch (error) {
        console.error(`✗ Failed to fetch from ${source.name}:`, error.message);
      }
    }

    // Deduplicate and return
    const deduplicated = this.deduplicateIndicators(results);
    console.log(`Total indicators after deduplication: ${deduplicated.length}`);
    
    return deduplicated;
  }

  // Helper methods for validation
  isValidIP(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  isValidDomain(domain) {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    return domainRegex.test(domain);
  }

  isValidHash(hash) {
    const md5Regex = /^[a-fA-F0-9]{32}$/;
    const sha1Regex = /^[a-fA-F0-9]{40}$/;
    const sha256Regex = /^[a-fA-F0-9]{64}$/;
    return md5Regex.test(hash) || sha1Regex.test(hash) || sha256Regex.test(hash);
  }

  isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Helper methods for data transformation
  generateIndicatorHash(type, value) {
    return crypto.createHash('sha256').update(`${type}:${value}`).digest('hex');
  }

  generateId(item) {
    return crypto.createHash('md5').update(JSON.stringify(item)).digest('hex');
  }

  mapMISPTypeToStandard(mispType) {
    const typeMap = {
      'ip-src': 'ip',
      'ip-dst': 'ip',
      'domain': 'domain',
      'hostname': 'domain',
      'url': 'url',
      'md5': 'hash',
      'sha1': 'hash',
      'sha256': 'hash',
      'email-src': 'email',
      'email-dst': 'email'
    };
    return typeMap[mispType] || 'unknown';
  }

  calculateMISPConfidence(attribute) {
    // MISP doesn't have direct confidence, calculate based on available data
    let confidence = 50; // Base confidence
    
    if (attribute.distribution === '0') confidence += 20; // Organization only
    if (attribute.sharing_group_id) confidence += 10; // Shared with group
    if (attribute.comment) confidence += 10; // Has context
    
    return Math.min(100, confidence);
  }

  mapMISPThreatLevel(levelId) {
    const levelMap = {
      '1': 'high',
      '2': 'medium', 
      '3': 'low',
      '4': 'low'
    };
    return levelMap[levelId] || 'medium';
  }

  extractTLP(tags) {
    if (!tags) return 'white';
    
    for (const tag of tags) {
      if (tag.name.toLowerCase().includes('tlp:')) {
        return tag.name.toLowerCase().replace('tlp:', '');
      }
    }
    return 'white';
  }

  parseSTIXPattern(pattern) {
    // Simple STIX pattern parser
    const patterns = {
      ip: /\[ipv4-addr:value = '([^']+)'\]/,
      domain: /\[domain-name:value = '([^']+)'\]/,
      hash: /\[file:hashes\.(?:MD5|SHA-1|SHA-256) = '([^']+)'\]/,
      url: /\[url:value = '([^']+)'\]/,
      email: /\[email-addr:value = '([^']+)'\]/
    };

    for (const [type, regex] of Object.entries(patterns)) {
      const match = pattern.match(regex);
      if (match) {
        return { type, value: match[1] };
      }
    }

    return { type: null, value: null };
  }

  mapSTIXLabelsToSeverity(labels) {
    if (!labels) return 'medium';
    
    const labelStr = labels.join(' ').toLowerCase();
    if (labelStr.includes('high') || labelStr.includes('critical')) return 'high';
    if (labelStr.includes('low')) return 'low';
    return 'medium';
  }

  extractSTIXTLP(markingRefs) {
    if (!markingRefs) return 'white';
    
    for (const ref of markingRefs) {
      if (ref.includes('tlp')) {
        const tlp = ref.split(':').pop();
        return tlp || 'white';
      }
    }
    return 'white';
  }
}

module.exports = ThreatIntelClient;
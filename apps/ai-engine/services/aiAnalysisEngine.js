const logger = require('../utils/logger');
const AnomalyDetector = require('../models/anomalyDetector');
const ThreatClassifier = require('../models/threatClassifier');
const BehavioralAnalyzer = require('../models/behavioralAnalyzer');
const FeatureExtractor = require('../utils/featureExtractor');

class AIAnalysisEngine {
  constructor(modelManager, metricsCollector) {
    this.modelManager = modelManager;
    this.metricsCollector = metricsCollector;
    this.featureExtractor = new FeatureExtractor();
    
    // Initialize models
    this.anomalyDetector = new AnomalyDetector();
    this.threatClassifier = new ThreatClassifier();
    this.behavioralAnalyzer = new BehavioralAnalyzer();
    
    // Configuration
    this.anomalyThreshold = parseFloat(process.env.ANOMALY_THRESHOLD) || 0.7;
    this.classificationThreshold = parseFloat(process.env.CLASSIFICATION_THRESHOLD) || 0.8;
    this.batchSize = parseInt(process.env.BATCH_SIZE) || 100;
    
    // Processing state
    this.isReady = false;
    this.processingQueue = [];
    this.batchBuffer = [];
  }

  /**
   * Initialize the AI analysis engine
   */
  async initialize() {
    try {
      logger.info('Initializing AI Analysis Engine...');
      
      // Load or train models
      await this.anomalyDetector.initialize();
      await this.threatClassifier.initialize();
      await this.behavioralAnalyzer.initialize();
      
      // Start batch processing
      this.startBatchProcessing();
      
      this.isReady = true;
      logger.info('AI Analysis Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AI Analysis Engine:', error);
      throw error;
    }
  }

  /**
   * Analyze a single message from Kafka
   */
  async analyzeMessage(message) {
    const startTime = Date.now();
    
    try {
      if (!this.isReady) {
        throw new Error('AI Analysis Engine not ready');
      }

      const data = JSON.parse(message.value.toString());
      
      // Extract features from the threat intelligence data
      const features = this.featureExtractor.extractFeatures(data);
      
      // Perform multi-layered analysis
      const analysis = await this.performAnalysis(data, features);
      
      // Record metrics
      const processingTime = Date.now() - startTime;
      this.metricsCollector.recordProcessingTime('message_analysis', processingTime);
      this.metricsCollector.incrementCounter('messages_processed');
      
      return {
        timestamp: new Date().toISOString(),
        original_data: data,
        analysis: analysis,
        processing_time_ms: processingTime,
        engine_version: '1.0.0'
      };
    } catch (error) {
      logger.error('Error analyzing message:', error);
      this.metricsCollector.recordError('message_analysis', error);
      return null;
    }
  }

  /**
   * Analyze threat data directly (for API endpoint)
   */
  async analyzeData(data) {
    const startTime = Date.now();
    
    try {
      if (!this.isReady) {
        throw new Error('AI Analysis Engine not ready');
      }

      const features = this.featureExtractor.extractFeatures(data);
      const analysis = await this.performAnalysis(data, features);
      
      const processingTime = Date.now() - startTime;
      this.metricsCollector.recordProcessingTime('api_analysis', processingTime);
      
      return {
        timestamp: new Date().toISOString(),
        analysis: analysis,
        processing_time_ms: processingTime
      };
    } catch (error) {
      logger.error('Error analyzing data:', error);
      this.metricsCollector.recordError('api_analysis', error);
      throw error;
    }
  }

  /**
   * Perform comprehensive threat analysis
   */
  async performAnalysis(data, features) {
    const analysis = {
      threat_id: data.data?.id || `analysis_${Date.now()}`,
      risk_assessment: {},
      anomaly_detection: {},
      threat_classification: {},
      behavioral_analysis: {},
      composite_score: 0,
      confidence_level: 0,
      recommendations: []
    };

    try {
      // 1. Anomaly Detection
      const anomalyResult = await this.anomalyDetector.detect(features);
      analysis.anomaly_detection = {
        is_anomaly: anomalyResult.score > this.anomalyThreshold,
        anomaly_score: anomalyResult.score,
        anomaly_factors: anomalyResult.factors,
        baseline_deviation: anomalyResult.deviation
      };

      // 2. Threat Classification
      const classificationResult = await this.threatClassifier.classify(features);
      analysis.threat_classification = {
        threat_type: classificationResult.type,
        confidence: classificationResult.confidence,
        probability_distribution: classificationResult.probabilities,
        attack_vectors: classificationResult.vectors
      };

      // 3. Behavioral Analysis
      const behavioralResult = await this.behavioralAnalyzer.analyze(data, features);
      analysis.behavioral_analysis = {
        behavior_pattern: behavioralResult.pattern,
        temporal_analysis: behavioralResult.temporal,
        network_behavior: behavioralResult.network,
        user_behavior: behavioralResult.user,
        deviation_score: behavioralResult.deviationScore
      };

      // 4. Risk Assessment
      analysis.risk_assessment = this.calculateRiskAssessment(
        data,
        analysis.anomaly_detection,
        analysis.threat_classification,
        analysis.behavioral_analysis
      );

      // 5. Composite Scoring
      const compositeResult = this.calculateCompositeScore(analysis);
      analysis.composite_score = compositeResult.score;
      analysis.confidence_level = compositeResult.confidence;

      // 6. Generate Recommendations
      analysis.recommendations = this.generateRecommendations(analysis);

      // Record analysis metrics
      this.recordAnalysisMetrics(analysis);

      return analysis;
    } catch (error) {
      logger.error('Error in threat analysis:', error);
      throw error;
    }
  }

  /**
   * Calculate comprehensive risk assessment
   */
  calculateRiskAssessment(data, anomaly, classification, behavioral) {
    const riskFactors = {
      severity_weight: 0.25,
      confidence_weight: 0.20,
      anomaly_weight: 0.20,
      behavioral_weight: 0.15,
      temporal_weight: 0.10,
      asset_criticality_weight: 0.10
    };

    // Base severity from original data
    const severityScore = this.mapSeverityToScore(data.data?.severity_level || 'medium');
    
    // Confidence from original data
    const confidenceScore = (data.data?.confidence_score || 50) / 100;
    
    // Anomaly contribution
    const anomalyScore = anomaly.is_anomaly ? anomaly.anomaly_score : 0.3;
    
    // Behavioral contribution
    const behavioralScore = behavioral.deviation_score || 0.5;
    
    // Temporal relevance (recent threats are more critical)
    const temporalScore = this.calculateTemporalRelevance(data.data?.last_seen);
    
    // Asset criticality (placeholder - would be enhanced with asset inventory)
    const assetCriticalityScore = 0.7; // Default medium criticality
    
    const weightedScore = 
      (severityScore * riskFactors.severity_weight) +
      (confidenceScore * riskFactors.confidence_weight) +
      (anomalyScore * riskFactors.anomaly_weight) +
      (behavioralScore * riskFactors.behavioral_weight) +
      (temporalScore * riskFactors.temporal_weight) +
      (assetCriticalityScore * riskFactors.asset_criticality_weight);

    const riskLevel = this.mapScoreToRiskLevel(weightedScore);

    return {
      risk_score: Math.round(weightedScore * 100),
      risk_level: riskLevel,
      contributing_factors: {
        severity: severityScore,
        confidence: confidenceScore,
        anomaly: anomalyScore,
        behavioral: behavioralScore,
        temporal: temporalScore,
        asset_criticality: assetCriticalityScore
      },
      mitigation_priority: this.calculateMitigationPriority(weightedScore, classification)
    };
  }

  /**
   * Calculate composite threat score
   */
  calculateCompositeScore(analysis) {
    const weights = {
      risk: 0.4,
      anomaly: 0.25,
      classification: 0.25,
      behavioral: 0.1
    };

    const riskScore = analysis.risk_assessment.risk_score / 100;
    const anomalyScore = analysis.anomaly_detection.anomaly_score;
    const classificationScore = analysis.threat_classification.confidence;
    const behavioralScore = analysis.behavioral_analysis.deviation_score || 0.5;

    const compositeScore = 
      (riskScore * weights.risk) +
      (anomalyScore * weights.anomaly) +
      (classificationScore * weights.classification) +
      (behavioralScore * weights.behavioral);

    // Calculate confidence based on model agreement
    const modelScores = [riskScore, anomalyScore, classificationScore, behavioralScore];
    const variance = this.calculateVariance(modelScores);
    const confidence = Math.max(0.1, 1 - variance); // Lower variance = higher confidence

    return {
      score: Math.round(compositeScore * 100),
      confidence: Math.round(confidence * 100)
    };
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(analysis) {
    const recommendations = [];
    const riskScore = analysis.risk_assessment.risk_score;
    const isAnomaly = analysis.anomaly_detection.is_anomaly;
    const threatType = analysis.threat_classification.threat_type;

    // High-risk recommendations
    if (riskScore >= 80) {
      recommendations.push({
        priority: 'critical',
        action: 'immediate_investigation',
        description: 'Immediate investigation required due to high risk score',
        automated: false
      });
      
      recommendations.push({
        priority: 'critical',
        action: 'isolate_affected_assets',
        description: 'Consider isolating affected network segments or assets',
        automated: true
      });
    }

    // Anomaly-based recommendations
    if (isAnomaly) {
      recommendations.push({
        priority: 'high',
        action: 'behavioral_analysis',
        description: 'Conduct detailed behavioral analysis of anomalous activity',
        automated: false
      });
    }

    // Threat-type specific recommendations
    if (threatType === 'malware') {
      recommendations.push({
        priority: 'high',
        action: 'antivirus_scan',
        description: 'Initiate comprehensive antivirus scan on affected systems',
        automated: true
      });
    } else if (threatType === 'phishing') {
      recommendations.push({
        priority: 'medium',
        action: 'user_awareness',
        description: 'Send security awareness notification to potentially affected users',
        automated: true
      });
    }

    // General recommendations
    recommendations.push({
      priority: 'low',
      action: 'update_threat_intelligence',
      description: 'Update threat intelligence feeds with new indicators',
      automated: true
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Start batch processing for efficiency
   */
  startBatchProcessing() {
    setInterval(() => {
      if (this.batchBuffer.length >= this.batchSize) {
        this.processBatch();
      }
    }, 5000); // Process batches every 5 seconds
  }

  /**
   * Process a batch of threat data
   */
  async processBatch() {
    if (this.batchBuffer.length === 0) return;

    const batch = this.batchBuffer.splice(0, this.batchSize);
    
    try {
      logger.info(`Processing batch of ${batch.length} items`);
      
      // Batch processing for efficiency
      const batchFeatures = batch.map(item => this.featureExtractor.extractFeatures(item));
      
      // Batch anomaly detection
      await this.anomalyDetector.detectBatch(batchFeatures);
      
      // Update model performance metrics
      this.metricsCollector.incrementCounter('batches_processed');
      
    } catch (error) {
      logger.error('Error processing batch:', error);
      this.metricsCollector.recordError('batch_processing', error);
    }
  }

  /**
   * Record analysis metrics for monitoring
   */
  recordAnalysisMetrics(analysis) {
    this.metricsCollector.recordGauge('risk_score', analysis.risk_assessment.risk_score);
    this.metricsCollector.recordGauge('composite_score', analysis.composite_score);
    this.metricsCollector.recordGauge('confidence_level', analysis.confidence_level);
    
    if (analysis.anomaly_detection.is_anomaly) {
      this.metricsCollector.incrementCounter('anomalies_detected');
    }
    
    this.metricsCollector.incrementCounter(`threat_type_${analysis.threat_classification.threat_type}`);
  }

  // Helper methods
  mapSeverityToScore(severity) {
    const severityMap = {
      'critical': 1.0,
      'high': 0.8,
      'medium': 0.6,
      'low': 0.4,
      'info': 0.2
    };
    return severityMap[severity] || 0.6;
  }

  mapScoreToRiskLevel(score) {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  calculateTemporalRelevance(lastSeen) {
    if (!lastSeen) return 0.5;
    
    const now = Date.now();
    const lastSeenTime = new Date(lastSeen).getTime();
    const hoursSince = (now - lastSeenTime) / (1000 * 60 * 60);
    
    // Recent threats are more relevant
    if (hoursSince <= 1) return 1.0;
    if (hoursSince <= 24) return 0.8;
    if (hoursSince <= 168) return 0.6; // 1 week
    return 0.4;
  }

  calculateMitigationPriority(riskScore, classification) {
    const basePriority = Math.round(riskScore * 10);
    
    // Adjust based on threat type
    const threatTypeMultiplier = {
      'malware': 1.2,
      'ransomware': 1.5,
      'apt': 1.3,
      'phishing': 1.1,
      'botnet': 1.2
    };
    
    const multiplier = threatTypeMultiplier[classification.threat_type] || 1.0;
    return Math.min(10, Math.round(basePriority * multiplier));
  }

  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Check if engine is ready
   */
  isEngineReady() {
    return this.isReady;
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      ready: this.isReady,
      models: {
        anomaly_detector: this.anomalyDetector.isReady(),
        threat_classifier: this.threatClassifier.isReady(),
        behavioral_analyzer: this.behavioralAnalyzer.isReady()
      },
      queue_size: this.processingQueue.length,
      batch_buffer_size: this.batchBuffer.length
    };
  }
}

module.exports = AIAnalysisEngine;
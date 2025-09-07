const { Matrix } = require('ml-matrix');
const logger = require('../utils/logger');

/**
 * Isolation Forest implementation for anomaly detection
 * Based on the paper "Isolation Forest" by Liu, Ting and Zhou
 */
class IsolationForest {
  constructor(options = {}) {
    this.numTrees = options.numTrees || 100;
    this.subsampleSize = options.subsampleSize || 256;
    this.maxDepth = options.maxDepth || Math.ceil(Math.log2(this.subsampleSize));
    this.trees = [];
    this.trained = false;
  }

  /**
   * Train the isolation forest
   */
  fit(X) {
    const data = Matrix.isMatrix(X) ? X : new Matrix(X);
    const [n, m] = data.size;
    
    this.trees = [];
    
    for (let i = 0; i < this.numTrees; i++) {
      // Create subsample
      const subsampleIndices = this.randomSample(n, Math.min(this.subsampleSize, n));
      const subsample = data.selection(subsampleIndices, Array.from({length: m}, (_, i) => i));
      
      // Build isolation tree
      const tree = this.buildTree(subsample, 0);
      this.trees.push(tree);
    }
    
    this.trained = true;
    logger.info(`Isolation Forest trained with ${this.numTrees} trees`);
  }

  /**
   * Build a single isolation tree
   */
  buildTree(X, depth) {
    const [n, m] = X.size;
    
    // Terminal conditions
    if (depth >= this.maxDepth || n <= 1) {
      return {
        type: 'leaf',
        size: n,
        depth: depth
      };
    }

    // Random feature selection
    const feature = Math.floor(Math.random() * m);
    const column = X.getColumn(feature);
    const minVal = Math.min(...column);
    const maxVal = Math.max(...column);
    
    if (minVal === maxVal) {
      return {
        type: 'leaf',
        size: n,
        depth: depth
      };
    }

    // Random split point
    const splitValue = Math.random() * (maxVal - minVal) + minVal;
    
    // Split data
    const leftIndices = [];
    const rightIndices = [];
    
    for (let i = 0; i < n; i++) {
      if (column[i] < splitValue) {
        leftIndices.push(i);
      } else {
        rightIndices.push(i);
      }
    }

    if (leftIndices.length === 0 || rightIndices.length === 0) {
      return {
        type: 'leaf',
        size: n,
        depth: depth
      };
    }

    const leftData = X.selection(leftIndices, Array.from({length: m}, (_, i) => i));
    const rightData = X.selection(rightIndices, Array.from({length: m}, (_, i) => i));

    return {
      type: 'internal',
      feature: feature,
      splitValue: splitValue,
      left: this.buildTree(leftData, depth + 1),
      right: this.buildTree(rightData, depth + 1)
    };
  }

  /**
   * Calculate path length for a single point
   */
  pathLength(x, tree, depth = 0) {
    if (tree.type === 'leaf') {
      return depth + this.c(tree.size);
    }

    if (x[tree.feature] < tree.splitValue) {
      return this.pathLength(x, tree.left, depth + 1);
    } else {
      return this.pathLength(x, tree.right, depth + 1);
    }
  }

  /**
   * Average path length of unsuccessful search in BST
   */
  c(n) {
    if (n <= 1) return 0;
    return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
  }

  /**
   * Predict anomaly scores
   */
  predict(X) {
    if (!this.trained) {
      throw new Error('Model must be trained before prediction');
    }

    const data = Matrix.isMatrix(X) ? X : new Matrix(X);
    const [n] = data.size;
    const scores = [];

    for (let i = 0; i < n; i++) {
      const x = data.getRow(i);
      let avgPathLength = 0;

      for (const tree of this.trees) {
        avgPathLength += this.pathLength(x, tree);
      }

      avgPathLength /= this.numTrees;
      const score = Math.pow(2, -avgPathLength / this.c(this.subsampleSize));
      scores.push(score);
    }

    return scores;
  }

  /**
   * Random sampling without replacement
   */
  randomSample(n, k) {
    const indices = Array.from({length: n}, (_, i) => i);
    const sample = [];
    
    for (let i = 0; i < k; i++) {
      const randomIndex = Math.floor(Math.random() * indices.length);
      sample.push(indices.splice(randomIndex, 1)[0]);
    }
    
    return sample;
  }
}

/**
 * Anomaly Detector using Isolation Forest and statistical methods
 */
class AnomalyDetector {
  constructor() {
    this.isolationForest = new IsolationForest({
      numTrees: 100,
      subsampleSize: 256
    });
    
    this.statisticalBaseline = {
      means: [],
      stds: [],
      quantiles: []
    };
    
    this.trainingData = [];
    this.isModelReady = false;
    this.lastTrainingTime = null;
    this.anomalyThreshold = 0.6; // Configurable threshold
  }

  /**
   * Initialize the anomaly detector
   */
  async initialize() {
    try {
      logger.info('Initializing Anomaly Detector...');
      
      // Try to load existing model
      await this.loadModel();
      
      if (!this.isModelReady) {
        // Generate synthetic training data for initial model
        await this.generateInitialTrainingData();
        await this.trainModel();
      }
      
      logger.info('Anomaly Detector initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Anomaly Detector:', error);
      throw error;
    }
  }

  /**
   * Detect anomalies in threat intelligence features
   */
  async detect(features) {
    try {
      if (!this.isModelReady) {
        throw new Error('Anomaly detector not ready');
      }

      const featureVector = this.prepareFeatureVector(features);
      
      // Isolation Forest prediction
      const isolationScore = this.isolationForest.predict([featureVector])[0];
      
      // Statistical anomaly detection
      const statisticalScore = this.detectStatisticalAnomaly(featureVector);
      
      // Combined anomaly score
      const combinedScore = (isolationScore * 0.7) + (statisticalScore * 0.3);
      
      // Determine anomaly factors
      const factors = this.identifyAnomalyFactors(featureVector, features);
      
      // Calculate baseline deviation
      const deviation = this.calculateBaselineDeviation(featureVector);

      return {
        score: combinedScore,
        is_anomaly: combinedScore > this.anomalyThreshold,
        isolation_score: isolationScore,
        statistical_score: statisticalScore,
        factors: factors,
        deviation: deviation,
        threshold: this.anomalyThreshold
      };
    } catch (error) {
      logger.error('Error in anomaly detection:', error);
      throw error;
    }
  }

  /**
   * Batch anomaly detection for efficiency
   */
  async detectBatch(featuresArray) {
    try {
      if (!this.isModelReady) {
        throw new Error('Anomaly detector not ready');
      }

      const featureVectors = featuresArray.map(f => this.prepareFeatureVector(f));
      const isolationScores = this.isolationForest.predict(featureVectors);
      
      const results = [];
      
      for (let i = 0; i < featureVectors.length; i++) {
        const statisticalScore = this.detectStatisticalAnomaly(featureVectors[i]);
        const combinedScore = (isolationScores[i] * 0.7) + (statisticalScore * 0.3);
        
        results.push({
          score: combinedScore,
          is_anomaly: combinedScore > this.anomalyThreshold,
          isolation_score: isolationScores[i],
          statistical_score: statisticalScore
        });
      }

      return results;
    } catch (error) {
      logger.error('Error in batch anomaly detection:', error);
      throw error;
    }
  }

  /**
   * Prepare feature vector from threat intelligence features
   */
  prepareFeatureVector(features) {
    return [
      features.confidence_score || 0,
      features.severity_numeric || 0,
      features.temporal_score || 0,
      features.source_reputation || 0,
      features.indicator_frequency || 0,
      features.geographic_risk || 0,
      features.network_entropy || 0,
      features.behavioral_score || 0,
      features.correlation_count || 0,
      features.threat_actor_score || 0
    ];
  }

  /**
   * Statistical anomaly detection using z-score and IQR methods
   */
  detectStatisticalAnomaly(featureVector) {
    if (this.statisticalBaseline.means.length === 0) {
      return 0.5; // Default score if no baseline
    }

    let anomalyScore = 0;
    const numFeatures = featureVector.length;

    for (let i = 0; i < numFeatures && i < this.statisticalBaseline.means.length; i++) {
      const mean = this.statisticalBaseline.means[i];
      const std = this.statisticalBaseline.stds[i];
      const quantiles = this.statisticalBaseline.quantiles[i];

      // Z-score based detection
      const zScore = std > 0 ? Math.abs((featureVector[i] - mean) / std) : 0;
      const zScoreAnomaly = Math.min(1, zScore / 3); // Normalize to 0-1

      // IQR based detection
      const q1 = quantiles.q1;
      const q3 = quantiles.q3;
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      
      const iqrAnomaly = (featureVector[i] < lowerBound || featureVector[i] > upperBound) ? 1 : 0;

      // Combine z-score and IQR
      anomalyScore += (zScoreAnomaly * 0.7 + iqrAnomaly * 0.3);
    }

    return anomalyScore / numFeatures;
  }

  /**
   * Identify which features contribute most to anomaly
   */
  identifyAnomalyFactors(featureVector, originalFeatures) {
    const factors = [];
    const featureNames = [
      'confidence_score', 'severity_numeric', 'temporal_score', 'source_reputation',
      'indicator_frequency', 'geographic_risk', 'network_entropy', 'behavioral_score',
      'correlation_count', 'threat_actor_score'
    ];

    for (let i = 0; i < featureVector.length && i < this.statisticalBaseline.means.length; i++) {
      const mean = this.statisticalBaseline.means[i];
      const std = this.statisticalBaseline.stds[i];
      
      if (std > 0) {
        const zScore = Math.abs((featureVector[i] - mean) / std);
        
        if (zScore > 2) { // Significant deviation
          factors.push({
            feature: featureNames[i] || `feature_${i}`,
            value: featureVector[i],
            expected_mean: mean,
            z_score: zScore,
            deviation_type: featureVector[i] > mean ? 'above_normal' : 'below_normal'
          });
        }
      }
    }

    return factors.sort((a, b) => b.z_score - a.z_score);
  }

  /**
   * Calculate overall baseline deviation
   */
  calculateBaselineDeviation(featureVector) {
    if (this.statisticalBaseline.means.length === 0) {
      return { overall: 0, per_feature: [] };
    }

    let totalDeviation = 0;
    const perFeatureDeviation = [];

    for (let i = 0; i < featureVector.length && i < this.statisticalBaseline.means.length; i++) {
      const mean = this.statisticalBaseline.means[i];
      const std = this.statisticalBaseline.stds[i];
      
      const deviation = std > 0 ? Math.abs((featureVector[i] - mean) / std) : 0;
      totalDeviation += deviation;
      perFeatureDeviation.push(deviation);
    }

    return {
      overall: totalDeviation / featureVector.length,
      per_feature: perFeatureDeviation,
      max_deviation: Math.max(...perFeatureDeviation)
    };
  }

  /**
   * Train the anomaly detection model
   */
  async trainModel() {
    try {
      if (this.trainingData.length < 10) {
        throw new Error('Insufficient training data');
      }

      logger.info(`Training anomaly detector with ${this.trainingData.length} samples`);

      // Prepare training matrix
      const trainingMatrix = this.trainingData.map(sample => this.prepareFeatureVector(sample));
      
      // Train Isolation Forest
      this.isolationForest.fit(trainingMatrix);
      
      // Calculate statistical baseline
      this.calculateStatisticalBaseline(trainingMatrix);
      
      this.isModelReady = true;
      this.lastTrainingTime = new Date();
      
      logger.info('Anomaly detector training completed');
    } catch (error) {
      logger.error('Error training anomaly detector:', error);
      throw error;
    }
  }

  /**
   * Calculate statistical baseline from training data
   */
  calculateStatisticalBaseline(trainingMatrix) {
    const numFeatures = trainingMatrix[0].length;
    const numSamples = trainingMatrix.length;
    
    this.statisticalBaseline.means = [];
    this.statisticalBaseline.stds = [];
    this.statisticalBaseline.quantiles = [];

    for (let i = 0; i < numFeatures; i++) {
      const column = trainingMatrix.map(row => row[i]);
      
      // Calculate mean
      const mean = column.reduce((sum, val) => sum + val, 0) / numSamples;
      
      // Calculate standard deviation
      const variance = column.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / numSamples;
      const std = Math.sqrt(variance);
      
      // Calculate quantiles
      const sorted = [...column].sort((a, b) => a - b);
      const q1Index = Math.floor(numSamples * 0.25);
      const q3Index = Math.floor(numSamples * 0.75);
      
      this.statisticalBaseline.means.push(mean);
      this.statisticalBaseline.stds.push(std);
      this.statisticalBaseline.quantiles.push({
        q1: sorted[q1Index],
        q3: sorted[q3Index],
        median: sorted[Math.floor(numSamples * 0.5)]
      });
    }
  }

  /**
   * Generate initial training data for cold start
   */
  async generateInitialTrainingData() {
    logger.info('Generating initial training data for anomaly detector');
    
    // Generate synthetic normal threat intelligence patterns
    for (let i = 0; i < 1000; i++) {
      const sample = {
        confidence_score: Math.random() * 40 + 60, // 60-100
        severity_numeric: Math.random() * 0.6 + 0.2, // 0.2-0.8
        temporal_score: Math.random() * 0.8 + 0.2, // 0.2-1.0
        source_reputation: Math.random() * 0.4 + 0.6, // 0.6-1.0
        indicator_frequency: Math.random() * 10 + 1, // 1-11
        geographic_risk: Math.random() * 0.6 + 0.2, // 0.2-0.8
        network_entropy: Math.random() * 0.8 + 0.1, // 0.1-0.9
        behavioral_score: Math.random() * 0.6 + 0.2, // 0.2-0.8
        correlation_count: Math.floor(Math.random() * 5) + 1, // 1-5
        threat_actor_score: Math.random() * 0.7 + 0.1 // 0.1-0.8
      };
      
      this.trainingData.push(sample);
    }

    // Add some anomalous patterns
    for (let i = 0; i < 50; i++) {
      const anomaly = {
        confidence_score: Math.random() * 20 + 10, // Very low confidence
        severity_numeric: Math.random() * 0.3 + 0.7, // Very high severity
        temporal_score: Math.random() * 0.2, // Very old
        source_reputation: Math.random() * 0.3, // Low reputation
        indicator_frequency: Math.random() * 50 + 20, // Very high frequency
        geographic_risk: Math.random() * 0.3 + 0.7, // High geographic risk
        network_entropy: Math.random() * 0.2 + 0.8, // High entropy
        behavioral_score: Math.random() * 0.3 + 0.7, // High behavioral score
        correlation_count: Math.floor(Math.random() * 20) + 10, // High correlation
        threat_actor_score: Math.random() * 0.3 + 0.7 // High threat actor score
      };
      
      this.trainingData.push(anomaly);
    }
  }

  /**
   * Update model with new data
   */
  async updateModel(newData) {
    try {
      // Add new data to training set
      this.trainingData.push(...newData);
      
      // Keep only recent data (last 10000 samples)
      if (this.trainingData.length > 10000) {
        this.trainingData = this.trainingData.slice(-10000);
      }
      
      // Retrain if enough new data
      if (newData.length > 100) {
        await this.trainModel();
        logger.info('Anomaly detector retrained with new data');
      }
    } catch (error) {
      logger.error('Error updating anomaly detector:', error);
    }
  }

  /**
   * Load existing model (placeholder for persistence)
   */
  async loadModel() {
    // TODO: Implement model persistence
    logger.info('Model loading not implemented yet');
  }

  /**
   * Save model (placeholder for persistence)
   */
  async saveModel() {
    // TODO: Implement model persistence
    logger.info('Model saving not implemented yet');
  }

  /**
   * Check if model is ready
   */
  isReady() {
    return this.isModelReady;
  }

  /**
   * Get model information
   */
  getModelInfo() {
    return {
      ready: this.isModelReady,
      last_training: this.lastTrainingTime,
      training_samples: this.trainingData.length,
      threshold: this.anomalyThreshold,
      isolation_forest: {
        num_trees: this.isolationForest.numTrees,
        subsample_size: this.isolationForest.subsampleSize,
        trained: this.isolationForest.trained
      }
    };
  }
}

module.exports = AnomalyDetector;
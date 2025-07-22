/**
 * ATS Resume Scorer - 5-Dimension Scoring Algorithm
 *
 * Implements scientific ATS scoring algorithm including:
 * - 5-dimension keyword matching scoring
 * - TF-IDF weight calculation
 * - ESCO quality assessment
 * - Final 0-100 score calculation
 */

import type {
  ATSScoreCalculation,
  ATSScores,
  DimensionScore,
  ExtractedKeywords,
  ScoringWeights,
} from './types';
import { DEFAULT_SCORING_WEIGHTS, SCORE_LEVELS } from './types';

/**
 * ATS评分器类
 */
export class ATSScorer {
  private weights: ScoringWeights;

  constructor(weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS) {
    this.weights = weights;
  }

  /**
   * Calculate complete ATS score
   */
  calculateScore(
    jdKeywords: ExtractedKeywords,
    resumeKeywords: ExtractedKeywords,
    tfIdfWeights: Map<string, number> = new Map(),
    escoValidated: Set<string> = new Set()
  ): ATSScoreCalculation {
    console.log('🎯 Starting ATS score calculation...');

    // Calculate dimension scores
    const dimensionScores: ATSScores = {
      hardSkills: this.calculateDimensionScore(
        jdKeywords.hardSkills,
        resumeKeywords.hardSkills,
        tfIdfWeights,
        escoValidated
      ),
      jobTitle: this.calculateDimensionScore(
        jdKeywords.jobTitles,
        resumeKeywords.jobTitles,
        tfIdfWeights,
        escoValidated
      ),
      softSkills: this.calculateDimensionScore(
        jdKeywords.softSkills,
        resumeKeywords.softSkills,
        tfIdfWeights,
        escoValidated
      ),
      certifications: this.calculateDimensionScore(
        jdKeywords.certifications,
        resumeKeywords.certifications,
        tfIdfWeights,
        escoValidated
      ),
      tools: this.calculateDimensionScore(
        jdKeywords.tools,
        resumeKeywords.tools,
        tfIdfWeights,
        escoValidated
      ),
    };

    // Calculate final total score
    const totalScore = this.calculateFinalScore(dimensionScores);

    // Determine score level
    const level = this.getScoreLevel(totalScore);

    // Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(
      dimensionScores,
      escoValidated
    );

    console.log(
      `✅ ATS score calculation completed: ${totalScore}/100 (${level})`
    );

    return {
      dimensionScores,
      totalScore,
      level,
      qualityMetrics,
    };
  }

  /**
   * Calculate individual dimension score
   */
  private calculateDimensionScore(
    jdKeywords: string[],
    resumeKeywords: string[],
    tfIdfWeights: Map<string, number>,
    escoValidated: Set<string>
  ): DimensionScore {
    // Find matched keywords (case insensitive)
    const matchedKeywords = jdKeywords.filter((keyword) =>
      resumeKeywords.some(
        (rKeyword) => rKeyword.toLowerCase() === keyword.toLowerCase()
      )
    );

    // Find missing keywords
    const missingKeywords = jdKeywords.filter(
      (keyword) =>
        !resumeKeywords.some(
          (rKeyword) => rKeyword.toLowerCase() === keyword.toLowerCase()
        )
    );

    // Basic match rate
    const basicMatchRate =
      jdKeywords.length > 0 ? matchedKeywords.length / jdKeywords.length : 0;

    // TF-IDF weighted score
    const tfIdfScore = this.calculateTfIdfScore(
      matchedKeywords,
      jdKeywords,
      tfIdfWeights
    );

    // ESCO validation quality score
    const qualityScore = this.calculateQualityScore(
      matchedKeywords,
      escoValidated
    );

    // Comprehensive dimension score = basic match rate * 0.6 + TF-IDF score * 0.3 + quality score * 0.1
    const dimensionScore =
      basicMatchRate * 0.6 + tfIdfScore * 0.3 + qualityScore * 0.1;

    return {
      score: Math.min(dimensionScore, 1.0),
      matched: matchedKeywords.length,
      total: jdKeywords.length,
      matchedKeywords,
      missingKeywords,
      qualityScore,
      tfIdfWeight: tfIdfScore,
    };
  }

  /**
   * Calculate TF-IDF weighted score
   */
  private calculateTfIdfScore(
    matchedKeywords: string[],
    allJdKeywords: string[],
    tfIdfWeights: Map<string, number>
  ): number {
    if (matchedKeywords.length === 0 || allJdKeywords.length === 0) return 0;

    // Calculate total TF-IDF weight of matched keywords
    const matchedWeight = matchedKeywords.reduce((sum, keyword) => {
      return sum + (tfIdfWeights.get(keyword) || 0);
    }, 0);

    // Calculate total TF-IDF weight of all JD keywords
    const totalWeight = allJdKeywords.reduce((sum, keyword) => {
      return sum + (tfIdfWeights.get(keyword) || 0);
    }, 0);

    return totalWeight > 0 ? matchedWeight / totalWeight : 0;
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(
    matchedKeywords: string[],
    escoValidated: Set<string>
  ): number {
    if (matchedKeywords.length === 0) return 0;

    // ESCO validated keyword ratio
    const escoValidatedCount = matchedKeywords.filter((keyword) =>
      escoValidated.has(keyword.toLowerCase())
    ).length;

    const escoValidationRate = escoValidatedCount / matchedKeywords.length;

    // Keyword length quality (avoid overly short noise words)
    const avgLength =
      matchedKeywords.reduce((sum, keyword) => sum + keyword.length, 0) /
      matchedKeywords.length;
    const lengthQuality = Math.min(avgLength / 8, 1); // 8 characters as ideal length

    // Comprehensive quality score
    return escoValidationRate * 0.7 + lengthQuality * 0.3;
  }

  /**
   * Calculate final total score
   */
  private calculateFinalScore(dimensionScores: ATSScores): number {
    let totalScore = 0;
    let totalWeight = 0;

    // Only calculate dimensions with keywords, avoid empty dimensions lowering scores
    Object.entries(dimensionScores).forEach(([dimension, score]) => {
      if (score.total > 0) {
        // Only dimensions with keywords in JD participate in calculation
        const weight = this.weights[dimension as keyof ScoringWeights];
        totalScore += score.score * weight;
        totalWeight += weight;
      }
    });

    // Normalize by actual participating weights
    const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    // Convert to 0-100 scale
    return Math.round(normalizedScore * 100);
  }

  /**
   * Determine level based on score
   */
  private getScoreLevel(score: number): string {
    for (const [key, level] of Object.entries(SCORE_LEVELS)) {
      if (score >= level.min && score <= level.max) {
        return level.label;
      }
    }
    return SCORE_LEVELS.VERY_POOR.label;
  }

  /**
   * Calculate quality metrics
   */
  private calculateQualityMetrics(
    dimensionScores: ATSScores,
    escoValidated: Set<string>
  ): {
    escoValidationRate: number;
    keywordDensity: number;
    contextualRelevance: number;
  } {
    const allMatched = Object.values(dimensionScores).reduce(
      (sum, score) => sum + score.matched,
      0
    );
    const allTotal = Object.values(dimensionScores).reduce(
      (sum, score) => sum + score.total,
      0
    );

    // ESCO validation rate
    const allMatchedKeywords = Object.values(dimensionScores).flatMap(
      (score) => score.matchedKeywords
    );
    const escoValidatedCount = allMatchedKeywords.filter((keyword) =>
      escoValidated.has(keyword.toLowerCase())
    ).length;
    const escoValidationRate =
      allMatchedKeywords.length > 0
        ? escoValidatedCount / allMatchedKeywords.length
        : 0;

    // Keyword density
    const keywordDensity = allTotal > 0 ? allMatched / allTotal : 0;

    // Contextual relevance (based on average quality score)
    const avgQualityScore =
      Object.values(dimensionScores).reduce(
        (sum, score) => sum + score.qualityScore,
        0
      ) / Object.values(dimensionScores).length;

    return {
      escoValidationRate: Number((escoValidationRate * 100).toFixed(1)),
      keywordDensity: Number((keywordDensity * 100).toFixed(1)),
      contextualRelevance: Number((avgQualityScore * 100).toFixed(1)),
    };
  }
}

// 导出单例实例
export const atsScorer = new ATSScorer();

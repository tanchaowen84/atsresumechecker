/**
 * Enhanced Keyword Extractor with ESCO Integration
 *
 * Combines traditional keyword extraction with ESCO API validation
 * for comprehensive cross-industry skill and occupation recognition
 */

import type { ExtractedKeywords, KeywordMatch } from '../types';
import { type ESCOValidatedKeyword, escoClient } from './esco-integration';
import { categorizeKeywords, extractRawKeywords } from './extractor';

/**
 * Enhanced extraction result with ESCO validation
 */
export interface EnhancedExtractionResult {
  // Traditional extraction results
  basicKeywords: ExtractedKeywords;

  // ESCO-validated keywords
  validatedKeywords: ExtractedKeywords;

  // Validation details
  validationResults: ESCOValidatedKeyword[];

  // Statistics
  stats: {
    totalKeywords: number;
    validatedCount: number;
    validationRate: number;
    industryDiversity: string[];
    suggestedKeywords: string[];
  };

  // Performance metrics
  performance: {
    basicExtractionTime: number;
    escoValidationTime: number;
    totalTime: number;
  };
}

/**
 * Enhanced keyword extractor with ESCO integration
 */
export class EnhancedKeywordExtractor {
  /**
   * Extract and validate keywords with ESCO integration
   */
  async extractAndValidate(
    text: string,
    options: {
      enableESCOValidation?: boolean;
      escoConfidenceThreshold?: number;
      maxKeywordsToValidate?: number;
    } = {}
  ): Promise<EnhancedExtractionResult> {
    const {
      enableESCOValidation = true,
      escoConfidenceThreshold = 0.7,
      maxKeywordsToValidate = 25, // Reduced for faster processing
    } = options;

    const startTime = Date.now();

    console.log('🚀 Enhanced keyword extraction started');

    // Step 1: Basic keyword extraction
    const basicStartTime = Date.now();
    const rawKeywords = extractRawKeywords(text);
    const basicKeywords = categorizeKeywords(rawKeywords);
    const basicExtractionTime = Date.now() - basicStartTime;

    console.log(
      `✅ Basic extraction: ${rawKeywords.length} keywords in ${basicExtractionTime}ms`
    );

    // Step 2: ESCO validation (if enabled)
    let validationResults: ESCOValidatedKeyword[] = [];
    let validatedKeywords: ExtractedKeywords = { ...basicKeywords };
    let escoValidationTime = 0;

    if (enableESCOValidation && rawKeywords.length > 0) {
      const escoStartTime = Date.now();

      // Limit keywords to validate (prioritize by length and uniqueness)
      const keywordsToValidate = this.prioritizeKeywordsForValidation(
        rawKeywords,
        maxKeywordsToValidate
      );

      console.log(
        `🔍 ESCO validation: Processing ${keywordsToValidate.length} keywords`
      );

      try {
        validationResults =
          await escoClient.validateKeywords(keywordsToValidate);
        validatedKeywords = this.mergeESCOResults(
          basicKeywords,
          validationResults,
          escoConfidenceThreshold
        );
        escoValidationTime = Date.now() - escoStartTime;

        console.log(`✅ ESCO validation completed in ${escoValidationTime}ms`);
      } catch (error) {
        console.error('ESCO validation failed:', error);
        // Fall back to basic keywords if ESCO fails
        validationResults = [];
        escoValidationTime = Date.now() - escoStartTime;
      }
    }

    // Step 3: Generate statistics
    const stats = this.generateStats(basicKeywords, validationResults);

    const totalTime = Date.now() - startTime;
    console.log(`🎉 Enhanced extraction completed in ${totalTime}ms`);

    return {
      basicKeywords,
      validatedKeywords,
      validationResults,
      stats,
      performance: {
        basicExtractionTime,
        escoValidationTime,
        totalTime,
      },
    };
  }

  /**
   * Prioritize keywords for ESCO validation
   */
  private prioritizeKeywordsForValidation(
    keywords: string[],
    maxCount: number
  ): string[] {
    // Score keywords based on:
    // 1. Length (longer keywords are often more specific)
    // 2. Alphabetic content (avoid numbers and symbols)
    // 3. Common patterns (avoid obvious noise)

    const scored = keywords.map((keyword) => ({
      keyword,
      score: this.calculateKeywordPriority(keyword),
    }));

    // Sort by score (descending) and take top N
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCount)
      .map((item) => item.keyword);
  }

  /**
   * Calculate priority score for keyword validation
   */
  private calculateKeywordPriority(keyword: string): number {
    let score = 0;

    // Length bonus (3-15 characters are ideal)
    const length = keyword.length;
    if (length >= 3 && length <= 15) {
      score += Math.min(length * 2, 20);
    } else if (length > 15) {
      score += 10; // Still valuable but penalized
    }

    // Alphabetic content bonus
    const alphaRatio = (keyword.match(/[a-zA-Z]/g) || []).length / length;
    score += alphaRatio * 10;

    // Common skill/occupation patterns
    if (/^[A-Z][a-z]+$/.test(keyword)) score += 5; // Proper case
    if (keyword.includes('-')) score += 3; // Compound terms
    if (/ing$/.test(keyword)) score += 2; // Skills ending in -ing

    // Penalty for obvious noise
    if (/^\d+$/.test(keyword)) score -= 20; // Pure numbers
    if (keyword.length < 3) score -= 10; // Too short
    if (/[^a-zA-Z\-\s]/.test(keyword)) score -= 5; // Special characters

    return Math.max(score, 0);
  }

  /**
   * Merge ESCO validation results with basic keywords
   */
  private mergeESCOResults(
    basicKeywords: ExtractedKeywords,
    validationResults: ESCOValidatedKeyword[],
    confidenceThreshold: number
  ): ExtractedKeywords {
    const enhanced: ExtractedKeywords = {
      hardSkills: [...basicKeywords.hardSkills],
      softSkills: [...basicKeywords.softSkills],
      jobTitles: [...basicKeywords.jobTitles],
      certifications: [...basicKeywords.certifications],
      education: [...basicKeywords.education],
      tools: [...basicKeywords.tools],
    };

    // Process validation results
    for (const result of validationResults) {
      if (result.isValidated && result.confidence >= confidenceThreshold) {
        const category = result.category;

        // Add validated keyword if not already present
        if (!enhanced[category].includes(result.keyword)) {
          enhanced[category].push(result.keyword);
        }

        // Add ESCO match title if different and high confidence
        if (result.escoMatch && result.confidence > 0.8) {
          const escoTitle = result.escoMatch.title;
          if (!enhanced[category].includes(escoTitle)) {
            enhanced[category].push(escoTitle);
          }
        }

        // Add high-confidence suggestions
        if (result.suggestions && result.confidence > 0.9) {
          for (const suggestion of result.suggestions.slice(0, 2)) {
            if (!enhanced[category].includes(suggestion)) {
              enhanced[category].push(suggestion);
            }
          }
        }
      }
    }

    // Sort and deduplicate all categories
    Object.keys(enhanced).forEach((key) => {
      const categoryKey = key as keyof ExtractedKeywords;
      enhanced[categoryKey] = [...new Set(enhanced[categoryKey])].sort();
    });

    return enhanced;
  }

  /**
   * Generate comprehensive statistics
   */
  private generateStats(
    basicKeywords: ExtractedKeywords,
    validationResults: ESCOValidatedKeyword[]
  ) {
    const totalKeywords = Object.values(basicKeywords).flat().length;
    const validatedCount = validationResults.filter(
      (r) => r.isValidated
    ).length;
    const validationRate =
      totalKeywords > 0 ? (validatedCount / totalKeywords) * 100 : 0;

    // Analyze industry diversity based on ESCO matches
    const industryDiversity = this.analyzeIndustryDiversity(validationResults);

    // Collect suggested keywords
    const suggestedKeywords = validationResults
      .filter((r) => r.suggestions && r.suggestions.length > 0)
      .flatMap((r) => r.suggestions!)
      .filter((keyword, index, array) => array.indexOf(keyword) === index)
      .slice(0, 10); // Top 10 suggestions

    return {
      totalKeywords,
      validatedCount,
      validationRate: Number(validationRate.toFixed(1)),
      industryDiversity,
      suggestedKeywords,
    };
  }

  /**
   * Analyze industry diversity from ESCO matches
   */
  private analyzeIndustryDiversity(
    validationResults: ESCOValidatedKeyword[]
  ): string[] {
    const industries = new Set<string>();

    for (const result of validationResults) {
      if (result.escoMatch && result.isValidated) {
        // Extract industry indicators from ESCO match
        const title = result.escoMatch.title.toLowerCase();

        // Common industry keywords
        if (
          title.includes('software') ||
          title.includes('computer') ||
          title.includes('programming')
        ) {
          industries.add('Information Technology');
        } else if (
          title.includes('marketing') ||
          title.includes('sales') ||
          title.includes('advertising')
        ) {
          industries.add('Marketing & Sales');
        } else if (
          title.includes('finance') ||
          title.includes('accounting') ||
          title.includes('banking')
        ) {
          industries.add('Finance & Accounting');
        } else if (
          title.includes('health') ||
          title.includes('medical') ||
          title.includes('nursing')
        ) {
          industries.add('Healthcare');
        } else if (
          title.includes('education') ||
          title.includes('teaching') ||
          title.includes('training')
        ) {
          industries.add('Education');
        } else if (
          title.includes('engineering') ||
          title.includes('mechanical') ||
          title.includes('electrical')
        ) {
          industries.add('Engineering');
        } else if (
          title.includes('design') ||
          title.includes('creative') ||
          title.includes('art')
        ) {
          industries.add('Design & Creative');
        } else if (
          title.includes('management') ||
          title.includes('leadership') ||
          title.includes('administration')
        ) {
          industries.add('Management');
        } else if (
          title.includes('legal') ||
          title.includes('law') ||
          title.includes('compliance')
        ) {
          industries.add('Legal');
        } else if (
          title.includes('human resources') ||
          title.includes('hr') ||
          title.includes('recruitment')
        ) {
          industries.add('Human Resources');
        }
      }
    }

    return Array.from(industries).sort();
  }
}

// Export singleton instance
export const enhancedExtractor = new EnhancedKeywordExtractor();

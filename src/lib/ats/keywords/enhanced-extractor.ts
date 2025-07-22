/**
 * Enhanced Keyword Extractor with ESCO Integration
 *
 * Combines traditional keyword extraction with ESCO API validation
 * for comprehensive cross-industry skill and occupation recognition
 */

import type { ExtractedKeywords } from '../types';
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
   * Prioritize keywords for ESCO validation with enhanced noise filtering
   */
  private prioritizeKeywordsForValidation(
    keywords: string[],
    maxCount: number
  ): string[] {
    console.log(`🔍 Prioritizing ${keywords.length} keywords for validation`);

    // Step 1: Enhanced noise filtering
    const cleanKeywords = keywords.filter((keyword) =>
      this.isHighQualityKeyword(keyword)
    );
    console.log(
      `🧹 After noise filtering: ${cleanKeywords.length} keywords (removed ${keywords.length - cleanKeywords.length} noise)`
    );

    // Step 2: Smart scoring with multiple factors
    const scored = cleanKeywords.map((keyword) => ({
      keyword,
      score: this.calculateSmartPriority(keyword, keywords),
    }));

    // Step 3: Sort by score and take top N
    const prioritized = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCount)
      .map((item) => item.keyword);

    console.log(
      `⭐ Top prioritized keywords: ${prioritized.slice(0, 5).join(', ')}...`
    );
    return prioritized;
  }

  /**
   * Enhanced noise filtering - check if keyword is high quality
   */
  private isHighQualityKeyword(keyword: string): boolean {
    const lowerKeyword = keyword.toLowerCase().trim();

    // Basic length check
    if (lowerKeyword.length < 2 || lowerKeyword.length > 25) return false;

    // Enhanced noise patterns
    const noisePatterns = [
      /^\d+$/, // Pure numbers: 123, 2023
      /^\d{4}$/, // Years: 2019, 2023
      /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/, // Dates: 12/2023, 01-2024
      /^[\d\-\(\)\+\s]+$/, // Phone numbers: +1-234-567-8900
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, // Emails
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/i, // Month abbreviations
      /^(january|february|march|april|may|june|july|august|september|october|november|december)$/i, // Full months
      /^(mon|tue|wed|thu|fri|sat|sun)$/i, // Day abbreviations
      /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/i, // Full days
      /^(st|nd|rd|th)$/, // Ordinal suffixes
      /^(am|pm)$/i, // Time indicators
      /^(inc|llc|ltd|corp|co)$/i, // Company suffixes
      /^(mr|mrs|ms|dr|prof)$/i, // Titles
      /^[ivxlcdm]+$/i, // Roman numerals: i, ii, iii, iv, v
      /^\d+[a-z]{1,2}$/, // Ordinals: 1st, 2nd, 3rd
      /^[^a-zA-Z]*$/, // No letters at all
      /^(the|and|or|but|in|on|at|to|for|of|with|by|from|as|is|was|are|were|be|been|have|has|had|do|does|did|will|would|could|should|may|might|can|must)$/i, // Common stop words
    ];

    // Check against noise patterns
    for (const pattern of noisePatterns) {
      if (pattern.test(lowerKeyword)) {
        return false;
      }
    }

    // Additional quality checks
    if (lowerKeyword.length === 1) return false; // Single characters
    if (/^\d/.test(lowerKeyword) && !/^\d+[a-zA-Z]/.test(lowerKeyword))
      return false; // Starting with number but not version-like

    // Check for meaningful content
    const hasLetters = /[a-zA-Z]/.test(lowerKeyword);
    const letterRatio =
      (lowerKeyword.match(/[a-zA-Z]/g) || []).length / lowerKeyword.length;

    return hasLetters && letterRatio >= 0.5; // At least 50% letters
  }

  /**
   * Smart priority calculation with context awareness
   */
  private calculateSmartPriority(
    keyword: string,
    allKeywords: string[]
  ): number {
    let score = 0;
    const lowerKeyword = keyword.toLowerCase();

    // Base score from length (optimal range: 3-15 characters)
    const length = keyword.length;
    if (length >= 3 && length <= 15) {
      score += Math.min(length * 1.5, 15);
    } else if (length > 15 && length <= 20) {
      score += 8; // Longer terms, moderate penalty
    }

    // Format recognition bonuses
    if (/^[A-Z][a-z]+$/.test(keyword)) score += 8; // Proper case: React, JavaScript
    if (/^[A-Z]{2,6}$/.test(keyword)) score += 6; // Acronyms: AWS, API, SQL
    if (keyword.includes('-')) score += 5; // Compound terms: full-stack, front-end
    if (keyword.includes('.')) score += 4; // Tech formats: Node.js, React.js
    if (/ing$/.test(lowerKeyword)) score += 3; // Skills: programming, testing

    // Technology and skill patterns
    if (
      /^(javascript|typescript|python|java|react|angular|vue|node|express|spring|django|flask)$/i.test(
        lowerKeyword
      )
    )
      score += 10;
    if (
      /^(aws|azure|gcp|docker|kubernetes|git|github|gitlab|jenkins|terraform)$/i.test(
        lowerKeyword
      )
    )
      score += 10;
    if (
      /^(mysql|postgresql|mongodb|redis|elasticsearch|oracle|sqlite)$/i.test(
        lowerKeyword
      )
    )
      score += 10;

    // Professional terms
    if (
      /(developer|engineer|architect|manager|analyst|specialist|consultant|lead|senior|junior)$/i.test(
        lowerKeyword
      )
    )
      score += 8;
    if (
      /(experience|skilled|proficient|expert|advanced|intermediate|beginner)$/i.test(
        lowerKeyword
      )
    )
      score += 6;

    // Frequency bonus (appears multiple times)
    const frequency = allKeywords.filter(
      (k) => k.toLowerCase() === lowerKeyword
    ).length;
    if (frequency > 1) score += Math.min(frequency * 2, 8);

    // Alphabetic content ratio
    const alphaRatio = (keyword.match(/[a-zA-Z]/g) || []).length / length;
    score += alphaRatio * 5;

    // Penalty for suspicious patterns
    if (/^\d+$/.test(keyword)) score -= 50; // Pure numbers
    if (keyword.length < 3) score -= 20; // Too short
    if (/[^a-zA-Z0-9\-\.\s]/.test(keyword)) score -= 10; // Special characters
    if (/^(a|an|the|and|or|but|in|on|at|to|for|of|with|by)$/i.test(keyword))
      score -= 30; // Stop words

    return Math.max(score, 0);
  }

  /**
   * Calculate priority score for keyword validation (legacy method)
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

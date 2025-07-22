/**
 * ESCO API Integration for ATS Resume Checker
 *
 * Integrates with European Skills, Competences, Qualifications and Occupations (ESCO) API
 * to provide comprehensive skill and occupation validation across all industries
 */

import type { ExtractedKeywords } from '../types';

/**
 * ESCO API Configuration
 */
const ESCO_API_BASE = 'https://ec.europa.eu/esco/api';
const DEFAULT_LANGUAGE = 'en';

/**
 * ESCO Skill Interface
 */
export interface ESCOSkill {
  uri: string;
  title: string;
  description?: string;
  skillType: 'skill/competence' | 'knowledge' | 'attitude';
  reuseLevel: 'sector-specific' | 'cross-sector' | 'transversal';
  alternativeLabels?: string[];
  broaderSkills?: string[];
  narrowerSkills?: string[];
}

/**
 * ESCO Occupation Interface
 */
export interface ESCOOccupation {
  uri: string;
  title: string;
  description?: string;
  iscoGroup: string;
  alternativeLabels?: string[];
  essentialSkills?: string[];
  optionalSkills?: string[];
}

/**
 * ESCO Search Result Interface
 */
export interface ESCOSearchResult {
  _links: {
    self: { href: string };
  };
  total: number;
  _embedded?: {
    results?: Array<ESCOSkill | ESCOOccupation>;
  };
}

/**
 * Enhanced Keyword with ESCO validation
 */
export interface ESCOValidatedKeyword {
  keyword: string;
  isValidated: boolean;
  escoMatch?: ESCOSkill | ESCOOccupation;
  confidence: number;
  category: keyof ExtractedKeywords;
  suggestions?: string[];
}

/**
 * ESCO API Client
 */
export class ESCOAPIClient {
  private cache = new Map<string, any>();
  private readonly cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
  private validationCache = new Map<string, ESCOValidatedKeyword>();
  private readonly validationCacheExpiry = 60 * 60 * 1000; // 1 hour for validation results

  /**
   * Search for skills in ESCO database
   */
  async searchSkills(
    query: string,
    limit = 10,
    language: string = DEFAULT_LANGUAGE
  ): Promise<ESCOSkill[]> {
    const cacheKey = `skills_${query}_${limit}_${language}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const url = `${ESCO_API_BASE}/search`;
      const params = new URLSearchParams({
        text: query,
        language,
        type: 'skill',
        limit: limit.toString(),
        full: 'true',
      });

      console.log(`🔍 ESCO API: Searching skills for "${query}"`);

      const response = await fetch(`${url}?${params}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ATS-Resume-Checker/1.0',
        },
      });

      if (!response.ok) {
        console.warn(`ESCO API skills search failed: ${response.status}`);
        return [];
      }

      const data: ESCOSearchResult = await response.json();
      const skills = (data._embedded?.results || []) as ESCOSkill[];

      this.setCache(cacheKey, skills);
      console.log(`✅ ESCO API: Found ${skills.length} skills for "${query}"`);

      return skills;
    } catch (error) {
      console.error('ESCO API skills search error:', error);
      return [];
    }
  }

  /**
   * Search for occupations in ESCO database
   */
  async searchOccupations(
    query: string,
    limit = 10,
    language: string = DEFAULT_LANGUAGE
  ): Promise<ESCOOccupation[]> {
    const cacheKey = `occupations_${query}_${limit}_${language}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const url = `${ESCO_API_BASE}/search`;
      const params = new URLSearchParams({
        text: query,
        language,
        type: 'occupation',
        limit: limit.toString(),
        full: 'true',
      });

      console.log(`🔍 ESCO API: Searching occupations for "${query}"`);

      const response = await fetch(`${url}?${params}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ATS-Resume-Checker/1.0',
        },
      });

      if (!response.ok) {
        console.warn(`ESCO API occupations search failed: ${response.status}`);
        return [];
      }

      const data: ESCOSearchResult = await response.json();
      const occupations = (data._embedded?.results || []) as ESCOOccupation[];

      this.setCache(cacheKey, occupations);
      console.log(
        `✅ ESCO API: Found ${occupations.length} occupations for "${query}"`
      );

      return occupations;
    } catch (error) {
      console.error('ESCO API occupations search error:', error);
      return [];
    }
  }

  /**
   * Validate a keyword against ESCO database with smart caching
   */
  async validateKeyword(keyword: string): Promise<ESCOValidatedKeyword> {
    const normalizedKeyword = keyword.toLowerCase().trim();

    // Check validation cache first
    const cacheKey = `validation_${normalizedKeyword}`;
    const cached = this.getValidationFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Search both skills and occupations in parallel with reduced limits
    const [skills, occupations] = await Promise.all([
      this.searchSkills(normalizedKeyword, 3),
      this.searchOccupations(normalizedKeyword, 3),
    ]);

    // Find best match
    let bestMatch: ESCOSkill | ESCOOccupation | undefined;
    let confidence = 0;
    let category: keyof ExtractedKeywords = 'hardSkills';

    // Check skills first
    for (const skill of skills) {
      const matchConfidence = this.calculateMatchConfidence(
        normalizedKeyword,
        skill.title,
        skill.alternativeLabels
      );
      if (matchConfidence > confidence) {
        bestMatch = skill;
        confidence = matchConfidence;
        category = this.categorizeESCOSkill(skill);
      }
    }

    // Check occupations
    for (const occupation of occupations) {
      const matchConfidence = this.calculateMatchConfidence(
        normalizedKeyword,
        occupation.title,
        occupation.alternativeLabels
      );
      if (matchConfidence > confidence) {
        bestMatch = occupation;
        confidence = matchConfidence;
        category = 'jobTitles';
      }
    }

    // Generate suggestions
    const suggestions = this.generateSuggestions(
      skills,
      occupations,
      normalizedKeyword
    );

    const result: ESCOValidatedKeyword = {
      keyword,
      isValidated: confidence > 0.7,
      escoMatch: bestMatch,
      confidence,
      category,
      suggestions: suggestions.slice(0, 3), // Top 3 suggestions
    };

    // Cache the validation result
    this.setValidationCache(cacheKey, result);

    return result;
  }

  /**
   * Batch validate multiple keywords
   */
  async validateKeywords(keywords: string[]): Promise<ESCOValidatedKeyword[]> {
    console.log(`🔍 ESCO API: Validating ${keywords.length} keywords`);

    // 并行批处理优化
    const batchSize = 20; // 增加批次大小
    const maxConcurrentBatches = 10; // 控制并发数
    const results: ESCOValidatedKeyword[] = [];

    // Create batches
    const batches: string[][] = [];
    for (let i = 0; i < keywords.length; i += batchSize) {
      batches.push(keywords.slice(i, i + batchSize));
    }

    // Process batches with controlled concurrency
    for (let i = 0; i < batches.length; i += maxConcurrentBatches) {
      const concurrentBatches = batches.slice(i, i + maxConcurrentBatches);

      const batchPromises = concurrentBatches.map(async (batch) => {
        return Promise.all(
          batch.map((keyword) => this.validateKeyword(keyword))
        );
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.flat());

      // Minimal delay between concurrent batch groups
      if (i + maxConcurrentBatches < batches.length) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    console.log(`✅ ESCO API: Validated ${results.length} keywords`);
    return results;
  }

  /**
   * Calculate match confidence between keyword and ESCO entry
   */
  private calculateMatchConfidence(
    keyword: string,
    title: string,
    alternativeLabels?: string[]
  ): number {
    const normalizedTitle =
      typeof title === 'string' ? title.toLowerCase() : '';
    const normalizedKeyword =
      typeof keyword === 'string' ? keyword.toLowerCase() : '';

    // Exact match
    if (normalizedKeyword === normalizedTitle) return 1.0;

    // Check alternative labels
    if (Array.isArray(alternativeLabels)) {
      for (const label of alternativeLabels) {
        if (
          typeof label === 'string' &&
          normalizedKeyword === label.toLowerCase()
        )
          return 0.95;
      }
    }

    // Partial match in title
    if (normalizedTitle.includes(normalizedKeyword)) return 0.8;
    if (normalizedKeyword.includes(normalizedTitle)) return 0.75;

    // Check alternative labels for partial matches
    if (Array.isArray(alternativeLabels)) {
      for (const label of alternativeLabels) {
        if (typeof label === 'string') {
          const normalizedLabel = label.toLowerCase();
          if (normalizedLabel.includes(normalizedKeyword)) return 0.7;
          if (normalizedKeyword.includes(normalizedLabel)) return 0.65;
        }
      }
    }

    // Fuzzy matching (simple Levenshtein-based)
    const similarity = this.calculateSimilarity(
      normalizedKeyword,
      normalizedTitle
    );
    return similarity > 0.8 ? similarity * 0.6 : 0;
  }

  /**
   * Categorize ESCO skill into our 6-dimension system
   */
  private categorizeESCOSkill(skill: ESCOSkill): keyof ExtractedKeywords {
    const title =
      typeof skill.title === 'string' ? skill.title.toLowerCase() : '';

    // Check skill type and content
    if (skill.skillType === 'knowledge') {
      if (
        title.includes('computer') ||
        title.includes('software') ||
        title.includes('programming')
      ) {
        return 'hardSkills';
      }
      if (
        title.includes('education') ||
        title.includes('degree') ||
        title.includes('qualification')
      ) {
        return 'education';
      }
      return 'hardSkills';
    }

    if (skill.skillType === 'attitude' || skill.reuseLevel === 'transversal') {
      return 'softSkills';
    }

    // Default to hard skills for competences
    return 'hardSkills';
  }

  /**
   * Generate keyword suggestions based on ESCO results
   */
  private generateSuggestions(
    skills: ESCOSkill[],
    occupations: ESCOOccupation[],
    originalKeyword: string
  ): string[] {
    const suggestions: string[] = [];

    const normalizedOriginal =
      typeof originalKeyword === 'string' ? originalKeyword.toLowerCase() : '';

    // Add skill titles
    skills.forEach((skill) => {
      if (
        typeof skill.title === 'string' &&
        skill.title.toLowerCase() !== normalizedOriginal
      ) {
        suggestions.push(skill.title);
      }
      // Add alternative labels
      if (Array.isArray(skill.alternativeLabels)) {
        skill.alternativeLabels.forEach((label) => {
          if (
            typeof label === 'string' &&
            label.toLowerCase() !== normalizedOriginal &&
            !suggestions.includes(label)
          ) {
            suggestions.push(label);
          }
        });
      }
    });

    // Add occupation titles
    occupations.forEach((occupation) => {
      if (
        typeof occupation.title === 'string' &&
        occupation.title.toLowerCase() !== normalizedOriginal
      ) {
        suggestions.push(occupation.title);
      }
    });

    return suggestions;
  }

  /**
   * Simple similarity calculation
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Validation cache management
   */
  private getValidationFromCache(key: string): ESCOValidatedKeyword | null {
    const cached = this.validationCache.get(key);
    if (cached) {
      // Check if cache entry has timestamp (for backward compatibility)
      const cacheEntry = cached as any;
      if (
        cacheEntry.timestamp &&
        Date.now() - cacheEntry.timestamp < this.validationCacheExpiry
      ) {
        return cacheEntry.data;
      } else if (!cacheEntry.timestamp) {
        // Old cache entry without timestamp, assume it's fresh for now
        return cached;
      }
      // Cache expired, remove it
      this.validationCache.delete(key);
    }
    return null;
  }

  private setValidationCache(key: string, data: ESCOValidatedKeyword): void {
    this.validationCache.set(key, {
      ...data,
      timestamp: Date.now(),
    } as any);
  }
}

// Export singleton instance
export const escoClient = new ESCOAPIClient();

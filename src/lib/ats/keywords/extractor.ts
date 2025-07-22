/**
 * Keyword Extractor for ATS Resume Checker
 *
 * Extracts and categorizes keywords from job descriptions and resumes
 * Supports 6-dimension keyword classification for ATS scoring
 */

import * as keywordExtractor from 'keyword-extractor';
// Import TfIdf directly to avoid PostgreSQL dependencies
const TfIdf = require('natural/lib/natural/tfidf/tfidf');
import type { ExtractedKeywords } from '../types';

/**
 * Invalid keyword patterns to filter out
 */
const INVALID_PATTERNS = [
  /^\d+$/, // Pure numbers (123, 2021, etc.)
  /^\d{1,2}\/\d{1,2}$/, // Date patterns (5/8, 12/31)
  /^\d{3,4}-\d{4}$/, // Phone number patterns (456-7890)
  /^[a-z]$/i, // Single letters (a, b, c)
  /^(the|and|or|but|in|on|at|to|for|of|with|by|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|may|might|can|must|shall)$/i, // Common stop words
  /^(this|that|these|those|here|there|where|when|what|who|why|how)$/i, // Question words and demonstratives
  /^(very|quite|rather|really|just|only|also|even|still|yet|already|now|then|soon|later|before|after|during|while)$/i, // Adverbs
  /^\w{1,2}$/, // Very short words (likely noise)
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/i, // Month abbreviations
  /^(mon|tue|wed|thu|fri|sat|sun)$/i, // Day abbreviations
];

/**
 * Compound words that should be merged when found separately
 */
const COMPOUND_WORDS = new Map([
  // Technical compound terms
  ['full-stack', ['full', 'stack']],
  ['fullstack', ['full', 'stack']],
  ['front-end', ['front', 'end']],
  ['frontend', ['front', 'end']],
  ['back-end', ['back', 'end']],
  ['backend', ['back', 'end']],
  ['machine-learning', ['machine', 'learning']],
  ['artificial-intelligence', ['artificial', 'intelligence']],
  ['data-science', ['data', 'science']],
  ['web-development', ['web', 'development']],
  ['software-engineering', ['software', 'engineering']],
  ['computer-science', ['computer', 'science']],
  ['user-experience', ['user', 'experience']],
  ['user-interface', ['user', 'interface']],
  ['quality-assurance', ['quality', 'assurance']],
  ['project-management', ['project', 'management']],
  ['product-management', ['product', 'management']],
  ['business-intelligence', ['business', 'intelligence']],
  ['cloud-computing', ['cloud', 'computing']],
  ['cyber-security', ['cyber', 'security']],
  ['information-technology', ['information', 'technology']],

  // Tools and technologies
  ['node-js', ['node', 'js']],
  ['react-js', ['react', 'js']],
  ['vue-js', ['vue', 'js']],
  ['angular-js', ['angular', 'js']],
  ['next-js', ['next', 'js']],
  ['express-js', ['express', 'js']],
  ['visual-studio', ['visual', 'studio']],
  ['github-actions', ['github', 'actions']],
  ['google-cloud', ['google', 'cloud']],
  ['amazon-web-services', ['amazon', 'web', 'services']],
  ['microsoft-azure', ['microsoft', 'azure']],
]);

/**
 * Technology name standardization map
 */
const TECH_STANDARDIZATION = new Map([
  // JavaScript variations
  ['js', 'JavaScript'],
  ['javascript', 'JavaScript'],
  ['ecmascript', 'JavaScript'],

  // TypeScript variations
  ['ts', 'TypeScript'],
  ['typescript', 'TypeScript'],

  // Node.js variations
  ['nodejs', 'Node.js'],
  ['node', 'Node.js'],

  // React variations
  ['reactjs', 'React'],
  ['react', 'React'],

  // Version control
  ['git', 'Git'],
  ['github', 'GitHub'],
  ['gitlab', 'GitLab'],

  // Databases
  ['mysql', 'MySQL'],
  ['postgresql', 'PostgreSQL'],
  ['postgres', 'PostgreSQL'],
  ['mongodb', 'MongoDB'],
  ['mongo', 'MongoDB'],

  // Cloud platforms
  ['aws', 'AWS'],
  ['azure', 'Microsoft Azure'],
  ['gcp', 'Google Cloud Platform'],

  // Common abbreviations
  ['api', 'API'],
  ['rest', 'REST API'],
  ['graphql', 'GraphQL'],
  ['sql', 'SQL'],
  ['html', 'HTML'],
  ['css', 'CSS'],
  ['ui', 'UI'],
  ['ux', 'UX'],
  ['qa', 'QA'],
  ['ci', 'CI'],
  ['cd', 'CD'],
  ['devops', 'DevOps'],
]);

/**
 * Configuration for keyword extraction
 */
export interface KeywordExtractionOptions {
  language?: 'english' | 'chinese';
  removeDigits?: boolean;
  returnChangedCase?: boolean;
  returnChunks?: boolean;
  removeStopwords?: boolean;
  minLength?: number;
  maxLength?: number;
}

/**
 * Default extraction options - Optimized for better quality
 */
const DEFAULT_OPTIONS: KeywordExtractionOptions = {
  language: 'english',
  removeDigits: true, // Remove pure numbers to reduce noise
  returnChangedCase: true, // Normalize case
  returnChunks: false,
  removeStopwords: true,
  minLength: 3, // Increased to reduce single letters and short noise
  maxLength: 20, // Reduced to focus on meaningful terms
};

/**
 * Predefined keyword categories for classification
 */
export const KEYWORD_CATEGORIES = {
  // Hard Skills - Technical skills, programming languages, frameworks
  hardSkills: [
    // Programming Languages
    'javascript',
    'typescript',
    'python',
    'java',
    'c++',
    'c#',
    'php',
    'ruby',
    'go',
    'rust',
    'swift',
    'kotlin',
    'scala',
    'r',
    'matlab',
    'sql',
    'html',
    'css',
    'sass',
    'less',

    // Frameworks & Libraries
    'react',
    'vue',
    'angular',
    'node.js',
    'express',
    'django',
    'flask',
    'spring',
    'laravel',
    'rails',
    'next.js',
    'nuxt.js',
    'svelte',
    'ember',
    'backbone',
    'jquery',
    'bootstrap',
    'tailwind',

    // Databases
    'mysql',
    'postgresql',
    'mongodb',
    'redis',
    'elasticsearch',
    'oracle',
    'sqlite',
    'cassandra',
    'dynamodb',
    'firebase',
    'supabase',

    // Cloud & DevOps
    'aws',
    'azure',
    'gcp',
    'docker',
    'kubernetes',
    'jenkins',
    'gitlab',
    'github',
    'terraform',
    'ansible',
    'chef',
    'puppet',
    'vagrant',
    'nginx',
    'apache',

    // Tools & Technologies
    'git',
    'svn',
    'jira',
    'confluence',
    'slack',
    'figma',
    'sketch',
    'photoshop',
    'illustrator',
    'postman',
    'swagger',
    'graphql',
    'rest',
    'api',
    'microservices',
    'serverless',
  ],

  // Soft Skills - Interpersonal and behavioral skills
  softSkills: [
    'leadership',
    'communication',
    'teamwork',
    'collaboration',
    'problem-solving',
    'analytical',
    'creative',
    'innovative',
    'adaptable',
    'flexible',
    'organized',
    'detail-oriented',
    'time-management',
    'multitasking',
    'self-motivated',
    'proactive',
    'initiative',
    'critical-thinking',
    'decision-making',
    'negotiation',
    'presentation',
    'public-speaking',
    'mentoring',
    'coaching',
    'training',
    'customer-service',
    'client-facing',
  ],

  // Job Titles - Common job titles and roles
  jobTitles: [
    'developer',
    'engineer',
    'programmer',
    'architect',
    'manager',
    'director',
    'lead',
    'senior',
    'junior',
    'principal',
    'staff',
    'consultant',
    'analyst',
    'specialist',
    'coordinator',
    'administrator',
    'designer',
    'researcher',
    'scientist',
    'technician',
    'intern',
    'frontend',
    'backend',
    'fullstack',
    'full-stack',
    'devops',
    'sre',
    'qa',
    'qe',
    'product-manager',
    'project-manager',
    'scrum-master',
    'tech-lead',
    'team-lead',
  ],

  // Certifications - Professional certifications and credentials
  certifications: [
    'aws-certified',
    'azure-certified',
    'gcp-certified',
    'cissp',
    'cism',
    'cisa',
    'pmp',
    'scrum-master',
    'product-owner',
    'itil',
    'six-sigma',
    'lean',
    'agile',
    'safe',
    'comptia',
    'cisco',
    'microsoft',
    'oracle',
    'salesforce',
    'google-analytics',
    'hubspot',
    'facebook-blueprint',
    'google-ads',
    'linkedin-certified',
  ],

  // Tools - Software tools and platforms
  tools: [
    'visual-studio',
    'vscode',
    'intellij',
    'eclipse',
    'xcode',
    'android-studio',
    'sublime-text',
    'atom',
    'vim',
    'emacs',
    'notepad++',
    'chrome',
    'firefox',
    'safari',
    'edge',
    'postman',
    'insomnia',
    'tableau',
    'power-bi',
    'excel',
    'google-sheets',
    'google-analytics',
    'salesforce',
    'hubspot',
    'mailchimp',
    'wordpress',
    'shopify',
    'zoom',
    'teams',
    'slack',
    'discord',
    'notion',
    'trello',
    'asana',
  ],
};

/**
 * Check if a keyword is valid (not in invalid patterns)
 */
function isValidKeyword(keyword: string): boolean {
  const lowerKeyword = keyword.toLowerCase().trim();

  // Check against invalid patterns
  for (const pattern of INVALID_PATTERNS) {
    if (pattern.test(lowerKeyword)) {
      return false;
    }
  }

  // Additional quality checks
  if (lowerKeyword.length < 2) return false;
  if (lowerKeyword.length > 25) return false;

  // Check for meaningless patterns
  if (/^[^a-zA-Z]*$/.test(lowerKeyword)) return false; // No letters at all
  if (/^\d+[a-zA-Z]{1,2}$/.test(lowerKeyword)) return false; // Like "123rd", "1st"

  return true;
}

/**
 * Standardize technology names and abbreviations
 */
function standardizeTechNames(keywords: string[]): string[] {
  return keywords.map((keyword) => {
    const lowerKeyword = keyword.toLowerCase();
    return TECH_STANDARDIZATION.get(lowerKeyword) || keyword;
  });
}

/**
 * Merge compound words found as separate tokens
 */
function mergeCompoundWords(keywords: string[]): string[] {
  const result = [...keywords];
  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  // Check each compound word pattern
  for (const [compound, parts] of COMPOUND_WORDS.entries()) {
    const lowerParts = parts.map((p) => p.toLowerCase());

    // Check if all parts of the compound word exist
    const allPartsExist = lowerParts.every((part) =>
      lowerKeywords.includes(part)
    );

    if (allPartsExist) {
      // Remove individual parts
      lowerParts.forEach((part) => {
        const index = lowerKeywords.indexOf(part);
        if (index !== -1) {
          result.splice(index, 1);
          lowerKeywords.splice(index, 1);
        }
      });

      // Add compound word
      result.push(compound);
    }
  }

  return result;
}

/**
 * Extract keywords from text using keyword-extractor with enhanced quality filtering
 */
export function extractRawKeywords(
  text: string,
  options: KeywordExtractionOptions = {}
): string[] {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Step 1: Basic extraction
    const rawKeywords = (keywordExtractor as any).extract(text, {
      language: mergedOptions.language,
      remove_digits: mergedOptions.removeDigits,
      return_changed_case: mergedOptions.returnChangedCase,
      return_chunkd_words: mergedOptions.returnChunks,
      remove_duplicates: true,
    });

    // Step 2: Filter by length and basic validation
    const lengthFiltered = rawKeywords.filter((keyword: string) => {
      const length = keyword.length;
      return (
        length >= (mergedOptions.minLength || 3) &&
        length <= (mergedOptions.maxLength || 20)
      );
    });

    // Step 3: Apply quality filters
    const qualityFiltered = lengthFiltered.filter(isValidKeyword);

    // Step 4: Standardize technology names
    const standardized = standardizeTechNames(qualityFiltered);

    // Step 5: Merge compound words
    const merged = mergeCompoundWords(standardized);

    // Step 6: Remove duplicates and sort
    const unique = [...new Set(merged)];

    return unique.sort();
  } catch (error) {
    console.error('Error extracting keywords:', error);
    return [];
  }
}

/**
 * Categorize keywords into 6 dimensions
 */
export function categorizeKeywords(keywords: string[]): ExtractedKeywords {
  const result: ExtractedKeywords = {
    hardSkills: [],
    softSkills: [],
    jobTitles: [],
    certifications: [],
    tools: [],
  };

  // Normalize keywords for matching
  const normalizedKeywords = keywords.map((k) =>
    k.toLowerCase().replace(/[^a-z0-9]/g, '-')
  );

  // Categorize each keyword
  normalizedKeywords.forEach((keyword, index) => {
    const originalKeyword = keywords[index];
    let categorized = false;

    // Check each category
    Object.entries(KEYWORD_CATEGORIES).forEach(
      ([category, categoryKeywords]) => {
        if (
          !categorized &&
          categoryKeywords.some(
            (ck) =>
              keyword.includes(ck) ||
              ck.includes(keyword) ||
              keyword === ck ||
              similarity(keyword, ck) > 0.8
          )
        ) {
          (result[category as keyof ExtractedKeywords] as string[]).push(
            originalKeyword
          );
          categorized = true;
        }
      }
    );

    // If not categorized, try to infer from context
    if (!categorized) {
      if (isLikelyHardSkill(keyword)) {
        result.hardSkills.push(originalKeyword);
      } else if (isLikelySoftSkill(keyword)) {
        result.softSkills.push(originalKeyword);
      } else if (isLikelyJobTitle(keyword)) {
        result.jobTitles.push(originalKeyword);
      }
    }
  });

  // Remove duplicates and sort
  Object.keys(result).forEach((key) => {
    const categoryKey = key as keyof ExtractedKeywords;
    result[categoryKey] = [...new Set(result[categoryKey])].sort();
  });

  return result;
}

/**
 * Extract and categorize keywords from text
 */
export function extractCategorizedKeywords(
  text: string,
  options: KeywordExtractionOptions = {}
): ExtractedKeywords {
  const rawKeywords = extractRawKeywords(text, options);
  return categorizeKeywords(rawKeywords);
}

/**
 * Calculate TF-IDF weights for keywords
 */
export function calculateTfIdfWeights(
  documents: string[],
  keywords: string[]
): Map<string, number> {
  const tfidf = new TfIdf();

  // Add documents to TF-IDF
  documents.forEach((doc) => tfidf.addDocument(doc));

  const weights = new Map<string, number>();

  // Calculate weights for each keyword
  keywords.forEach((keyword) => {
    let maxWeight = 0;

    // Check weight across all documents
    for (let i = 0; i < documents.length; i++) {
      const weight = tfidf.tfidf(keyword, i);
      maxWeight = Math.max(maxWeight, weight);
    }

    weights.set(keyword, maxWeight);
  });

  return weights;
}

// Helper functions for keyword inference
function isLikelyHardSkill(keyword: string): boolean {
  const hardSkillPatterns = [
    /\.(js|ts|py|java|cpp|cs|php|rb|go|rs)$/,
    /^(api|sdk|cli|gui|ui|ux)$/,
    /\d+(\.\d+)?$/, // Version numbers
    /(framework|library|database|server|client)$/,
  ];

  return hardSkillPatterns.some((pattern) => pattern.test(keyword));
}

function isLikelySoftSkill(keyword: string): boolean {
  const softSkillPatterns = [
    /(management|leadership|communication|collaboration)$/,
    /(creative|innovative|analytical|strategic)$/,
    /(oriented|focused|driven|minded)$/,
  ];

  return softSkillPatterns.some((pattern) => pattern.test(keyword));
}

function isLikelyJobTitle(keyword: string): boolean {
  const jobTitlePatterns = [
    /(developer|engineer|manager|director|lead|senior|junior)$/,
    /(analyst|specialist|coordinator|administrator)$/,
    /^(head|chief|vp|vice)$/,
  ];

  return jobTitlePatterns.some((pattern) => pattern.test(keyword));
}

// Simple string similarity function
function similarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
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

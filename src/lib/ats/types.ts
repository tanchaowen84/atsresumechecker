/**
 * ATS Resume Checker Types
 *
 * Core type definitions for the ATS resume checking system
 */

// File parsing types
export interface ParsedDocument {
  text: string;
  success: boolean;
  error?: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    fileSize?: number;
    processingTime?: number;
  };
}

export interface FileParseOptions {
  maxFileSize?: number; // in bytes, default 2MB
  timeout?: number; // in milliseconds, default 30s
}

// Keyword extraction types
export interface ExtractedKeywords {
  hardSkills: string[];
  softSkills: string[];
  jobTitles: string[];
  certifications: string[];
  education: string[];
  tools: string[];
}

export interface KeywordMatch {
  keyword: string;
  category: keyof ExtractedKeywords;
  found: boolean;
  variations?: string[]; // matched variations
}

// Scoring types
export interface DimensionScore {
  score: number; // 0-1
  matched: number;
  total: number;
  matchedKeywords: string[];
  missingKeywords: string[];
}

export interface ATSScores {
  hardSkills: DimensionScore;
  jobTitle: DimensionScore;
  softSkills: DimensionScore;
  certifications: DimensionScore;
  education: DimensionScore;
  tools: DimensionScore;
}

export interface ATSResult {
  totalScore: number; // 0-100
  scores: ATSScores;
  formatRisks: string[];
  recommendations: string[];
}

// Format risk types
export interface FormatRisk {
  type: 'table' | 'two_column' | 'image' | 'special_font' | 'complex_layout';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}

// API types
export interface ATSScanRequest {
  resumeFile: File;
  jobDescription: string;
}

export interface ATSScanResponse {
  success: boolean;
  data?: ATSResult;
  error?: string;
  processingTime?: number;
}

// Configuration types
export interface ScoringWeights {
  hardSkills: number;
  jobTitle: number;
  softSkills: number;
  certifications: number;
  education: number;
  tools: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  hardSkills: 0.4, // 40% - Most important
  jobTitle: 0.2, // 20% - Job title matching
  softSkills: 0.15, // 15% - Soft skills
  certifications: 0.1, // 10% - Certifications
  education: 0.1, // 10% - Education background
  tools: 0.05, // 5% - Tools/tech stack
};

// Error types
export class ATSError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ATSError';
  }
}

export class ParseError extends ATSError {
  constructor(message: string, details?: any) {
    super(message, 'PARSE_ERROR', details);
    this.name = 'ParseError';
  }
}

export class ValidationError extends ATSError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

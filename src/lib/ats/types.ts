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
  score: number; // 0-1 维度得分
  matched: number; // 匹配关键词数量
  total: number; // JD中该维度总关键词数量
  matchedKeywords: string[];
  missingKeywords: string[];
  qualityScore: number; // 匹配质量分数
  tfIdfWeight: number; // TF-IDF加权分数
}

export interface ATSScores {
  hardSkills: DimensionScore;
  jobTitle: DimensionScore;
  softSkills: DimensionScore;
  certifications: DimensionScore;
  tools: DimensionScore;
}

export interface ATSResult {
  totalScore: number; // 0-100
  scores: ATSScores;
  formatRisks: string[];
  recommendations: string[];
}

// 新增：ATS评分计算结果
export interface ATSScoreCalculation {
  dimensionScores: ATSScores;
  totalScore: number; // 0-100 最终得分
  level: string; // 评分等级
  qualityMetrics: {
    escoValidationRate: number;
    keywordDensity: number;
    contextualRelevance: number;
  };
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
  tools: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  hardSkills: 0.5, // 50% - 硬技能（最重要，从45%提升）
  jobTitle: 0.25, // 25% - 职位标题匹配（保持不变）
  softSkills: 0.15, // 15% - 软技能（保持不变）
  certifications: 0.05, // 5% - 证书认证（从10%降低）
  tools: 0.05, // 5% - 工具/技术栈（保持不变）
};

// Score level definitions
export const SCORE_LEVELS = {
  EXCELLENT: { min: 85, max: 100, label: 'Excellent', color: 'green' },
  GOOD: { min: 70, max: 84, label: 'Good', color: 'blue' },
  FAIR: { min: 55, max: 69, label: 'Fair', color: 'yellow' },
  POOR: { min: 40, max: 54, label: 'Poor', color: 'orange' },
  VERY_POOR: { min: 0, max: 39, label: 'Very Poor', color: 'red' },
} as const;

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

/**
 * Unified Text Extractor for ATS Resume Checker
 * 
 * Provides a single interface for extracting text from various file formats
 * Handles file type detection and routing to appropriate parsers
 */

import { parsePDF, validatePDFFile } from './pdfParser';
import { parseDOCX, validateDOCXFile } from './docxParser';
import type { ParsedDocument, FileParseOptions } from '../types';
import { ValidationError, ParseError } from '../types';

/**
 * Supported file types for resume parsing
 */
export const SUPPORTED_FILE_TYPES = {
  PDF: 'application/pdf',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  DOC: 'application/msword'
} as const;

export type SupportedFileType = typeof SUPPORTED_FILE_TYPES[keyof typeof SUPPORTED_FILE_TYPES];

/**
 * Extract text from resume file (PDF or DOCX)
 * 
 * @param file - File object from browser
 * @param options - Parsing options
 * @returns Promise<ParsedDocument>
 */
export async function extractTextFromFile(
  file: File,
  options: FileParseOptions = {}
): Promise<ParsedDocument> {
  const startTime = Date.now();
  
  try {
    // Validate file first
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new ValidationError(validation.error || 'Invalid file');
    }

    // Convert file to buffer
    const buffer = await fileToBuffer(file);
    
    // Determine file type and route to appropriate parser
    const fileType = detectFileType(file, buffer);
    
    let result: ParsedDocument;
    
    switch (fileType) {
      case SUPPORTED_FILE_TYPES.PDF:
        console.log(`Parsing PDF file: ${file.name}`);
        result = await parsePDF(buffer, options);
        break;
        
      case SUPPORTED_FILE_TYPES.DOCX:
      case SUPPORTED_FILE_TYPES.DOC:
        console.log(`Parsing DOCX file: ${file.name}`);
        result = await parseDOCX(buffer, options);
        break;
        
      default:
        throw new ValidationError(`Unsupported file type: ${file.type}`);
    }

    // Add processing metadata
    const processingTime = Date.now() - startTime;
    if (result.success && result.metadata) {
      result.metadata.processingTime = processingTime;
    }

    console.log(`File extraction completed in ${processingTime}ms`);
    return result;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`File extraction failed after ${processingTime}ms:`, error);

    if (error instanceof ValidationError || error instanceof ParseError) {
      return {
        text: '',
        success: false,
        error: error.message
      };
    }

    return {
      text: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Validate file before processing
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check if file exists
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size (global limit)
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max: 2MB)` 
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  // Check file type
  const supportedTypes = Object.values(SUPPORTED_FILE_TYPES);
  if (!supportedTypes.includes(file.type as SupportedFileType)) {
    return { 
      valid: false, 
      error: `Unsupported file type: ${file.type}. Supported: PDF, DOCX` 
    };
  }

  // Specific validation based on file type
  if (file.type === SUPPORTED_FILE_TYPES.PDF) {
    return validatePDFFile(file);
  } else if (
    file.type === SUPPORTED_FILE_TYPES.DOCX || 
    file.type === SUPPORTED_FILE_TYPES.DOC
  ) {
    return validateDOCXFile(file);
  }

  return { valid: true };
}

/**
 * Detect file type from file object and buffer
 */
function detectFileType(file: File, buffer: Buffer): SupportedFileType {
  // First check MIME type
  if (file.type === SUPPORTED_FILE_TYPES.PDF) {
    return SUPPORTED_FILE_TYPES.PDF;
  }
  
  if (
    file.type === SUPPORTED_FILE_TYPES.DOCX || 
    file.type === SUPPORTED_FILE_TYPES.DOC
  ) {
    return SUPPORTED_FILE_TYPES.DOCX;
  }

  // Fallback to file extension if MIME type is not reliable
  const fileName = file.name.toLowerCase();
  if (fileName.endsWith('.pdf')) {
    return SUPPORTED_FILE_TYPES.PDF;
  }
  
  if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
    return SUPPORTED_FILE_TYPES.DOCX;
  }

  // Last resort: check file signature in buffer
  if (buffer.length >= 4) {
    // PDF signature
    if (buffer.subarray(0, 4).toString() === '%PDF') {
      return SUPPORTED_FILE_TYPES.PDF;
    }
    
    // ZIP signature (DOCX is a ZIP file)
    const header = buffer.subarray(0, 4);
    if (
      (header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04) ||
      (header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x05 && header[3] === 0x06)
    ) {
      return SUPPORTED_FILE_TYPES.DOCX;
    }
  }

  throw new ValidationError(`Cannot determine file type for: ${file.name}`);
}

/**
 * Convert File object to Buffer
 */
async function fileToBuffer(file: File): Promise<Buffer> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    throw new ParseError(
      `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get file type information
 */
export function getFileTypeInfo(file: File): {
  type: string;
  extension: string;
  supported: boolean;
  maxSize: string;
} {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const supported = Object.values(SUPPORTED_FILE_TYPES).includes(file.type as SupportedFileType);
  
  return {
    type: file.type,
    extension,
    supported,
    maxSize: '2MB'
  };
}

/**
 * Check if file type is supported
 */
export function isSupportedFileType(file: File): boolean {
  return Object.values(SUPPORTED_FILE_TYPES).includes(file.type as SupportedFileType);
}

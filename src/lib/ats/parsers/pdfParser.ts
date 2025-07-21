/**
 * PDF Parser for ATS Resume Checker
 *
 * Uses pdf-parse with dynamic import to extract text from PDF files
 * High-quality text extraction with Node.js compatibility
 */

import type { FileParseOptions, ParsedDocument } from '../types';
import { ParseError } from '../types';

/**
 * Parse PDF file and extract text content using pdf-parse with dynamic import
 *
 * @param buffer - PDF file buffer
 * @param options - Parsing options
 * @returns Promise<ParsedDocument>
 */
export async function parsePDF(
  buffer: Buffer,
  options: FileParseOptions = {}
): Promise<ParsedDocument> {
  const startTime = Date.now();

  try {
    // Validate file size
    const maxSize = options.maxFileSize || 2 * 1024 * 1024; // 2MB default
    if (buffer.length > maxSize) {
      throw new ParseError(
        `PDF file too large: ${buffer.length} bytes (max: ${maxSize} bytes)`
      );
    }

    // Validate PDF header
    if (!isPDFBuffer(buffer)) {
      throw new ParseError('Invalid PDF file format');
    }

    // Use require instead of import to avoid ENOENT issues with pdf-parse
    const pdfParse = require('pdf-parse');

    // Set timeout for parsing
    const timeout = options.timeout || 30000; // 30s default

    // Parse PDF with timeout
    const parsePromise = pdfParse(buffer, {
      // pdf-parse options for better text extraction
      max: 0, // Parse all pages
      version: 'v1.10.100', // Use specific version for consistency
    });

    // Add timeout wrapper
    const result = await Promise.race([
      parsePromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new ParseError('PDF parsing timeout')), timeout)
      ),
    ]);

    // Clean and validate extracted text
    const cleanedText = cleanPDFText(result.text);

    if (!cleanedText || cleanedText.trim().length === 0) {
      throw new ParseError('No text content found in PDF');
    }

    const processingTime = Date.now() - startTime;
    console.log(`PDF parsed successfully in ${processingTime}ms`);

    return {
      text: cleanedText,
      success: true,
      metadata: {
        pageCount: result.numpages,
        wordCount: countWords(cleanedText),
        fileSize: buffer.length,
      },
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`PDF parsing failed after ${processingTime}ms:`, error);

    if (error instanceof ParseError) {
      return {
        text: '',
        success: false,
        error: error.message,
      };
    }

    // Handle pdf-parse specific errors
    let errorMessage = 'Failed to parse PDF file';
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF')) {
        errorMessage = 'Invalid or corrupted PDF file';
      } else if (error.message.includes('Password')) {
        errorMessage = 'Password-protected PDFs are not supported';
      } else if (error.message.includes('memory')) {
        errorMessage = 'PDF file is too complex to process';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'PDF processing timeout - file may be too complex';
      }
    }

    return {
      text: '',
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check if buffer contains a valid PDF file
 */
function isPDFBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;

  // Check for PDF header signature
  const header = buffer.subarray(0, 4).toString();
  return header === '%PDF';
}

/**
 * Clean and normalize text extracted from PDF
 */
function cleanPDFText(text: string): string {
  if (!text) return '';

  return (
    text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove page breaks and form feeds
      .replace(/[\f\r]/g, '')
      // Normalize line breaks
      .replace(/\n\s*\n/g, '\n')
      // Remove leading/trailing whitespace
      .trim()
      // Remove common PDF artifacts
      .replace(/\0/g, '') // null characters
      .replace(/\uFFFD/g, '') // replacement characters
      // Fix common encoding issues
      .replace(/â€™/g, "'") // smart apostrophe
      .replace(/â€œ/g, '"') // smart quote left
      .replace(/â€\u009d/g, '"') // smart quote right
      .replace(/â€"/g, '–') // en dash
      .replace(/â€"/g, '—') // em dash
      // Remove excessive spaces around punctuation
      .replace(/\s+([,.!?;:])/g, '$1')
      .replace(/([,.!?;:])\s+/g, '$1 ')
      // Fix line breaks in the middle of words
      .replace(/(\w)-\s*\n\s*(\w)/g, '$1$2')
      // Normalize multiple spaces
      .replace(/[ \t]+/g, ' ')
  );
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  if (!text) return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

/**
 * Validate PDF file before parsing
 */
export function validatePDFFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file extension
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: 'File must have .pdf extension' };
  }

  // Check MIME type
  if (file.type !== 'application/pdf') {
    return { valid: false, error: 'Invalid file type. Expected PDF.' };
  }

  // Check file size (2MB limit)
  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max: 2MB)`,
    };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty' };
  }

  return { valid: true };
}

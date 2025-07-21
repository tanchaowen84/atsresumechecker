/**
 * DOCX Parser for ATS Resume Checker
 *
 * Uses mammoth library to extract text from DOCX files
 * Includes error handling and text cleaning
 */

import mammoth from 'mammoth';
import type { FileParseOptions, ParsedDocument } from '../types';
import { ParseError } from '../types';

/**
 * Parse DOCX file and extract text content
 *
 * @param buffer - DOCX file buffer
 * @param options - Parsing options
 * @returns Promise<ParsedDocument>
 */
export async function parseDOCX(
  buffer: Buffer,
  options: FileParseOptions = {}
): Promise<ParsedDocument> {
  const startTime = Date.now();

  try {
    // Validate file size
    const maxSize = options.maxFileSize || 2 * 1024 * 1024; // 2MB default
    if (buffer.length > maxSize) {
      throw new ParseError(
        `DOCX file too large: ${buffer.length} bytes (max: ${maxSize} bytes)`
      );
    }

    // Validate DOCX header
    if (!isDOCXBuffer(buffer)) {
      throw new ParseError('Invalid DOCX file format');
    }

    // Set timeout for parsing
    const timeout = options.timeout || 30000; // 30s default

    // Parse DOCX with timeout - mammoth.extractRawText accepts buffer input
    const parsePromise = mammoth.extractRawText({ buffer });

    const result = await Promise.race([
      parsePromise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new ParseError('DOCX parsing timeout')),
          timeout
        )
      ),
    ]);

    // Clean and validate extracted text
    const cleanedText = cleanDOCXText(result.value);

    if (!cleanedText || cleanedText.trim().length === 0) {
      throw new ParseError('No text content found in DOCX');
    }

    // Check for parsing warnings
    if (result.messages && result.messages.length > 0) {
      const warnings = result.messages
        .filter((msg) => msg.type === 'warning')
        .map((msg) => msg.message);

      if (warnings.length > 0) {
        console.warn('DOCX parsing warnings:', warnings);
      }
    }

    const processingTime = Date.now() - startTime;
    console.log(`DOCX parsed successfully in ${processingTime}ms`);

    return {
      text: cleanedText,
      success: true,
      metadata: {
        wordCount: countWords(cleanedText),
        fileSize: buffer.length,
      },
    };
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`DOCX parsing failed after ${processingTime}ms:`, error);

    if (error instanceof ParseError) {
      return {
        text: '',
        success: false,
        error: error.message,
      };
    }

    // Handle mammoth specific errors
    let errorMessage = 'Failed to parse DOCX file';
    if (error instanceof Error) {
      if (error.message.includes('not a valid zip file')) {
        errorMessage = 'Invalid or corrupted DOCX file';
      } else if (error.message.includes('password')) {
        errorMessage = 'Password-protected DOCX files are not supported';
      } else if (error.message.includes('memory')) {
        errorMessage = 'DOCX file is too complex to process';
      } else if (error.message.includes('zip')) {
        errorMessage = 'DOCX file structure is invalid';
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
 * Check if buffer contains a valid DOCX file
 */
function isDOCXBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;

  // Check for ZIP header signature (DOCX is a ZIP file)
  const header = buffer.subarray(0, 4);
  return (
    // Standard ZIP signature
    (header[0] === 0x50 &&
      header[1] === 0x4b &&
      header[2] === 0x03 &&
      header[3] === 0x04) ||
    // Empty ZIP signature
    (header[0] === 0x50 &&
      header[1] === 0x4b &&
      header[2] === 0x05 &&
      header[3] === 0x06) ||
    // Spanned ZIP signature
    (header[0] === 0x50 &&
      header[1] === 0x4b &&
      header[2] === 0x07 &&
      header[3] === 0x08)
  );
}

/**
 * Clean and normalize text extracted from DOCX
 */
function cleanDOCXText(text: string): string {
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
      // Remove common DOCX artifacts
      .replace(/\0/g, '') // null characters
      .replace(/\ufffd/g, '') // replacement characters
      // Remove excessive tabs
      .replace(/\t+/g, ' ')
      // Fix common encoding issues
      .replace(/â€™/g, "'") // smart apostrophe
      .replace(/â€œ/g, '"') // smart quote left
      .replace(/â€\u009d/g, '"') // smart quote right
      .replace(/â€"/g, '–') // en dash
      .replace(/â€"/g, '—') // em dash
      // Remove header/footer artifacts
      .replace(/^(Header|Footer):\s*/gm, '')
      // Clean up bullet points
      .replace(/^[•·▪▫‣⁃]\s*/gm, '• ')
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
 * Validate DOCX file before parsing
 */
export function validateDOCXFile(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file extension
  const validExtensions = ['.docx', '.doc'];
  const hasValidExtension = validExtensions.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!hasValidExtension) {
    return { valid: false, error: 'File must have .docx or .doc extension' };
  }

  // Check MIME type
  const validMimeTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.ms-word',
  ];

  if (!validMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Expected Word document.',
    };
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

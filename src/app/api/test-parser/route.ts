import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromFile } from '@/lib/ats/parsers/textExtractor';

/**
 * Test API endpoint for document parsing
 * 
 * This is a temporary endpoint for testing the PDF/DOCX parsing functionality
 * It will be replaced by the main ATS scan API later
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No file provided' 
        },
        { status: 400 }
      );
    }

    console.log(`Testing parser with file: ${file.name} (${file.size} bytes, ${file.type})`);

    // Extract text using our unified text extractor
    const result = await extractTextFromFile(file, {
      maxFileSize: 2 * 1024 * 1024, // 2MB
      timeout: 30000 // 30 seconds
    });

    // Log the result for debugging
    if (result.success) {
      console.log(`✅ Parse successful: ${result.metadata?.wordCount || 0} words extracted`);
    } else {
      console.log(`❌ Parse failed: ${result.error}`);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Test parser API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// Configure the API route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};

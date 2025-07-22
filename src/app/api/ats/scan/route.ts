import { keywordCategorizer } from '@/lib/ats/keywords/categorizer';
import { enhancedExtractor } from '@/lib/ats/keywords/enhanced-extractor';
import {
  calculateTfIdfWeights,
  extractCategorizedKeywords,
} from '@/lib/ats/keywords/extractor';
import { extractTextFromFile } from '@/lib/ats/parsers/textExtractor';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * ATS Resume Scan API
 *
 * Processes resume files and job descriptions to provide ATS compatibility analysis
 */
export async function POST(request: NextRequest) {
  try {
    // Handle FormData parsing with error handling
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error('FormData parsing error:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid form data format',
        },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    const jobDescription = formData.get('jobDescription') as string | null;

    // Validate inputs
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'Resume file is required',
        },
        { status: 400 }
      );
    }

    if (!jobDescription?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Job description is required',
        },
        { status: 400 }
      );
    }

    console.log(`Processing ATS scan: ${file.name} (${file.size} bytes)`);
    const startTime = Date.now();

    // Step 1: Extract text from resume file
    console.log('Step 1: Extracting text from resume...');
    const parseResult = await extractTextFromFile(file, {
      maxFileSize: 2 * 1024 * 1024, // 2MB
      timeout: 30000, // 30 seconds
    });

    if (!parseResult.success || !parseResult.text) {
      return NextResponse.json(
        {
          success: false,
          error: parseResult.error || 'Failed to extract text from resume',
        },
        { status: 400 }
      );
    }

    const resumeText = parseResult.text;
    console.log(`✅ Resume text extracted: ${resumeText.length} characters`);

    // Step 2: Enhanced keyword extraction from job description with ESCO validation
    console.log('Step 2: Enhanced keyword extraction from job description...');
    const jdEnhanced = await enhancedExtractor.extractAndValidate(
      jobDescription,
      {
        enableESCOValidation: true,
        escoConfidenceThreshold: 0.7,
        maxKeywordsToValidate: 20, // Reduced for faster processing
      }
    );

    console.log(
      `✅ JD keywords extracted: ${Object.values(jdEnhanced.validatedKeywords).flat().length} total ` +
        `(${jdEnhanced.stats.validatedCount} ESCO-validated, ${jdEnhanced.stats.validationRate}% validation rate)`
    );

    // Step 3: Enhanced keyword extraction from resume text with ESCO validation
    console.log('Step 3: Enhanced keyword extraction from resume...');
    const resumeEnhanced = await enhancedExtractor.extractAndValidate(
      resumeText,
      {
        enableESCOValidation: true,
        escoConfidenceThreshold: 0.7,
        maxKeywordsToValidate: 25, // Reduced for faster processing,
      }
    );

    console.log(
      `✅ Resume keywords extracted: ${Object.values(resumeEnhanced.validatedKeywords).flat().length} total ` +
        `(${resumeEnhanced.stats.validatedCount} ESCO-validated, ${resumeEnhanced.stats.validationRate}% validation rate)`
    );

    // Step 4: Calculate keyword matching with enhanced ESCO-validated keywords
    console.log('Step 4: Calculating keyword matching...');
    const jdKeywordsList = Object.values(jdEnhanced.validatedKeywords).flat();
    const resumeKeywordsList = Object.values(
      resumeEnhanced.validatedKeywords
    ).flat();
    const allKeywords = [
      ...new Set([...jdKeywordsList, ...resumeKeywordsList]),
    ];

    // Calculate TF-IDF weights
    const tfidfWeights = calculateTfIdfWeights(
      [jobDescription, resumeText],
      allKeywords
    );

    // Find matching keywords by category using ESCO-validated keywords
    const matchingByCategory = {
      hardSkills: jdEnhanced.validatedKeywords.hardSkills.filter((keyword) =>
        resumeEnhanced.validatedKeywords.hardSkills.some(
          (rKeyword) => rKeyword.toLowerCase() === keyword.toLowerCase()
        )
      ),
      softSkills: jdEnhanced.validatedKeywords.softSkills.filter((keyword) =>
        resumeEnhanced.validatedKeywords.softSkills.some(
          (rKeyword) => rKeyword.toLowerCase() === keyword.toLowerCase()
        )
      ),
      jobTitles: jdEnhanced.validatedKeywords.jobTitles.filter((keyword) =>
        resumeEnhanced.validatedKeywords.jobTitles.some(
          (rKeyword) => rKeyword.toLowerCase() === keyword.toLowerCase()
        )
      ),
      certifications: jdEnhanced.validatedKeywords.certifications.filter(
        (keyword) =>
          resumeEnhanced.validatedKeywords.certifications.some(
            (rKeyword) => rKeyword.toLowerCase() === keyword.toLowerCase()
          )
      ),

      tools: jdEnhanced.validatedKeywords.tools.filter((keyword) =>
        resumeEnhanced.validatedKeywords.tools.some(
          (rKeyword) => rKeyword.toLowerCase() === keyword.toLowerCase()
        )
      ),
    };

    // Find missing keywords by category using ESCO-validated keywords
    const missingByCategory = {
      hardSkills: jdEnhanced.validatedKeywords.hardSkills.filter(
        (keyword) =>
          !resumeEnhanced.validatedKeywords.hardSkills.some(
            (rKeyword) => rKeyword.toLowerCase() === keyword.toLowerCase()
          )
      ),
      softSkills: jdEnhanced.validatedKeywords.softSkills.filter(
        (keyword) =>
          !resumeEnhanced.validatedKeywords.softSkills.some(
            (rKeyword) => rKeyword.toLowerCase() === keyword.toLowerCase()
          )
      ),
      jobTitles: jdEnhanced.validatedKeywords.jobTitles.filter(
        (keyword) =>
          !resumeEnhanced.validatedKeywords.jobTitles.some(
            (rKeyword) => rKeyword.toLowerCase() === keyword.toLowerCase()
          )
      ),
      certifications: jdEnhanced.validatedKeywords.certifications.filter(
        (keyword) =>
          !resumeEnhanced.validatedKeywords.certifications.some(
            (rKeyword) => rKeyword.toLowerCase() === keyword.toLowerCase()
          )
      ),

      tools: jdEnhanced.validatedKeywords.tools.filter(
        (keyword) =>
          !resumeEnhanced.validatedKeywords.tools.some(
            (rKeyword) => rKeyword.toLowerCase() === keyword.toLowerCase()
          )
      ),
    };

    // Calculate overall statistics
    const totalJdKeywords = jdKeywordsList.length;
    const totalResumeKeywords = resumeKeywordsList.length;
    const totalMatchingKeywords =
      Object.values(matchingByCategory).flat().length;
    const totalMissingKeywords = Object.values(missingByCategory).flat().length;
    const matchingRate =
      totalJdKeywords > 0 ? (totalMatchingKeywords / totalJdKeywords) * 100 : 0;

    const processingTime = Date.now() - startTime;
    console.log(`✅ ATS scan completed in ${processingTime}ms`);

    // Return comprehensive results
    return NextResponse.json({
      success: true,
      data: {
        // File processing info
        fileInfo: {
          name: file.name,
          size: file.size,
          type: file.type,
          processingTime: parseResult.metadata?.processingTime || 0,
          wordCount: parseResult.metadata?.wordCount || 0,
        },

        // Job description analysis with ESCO enhancement
        jobDescription: {
          wordCount: jobDescription.split(/\s+/).length,
          keywords: jdEnhanced.validatedKeywords,
          basicKeywords: jdEnhanced.basicKeywords,
          totalKeywords: totalJdKeywords,
          categoryDistribution: {
            hardSkills: jdEnhanced.validatedKeywords.hardSkills.length,
            softSkills: jdEnhanced.validatedKeywords.softSkills.length,
            jobTitles: jdEnhanced.validatedKeywords.jobTitles.length,
            certifications: jdEnhanced.validatedKeywords.certifications.length,

            tools: jdEnhanced.validatedKeywords.tools.length,
          },
          escoStats: jdEnhanced.stats,
          performance: jdEnhanced.performance,
        },

        // Resume analysis with ESCO enhancement
        resume: {
          wordCount: resumeText.split(/\s+/).length,
          keywords: resumeEnhanced.validatedKeywords,
          basicKeywords: resumeEnhanced.basicKeywords,
          totalKeywords: totalResumeKeywords,
          categoryDistribution: {
            hardSkills: resumeEnhanced.validatedKeywords.hardSkills.length,
            softSkills: resumeEnhanced.validatedKeywords.softSkills.length,
            jobTitles: resumeEnhanced.validatedKeywords.jobTitles.length,
            certifications:
              resumeEnhanced.validatedKeywords.certifications.length,

            tools: resumeEnhanced.validatedKeywords.tools.length,
          },
          escoStats: resumeEnhanced.stats,
          performance: resumeEnhanced.performance,
        },

        // Matching analysis
        matching: {
          totalJdKeywords,
          totalResumeKeywords,
          totalMatchingKeywords,
          totalMissingKeywords,
          matchingRate: Number(matchingRate.toFixed(2)),
          matchingByCategory,
          missingByCategory,
          categoryMatchRates: {
            hardSkills:
              jdEnhanced.validatedKeywords.hardSkills.length > 0
                ? Number(
                    (
                      (matchingByCategory.hardSkills.length /
                        jdEnhanced.validatedKeywords.hardSkills.length) *
                      100
                    ).toFixed(2)
                  )
                : 0,
            softSkills:
              jdEnhanced.validatedKeywords.softSkills.length > 0
                ? Number(
                    (
                      (matchingByCategory.softSkills.length /
                        jdEnhanced.validatedKeywords.softSkills.length) *
                      100
                    ).toFixed(2)
                  )
                : 0,
            jobTitles:
              jdEnhanced.validatedKeywords.jobTitles.length > 0
                ? Number(
                    (
                      (matchingByCategory.jobTitles.length /
                        jdEnhanced.validatedKeywords.jobTitles.length) *
                      100
                    ).toFixed(2)
                  )
                : 0,
            certifications:
              jdEnhanced.validatedKeywords.certifications.length > 0
                ? Number(
                    (
                      (matchingByCategory.certifications.length /
                        jdEnhanced.validatedKeywords.certifications.length) *
                      100
                    ).toFixed(2)
                  )
                : 0,

            tools:
              jdEnhanced.validatedKeywords.tools.length > 0
                ? Number(
                    (
                      (matchingByCategory.tools.length /
                        jdEnhanced.validatedKeywords.tools.length) *
                      100
                    ).toFixed(2)
                  )
                : 0,
          },
        },

        // Performance metrics
        performance: {
          totalProcessingTime: processingTime,
          fileParsingTime: parseResult.metadata?.processingTime || 0,
          keywordExtractionTime:
            processingTime - (parseResult.metadata?.processingTime || 0),
        },
      },
    });
  } catch (error) {
    console.error('ATS scan API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// Configure the API route for file uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};

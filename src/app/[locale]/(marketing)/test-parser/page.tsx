'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface ParseResult {
  success: boolean;
  text?: string;
  error?: string;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    fileSize?: number;
    processingTime?: number;
  };
}

export default function TestParserPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null); // Clear previous results
    }
  };

  const handleParse = async () => {
    if (!file) return;

    setIsLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/test-parser', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Document Parser Test</h1>
        <p className="text-muted-foreground">
          Test the PDF and DOCX parsing functionality for the ATS Resume Checker
        </p>
      </div>

      {/* File Upload Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Document
          </CardTitle>
          <CardDescription>
            Upload a PDF or DOCX file to test the parsing functionality (max 2MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={handleFileChange}
                className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              <Button 
                onClick={handleParse} 
                disabled={!file || isLoading}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Parse File
                  </>
                )}
              </Button>
            </div>

            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{file.name}</span>
                <Badge variant="secondary">{formatFileSize(file.size)}</Badge>
                <Badge variant="outline">{file.type}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              Parse Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="space-y-4">
                {/* Metadata */}
                {result.metadata && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {result.metadata.wordCount && (
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{result.metadata.wordCount}</div>
                        <div className="text-sm text-muted-foreground">Words</div>
                      </div>
                    )}
                    {result.metadata.pageCount && (
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{result.metadata.pageCount}</div>
                        <div className="text-sm text-muted-foreground">Pages</div>
                      </div>
                    )}
                    {result.metadata.fileSize && (
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{formatFileSize(result.metadata.fileSize)}</div>
                        <div className="text-sm text-muted-foreground">Size</div>
                      </div>
                    )}
                    {result.metadata.processingTime && (
                      <div className="text-center p-3 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">{result.metadata.processingTime}ms</div>
                        <div className="text-sm text-muted-foreground">Time</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Extracted Text */}
                {result.text && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Extracted Text</h3>
                    <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {result.text}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {result.error || 'Failed to parse document'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

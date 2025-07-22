'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Loader2, Upload, FileText, AlertCircle, CheckCircle, TrendingUp, Search } from 'lucide-react';

interface ATSScanResult {
  success: boolean;
  error?: string;
  data?: {
    fileInfo: any;
    jobDescription: any;
    resume: any;
    matching: any;
    performance: any;
  };
}

export default function ATSCheckerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ATSScanResult | null>(null);

  // Sample job description for testing
  const sampleJD = `We are looking for a Senior Full Stack Developer to join our growing team.

Requirements:
- 5+ years of experience in React, TypeScript, and Node.js
- Strong knowledge of AWS cloud services (EC2, S3, Lambda)
- Experience with PostgreSQL and MongoDB databases
- Proficiency in Docker and Kubernetes
- Excellent communication and leadership skills
- Bachelor's degree in Computer Science or related field
- AWS Certified Solutions Architect preferred

Responsibilities:
- Lead development of scalable web applications
- Mentor junior developers and conduct code reviews
- Collaborate with product managers and designers
- Implement CI/CD pipelines using Jenkins or GitHub Actions`;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null); // Clear previous results
    }
  };

  const handleScan = async () => {
    if (!file || !jobDescription.trim()) {
      alert('Please provide both a resume file and job description');
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('jobDescription', jobDescription.trim());

      const response = await fetch('/api/ats/scan', {
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

  const loadSampleJD = () => {
    setJobDescription(sampleJD);
  };

  const clearAll = () => {
    setFile(null);
    setJobDescription('');
    setResult(null);
    // Clear file input
    const fileInput = document.getElementById('resume-file') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">ATS Resume Checker</h1>
        <p className="text-muted-foreground">
          Upload your resume and job description to check ATS compatibility and keyword matching
        </p>
      </div>

      {/* Input Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Resume & Job Description
          </CardTitle>
          <CardDescription>
            Upload your resume (PDF/DOCX, max 2MB) and paste the job description
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button onClick={loadSampleJD} variant="outline" size="sm">
                Load Sample JD
              </Button>
              <Button onClick={clearAll} variant="outline" size="sm">
                Clear All
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* File Upload */}
              <div>
                <label htmlFor="resume-file" className="text-sm font-medium mb-2 block">
                  Resume File
                </label>
                <input
                  id="resume-file"
                  type="file"
                  accept=".pdf,.docx,.doc"
                  onChange={handleFileChange}
                  className="flex-1 w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {file && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                    <FileText className="h-4 w-4" />
                    <span>{file.name}</span>
                    <Badge variant="secondary">{formatFileSize(file.size)}</Badge>
                    <Badge variant="outline">{file.type}</Badge>
                  </div>
                )}
              </div>

              {/* Job Description */}
              <div>
                <label htmlFor="job-description" className="text-sm font-medium mb-2 block">
                  Job Description ({jobDescription.length} characters)
                </label>
                <Textarea
                  id="job-description"
                  placeholder="Paste job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[200px]"
                />
              </div>
            </div>

            <Button 
              onClick={handleScan} 
              disabled={isLoading || !file || !jobDescription.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Scanning Resume...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Scan Resume
                </>
              )}
            </Button>
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
              ATS Scan Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success && result.data ? (
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="matching">Keyword Matching</TabsTrigger>
                  <TabsTrigger value="job-keywords">JD Keywords</TabsTrigger>
                  <TabsTrigger value="resume-keywords">Resume Keywords</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {result.data.matching.matchingRate}%
                      </div>
                      <div className="text-sm text-muted-foreground">Match Rate</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {result.data.matching.totalMatchingKeywords}
                      </div>
                      <div className="text-sm text-muted-foreground">Matching Keywords</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {result.data.matching.totalMissingKeywords}
                      </div>
                      <div className="text-sm text-muted-foreground">Missing Keywords</div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">
                        {result.data.performance.totalProcessingTime}ms
                      </div>
                      <div className="text-sm text-muted-foreground">Processing Time</div>
                    </div>
                  </div>

                  {/* Category Match Rates */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold">Category Match Rates</h3>
                    {Object.entries(result.data.matching.categoryMatchRates).map(([category, rate]) => (
                      <div key={category} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span>{rate}%</span>
                        </div>
                        <Progress value={rate as number} className="h-2" />
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="matching" className="space-y-4">
                  <div className="space-y-4">
                    {Object.entries(result.data.matching.matchingByCategory).map(([category, keywords]) => (
                      <div key={category}>
                        <h4 className="font-medium text-green-600 mb-2 capitalize">
                          ✅ {category.replace(/([A-Z])/g, ' $1').trim()} - Matching ({(keywords as string[]).length})
                        </h4>
                        <div className="flex flex-wrap gap-1 mb-4">
                          {(keywords as string[]).map((keyword, index) => (
                            <Badge key={index} variant="default" className="bg-green-100 text-green-800">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}

                    {Object.entries(result.data.matching.missingByCategory).map(([category, keywords]) => (
                      <div key={category}>
                        <h4 className="font-medium text-red-600 mb-2 capitalize">
                          ❌ {category.replace(/([A-Z])/g, ' $1').trim()} - Missing ({(keywords as string[]).length})
                        </h4>
                        <div className="flex flex-wrap gap-1 mb-4">
                          {(keywords as string[]).map((keyword, index) => (
                            <Badge key={index} variant="destructive" className="bg-red-100 text-red-800">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="job-keywords" className="space-y-4">
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                    {Object.entries(result.data.jobDescription.categoryDistribution).map(([category, count]) => (
                      <div key={category} className="text-center p-2 bg-muted rounded">
                        <div className="font-bold">{count as number}</div>
                        <div className="text-xs capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-3">
                    {Object.entries(result.data.jobDescription.keywords).map(([category, keywords]) => (
                      <div key={category}>
                        <h4 className="font-medium capitalize mb-2">
                          {category.replace(/([A-Z])/g, ' $1').trim()} ({(keywords as string[]).length})
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {(keywords as string[]).map((keyword, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="resume-keywords" className="space-y-4">
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                    {Object.entries(result.data.resume.categoryDistribution).map(([category, count]) => (
                      <div key={category} className="text-center p-2 bg-muted rounded">
                        <div className="font-bold">{count as number}</div>
                        <div className="text-xs capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-3">
                    {Object.entries(result.data.resume.keywords).map(([category, keywords]) => (
                      <div key={category}>
                        <h4 className="font-medium capitalize mb-2">
                          {category.replace(/([A-Z])/g, ' $1').trim()} ({(keywords as string[]).length})
                        </h4>
                        <div className="flex flex-wrap gap-1">
                          {(keywords as string[]).map((keyword, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {result.error || 'Failed to scan resume'}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

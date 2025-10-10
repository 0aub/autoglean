import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { UploadCloud, Play, File, Zap, Map, Calendar, Home, Search, Circle, LucideIcon, Copy, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Extractor, ExtractedResult } from "@/types/extractor";
import { uploadFile, startExtraction, pollTaskStatus } from "@/services/api";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Icon mapping for lucide icons
const iconMap: Record<string, LucideIcon> = {
  Map,
  Calendar,
  Home,
  File,
  Search,
  Circle,
};

interface ExtractorViewProps {
  extractor: Extractor;
}

export const ExtractorView = ({ extractor }: ExtractorViewProps) => {
  const { t } = useLanguage();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ExtractedResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingFile, setCurrentProcessingFile] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(0);
  const [filePreviewContent, setFilePreviewContent] = useState<string>('');

  const IconComponent = iconMap[extractor.icon] || File;

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isProcessing) return; // Lock during processing
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  }, [isProcessing]);

  const copyAsText = (content: string) => {
    // Remove markdown formatting
    const text = content
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*/g, '') // Remove bold
      .replace(/\*/g, '') // Remove italic
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links, keep text
      .replace(/`{1,3}[^`]*`{1,3}/g, '') // Remove code blocks
      .replace(/^\s*[-*+]\s/gm, '') // Remove list markers
      .replace(/^\s*\d+\.\s/gm, ''); // Remove numbered lists

    navigator.clipboard.writeText(text);
    toast.success('Copied as text!');
  };

  const copyAsMarkdown = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied as markdown!');
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isProcessing) return; // Lock during processing
    const files = Array.from(e.dataTransfer.files);
    setUploadedFiles(prev => [...prev, ...files]);
  }, [isProcessing]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve(content);
      };
      reader.onerror = reject;

      // Check if it's an image
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        // For PDFs, return a message instead of trying to read as text
        resolve('PDF Document\n\nPreview not available for PDF files.\nPlease see the extraction results on the right.');
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handleExtract = async () => {
    setIsProcessing(true);

    try {
      // Process each uploaded file
      for (const file of uploadedFiles) {
        setCurrentProcessingFile(file.name);
        setProcessingStatus('Reading file...');

        // Read the original file content for preview
        const originalContent = await readFileContent(file);

        setProcessingStatus('Uploading...');

        // Upload file
        const uploadResponse = await uploadFile(file);
        const jobId = uploadResponse.job_id;

        setProcessingStatus('Starting extraction...');

        // Start extraction task
        const extractionResponse = await startExtraction(
          jobId,
          extractor.id || 'coordinates'
        );

        setProcessingStatus('Processing document...');

        // Poll for completion
        const taskResult = await pollTaskStatus(extractionResponse.task_id);

        if (taskResult.status === 'success' && taskResult.result) {
          // Check if extraction was successful or failed
          if (taskResult.result.status === 'completed' && taskResult.result.result) {
            const extractedData = taskResult.result.result;

            const newResult: ExtractedResult = {
              id: taskResult.task_id,
              fileName: extractedData.file_name,
              content: extractedData.result_content,
              extractedAt: new Date(),
              originalContent: originalContent,
              fileType: file.type,
              jobId: jobId,
            };

            setResults(prev => [newResult, ...prev]);

            // Load the first result's content into preview
            if (results.length === 0) {
              setFilePreviewContent(originalContent);
            }

            setProcessingStatus('Completed!');
          } else if (taskResult.result.status === 'failed') {
            setProcessingStatus(`Failed: ${taskResult.result.error}`);
            toast.error(`Extraction failed for ${file.name}: ${taskResult.result.error}`);
          }
        } else if (taskResult.status === 'failure') {
          setProcessingStatus(`Failed: ${taskResult.error || 'Unknown error'}`);
          toast.error(`Extraction failed: ${taskResult.error || 'Unknown error'}`);
        }

        // Small delay before next file
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setUploadedFiles([]);
    } catch (error) {
      console.error('Extraction error:', error);
      setProcessingStatus('Error occurred');
      toast.error('Extraction failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setCurrentProcessingFile(null);
      setProcessingStatus('');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-8 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-soft">
            <IconComponent className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground mb-2">{extractor.name}</h1>
            {extractor.description && (
              <p className="text-muted-foreground">{extractor.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content - Two Column Layout */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-8">
        <div className="max-w-7xl mx-auto">
          {results.length === 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Section */}
              <div className="flex flex-col">
              <>
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-6">
                  <UploadCloud className="h-5 w-5 text-muted-foreground" />
                  {t('uploadDocuments')}
                </h2>

                {/* Upload Area */}
                <Card
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className={cn(
                    "border-2 border-dashed transition-colors h-96",
                    isProcessing ? "opacity-50 cursor-not-allowed" : "hover:border-primary hover:bg-accent/50",
                    uploadedFiles.length > 0 ? "border-primary bg-accent/30" : "border-border"
                  )}
                >
                  <label className={cn("h-full flex items-center justify-center p-12", isProcessing ? "cursor-not-allowed" : "cursor-pointer")}>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                      disabled={isProcessing}
                    />
                    <div className="flex flex-col items-center text-center">
                      {isProcessing ? (
                        <Loader2 className="h-12 w-12 text-muted-foreground mb-4 animate-spin" />
                      ) : (
                        <UploadCloud className="h-12 w-12 text-muted-foreground mb-4" />
                      )}
                      <p className="text-lg font-medium text-foreground mb-2">
                        {isProcessing ? 'Processing...' : t('uploadDocuments')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isProcessing ? 'Please wait until processing completes' : t('dragOrClick')}
                      </p>
                    </div>
                  </label>
                </Card>

                {/* Processing Status - Show inline in upload area when processing */}
                {isProcessing && currentProcessingFile && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-blue-900 dark:text-blue-100">{currentProcessingFile}</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">{processingStatus}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Uploaded Files List - Show count only */}
                {uploadedFiles.length > 0 && !isProcessing && (
                  <div className="mt-4">
                    <Button
                      onClick={handleExtract}
                      disabled={isProcessing}
                      className="w-full bg-gradient-primary hover:opacity-90 shadow-soft"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Extract {uploadedFiles.length} {uploadedFiles.length === 1 ? 'File' : 'Files'}
                    </Button>
                  </div>
                )}
              </>
              </div>
              {/* Results Section - Empty State */}
              <div className="flex flex-col">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-6">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                  {t('results')}
                </h2>
                <Card className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('noResults')}</p>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {results.map((result) => (
                <div key={result.id} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* File Preview */}
                  <Card className="overflow-hidden">
                    <div className="p-4 border-b border-border bg-accent/30">
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-sm text-foreground">{result.fileName}</h3>
                      </div>
                    </div>
                    <div className="p-6 h-96 overflow-auto">
                      {result.fileType?.startsWith('image/') ? (
                        <div className="flex items-center justify-center h-full">
                          <img
                            src={result.originalContent}
                            alt={result.fileName}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      ) : result.originalContent?.startsWith('PDF Document') ? (
                        <object
                          data={`http://localhost:8001/api/files/${result.jobId}/${result.fileName}`}
                          type="application/pdf"
                          className="w-full h-full"
                        >
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center text-muted-foreground">
                              <File className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <p className="font-semibold text-lg mb-2">PDF Document</p>
                              <p className="text-sm mb-4">{result.fileName}</p>
                              <a
                                href={`http://localhost:8001/api/files/${result.jobId}/${result.fileName}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                Download PDF
                              </a>
                            </div>
                          </div>
                        </object>
                      ) : (
                        <pre className="whitespace-pre-wrap text-xs bg-accent/50 p-4 rounded font-mono h-full overflow-auto">
                          {result.originalContent || 'Loading file content...'}
                        </pre>
                      )}
                    </div>
                  </Card>

                  {/* Extraction Result */}
                  <Card className="overflow-hidden">
                    <div className="p-4 border-b border-border bg-accent/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold text-sm text-foreground">Extraction Result</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyAsText(result.content)}
                            className="h-7 rounded-sm"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Copy Text
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyAsMarkdown(result.content)}
                            className="h-7 rounded-sm"
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy MD
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 h-96 overflow-auto">
                      <div className="text-sm text-foreground bg-accent/50 p-6 rounded-lg prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {result.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

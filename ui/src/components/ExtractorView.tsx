import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { UploadCloud, Play, File, Zap, Map, Calendar, Home, Search, Circle, LucideIcon, Copy, FileText, Loader2, Lock, Share2, Star, History, CheckCircle, Clock, Folder, Database, Settings, Users, BarChart, Layers, Package, Globe, Book, Briefcase, ClipboardList, Mail, Phone, MapPin, Tag, Archive, ThumbsUp, TrendingUp, Activity, Award, Target, Flag, CheckSquare, Filter, Compass, Navigation, Bell, Bookmark, Box, Camera, Cast, ChevronRight, Cloud, Code, Coffee, CreditCard, DollarSign, Download, Droplet, Edit, Eye, Facebook, FileCheck, Film, Flame, Gift, Headphones, Image, Instagram, Key, Link, MessageCircle, Mic, Monitor, Moon, Music, PenTool, Percent, Printer, Radio, Repeat, Save, Send, Server, Shield, ShoppingBag, ShoppingCart, Shuffle, Smartphone, Speaker, Sun, Thermometer, Trash, Truck, Tv, Twitter, Umbrella, Upload, User, Video, Wifi, Wind, Youtube, Anchor, Atom, Battery, Bluetooth, Calculator, ChevronDown, Clipboard, CloudRain, Cpu, Disc, Feather, FileVideo, Fingerprint, Flashlight, FolderOpen, Gamepad2, HardDrive, Hash, Headset, HelpCircle, Laptop, Lightbulb, Medal, Menu, MessageSquare, Paperclip, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Extractor, ExtractedResult } from "@/types/extractor";
import { uploadFile, startExtraction, pollTaskStatus } from "@/services/api";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ShareExtractorDialog } from "./ShareExtractorDialog";
import { ApiExportDialog } from "./ApiExportDialog";
import { RateExtractorDialog } from "./RateExtractorDialog";
import { VersionHistoryDialog } from "./VersionHistoryDialog";
import { getCachedResult, setCachedResult } from "@/lib/cache";

// Icon mapping for lucide icons
const iconMap: Record<string, LucideIcon> = {
  Map, Calendar, Home, File, Search, Circle, FileText, Folder, Database, Settings, Users, BarChart, Zap, Layers, Package, Globe, Book, Briefcase, ClipboardList, Mail, Phone, MapPin, Clock, Tag, Archive, Star, Heart: Star, ThumbsUp, TrendingUp, Activity, Award, Target, Flag, CheckSquare, Filter, Share2, Compass, Navigation, Bell, Bookmark, Box, Camera, Cast, ChevronRight, Cloud, Code, Coffee, Copy, CreditCard, DollarSign, Download, Droplet, Edit, Eye, Facebook, FileCheck, Film, Flame, Gift, Headphones, Image, Instagram, Key, Link, Lock, MessageCircle, Mic, Monitor, Moon, Music, PenTool, Percent, Play, Printer, Radio, Repeat, Save, Send, Server, Shield, ShoppingBag, ShoppingCart, Shuffle, Smartphone, Speaker, Sun, Thermometer, Trash, Truck, Tv, Twitter, Umbrella, Upload, User, Video, Wifi, Wind, Youtube, Anchor, Atom, Battery, Bluetooth, Calculator, CheckCircle, ChevronDown, Clipboard, CloudRain, Cpu, Disc, Feather, FileVideo, Fingerprint, Flashlight, FolderOpen, Gamepad2, HardDrive, Hash, Headset, HelpCircle, Laptop, Lightbulb, Medal, Menu, MessageSquare, Paperclip, PieChart,
};

interface ExtractorViewProps {
  extractor: Extractor;
}

export const ExtractorView = ({ extractor }: ExtractorViewProps) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [results, setResults] = useState<ExtractedResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingFile, setCurrentProcessingFile] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [fileProgressMap, setFileProgressMap] = useState<Record<string, { status: string, isProcessing: boolean, isComplete: boolean }>>({});
  const [selectedResultIndex, setSelectedResultIndex] = useState<number>(0);
  const [filePreviewContent, setFilePreviewContent] = useState<string>('');
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isApiExportDialogOpen, setIsApiExportDialogOpen] = useState(false);
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  const IconComponent = iconMap[extractor.icon] || File;

  // Check if current user owns this extractor
  const isOwner = user?.id === extractor.owner_id;

  // Check if user can rate (only public extractors that user doesn't own)
  const canRate = extractor.visibility === 'public' && !isOwner;

  // Check if history should be shown (public extractors)
  const showHistory = extractor.visibility === 'public';

  // Get display names based on language
  const displayName = language === 'en' ? extractor.name_en : extractor.name_ar;
  const displayDescription = language === 'en' ? extractor.description_en : extractor.description_ar;
  const ownerName = language === 'en' ? extractor.owner_name_en : extractor.owner_name_ar;
  const ownerDepartment = language === 'en' ? extractor.owner_department_name_en : extractor.owner_department_name_ar;
  const ownerGM = language === 'en' ? extractor.owner_gm_name_en : extractor.owner_gm_name_ar;

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (isProcessing) return; // Lock during processing
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  }, [isProcessing]);

  const copyAsText = (content: string) => {
    // Remove markdown formatting
    const text = content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks (triple backticks)
      .replace(/`[^`]+`/g, '') // Remove inline code
      .replace(/#{1,6}\s+/g, '') // Remove headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold, keep text
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic, keep text
      .replace(/_([^_]+)_/g, '$1') // Remove italic underscore, keep text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove links, keep text
      .replace(/^\s*[-*+]\s+/gm, '') // Remove list markers
      .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered lists
      .replace(/^\s*>\s+/gm, '') // Remove blockquotes
      .replace(/---+/g, '') // Remove horizontal rules
      .replace(/\n{3,}/g, '\n\n'); // Normalize multiple newlines

    navigator.clipboard.writeText(text.trim());
    toast.success(language === 'en' ? 'Copied as text!' : 'تم النسخ كنص!');
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

    // Initialize progress for all files
    const initialProgress: Record<string, { status: string, isProcessing: boolean, isComplete: boolean }> = {};
    uploadedFiles.forEach(file => {
      initialProgress[file.name] = {
        status: language === 'en' ? 'Waiting...' : 'في الانتظار...',
        isProcessing: false,
        isComplete: false
      };
    });
    setFileProgressMap(initialProgress);

    try {
      // Process each uploaded file
      for (const file of uploadedFiles) {
        setCurrentProcessingFile(file.name);
        setFileProgressMap(prev => ({
          ...prev,
          [file.name]: { status: language === 'en' ? 'Checking cache...' : 'فحص ذاكرة التخزين المؤقت...', isProcessing: true, isComplete: false }
        }));
        setProcessingStatus(language === 'en' ? 'Checking cache...' : 'فحص ذاكرة التخزين المؤقت...');

        // Read the original file content for preview
        const originalContent = await readFileContent(file);

        // Check if we have a cached result for this file + extractor combination
        const cachedResult = await getCachedResult(
          file,
          extractor.extractor_id,
          extractor.updated_at
        );

        if (cachedResult) {
          // Use cached result BUT still create job record for activity tracking
          setFileProgressMap(prev => ({
            ...prev,
            [file.name]: { status: language === 'en' ? 'Using cached result...' : 'استخدام النتيجة المخزنة...', isProcessing: true, isComplete: false }
          }));
          setProcessingStatus(language === 'en' ? 'Using cached result...' : 'استخدام النتيجة المخزنة...');

          // Upload file and create extraction job to track activity
          const uploadResponse = await uploadFile(file);
          const jobId = uploadResponse.job_id;

          // Start extraction (backend will use cache and create job record)
          const extractionResponse = await startExtraction(
            jobId,
            extractor.extractor_id
          );

          // Poll for completion (should be instant since backend uses cache)
          await pollTaskStatus(extractionResponse.task_id);

          // Display the cached result immediately
          const newResult: ExtractedResult = {
            id: extractionResponse.task_id,
            fileName: file.name,
            content: cachedResult.result_content,
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

          setFileProgressMap(prev => ({
            ...prev,
            [file.name]: { status: language === 'en' ? '✓ Completed (cached)' : '✓ مكتمل (مخزن)', isProcessing: false, isComplete: true }
          }));
          setProcessingStatus(language === 'en' ? 'Completed (cached)!' : 'مكتمل (مخزن)!');
          toast.success(language === 'en' ? `Loaded cached result for ${file.name}` : `تم تحميل النتيجة المخزنة لـ ${file.name}`);

          // Small delay before next file
          await new Promise(resolve => setTimeout(resolve, 300));
          continue;
        }

        // Cache miss - proceed with extraction
        setFileProgressMap(prev => ({
          ...prev,
          [file.name]: { status: language === 'en' ? 'Uploading...' : 'جاري الرفع...', isProcessing: true, isComplete: false }
        }));
        setProcessingStatus(language === 'en' ? 'Uploading...' : 'جاري الرفع...');

        // Upload file
        const uploadResponse = await uploadFile(file);
        const jobId = uploadResponse.job_id;

        setFileProgressMap(prev => ({
          ...prev,
          [file.name]: { status: language === 'en' ? 'Starting extraction...' : 'بدء الاستخراج...', isProcessing: true, isComplete: false }
        }));
        setProcessingStatus(language === 'en' ? 'Starting extraction...' : 'بدء الاستخراج...');

        // Start extraction task
        const extractionResponse = await startExtraction(
          jobId,
          extractor.extractor_id
        );

        setFileProgressMap(prev => ({
          ...prev,
          [file.name]: { status: language === 'en' ? 'Processing document...' : 'معالجة المستند...', isProcessing: true, isComplete: false }
        }));
        setProcessingStatus(language === 'en' ? 'Processing document...' : 'معالجة المستند...');

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

            // Cache the successful result
            await setCachedResult(
              file,
              extractor.extractor_id,
              extractor.updated_at,
              extractedData,
              taskResult.task_id
            );

            setFileProgressMap(prev => ({
              ...prev,
              [file.name]: { status: language === 'en' ? '✓ Completed' : '✓ مكتمل', isProcessing: false, isComplete: true }
            }));
            setProcessingStatus(language === 'en' ? 'Completed!' : 'مكتمل!');
          } else if (taskResult.result.status === 'failed') {
            setFileProgressMap(prev => ({
              ...prev,
              [file.name]: { status: language === 'en' ? `✗ Failed: ${taskResult.result.error}` : `✗ فشل: ${taskResult.result.error}`, isProcessing: false, isComplete: false }
            }));
            setProcessingStatus(language === 'en' ? `Failed: ${taskResult.result.error}` : `فشل: ${taskResult.result.error}`);
            toast.error(language === 'en' ? `Extraction failed for ${file.name}: ${taskResult.result.error}` : `فشل الاستخراج لـ ${file.name}: ${taskResult.result.error}`);
          }
        } else if (taskResult.status === 'failure') {
          setFileProgressMap(prev => ({
            ...prev,
            [file.name]: { status: language === 'en' ? `✗ Failed: ${taskResult.error || 'Unknown error'}` : `✗ فشل: ${taskResult.error || 'خطأ غير معروف'}`, isProcessing: false, isComplete: false }
          }));
          setProcessingStatus(language === 'en' ? `Failed: ${taskResult.error || 'Unknown error'}` : `فشل: ${taskResult.error || 'خطأ غير معروف'}`);
          toast.error(language === 'en' ? `Extraction failed: ${taskResult.error || 'Unknown error'}` : `فشل الاستخراج: ${taskResult.error || 'خطأ غير معروف'}`);
        }

        // Small delay before next file
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setUploadedFiles([]);
    } catch (error) {
      console.error('Extraction error:', error);
      setProcessingStatus(language === 'en' ? 'Error occurred' : 'حدث خطأ');
      toast.error(language === 'en' ? 'Extraction failed. Please try again.' : 'فشل الاستخراج. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessing(false);
      setCurrentProcessingFile(null);
      setProcessingStatus('');
      // Clear progress map after a delay so user can see final status
      setTimeout(() => setFileProgressMap({}), 2000);
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
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground mb-2">{displayName}</h1>
                {displayDescription && (
                  <p className="text-muted-foreground mb-2">{displayDescription}</p>
                )}
                {/* Visibility Badges - Show visibility and ownership with colored badges */}
                <div className="mt-2 flex gap-2">
                  {/* Visibility badge with color styling */}
                  {extractor.visibility === 'public' && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 text-green-800 dark:text-green-200">
                      {language === 'en' ? 'Public' : 'عام'}
                    </span>
                  )}
                  {extractor.visibility === 'private' && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-900/30 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-gray-200">
                      {language === 'en' ? 'Private' : 'خاص'}
                    </span>
                  )}
                  {extractor.visibility === 'shared' && (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200">
                      {language === 'en' ? 'Shared' : 'مشترك'}
                    </span>
                  )}
                  {/* Ownership badge */}
                  {isOwner ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200">
                      {language === 'en' ? 'By me' : 'بواسطتي'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-teal-100 dark:bg-teal-900/30 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200">
                      {extractor.visibility === 'shared'
                        ? (language === 'en' ? 'Shared with you' : 'مشترك معك')
                        : (language === 'en' ? 'By others' : 'من الآخرين')
                      }
                    </span>
                  )}
                </div>
                {!isOwner && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    <p className="font-medium">{language === 'en' ? 'Created by:' : 'أنشئ بواسطة:'} {ownerName}</p>
                    {ownerDepartment && (
                      <p>{language === 'en' ? 'Department:' : 'القسم:'} {ownerDepartment}</p>
                    )}
                    {ownerGM && (
                      <p>{language === 'en' ? 'General Management:' : 'الإدارة العامة:'} {ownerGM}</p>
                    )}
                  </div>
                )}
              </div>
              {/* Action Buttons */}
              <div className="flex gap-2">
                {isOwner && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsShareDialogOpen(true)}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      {language === 'en' ? 'Share' : 'مشاركة'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsApiExportDialogOpen(true)}
                    >
                      <Code className="h-4 w-4 mr-2" />
                      {language === 'en' ? 'API Export' : 'تصدير API'}
                    </Button>
                  </>
                )}
                {showHistory && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsHistoryDialogOpen(true)}
                  >
                    <History className="h-4 w-4 mr-2" />
                    {language === 'en' ? 'History' : 'السجل'}
                  </Button>
                )}
                {canRate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsRateDialogOpen(true)}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    {language === 'en' ? 'Rate' : 'تقييم'}
                  </Button>
                )}
                {extractor.visibility === 'public' && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-accent/50 rounded-md">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">
                      {extractor.rating_avg ? extractor.rating_avg.toFixed(1) : 'N/A'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({extractor.rating_count})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      {isOwner && (
        <ShareExtractorDialog
          open={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
          extractorId={Number(extractor.id)}
          extractorName={displayName}
          currentVisibility={extractor.visibility}
          onVisibilityChange={() => window.location.reload()}
        />
      )}

      {/* API Export Dialog */}
      {isOwner && (
        <ApiExportDialog
          open={isApiExportDialogOpen}
          onOpenChange={setIsApiExportDialogOpen}
          extractorId={Number(extractor.id)}
          extractorName={displayName}
        />
      )}

      {/* Rate Dialog */}
      {canRate && (
        <RateExtractorDialog
          open={isRateDialogOpen}
          onOpenChange={setIsRateDialogOpen}
          extractorId={Number(extractor.id)}
          extractorName={displayName}
        />
      )}

      {/* Version History Dialog */}
      {showHistory && (
        <VersionHistoryDialog
          open={isHistoryDialogOpen}
          onOpenChange={setIsHistoryDialogOpen}
          extractorId={Number(extractor.id)}
          extractorName={displayName}
        />
      )}


      {/* Content - Two Column Layout */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-8">
        <div className="max-w-7xl mx-auto">
          {(results.length === 0 || isProcessing) ? (
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
                        {isProcessing ? (language === 'en' ? 'Processing...' : 'جاري المعالجة...') : t('uploadDocuments')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isProcessing ? (language === 'en' ? 'Please wait until processing completes' : 'الرجاء الانتظار حتى تكتمل المعالجة') : t('dragOrClick')}
                      </p>
                    </div>
                  </label>
                </Card>

                {/* Processing Status - Show list of all files with individual progress */}
                {Object.keys(fileProgressMap).length > 0 && (
                  <div className="mt-4 space-y-2">
                    {Object.entries(fileProgressMap).map(([fileName, progress]) => (
                      <div
                        key={fileName}
                        className={`p-3 rounded-lg border ${
                          progress.isComplete
                            ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                            : progress.isProcessing
                            ? 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {progress.isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          ) : progress.isComplete ? (
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                          ) : (
                            <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate text-foreground">{fileName}</p>
                            <p className={`text-xs ${
                              progress.isComplete
                                ? 'text-green-700 dark:text-green-300'
                                : progress.isProcessing
                                ? 'text-blue-700 dark:text-blue-300'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>{progress.status}</p>
                          </div>
                        </div>
                      </div>
                    ))}
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
                      {language === 'en'
                        ? `Extract ${uploadedFiles.length} ${uploadedFiles.length === 1 ? 'File' : 'Files'}`
                        : `استخراج ${uploadedFiles.length} ${uploadedFiles.length === 1 ? 'ملف' : 'ملفات'}`
                      }
                    </Button>
                  </div>
                )}
              </>
              </div>
              {/* Results Section - Show completed results or empty state */}
              <div className="flex flex-col">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-6">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                  {t('results')}
                  {isProcessing && results.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ({results.length} {language === 'en' ? 'completed' : 'مكتمل'})
                    </span>
                  )}
                </h2>
                {results.length === 0 ? (
                  <Card className="h-96 flex items-center justify-center">
                    <div className="text-center">
                      <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">{t('noResults')}</p>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {results.map((result) => (
                      <Card key={result.id} className="overflow-hidden">
                        <div className="p-4 border-b border-border bg-accent/30">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <h3 className="font-semibold text-sm text-foreground">{result.fileName}</h3>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="text-sm text-muted-foreground line-clamp-3">
                            {result.content.substring(0, 150)}...
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
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

              {/* Try Another File Button */}
              <div className="mt-8 flex justify-center">
                <Button
                  size="lg"
                  onClick={() => setResults([])}
                  className="gap-2"
                >
                  <UploadCloud className="h-5 w-5" />
                  {language === 'en' ? 'Extract Another Document' : 'استخراج مستند آخر'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

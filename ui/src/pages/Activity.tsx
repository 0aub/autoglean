import { useEffect, useState } from 'react';
import { useLanguage, LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { FileText, Clock, CheckCircle, XCircle, Loader2, Eye, Download, ChevronLeft, ChevronRight, Copy, Calendar, Code } from 'lucide-react';
import { getMyJobs } from '@/services/api';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, addMonths, subMonths } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Job {
  id: number;
  job_id: string;
  user_id: number;
  user_name: string;
  extractor_id: number;
  extractor_name: string;
  file_name: string;
  status: string;
  result_text: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  cached_tokens: number | null;
  model_used: string | null;
  is_cached_result: boolean;
}

function ActivityContent() {
  const { language, direction } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [showCached, setShowCached] = useState(true);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tempStartDate, setTempStartDate] = useState<Date | null>(null);
  const [tempEndDate, setTempEndDate] = useState<Date | null>(null);

  useEffect(() => {
    loadJobs();
  }, [currentPage, itemsPerPage, dateFrom, dateTo, showCached]);

  const handleDateClick = (date: Date) => {
    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      // Start new selection
      setTempStartDate(date);
      setTempEndDate(null);
    } else {
      // Select end date
      if (date < tempStartDate) {
        // If end date is before start, swap them
        setTempEndDate(tempStartDate);
        setTempStartDate(date);
      } else {
        setTempEndDate(date);
      }
    }
  };

  const applyDateRange = () => {
    setDateFrom(tempStartDate);
    setDateTo(tempEndDate);
    setIsDatePickerOpen(false);
    setCurrentPage(1);
  };

  const clearDateRange = () => {
    setTempStartDate(null);
    setTempEndDate(null);
    setDateFrom(null);
    setDateTo(null);
    setCurrentPage(1);
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const getCalendarDays = () => {
    const days = getDaysInMonth();
    const startDay = days[0].getDay();
    const emptyDays = Array(startDay).fill(null);
    return [...emptyDays, ...days];
  };

  const isDayInRange = (day: Date) => {
    if (!tempStartDate || !tempEndDate) return false;
    return isWithinInterval(day, { start: tempStartDate, end: tempEndDate });
  };

  const isDaySelected = (day: Date) => {
    if (!tempStartDate) return false;
    if (isSameDay(day, tempStartDate)) return true;
    if (tempEndDate && isSameDay(day, tempEndDate)) return true;
    return false;
  };

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      const offset = (currentPage - 1) * itemsPerPage;
      const data = await getMyJobs(undefined, undefined, itemsPerPage, offset);

      // Apply filters on client side
      let filteredJobs = data.jobs;

      // Date range filter
      if (dateFrom || dateTo) {
        filteredJobs = filteredJobs.filter(job => {
          const jobDate = new Date(job.created_at);
          jobDate.setHours(0, 0, 0, 0);

          if (dateFrom && dateTo) {
            const fromDate = new Date(dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            return jobDate >= fromDate && jobDate <= toDate;
          } else if (dateFrom) {
            const fromDate = new Date(dateFrom);
            fromDate.setHours(0, 0, 0, 0);
            return jobDate >= fromDate;
          } else if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            return jobDate <= toDate;
          }
          return true;
        });
      }

      // Cached filter
      if (!showCached) {
        filteredJobs = filteredJobs.filter(job => !job.is_cached_result);
      }

      setJobs(filteredJobs);
      setTotal((dateFrom || dateTo || !showCached) ? filteredJobs.length : data.total);
    } catch (error) {
      console.error('Failed to load jobs:', error);
      toast.error('Failed to load activity history');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          {language === 'en' ? 'Completed' : 'مكتمل'}
        </Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          {language === 'en' ? 'Failed' : 'فشل'}
        </Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {language === 'en' ? 'Processing' : 'جاري المعالجة'}
        </Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
          {status}
        </Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);

    if (language === 'ar') {
      // Arabic with Gregorian calendar
      const arabicMonths = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];

      const day = date.getDate();
      const month = arabicMonths[date.getMonth()];
      const year = date.getFullYear();

      // 12-hour format with AM/PM
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'م' : 'ص'; // م for PM (مساءً), ص for AM (صباحاً)
      hours = hours % 12 || 12; // Convert to 12-hour format

      return `${day} ${month} ${year} • ${hours}:${minutes} ${ampm}`;
    }

    const formattedDate = date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const formattedTime = date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return `${formattedDate} • ${formattedTime}`;
  };

  const copyAsText = (content: string) => {
    const text = content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]+`/g, '')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/^\s*>\s+/gm, '')
      .replace(/---+/g, '')
      .replace(/\n{3,}/g, '\n\n');

    navigator.clipboard.writeText(text.trim());
    toast.success(language === 'en' ? 'Copied as text!' : 'تم النسخ كنص!');
  };

  const copyAsMarkdown = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success(language === 'en' ? 'Copied as markdown!' : 'تم النسخ كـ markdown!');
  };

  const downloadResult = (job: Job) => {
    if (!job.result_text) return;
    const blob = new Blob([job.result_text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job.file_name}_result.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="mt-4 text-muted-foreground">
              {language === 'en' ? 'Loading activity...' : 'جاري تحميل النشاط...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 overflow-auto p-6" dir={direction}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">
              {language === 'en' ? 'My Activity' : 'نشاطي'}
            </h1>
          </div>

          <Tabs defaultValue="extraction-jobs" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="extraction-jobs" className="gap-2">
                <FileText className="h-4 w-4" />
                {language === 'en' ? 'Extraction Jobs' : 'مهام الاستخراج'}
              </TabsTrigger>
              <TabsTrigger value="api-requests" className="gap-2">
                <Code className="h-4 w-4" />
                {language === 'en' ? 'My API Requests' : 'طلبات API الخاصة بي'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="extraction-jobs">
              <p className="text-muted-foreground mb-4">
                {language === 'en'
                  ? `${total} extraction jobs`
                  : `${total} عملية استخراج`}
              </p>

              {/* Filters and Pagination Controls */}
          <div className="mb-4 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4 items-center flex-wrap">
              {/* Date Range Filter */}
              <div className="flex gap-2 items-center">
                <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="relative">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsDatePickerOpen(!isDatePickerOpen);
                      if (!isDatePickerOpen) {
                        setTempStartDate(dateFrom);
                        setTempEndDate(dateTo);
                      }
                    }}
                    className="min-w-[220px] justify-start text-left font-normal"
                  >
                    {dateFrom && dateTo
                      ? `${format(dateFrom, 'MMM dd, yyyy')} ${language === 'en' ? 'to' : 'إلى'} ${format(dateTo, 'MMM dd, yyyy')}`
                      : language === 'en' ? 'Select date range' : 'اختر نطاق التاريخ'}
                  </Button>
                  {isDatePickerOpen && (
                    <div className="absolute top-full mt-2 z-50 bg-background border rounded-lg shadow-lg p-4 min-w-[320px]">
                      {/* Month navigation */}
                      <div className="flex items-center justify-between mb-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="font-medium">
                          {format(currentMonth, 'MMMM yyyy')}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Week days header */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                          <div key={day} className="text-center text-xs font-medium text-muted-foreground p-2">
                            {day}
                          </div>
                        ))}
                      </div>

                      {/* Calendar days */}
                      <div className="grid grid-cols-7 gap-1 mb-4">
                        {getCalendarDays().map((day, index) => {
                          if (!day) {
                            return <div key={`empty-${index}`} />;
                          }

                          const isSelected = isDaySelected(day);
                          const isInRange = isDayInRange(day);
                          const isCurrentMonth = isSameMonth(day, currentMonth);

                          return (
                            <button
                              key={day.toString()}
                              onClick={() => handleDateClick(day)}
                              disabled={!isCurrentMonth}
                              className={`
                                p-2 text-sm rounded transition-colors
                                ${!isCurrentMonth ? 'text-muted-foreground/30 cursor-not-allowed' : 'hover:bg-accent'}
                                ${isSelected ? 'bg-primary text-primary-foreground font-semibold' : ''}
                                ${isInRange && !isSelected ? 'bg-primary/20' : ''}
                              `}
                            >
                              {format(day, 'd')}
                            </button>
                          );
                        })}
                      </div>

                      {/* Selected range display */}
                      {tempStartDate && (
                        <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-xs">
                          {tempEndDate
                            ? `${format(tempStartDate, 'MMM dd, yyyy')} - ${format(tempEndDate, 'MMM dd, yyyy')}`
                            : `${format(tempStartDate, 'MMM dd, yyyy')} - ${language === 'en' ? 'Select end date' : 'اختر تاريخ النهاية'}`}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearDateRange}
                        >
                          {language === 'en' ? 'Clear' : 'مسح'}
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={applyDateRange}
                          disabled={!tempStartDate || !tempEndDate}
                        >
                          {language === 'en' ? 'Apply' : 'تطبيق'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                {(dateFrom || dateTo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearDateRange}
                  >
                    {language === 'en' ? 'Clear' : 'مسح'}
                  </Button>
                )}
              </div>

              {/* Cached Filter */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="show-cached"
                  checked={showCached}
                  onCheckedChange={(checked) => {
                    setShowCached(checked as boolean);
                    setCurrentPage(1);
                  }}
                />
                <Label
                  htmlFor="show-cached"
                  className="text-sm font-normal cursor-pointer"
                >
                  {language === 'en' ? 'Show cached results' : 'إظهار النتائج المخزنة'}
                </Label>
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {language === 'en' ? 'per page' : 'لكل صفحة'}
              </span>
            </div>
          </div>

          {jobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {language === 'en' ? 'No activity yet' : 'لا يوجد نشاط بعد'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <Card key={job.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4" dir={direction}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">
                          {getStatusIcon(job.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold truncate">
                              {job.file_name}
                            </h3>
                            {getStatusBadge(job.status)}
                            {job.is_cached_result && (
                              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                {language === 'en' ? '🔄 Cached Result' : '🔄 نتيجة مخزنة'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {language === 'en' ? 'Extractor:' : 'المستخرج:'} {job.extractor_name}
                          </p>
                          <p className="text-xs text-muted-foreground mb-1">
                            {language === 'en' ? 'ID:' : 'المعرف:'} <span className="font-mono">{job.id}</span>
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(job.created_at)}
                          </p>
                          {job.total_tokens && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {language === 'en' ? 'Tokens:' : 'الرموز:'} {job.total_tokens.toLocaleString()}
                              {job.cached_tokens && job.cached_tokens > 0 && (
                                <span className="text-green-600 dark:text-green-400 ml-1">
                                  ({job.cached_tokens.toLocaleString()} {language === 'en' ? 'cached' : 'مخزنة'})
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {job.status.toLowerCase() === 'completed' && job.result_text && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedJob(job)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {language === 'en' ? 'View' : 'عرض'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadResult(job)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              {language === 'en' ? 'Download' : 'تحميل'}
                            </Button>
                          </>
                        )}
                        {job.status.toLowerCase() === 'failed' && job.error_message && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedJob(job)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {language === 'en' ? 'View Error' : 'عرض الخطأ'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {total > itemsPerPage && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {language === 'en'
                  ? `Showing ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, total)} of ${total}`
                  : `عرض ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, total)} من ${total}`}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {language === 'en' ? 'Previous' : 'السابق'}
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.ceil(total / itemsPerPage)) }, (_, i) => {
                    const pageNum = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                    if (pageNum > Math.ceil(total / itemsPerPage)) return null;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(Math.ceil(total / itemsPerPage), prev + 1))}
                  disabled={currentPage >= Math.ceil(total / itemsPerPage)}
                >
                  {language === 'en' ? 'Next' : 'التالي'}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
      </TabsContent>

      <TabsContent value="api-requests">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Code className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {language === 'en' ? 'API Requests' : 'طلبات API'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {language === 'en'
                  ? 'View your requests made to other extractors via API'
                  : 'عرض طلباتك المرسلة إلى المستخرجات الأخرى عبر API'}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'en'
                  ? 'Coming soon...'
                  : 'قريباً...'}
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
      </div>

      {/* Result Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle>{selectedJob?.file_name}</DialogTitle>
                <DialogDescription>
                  {language === 'en' ? 'Extraction result' : 'نتيجة الاستخراج'}
                </DialogDescription>
              </div>
              {selectedJob?.result_text && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyAsText(selectedJob.result_text!)}
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    {language === 'en' ? 'Copy Text' : 'نسخ نص'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyAsMarkdown(selectedJob.result_text!)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    {language === 'en' ? 'Copy MD' : 'نسخ MD'}
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full">
            {selectedJob?.result_text ? (
              <div className="text-sm p-4 bg-accent rounded-md prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedJob.result_text}
                </ReactMarkdown>
              </div>
            ) : (
              <pre className="text-sm whitespace-pre-wrap p-4 bg-accent rounded-md text-red-600">
                {selectedJob?.error_message}
              </pre>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

export default function Activity() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ActivityContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

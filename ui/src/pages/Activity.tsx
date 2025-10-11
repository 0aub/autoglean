import { useEffect, useState } from 'react';
import { useLanguage, LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Header } from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Clock, CheckCircle, XCircle, Loader2, Eye, Download } from 'lucide-react';
import { getMyJobs } from '@/services/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
}

function ActivityContent() {
  const { language } = useLanguage();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const data = await getMyJobs();
      setJobs(data.jobs);
      setTotal(data.total);
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
    return date.toLocaleString(language === 'en' ? 'en-US' : 'ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">
              {language === 'en' ? 'My Activity' : 'نشاطي'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'en'
                ? `${total} extraction jobs`
                : `${total} عملية استخراج`}
            </p>
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
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-1">
                          {getStatusIcon(job.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">
                              {job.file_name}
                            </h3>
                            {getStatusBadge(job.status)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            {language === 'en' ? 'Extractor:' : 'المستخرج:'} {job.extractor_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDate(job.created_at)}
                          </p>
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
        </div>
      </div>

      {/* Result Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{selectedJob?.file_name}</DialogTitle>
            <DialogDescription>
              {language === 'en' ? 'Extraction result' : 'نتيجة الاستخراج'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] w-full">
            <pre className="text-sm whitespace-pre-wrap p-4 bg-accent rounded-md">
              {selectedJob?.result_text || selectedJob?.error_message}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
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

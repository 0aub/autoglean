import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAuthToken } from "@/services/auth";
import { toast } from "sonner";

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractorId: number;
  extractorName: string;
}

interface HistoryRecord {
  id: number;
  change_type: string;
  changed_by_user_name_en: string;
  changed_by_user_name_ar: string;
  changed_at: string;
  changes: {
    fields?: Record<string, { old: string; new: string }>;
    notes?: string;
  };
}

export const VersionHistoryDialog = ({
  open,
  onOpenChange,
  extractorId,
  extractorName,
}: VersionHistoryDialogProps) => {
  const { language } = useLanguage();
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open, extractorId]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8001'}/api/extractors/${extractorId}/history`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Failed to load version history:', error);
      toast.error(language === 'en' ? 'Failed to load version history' : 'فشل تحميل سجل الإصدارات');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

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

      return `${day} ${month} ${year}، ${hours}:${minutes} ${ampm}`;
    }

    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatFieldName = (fieldName: string) => {
    const fieldNames: Record<string, { en: string; ar: string }> = {
      name_en: { en: 'Name (English)', ar: 'الاسم (إنجليزي)' },
      name_ar: { en: 'Name (Arabic)', ar: 'الاسم (عربي)' },
      description_en: { en: 'Description (English)', ar: 'الوصف (إنجليزي)' },
      description_ar: { en: 'Description (Arabic)', ar: 'الوصف (عربي)' },
      prompt: { en: 'Prompt', ar: 'المطالبة' },
      icon: { en: 'Icon', ar: 'الأيقونة' },
      llm: { en: 'LLM Model', ar: 'نموذج اللغة' },
      temperature: { en: 'Temperature', ar: 'درجة الحرارة' },
      max_tokens: { en: 'Max Tokens', ar: 'الحد الأقصى للرموز' },
      output_format: { en: 'Output Format', ar: 'تنسيق الإخراج' },
      visibility: { en: 'Visibility', ar: 'الرؤية' },
    };

    return fieldNames[fieldName]?.[language] || fieldName;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {language === 'en' ? 'Version History' : 'سجل الإصدارات'}
          </DialogTitle>
          <DialogDescription>
            {language === 'en'
              ? `Change history for "${extractorName}"`
              : `سجل التغييرات لـ "${extractorName}"`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">
                {language === 'en' ? 'Loading...' : 'جاري التحميل...'}
              </p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">
                {language === 'en' ? 'No version history available' : 'لا يوجد سجل إصدارات متاح'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((record, index) => (
                <div
                  key={record.id}
                  className="relative border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
                >
                  {/* Timeline connector */}
                  {index < history.length - 1 && (
                    <div className="absolute left-8 top-12 bottom-0 w-px bg-border" />
                  )}

                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {record.change_type === 'updated'
                              ? language === 'en' ? 'Updated' : 'محدث'
                              : record.change_type === 'created'
                              ? language === 'en' ? 'Created' : 'تم الإنشاء'
                              : record.change_type}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <User className="h-3 w-3" />
                            <span>
                              {language === 'en'
                                ? record.changed_by_user_name_en
                                : record.changed_by_user_name_ar}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(record.changed_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Change Notes */}
                  {record.changes.notes && (
                    <div className="ml-11 mb-3 p-3 bg-blue-50 dark:bg-blue-950/30 border-l-2 border-blue-500 rounded">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                        {language === 'en' ? 'Change Notes:' : 'ملاحظات التغيير:'}
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        {record.changes.notes}
                      </p>
                    </div>
                  )}

                  {/* Field Changes */}
                  {record.changes.fields && Object.keys(record.changes.fields).length > 0 && (
                    <div className="ml-11 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        {language === 'en' ? 'Modified Fields:' : 'الحقول المعدلة:'}
                      </p>
                      {Object.entries(record.changes.fields).map(([field, change]) => (
                        <div key={field} className="text-xs space-y-1 pb-2 border-b last:border-b-0">
                          <p className="font-medium">{formatFieldName(field)}</p>
                          <div className="flex items-start gap-2">
                            <span className="text-red-600 dark:text-red-400 line-through flex-1 break-words">
                              {change.old || <em className="text-muted-foreground">(empty)</em>}
                            </span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-green-600 dark:text-green-400 flex-1 break-words">
                              {change.new || <em className="text-muted-foreground">(empty)</em>}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

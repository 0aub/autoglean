import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Key, Copy, Check, Code, BarChart3, RefreshCw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { getAuthToken } from "@/services/auth";

interface ApiExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractorId: number;
  extractorName: string;
}

interface ApiKeyData {
  api_key: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

export const ApiExportDialog = ({
  open,
  onOpenChange,
  extractorId,
  extractorName,
}: ApiExportDialogProps) => {
  const { language } = useLanguage();
  const [apiKeyData, setApiKeyData] = useState<ApiKeyData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load API key data when dialog opens
  useEffect(() => {
    if (open) {
      loadApiKey();
    }
  }, [open, extractorId]);

  const loadApiKey = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`http://localhost:8001/api/extractors/${extractorId}/api-export`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setApiKeyData(data);
      } else if (response.status === 404) {
        // No API key exists yet
        setApiKeyData(null);
      } else {
        throw new Error('Failed to load API key');
      }
    } catch (error) {
      console.error('Failed to load API key:', error);
      toast.error(language === 'en' ? 'Failed to load API key' : 'فشل في تحميل مفتاح API');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`http://localhost:8001/api/extractors/${extractorId}/api-export`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create API key');
      }

      const data = await response.json();
      await loadApiKey();
      toast.success(language === 'en' ? 'API key created successfully' : 'تم إنشاء مفتاح API بنجاح');
    } catch (error) {
      console.error('Failed to create API key:', error);
      toast.error(language === 'en' ? 'Failed to create API key' : 'فشل في إنشاء مفتاح API');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleActive = async (checked: boolean) => {
    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`http://localhost:8001/api/extractors/${extractorId}/api-export/toggle`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle API key');
      }

      await loadApiKey();
      toast.success(
        language === 'en'
          ? checked ? 'API activated' : 'API deactivated'
          : checked ? 'تم تفعيل API' : 'تم تعطيل API'
      );
    } catch (error) {
      console.error('Failed to toggle API key:', error);
      toast.error(language === 'en' ? 'Failed to toggle API' : 'فشل في تبديل API');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateKey = async () => {
    if (!confirm(language === 'en'
      ? 'Are you sure you want to regenerate the API key? The old key will stop working.'
      : 'هل أنت متأكد من تجديد مفتاح API؟ المفتاح القديم سيتوقف عن العمل.')) {
      return;
    }

    setIsLoading(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`http://localhost:8001/api/extractors/${extractorId}/api-export`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate API key');
      }

      await loadApiKey();
      toast.success(language === 'en' ? 'API key regenerated successfully' : 'تم تجديد مفتاح API بنجاح');
    } catch (error) {
      console.error('Failed to regenerate API key:', error);
      toast.error(language === 'en' ? 'Failed to regenerate API key' : 'فشل في تجديد مفتاح API');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyApiKey = () => {
    if (apiKeyData?.api_key) {
      navigator.clipboard.writeText(apiKeyData.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(language === 'en' ? 'API key copied' : 'تم نسخ مفتاح API');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {language === 'en' ? 'API Export' : 'تصدير API'}
          </DialogTitle>
          <DialogDescription>
            {language === 'en'
              ? `Export "${extractorName}" as an API`
              : `تصدير "${extractorName}" كـ API`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* API Key Status */}
          {apiKeyData ? (
            <>
              {/* Activation Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-accent/20">
                <div className="flex items-center gap-3">
                  <Key className="h-5 w-5 text-primary" />
                  <div>
                    <Label htmlFor="api-toggle" className="text-sm font-semibold cursor-pointer">
                      {language === 'en' ? 'API Status' : 'حالة API'}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {language === 'en'
                        ? apiKeyData.is_active ? 'API is active and accepting requests' : 'API is inactive'
                        : apiKeyData.is_active ? 'API نشط ويقبل الطلبات' : 'API غير نشط'}
                    </p>
                  </div>
                </div>
                <Switch
                  id="api-toggle"
                  checked={apiKeyData.is_active}
                  onCheckedChange={handleToggleActive}
                  disabled={isLoading}
                />
              </div>

              {/* API Key Display */}
              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  {language === 'en' ? 'API Key' : 'مفتاح API'}
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={apiKeyData.api_key}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyApiKey}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'en'
                    ? 'Keep this key secure. Anyone with this key can use your extractor.'
                    : 'احتفظ بهذا المفتاح آمناً. أي شخص لديه هذا المفتاح يمكنه استخدام المستخرج.'}
                </p>
              </div>

              {/* Usage Statistics */}
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                <BarChart3 className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <Label className="text-sm font-semibold">
                    {language === 'en' ? 'Total API Requests' : 'إجمالي طلبات API'}
                  </Label>
                  <p className="text-2xl font-bold">{apiKeyData.usage_count}</p>
                </div>
              </div>

              {/* Regenerate Key */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleRegenerateKey}
                  disabled={isLoading}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {language === 'en' ? 'Regenerate Key' : 'تجديد المفتاح'}
                </Button>
              </div>

              {/* API Documentation */}
              <div className="p-4 border rounded-lg bg-accent/10">
                <div className="flex items-center gap-2 mb-2">
                  <Code className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">
                    {language === 'en' ? 'How to Use' : 'كيفية الاستخدام'}
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  {language === 'en'
                    ? 'Send a POST request to:'
                    : 'أرسل طلب POST إلى:'}
                </p>
                <code className="block text-xs bg-muted p-2 rounded mb-2 break-all">
                  POST http://localhost:8001/api/v1/extract
                </code>
                <p className="text-xs text-muted-foreground mb-1">
                  {language === 'en' ? 'Required parameters:' : 'المعاملات المطلوبة:'}
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li><code>api_key</code>: {language === 'en' ? 'Your API key' : 'مفتاح API الخاص بك'}</li>
                  <li><code>user_id</code>: {language === 'en' ? 'Your user ID' : 'معرف المستخدم الخاص بك'}</li>
                  <li><code>label</code>: {language === 'en' ? 'Label for this request' : 'تسمية لهذا الطلب'}</li>
                  <li><code>file</code>: {language === 'en' ? 'The file to extract from' : 'الملف المراد استخراج البيانات منه'}</li>
                </ul>
              </div>
            </>
          ) : (
            /* No API Key Yet */
            <div className="text-center py-8">
              <Key className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">
                {language === 'en' ? 'No API Key Yet' : 'لا يوجد مفتاح API بعد'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {language === 'en'
                  ? 'Create an API key to export this extractor as an API'
                  : 'أنشئ مفتاح API لتصدير هذا المستخرج كـ API'}
              </p>
              <Button onClick={handleCreateApiKey} disabled={isLoading}>
                <Key className="h-4 w-4 mr-2" />
                {language === 'en' ? 'Create API Key' : 'إنشاء مفتاح API'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

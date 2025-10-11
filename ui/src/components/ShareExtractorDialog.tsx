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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { UserPlus, X, Search, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getUsers, shareExtractor, unshareExtractor, getExtractorShares, updateExtractor } from "@/services/api";
import { toast } from "sonner";

interface ShareExtractorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractorId: number;
  extractorName: string;
  currentVisibility: 'public' | 'private' | 'shared';
  onVisibilityChange?: () => void;
}

interface User {
  id: number;
  full_name_en: string;
  full_name_ar: string;
  email: string;
  department_id: number;
}

interface Share {
  id: number;
  extractor_id: number;
  shared_with_user_id: number;
  shared_with_user_name_en: string;
  shared_with_user_name_ar: string;
  can_edit: boolean;
  shared_at: string;
}

export const ShareExtractorDialog = ({
  open,
  onOpenChange,
  extractorId,
  extractorName,
  currentVisibility,
  onVisibilityChange,
}: ShareExtractorDialogProps) => {
  const { language } = useLanguage();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [sharedUsers, setSharedUsers] = useState<Share[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(currentVisibility === 'public');

  // Load users and shares when dialog opens
  useEffect(() => {
    if (open) {
      loadUsers();
      loadShares();
    }
  }, [open]);

  // Search users when search term changes
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        loadUsers(search);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [search, open]);

  const loadUsers = async (searchTerm?: string) => {
    try {
      const usersData = await getUsers(searchTerm);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
    }
  };

  const loadShares = async () => {
    try {
      const sharesData = await getExtractorShares(extractorId);
      setSharedUsers(sharesData);
    } catch (error) {
      console.error('Failed to load shares:', error);
      toast.error('Failed to load shared users');
    }
  };

  const handleShare = async (userId: number) => {
    setIsLoading(true);
    try {
      await shareExtractor(extractorId, userId);
      await loadShares();
      toast.success(language === 'en' ? 'Extractor shared successfully' : 'تم مشاركة المستخرج بنجاح');
    } catch (error) {
      console.error('Failed to share extractor:', error);
      toast.error(language === 'en' ? 'Failed to share extractor' : 'فشل في مشاركة المستخرج');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnshare = async (userId: number) => {
    setIsLoading(true);
    try {
      await unshareExtractor(extractorId, userId);
      await loadShares();
      toast.success(language === 'en' ? 'Share removed successfully' : 'تم إزالة المشاركة بنجاح');
    } catch (error) {
      console.error('Failed to unshare extractor:', error);
      toast.error(language === 'en' ? 'Failed to remove share' : 'فشل في إزالة المشاركة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePublic = async (checked: boolean) => {
    setIsLoading(true);
    try {
      const newVisibility = checked ? 'public' : (sharedUsers.length > 0 ? 'shared' : 'private');
      await updateExtractor(extractorId, { visibility: newVisibility });
      setIsPublic(checked);
      onVisibilityChange?.();
      toast.success(
        language === 'en'
          ? checked ? 'Extractor is now public' : 'Extractor is now private'
          : checked ? 'أصبح المستخرج عاماً' : 'أصبح المستخرج خاصاً'
      );
    } catch (error) {
      console.error('Failed to update visibility:', error);
      toast.error(language === 'en' ? 'Failed to update visibility' : 'فشل في تحديث الرؤية');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter out users who already have access
  const availableUsers = users.filter(
    (user) => !sharedUsers.some((share) => share.shared_with_user_id === user.id)
  );

  const isUserShared = (userId: number) => {
    return sharedUsers.some((share) => share.shared_with_user_id === userId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {language === 'en' ? 'Share Extractor' : 'مشاركة المستخرج'}
          </DialogTitle>
          <DialogDescription>
            {language === 'en'
              ? `Share "${extractorName}" with other users`
              : `مشاركة "${extractorName}" مع مستخدمين آخرين`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Make Public Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-accent/20">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="public-toggle" className="text-sm font-semibold cursor-pointer">
                  {language === 'en' ? 'Make Public' : 'جعله عاماً'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {language === 'en'
                    ? 'Everyone can view and use this extractor'
                    : 'يمكن للجميع عرض واستخدام هذا المستخرج'}
                </p>
              </div>
            </div>
            <Switch
              id="public-toggle"
              checked={isPublic}
              onCheckedChange={handleTogglePublic}
              disabled={isLoading}
            />
          </div>

          {/* Shared Users List */}
          {sharedUsers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">
                {language === 'en' ? 'Shared with' : 'مشترك مع'} ({sharedUsers.length})
              </h3>
              <ScrollArea className="h-32 border rounded-md p-2">
                {sharedUsers.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-2 hover:bg-accent rounded-md"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {language === 'en' ? share.shared_with_user_name_en : share.shared_with_user_name_ar}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnshare(share.shared_with_user_id)}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}

          {/* Search Users */}
          <div>
            <h3 className="text-sm font-semibold mb-2">
              {language === 'en' ? 'Add users' : 'إضافة مستخدمين'}
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'en' ? 'Search users...' : 'البحث عن مستخدمين...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Available Users List */}
          <ScrollArea className="h-64 border rounded-md p-2">
            {availableUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {language === 'en' ? 'No users found' : 'لم يتم العثور على مستخدمين'}
              </p>
            ) : (
              availableUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 hover:bg-accent rounded-md"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {language === 'en' ? user.full_name_en : user.full_name_ar}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare(user.id)}
                    disabled={isLoading || isUserShared(user.id)}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    {language === 'en' ? 'Share' : 'مشاركة'}
                  </Button>
                </div>
              ))
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

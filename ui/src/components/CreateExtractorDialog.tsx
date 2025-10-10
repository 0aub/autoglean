import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { File, Map, Calendar, Home, Search, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Extractor } from "@/types/extractor";

const ICON_OPTIONS = [
  { icon: 'Map', name: 'Map', component: Map },
  { icon: 'Calendar', name: 'Calendar', component: Calendar },
  { icon: 'Home', name: 'Building', component: Home },
  { icon: 'File', name: 'Document', component: File },
  { icon: 'Search', name: 'Search', component: Search },
  { icon: 'Circle', name: 'Scan', component: Circle },
];

interface CreateExtractorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (extractor: Omit<Extractor, 'id'>) => void;
  onDelete?: (id: string) => void;
  editingExtractor?: Extractor | null;
}

export const CreateExtractorDialog = ({
  open,
  onOpenChange,
  onSave,
  onDelete,
  editingExtractor,
}: CreateExtractorDialogProps) => {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0].icon);
  const [prompt, setPrompt] = useState("");
  const [description, setDescription] = useState("");

  // Populate form when editing
  useEffect(() => {
    if (editingExtractor) {
      setName(editingExtractor.name);
      setSelectedIcon(editingExtractor.icon);
      setPrompt(editingExtractor.prompt);
      setDescription(editingExtractor.description || "");
    } else {
      setName("");
      setSelectedIcon(ICON_OPTIONS[0].icon);
      setPrompt("");
      setDescription("");
    }
  }, [editingExtractor]);

  const handleSave = () => {
    if (!name.trim() || !prompt.trim()) return;
    
    onSave({
      name: name.trim(),
      icon: selectedIcon,
      prompt: prompt.trim(),
      description: description.trim() || undefined,
    });

    // Reset form
    setName("");
    setSelectedIcon(ICON_OPTIONS[0].icon);
    setPrompt("");
    setDescription("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setName("");
    setSelectedIcon(ICON_OPTIONS[0].icon);
    setPrompt("");
    setDescription("");
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (editingExtractor && onDelete) {
      onDelete(editingExtractor.id);
      setName("");
      setSelectedIcon(ICON_OPTIONS[0].icon);
      setPrompt("");
      setDescription("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {editingExtractor ? t('editExtractor') : t('createNewExtractor')}
          </DialogTitle>
          <DialogDescription>
            {t('extractorDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="name">{t('extractorName')}</Label>
            <Input
              id="name"
              placeholder={t('extractorNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="focus-visible:ring-primary"
            />
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>{t('selectIcon')}</Label>
            <div className="grid grid-cols-6 gap-2">
              {ICON_OPTIONS.map((option) => {
                const IconComponent = option.component;
                return (
                  <button
                    key={option.icon}
                    type="button"
                    onClick={() => setSelectedIcon(option.icon)}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all duration-200",
                      "hover:border-primary hover:bg-accent",
                      "focus:outline-none focus:ring-2 focus:ring-primary/50",
                      selectedIcon === option.icon
                        ? "border-primary bg-accent shadow-soft"
                        : "border-border bg-card"
                    )}
                    title={option.name}
                  >
                    <IconComponent className="h-5 w-5 mx-auto text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('description')} ({t('optional')})</Label>
            <Input
              id="description"
              placeholder={t('descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="focus-visible:ring-primary"
            />
          </div>

          {/* Prompt Input */}
          <div className="space-y-2">
            <Label htmlFor="prompt">{t('extractorPrompt')}</Label>
            <Textarea
              id="prompt"
              placeholder={t('promptPlaceholder')}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] focus-visible:ring-primary resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {editingExtractor && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="sm:mr-auto"
            >
              {t('delete')}
            </Button>
          )}
          <div className="flex gap-2 sm:ml-auto">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="border-border hover:bg-accent"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!name.trim() || !prompt.trim()}
              className="bg-gradient-primary hover:opacity-90 shadow-soft"
            >
              {t('save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

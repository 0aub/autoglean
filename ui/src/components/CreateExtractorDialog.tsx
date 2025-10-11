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
import { File, Map, Calendar, Home, Search, Circle, FileText, Folder, Database, Settings, Users, BarChart, Zap, Layers, Package, Globe, Book, Briefcase, ClipboardList, Mail, Phone, MapPin, Clock, Tag, Archive, Star, Heart, ThumbsUp, TrendingUp, Activity, Award, Target, Flag, CheckSquare, Filter, Share2, Compass, Navigation, Bell, Bookmark, Box, Camera, Cast, ChevronRight, Cloud, Code, Coffee, Copy, CreditCard, DollarSign, Download, Droplet, Edit, Eye, Facebook, FileCheck, Film, Flame, Gift, Headphones, Image, Instagram, Key, Link, Lock, MessageCircle, Mic, Monitor, Moon, Music, PenTool, Percent, Phone as PhoneCall, Play, Plus, Printer, Radio, Repeat, Save, Send, Server, Shield, ShoppingBag, ShoppingCart, Shuffle, Smartphone, Speaker, Sun, Thermometer, Trash, Truck, Tv, Twitter, Umbrella, Upload, User, Video, Wifi, Wind, Youtube, Anchor, Atom, Battery, Bluetooth, Calculator, CheckCircle, ChevronDown, Clipboard, CloudRain, Cpu, Disc, DollarSign as Dollar, Download as DownloadIcon, Feather, FileVideo, Fingerprint, Flashlight, FolderOpen, Gamepad2, HardDrive, Hash, Headset, HelpCircle, Laptop, Lightbulb, Medal, Menu, MessageSquare, Paperclip, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Extractor } from "@/types/extractor";

const ICON_OPTIONS = [
  { icon: 'Map', name: 'Map', component: Map },
  { icon: 'Calendar', name: 'Calendar', component: Calendar },
  { icon: 'Home', name: 'Building', component: Home },
  { icon: 'File', name: 'Document', component: File },
  { icon: 'Search', name: 'Search', component: Search },
  { icon: 'Circle', name: 'Scan', component: Circle },
  { icon: 'FileText', name: 'Text File', component: FileText },
  { icon: 'Folder', name: 'Folder', component: Folder },
  { icon: 'Database', name: 'Database', component: Database },
  { icon: 'Settings', name: 'Settings', component: Settings },
  { icon: 'Users', name: 'Users', component: Users },
  { icon: 'BarChart', name: 'Chart', component: BarChart },
  { icon: 'Zap', name: 'Lightning', component: Zap },
  { icon: 'Layers', name: 'Layers', component: Layers },
  { icon: 'Package', name: 'Package', component: Package },
  { icon: 'Globe', name: 'Globe', component: Globe },
  { icon: 'Book', name: 'Book', component: Book },
  { icon: 'Briefcase', name: 'Briefcase', component: Briefcase },
  { icon: 'ClipboardList', name: 'Clipboard', component: ClipboardList },
  { icon: 'Mail', name: 'Mail', component: Mail },
  { icon: 'Phone', name: 'Phone', component: Phone },
  { icon: 'MapPin', name: 'Location', component: MapPin },
  { icon: 'Clock', name: 'Clock', component: Clock },
  { icon: 'Tag', name: 'Tag', component: Tag },
  { icon: 'Archive', name: 'Archive', component: Archive },
  { icon: 'Star', name: 'Star', component: Star },
  { icon: 'Heart', name: 'Heart', component: Heart },
  { icon: 'ThumbsUp', name: 'Like', component: ThumbsUp },
  { icon: 'TrendingUp', name: 'Trending', component: TrendingUp },
  { icon: 'Activity', name: 'Activity', component: Activity },
  { icon: 'Award', name: 'Award', component: Award },
  { icon: 'Target', name: 'Target', component: Target },
  { icon: 'Flag', name: 'Flag', component: Flag },
  { icon: 'CheckSquare', name: 'Check', component: CheckSquare },
  { icon: 'Filter', name: 'Filter', component: Filter },
  { icon: 'Share2', name: 'Share', component: Share2 },
  { icon: 'Compass', name: 'Compass', component: Compass },
  { icon: 'Navigation', name: 'Navigation', component: Navigation },
  { icon: 'Bell', name: 'Bell', component: Bell },
  { icon: 'Bookmark', name: 'Bookmark', component: Bookmark },
  { icon: 'Box', name: 'Box', component: Box },
  { icon: 'Camera', name: 'Camera', component: Camera },
  { icon: 'Cast', name: 'Cast', component: Cast },
  { icon: 'ChevronRight', name: 'Arrow', component: ChevronRight },
  { icon: 'Cloud', name: 'Cloud', component: Cloud },
  { icon: 'Code', name: 'Code', component: Code },
  { icon: 'Coffee', name: 'Coffee', component: Coffee },
  { icon: 'Copy', name: 'Copy', component: Copy },
  { icon: 'CreditCard', name: 'Credit Card', component: CreditCard },
  { icon: 'DollarSign', name: 'Money', component: DollarSign },
  { icon: 'Download', name: 'Download', component: Download },
  { icon: 'Droplet', name: 'Water', component: Droplet },
  { icon: 'Edit', name: 'Edit', component: Edit },
  { icon: 'Eye', name: 'Eye', component: Eye },
  { icon: 'Facebook', name: 'Facebook', component: Facebook },
  { icon: 'FileCheck', name: 'File Check', component: FileCheck },
  { icon: 'Film', name: 'Film', component: Film },
  { icon: 'Flame', name: 'Fire', component: Flame },
  { icon: 'Gift', name: 'Gift', component: Gift },
  { icon: 'Headphones', name: 'Headphones', component: Headphones },
  { icon: 'Image', name: 'Image', component: Image },
  { icon: 'Instagram', name: 'Instagram', component: Instagram },
  { icon: 'Key', name: 'Key', component: Key },
  { icon: 'Link', name: 'Link', component: Link },
  { icon: 'Lock', name: 'Lock', component: Lock },
  { icon: 'MessageCircle', name: 'Message', component: MessageCircle },
  { icon: 'Mic', name: 'Microphone', component: Mic },
  { icon: 'Monitor', name: 'Monitor', component: Monitor },
  { icon: 'Moon', name: 'Moon', component: Moon },
  { icon: 'Music', name: 'Music', component: Music },
  { icon: 'PenTool', name: 'Pen', component: PenTool },
  { icon: 'Percent', name: 'Percent', component: Percent },
  { icon: 'Play', name: 'Play', component: Play },
  { icon: 'Plus', name: 'Plus', component: Plus },
  { icon: 'Printer', name: 'Printer', component: Printer },
  { icon: 'Radio', name: 'Radio', component: Radio },
  { icon: 'Repeat', name: 'Repeat', component: Repeat },
  { icon: 'Save', name: 'Save', component: Save },
  { icon: 'Send', name: 'Send', component: Send },
  { icon: 'Server', name: 'Server', component: Server },
  { icon: 'Shield', name: 'Shield', component: Shield },
  { icon: 'ShoppingBag', name: 'Shopping Bag', component: ShoppingBag },
  { icon: 'ShoppingCart', name: 'Cart', component: ShoppingCart },
  { icon: 'Shuffle', name: 'Shuffle', component: Shuffle },
  { icon: 'Smartphone', name: 'Phone', component: Smartphone },
  { icon: 'Speaker', name: 'Speaker', component: Speaker },
  { icon: 'Sun', name: 'Sun', component: Sun },
  { icon: 'Thermometer', name: 'Temperature', component: Thermometer },
  { icon: 'Trash', name: 'Trash', component: Trash },
  { icon: 'Truck', name: 'Truck', component: Truck },
  { icon: 'Tv', name: 'TV', component: Tv },
  { icon: 'Twitter', name: 'Twitter', component: Twitter },
  { icon: 'Umbrella', name: 'Umbrella', component: Umbrella },
  { icon: 'Upload', name: 'Upload', component: Upload },
  { icon: 'User', name: 'User', component: User },
  { icon: 'Video', name: 'Video', component: Video },
  { icon: 'Wifi', name: 'Wifi', component: Wifi },
  { icon: 'Wind', name: 'Wind', component: Wind },
  { icon: 'Youtube', name: 'Youtube', component: Youtube },
  { icon: 'Anchor', name: 'Anchor', component: Anchor },
  { icon: 'Atom', name: 'Atom', component: Atom },
  { icon: 'Battery', name: 'Battery', component: Battery },
  { icon: 'Bluetooth', name: 'Bluetooth', component: Bluetooth },
  { icon: 'Calculator', name: 'Calculator', component: Calculator },
  { icon: 'CheckCircle', name: 'Check Circle', component: CheckCircle },
  { icon: 'ChevronDown', name: 'Down', component: ChevronDown },
  { icon: 'Clipboard', name: 'Clipboard', component: Clipboard },
  { icon: 'CloudRain', name: 'Rain', component: CloudRain },
  { icon: 'Cpu', name: 'Processor', component: Cpu },
  { icon: 'Disc', name: 'Disc', component: Disc },
  { icon: 'Feather', name: 'Feather', component: Feather },
  { icon: 'FileVideo', name: 'Video File', component: FileVideo },
  { icon: 'Fingerprint', name: 'Fingerprint', component: Fingerprint },
  { icon: 'Flashlight', name: 'Flashlight', component: Flashlight },
  { icon: 'FolderOpen', name: 'Open Folder', component: FolderOpen },
  { icon: 'Gamepad2', name: 'Gaming', component: Gamepad2 },
  { icon: 'HardDrive', name: 'Hard Drive', component: HardDrive },
  { icon: 'Hash', name: 'Hash', component: Hash },
  { icon: 'Headset', name: 'Headset', component: Headset },
  { icon: 'HelpCircle', name: 'Help', component: HelpCircle },
  { icon: 'Laptop', name: 'Laptop', component: Laptop },
  { icon: 'Lightbulb', name: 'Idea', component: Lightbulb },
  { icon: 'Medal', name: 'Medal', component: Medal },
  { icon: 'Menu', name: 'Menu', component: Menu },
  { icon: 'MessageSquare', name: 'Chat', component: MessageSquare },
  { icon: 'Paperclip', name: 'Attachment', component: Paperclip },
  { icon: 'PieChart', name: 'Pie Chart', component: PieChart },
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
  const { t, language } = useLanguage();
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0].icon);
  const [prompt, setPrompt] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [changeNotes, setChangeNotes] = useState("");

  // Check if editing a public extractor (requires change notes)
  const isPublicExtractor = editingExtractor?.visibility === 'public';

  // Populate form when editing
  useEffect(() => {
    if (editingExtractor) {
      setNameEn(editingExtractor.name_en);
      setNameAr(editingExtractor.name_ar);
      setSelectedIcon(editingExtractor.icon);
      setPrompt(editingExtractor.prompt || "");
      setDescriptionEn(editingExtractor.description_en || "");
      setDescriptionAr(editingExtractor.description_ar || "");
      setChangeNotes("");
    } else {
      setNameEn("");
      setNameAr("");
      setSelectedIcon(ICON_OPTIONS[0].icon);
      setPrompt("");
      setDescriptionEn("");
      setDescriptionAr("");
      setChangeNotes("");
    }
  }, [editingExtractor]);

  const handleSave = () => {
    if (!nameEn.trim() || !nameAr.trim() || !prompt.trim()) return;

    // Require change notes for public extractors
    if (isPublicExtractor && !changeNotes.trim()) {
      return; // Will be handled by disabled state
    }

    const extractorData: any = {
      name_en: nameEn.trim(),
      name_ar: nameAr.trim(),
      icon: selectedIcon,
      prompt: prompt.trim(),
      description_en: descriptionEn.trim() || undefined,
      description_ar: descriptionAr.trim() || undefined,
    };

    // Add change notes if editing a public extractor
    if (isPublicExtractor && changeNotes.trim()) {
      extractorData.change_notes = changeNotes.trim();
    }

    onSave(extractorData as Omit<Extractor, 'id'>);

    // Reset form
    setNameEn("");
    setNameAr("");
    setSelectedIcon(ICON_OPTIONS[0].icon);
    setPrompt("");
    setDescriptionEn("");
    setDescriptionAr("");
    setChangeNotes("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setNameEn("");
    setNameAr("");
    setSelectedIcon(ICON_OPTIONS[0].icon);
    setPrompt("");
    setDescriptionEn("");
    setDescriptionAr("");
    setChangeNotes("");
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (editingExtractor && onDelete) {
      onDelete(editingExtractor.id);
      setNameEn("");
      setNameAr("");
      setSelectedIcon(ICON_OPTIONS[0].icon);
      setPrompt("");
      setDescriptionEn("");
      setDescriptionAr("");
      setChangeNotes("");
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
          {/* Name Inputs - Side by Side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name-en">{language === 'en' ? 'Name (English)' : 'الاسم (إنجليزي)'}</Label>
              <Input
                id="name-en"
                placeholder={language === 'en' ? 'English name' : 'الاسم بالإنجليزية'}
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name-ar">{language === 'en' ? 'Name (Arabic)' : 'الاسم (عربي)'}</Label>
              <Input
                id="name-ar"
                placeholder={language === 'en' ? 'Arabic name' : 'الاسم بالعربية'}
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className="focus-visible:ring-primary"
                dir="rtl"
              />
            </div>
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>{t('selectIcon')}</Label>
            <div className="max-h-[120px] overflow-y-auto border rounded-lg p-2">
              <div className="grid grid-cols-8 gap-2">
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
          </div>

          {/* Description Inputs - Side by Side with Textarea */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description-en">{language === 'en' ? 'Description (English) - Optional' : 'الوصف (إنجليزي) - اختياري'}</Label>
              <Textarea
                id="description-en"
                placeholder={language === 'en' ? 'Brief description' : 'وصف موجز'}
                value={descriptionEn}
                onChange={(e) => setDescriptionEn(e.target.value)}
                className="focus-visible:ring-primary resize-none h-20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description-ar">{language === 'en' ? 'Description (Arabic) - Optional' : 'الوصف (عربي) - اختياري'}</Label>
              <Textarea
                id="description-ar"
                placeholder={language === 'en' ? 'Brief description' : 'وصف موجز'}
                value={descriptionAr}
                onChange={(e) => setDescriptionAr(e.target.value)}
                className="focus-visible:ring-primary resize-none h-20"
                dir="rtl"
              />
            </div>
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

          {/* Change Notes - Required for Public Extractors */}
          {isPublicExtractor && (
            <div className="space-y-2">
              <Label htmlFor="change-notes" className="text-orange-600 dark:text-orange-400">
                {language === 'en' ? 'Change Notes (Required for Public Extractors)' : 'ملاحظات التغيير (مطلوبة للمستخرجات العامة)'}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Textarea
                id="change-notes"
                placeholder={language === 'en' ? 'Describe what changes you made to this public extractor...' : 'صف التغييرات التي أجريتها على هذا المستخرج العام...'}
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                className="min-h-[80px] focus-visible:ring-primary resize-none border-orange-300 dark:border-orange-700"
              />
              <p className="text-xs text-muted-foreground">
                {language === 'en'
                  ? 'Version history helps users understand changes to public extractors.'
                  : 'يساعد سجل الإصدارات المستخدمين على فهم التغييرات في المستخرجات العامة.'}
              </p>
            </div>
          )}
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
              disabled={
                !nameEn.trim() ||
                !nameAr.trim() ||
                !prompt.trim() ||
                (isPublicExtractor && !changeNotes.trim())
              }
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

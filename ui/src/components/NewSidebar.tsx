import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, ChevronDown, Heart, User, Users, Globe, Edit3, File, Map, Calendar, Home, Search, Circle, FileText, Folder, Database, Settings, BarChart, Zap, Layers, Package, Book, Briefcase, ClipboardList, Mail, Phone, MapPin, Clock, Tag, Archive, Star, ThumbsUp, TrendingUp, Activity, Award, Target, Flag, CheckSquare, Filter, Share2, Compass, Navigation, MoreVertical, Bell, Bookmark, Box, Camera, Cast, ChevronRight, Cloud, Code, Coffee, Copy, CreditCard, DollarSign, Download, Droplet, Edit, Eye, Facebook, FileCheck, Film, Flame, Gift, Headphones, Image, Instagram, Key, Link, Lock, MessageCircle, Mic, Monitor, Moon, Music, PenTool, Percent, Play, Printer, Radio, Repeat, Save, Send, Server, Shield, ShoppingBag, ShoppingCart, Shuffle, Smartphone, Speaker, Sun, Thermometer, Trash, Truck, Tv, Twitter, Umbrella, Upload, Video, Wifi, Wind, Youtube, Anchor, Atom, Battery, Bluetooth, Calculator, CheckCircle, ChevronDown as Down, Clipboard, CloudRain, Cpu, Disc, Feather, FileVideo, Fingerprint, Flashlight, FolderOpen, Gamepad2, HardDrive, Hash, Headset, HelpCircle, Laptop, Lightbulb, Medal, Menu, MessageSquare, Paperclip, PieChart, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { Extractor } from "@/types/extractor";

const iconMap: Record<string, LucideIcon> = {
  Map, Calendar, Home, File, Search, Circle, FileText, Folder, Database, Settings, Users, BarChart, Zap, Layers, Package, Globe, Book, Briefcase, ClipboardList, Mail, Phone, MapPin, Clock, Tag, Archive, Star, Heart, ThumbsUp, TrendingUp, Activity, Award, Target, Flag, CheckSquare, Filter, Share2, Compass, Navigation, Bell, Bookmark, Box, Camera, Cast, ChevronRight, Cloud, Code, Coffee, Copy, CreditCard, DollarSign, Download, Droplet, Edit, Eye, Facebook, FileCheck, Film, Flame, Gift, Headphones, Image, Instagram, Key, Link, Lock, MessageCircle, Mic, Monitor, Moon, Music, PenTool, Percent, Play, Plus, Printer, Radio, Repeat, Save, Send, Server, Shield, ShoppingBag, ShoppingCart, Shuffle, Smartphone, Speaker, Sun, Thermometer, Trash, Truck, Tv, Twitter, Umbrella, Upload, User, Video, Wifi, Wind, Youtube, Anchor, Atom, Battery, Bluetooth, Calculator, CheckCircle, ChevronDown, Clipboard, CloudRain, Cpu, Disc, Feather, FileVideo, Fingerprint, Flashlight, FolderOpen, Gamepad2, HardDrive, Hash, Headset, HelpCircle, Laptop, Lightbulb, Medal, Menu, MessageSquare, Paperclip, PieChart,
};

interface SidebarProps {
  extractors: Extractor[];
  activeExtractorId: string | null;
  onSelectExtractor: (id: string | null) => void;
  onCreateExtractor: () => void;
  onEditExtractor: (id: string) => void;
  favorites: Set<number>;
  onToggleFavorite: (id: number) => void;
}

export const Sidebar = ({
  extractors,
  activeExtractorId,
  onSelectExtractor,
  onCreateExtractor,
  onEditExtractor,
  favorites,
  onToggleFavorite,
}: SidebarProps) => {
  const { t, direction, language } = useLanguage();
  const { user } = useAuth();

  const [openSections, setOpenSections] = useState(() => {
    // Load from localStorage on mount
    const savedState = localStorage.getItem('sidebarSections');
    if (savedState) {
      try {
        return JSON.parse(savedState);
      } catch {
        return {
          favorites: true,
          mine: true,
          shared: true,
          public: true,
        };
      }
    }
    return {
      favorites: true,
      mine: true,
      shared: true,
      public: true,
    };
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => {
      const newState = { ...prev, [section]: !prev[section] };
      // Save to localStorage whenever state changes
      localStorage.setItem('sidebarSections', JSON.stringify(newState));
      return newState;
    });
  };

  // Categorize extractors
  const myExtractors = extractors.filter(e => e.owner_id === user?.id);
  const sharedExtractors = extractors.filter(e => e.visibility === 'shared' && e.owner_id !== user?.id);
  const publicExtractors = extractors.filter(e => e.visibility === 'public' && e.owner_id !== user?.id);
  const favoriteExtractors = extractors.filter(e => favorites.has(e.id));

  const renderExtractor = (extractor: Extractor, showEdit: boolean, showCreatedBy: boolean) => {
    const displayName = language === 'en' ? extractor.name_en : extractor.name_ar;
    const ownerName = language === 'en' ? extractor.owner_name_en : extractor.owner_name_ar;
    const isActive = activeExtractorId === String(extractor.id);
    const isMine = extractor.owner_id === user?.id;
    const isShared = extractor.visibility === 'shared';
    const isPublic = extractor.visibility === 'public';

    // Determine outline color based on ownership and visibility (RTL aware)
    const borderSide = direction === 'rtl' ? 'border-r-4' : 'border-l-4';
    let outlineClass = `${borderSide} border-transparent`;
    if (isActive) {
      outlineClass = `${borderSide} border-primary`;
    } else if (isMine) {
      // My extractors: always blue regardless of visibility
      outlineClass = `${borderSide} border-blue-300/30`;
    } else if (isPublic) {
      // Public extractors from others: green
      outlineClass = `${borderSide} border-green-300/30`;
    } else if (isShared) {
      // Shared with me: different green (teal)
      outlineClass = `${borderSide} border-teal-300/30`;
    }

    return (
      <div
        key={extractor.id}
        className={cn(
          "relative group rounded-lg transition-all duration-200",
          outlineClass,
          isActive
            ? "bg-sidebar-accent/80 shadow-soft"
            : "hover:bg-sidebar-accent/50"
        )}
      >
        <button
          onClick={() => onSelectExtractor(String(extractor.id))}
          className={cn(
            "w-full p-3 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-lg transition-all",
            direction === 'rtl' ? 'text-right' : 'text-left'
          )}
        >
          <div className={cn(
            "flex items-center gap-3",
            direction === 'rtl' && 'flex-row-reverse'
          )}>
            {(() => {
              const IconComponent = iconMap[extractor.icon] || File;
              return <IconComponent className="h-5 w-5 flex-shrink-0 text-muted-foreground" />;
            })()}
            <div className="flex-1 min-w-0">
              <span className={cn(
                "text-sm font-medium transition-colors block truncate",
                isActive
                  ? "text-primary"
                  : "text-sidebar-foreground"
              )}>
                {displayName}
              </span>
              <span className="text-[9px] text-muted-foreground truncate block mt-0.5">
                {isMine
                  ? (language === 'en' ? 'by me' : 'بواسطتي')
                  : (language === 'en' ? `by ${ownerName}` : `بواسطة ${ownerName}`)
                }
              </span>
            </div>
          </div>
        </button>

        {/* Three-dot menu for actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "absolute top-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent/80",
                direction === 'rtl' ? 'left-2' : 'right-2'
              )}
            >
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={direction === 'rtl' ? 'start' : 'end'}>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(extractor.id);
              }}
              className={cn(
                "gap-2",
                direction === 'rtl' && 'flex-row-reverse'
              )}
            >
              <Heart className={cn(
                "h-4 w-4",
                favorites.has(extractor.id) ? "fill-red-500 text-red-500" : ""
              )} />
              {favorites.has(extractor.id)
                ? (language === 'en' ? 'Unfavorite' : 'إزالة من المفضلة')
                : (language === 'en' ? 'Favorite' : 'إضافة للمفضلة')
              }
            </DropdownMenuItem>
            {showEdit && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEditExtractor(String(extractor.id));
                }}
                className={cn(
                  "gap-2",
                  direction === 'rtl' && 'flex-row-reverse'
                )}
              >
                <Edit3 className="h-4 w-4" />
                {language === 'en' ? 'Edit' : 'تعديل'}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <aside
      className={cn(
        "w-72 border-border bg-sidebar/80 backdrop-blur-sm flex flex-col shadow-medium",
        direction === 'rtl' ? 'border-l' : 'border-r'
      )}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-base font-semibold text-sidebar-foreground">
          {t('recipes')}
        </h2>
      </div>

      {/* Extractors List */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-6">
          {/* Favorites Section */}
          <Collapsible open={openSections.favorites} onOpenChange={() => toggleSection('favorites')}>
            <CollapsibleTrigger className={cn(
              "flex items-center justify-between w-full p-2.5 hover:bg-accent/50 rounded-lg transition-colors border border-transparent hover:border-border",
              direction === 'rtl' && 'flex-row-reverse'
            )}>
              <div className={cn(
                "flex items-center gap-2",
                direction === 'rtl' && 'flex-row-reverse'
              )}>
                <Heart className="h-4 w-4 text-red-500" />
                <span className="font-medium text-sm">
                  {language === 'en' ? 'Favorites' : 'المفضلة'}
                </span>
                <span className="text-xs text-muted-foreground">({favoriteExtractors.length})</span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                openSections.favorites && "rotate-180"
              )} />
            </CollapsibleTrigger>
            <CollapsibleContent className={cn(
              "mt-3 space-y-2",
              direction === 'rtl' ? 'pr-2' : 'pl-2'
            )}>
              {favoriteExtractors.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 italic">
                  {language === 'en' ? 'No favorites yet' : 'لا توجد مفضلات بعد'}
                </p>
              ) : (
                favoriteExtractors.map(e => renderExtractor(e, e.owner_id === user?.id, false))
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* My Extractors Section */}
          <Collapsible open={openSections.mine} onOpenChange={() => toggleSection('mine')}>
            <CollapsibleTrigger className={cn(
              "flex items-center justify-between w-full p-2.5 hover:bg-accent/50 rounded-lg transition-colors border border-transparent hover:border-border",
              direction === 'rtl' && 'flex-row-reverse'
            )}>
              <div className={cn(
                "flex items-center gap-2",
                direction === 'rtl' && 'flex-row-reverse'
              )}>
                <User className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">
                  {language === 'en' ? 'My Extractors' : 'مستخرجاتي'}
                </span>
                <span className="text-xs text-muted-foreground">({myExtractors.length})</span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                openSections.mine && "rotate-180"
              )} />
            </CollapsibleTrigger>
            <CollapsibleContent className={cn(
              "mt-3 space-y-2",
              direction === 'rtl' ? 'pr-2' : 'pl-2'
            )}>
              {myExtractors.map(e => renderExtractor(e, true, false))}
            </CollapsibleContent>
          </Collapsible>

          {/* Shared Extractors Section */}
          <Collapsible open={openSections.shared} onOpenChange={() => toggleSection('shared')}>
            <CollapsibleTrigger className={cn(
              "flex items-center justify-between w-full p-2.5 hover:bg-accent/50 rounded-lg transition-colors border border-transparent hover:border-border",
              direction === 'rtl' && 'flex-row-reverse'
            )}>
              <div className={cn(
                "flex items-center gap-2",
                direction === 'rtl' && 'flex-row-reverse'
              )}>
                <Users className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-sm">
                  {language === 'en' ? 'Shared' : 'مشاركة'}
                </span>
                <span className="text-xs text-muted-foreground">({sharedExtractors.length})</span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                openSections.shared && "rotate-180"
              )} />
            </CollapsibleTrigger>
            <CollapsibleContent className={cn(
              "mt-3 space-y-2",
              direction === 'rtl' ? 'pr-2' : 'pl-2'
            )}>
              {sharedExtractors.map(e => renderExtractor(e, false, true))}
            </CollapsibleContent>
          </Collapsible>

          {/* Public Extractors Section */}
          <Collapsible open={openSections.public} onOpenChange={() => toggleSection('public')}>
            <CollapsibleTrigger className={cn(
              "flex items-center justify-between w-full p-2.5 hover:bg-accent/50 rounded-lg transition-colors border border-transparent hover:border-border",
              direction === 'rtl' && 'flex-row-reverse'
            )}>
              <div className={cn(
                "flex items-center gap-2",
                direction === 'rtl' && 'flex-row-reverse'
              )}>
                <Globe className="h-4 w-4 text-green-500" />
                <span className="font-medium text-sm">
                  {language === 'en' ? 'Public' : 'عامة'}
                </span>
                <span className="text-xs text-muted-foreground">({publicExtractors.length})</span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                openSections.public && "rotate-180"
              )} />
            </CollapsibleTrigger>
            <CollapsibleContent className={cn(
              "mt-3 space-y-2",
              direction === 'rtl' ? 'pr-2' : 'pl-2'
            )}>
              {publicExtractors.map(e => renderExtractor(e, false, true))}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Floating Add Button */}
      <div className="p-4">
        <Button
          size="lg"
          onClick={onCreateExtractor}
          className="w-full bg-gradient-primary hover:opacity-90 shadow-glow transition-all duration-300 hover:scale-105"
        >
          <Plus className={cn(
            "h-5 w-5",
            direction === 'rtl' ? 'ml-2' : 'mr-2'
          )} />
          {t('newExtractor')}
        </Button>
      </div>
    </aside>
  );
};

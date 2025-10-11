import { Button } from "@/components/ui/button";
import { Globe, Layers, LogOut, Trophy, Home, FileSearch, Activity, Sun, Moon, Database, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOGO_PATH, LOGO_SIZE } from "@/lib/constants";
import { clearAllCache, getCacheStats } from "@/lib/cache";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Header = () => {
  const { language, toggleLanguage, t, direction } = useLanguage();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [cacheStats, setCacheStats] = useState(getCacheStats());

  // Get initials from user name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleClearCache = () => {
    clearAllCache();
    setCacheStats(getCacheStats());
    toast.success(language === 'en' ? 'Cache cleared successfully' : 'تم مسح ذاكرة التخزين المؤقت بنجاح');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return language === 'en' ? '0 B' : '0 ب';
    const k = 1024;
    const sizesEn = ['B', 'KB', 'MB', 'GB'];
    const sizesAr = ['ب', 'ك.ب', 'م.ب', 'ج.ب'];
    const sizes = language === 'en' ? sizesEn : sizesAr;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const value = Math.round(bytes / Math.pow(k, i) * 100) / 100;
    return language === 'en' ? `${value} ${sizes[i]}` : `${sizes[i]} ${value}`;
  };

  const displayName = language === 'en' ? user?.full_name_en : user?.full_name_ar;
  const departmentName = language === 'en' ? user?.department_name_en : user?.department_name_ar;
  const initials = displayName ? getInitials(displayName) : 'U';

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40 shadow-soft">
      <div className="h-full px-6 flex items-center justify-between" dir={direction}>
        {/* Logo/App Name */}
        <div className="flex items-center gap-3">
          <img src={LOGO_PATH} alt="AutoGlean" className={LOGO_SIZE.header} />
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
            {t('appName')}
          </h1>
        </div>

        {/* Center Navigation */}
        <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-1">
          <button
            onClick={() => navigate('/')}
            className="relative px-4 py-2 rounded-md transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {language === 'en' ? 'Home' : 'الرئيسية'}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-center" />
          </button>

          <button
            onClick={() => navigate('/public-extractors')}
            className="relative px-4 py-2 rounded-md transition-colors group"
          >
            <div className="flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {language === 'en' ? 'Public' : 'العامة'}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-center" />
          </button>

          <button
            onClick={() => navigate('/leaderboard')}
            className="relative px-4 py-2 rounded-md transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {language === 'en' ? 'Leaderboard' : 'المتصدرين'}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-center" />
          </button>

          <button
            onClick={() => navigate('/activity')}
            className="relative px-4 py-2 rounded-md transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {language === 'en' ? 'Activity' : 'النشاط'}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-center" />
          </button>
        </div>

        {/* User Card & Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-md hover:bg-accent"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Sun className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="rounded-md hover:bg-accent"
            title={language === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
          >
            <Globe className="h-4 w-4 text-muted-foreground" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex flex-col gap-1 px-3 py-2.5 rounded-md bg-sidebar-accent/50 border border-border/50 hover:bg-sidebar-accent cursor-pointer transition-colors w-[180px]">
                <p className={`text-sm font-semibold leading-tight text-foreground truncate ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>{displayName}</p>
                {departmentName && (
                  <p className={`text-[10px] leading-tight text-muted-foreground truncate ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>{departmentName}</p>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={direction === 'rtl' ? 'start' : 'end'} className="w-64">
              <DropdownMenuItem className={cn(
                "gap-2 cursor-default hover:bg-transparent",
                direction === 'rtl' && 'flex-row-reverse'
              )} onSelect={(e) => e.preventDefault()}>
                <Database className="h-4 w-4" />
                <div className="flex-1">
                  <div className={cn(
                    "text-xs font-medium",
                    direction === 'rtl' && 'text-right'
                  )}>
                    {language === 'en' ? 'Cache Storage' : 'ذاكرة التخزين المؤقت'}
                  </div>
                  <div className={cn(
                    "text-xs text-muted-foreground",
                    direction === 'rtl' && 'text-right'
                  )} dir={direction}>
                    {language === 'en'
                      ? `${cacheStats.entries} items • ${formatBytes(cacheStats.size)}`
                      : `عناصر ${cacheStats.entries} • ${formatBytes(cacheStats.size)}`
                    }
                  </div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleClearCache} className={cn(
                "gap-2 cursor-pointer",
                direction === 'rtl' && 'flex-row-reverse'
              )}>
                <Trash2 className="h-4 w-4" />
                <span>{language === 'en' ? 'Clear Cache' : 'مسح ذاكرة التخزين'}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className={cn(
                "gap-2 cursor-pointer",
                direction === 'rtl' && 'flex-row-reverse'
              )}>
                <LogOut className="h-4 w-4" />
                <span>{language === 'en' ? 'Logout' : 'تسجيل الخروج'}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

import { Button } from "@/components/ui/button";
import { Globe, Layers } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Header = () => {
  const { language, toggleLanguage, t, direction } = useLanguage();

  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-soft">
      <div className="h-full px-6 flex items-center justify-between" dir={direction}>
        {/* Logo/App Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Layers className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
            {t('appName')}
          </h1>
        </div>

        {/* User Card & Language Toggle */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="gap-2 hover:bg-accent rounded-full"
          >
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">{language === 'en' ? 'العربية' : 'English'}</span>
          </Button>
          
          <div className="flex items-center gap-3 px-3 py-2 rounded-full bg-sidebar-accent/50 border border-border/50">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                JD
              </AvatarFallback>
            </Avatar>
            <div className={`${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
              <p className="text-sm font-semibold leading-none mb-0.5 text-foreground">{t('userName')}</p>
              <p className="text-xs text-muted-foreground">{t('userPosition')}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

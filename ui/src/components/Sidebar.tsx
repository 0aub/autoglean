import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Layers, Edit3, Map, Calendar, Home, File, Search, Circle, LucideIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Extractor } from "@/types/extractor";

// Icon mapping for lucide icons
const iconMap: Record<string, LucideIcon> = {
  Map,
  Calendar,
  Home,
  File,
  Search,
  Circle,
};

interface SidebarProps {
  extractors: Extractor[];
  activeExtractorId: string | null;
  onSelectExtractor: (id: string | null) => void;
  onCreateExtractor: () => void;
  onEditExtractor: (id: string) => void;
}

export const Sidebar = ({
  extractors,
  activeExtractorId,
  onSelectExtractor,
  onCreateExtractor,
  onEditExtractor,
}: SidebarProps) => {
  const { t, direction } = useLanguage();

  return (
    <aside
      className={cn(
        "w-72 border-border bg-sidebar/80 backdrop-blur-sm flex flex-col shadow-medium",
        direction === 'rtl' ? 'border-l' : 'border-r'
      )}
    >
      {/* Sidebar Header */}
      <div className="p-6 border-b border-sidebar-border">
        <h2 className="text-lg font-semibold text-sidebar-foreground flex items-center gap-2">
          <Layers className="h-5 w-5 text-muted-foreground" />
          {t('recipes')}
        </h2>
      </div>

      {/* Extractors List */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-2">
          {extractors.map((extractor) => {
            const IconComponent = iconMap[extractor.icon] || File;
            return (
              <div
                key={extractor.id}
                className={cn(
                  "relative group w-full rounded-lg transition-all duration-200",
                  activeExtractorId === extractor.id
                    ? "bg-sidebar-accent/80 shadow-soft"
                    : "hover:bg-sidebar-accent/50"
                )}
              >
                <button
                  onClick={() => onSelectExtractor(extractor.id)}
                  className={cn(
                    "w-full text-start p-4 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-lg",
                    "border-l-3 transition-all",
                    activeExtractorId === extractor.id
                      ? "border-l-4 border-primary"
                      : "border-l-4 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <IconComponent className={cn(
                      "h-5 w-5 transition-colors",
                      activeExtractorId === extractor.id
                        ? "text-primary"
                        : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "font-medium transition-colors",
                      activeExtractorId === extractor.id
                        ? "text-primary"
                        : "text-sidebar-foreground"
                    )}>
                      {extractor.name}
                    </span>
                  </div>
                </button>
              
              {/* Edit Button */}
              <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditExtractor(extractor.id);
                  }}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent/80"
                  title={t('edit')}
                >
                  <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Floating Add Button */}
      <div className="p-4">
        <Button
          size="lg"
          onClick={onCreateExtractor}
          className="w-full bg-gradient-primary hover:opacity-90 shadow-glow transition-all duration-300 hover:scale-105"
        >
          <Plus className="h-5 w-5 mr-2" />
          {t('newExtractor')}
        </Button>
      </div>
    </aside>
  );
};

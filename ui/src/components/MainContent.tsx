import { WaveAnimation } from "./WaveAnimation";
import { ExtractorView } from "./ExtractorView";
import { useLanguage } from "@/contexts/LanguageContext";
import { Layers } from "lucide-react";
import type { Extractor } from "@/types/extractor";

interface MainContentProps {
  activeExtractor: Extractor | null;
}

export const MainContent = ({ activeExtractor }: MainContentProps) => {
  const { t } = useLanguage();

  if (activeExtractor) {
    return (
      <main className="flex-1 overflow-auto bg-gradient-subtle">
        <ExtractorView extractor={activeExtractor} />
      </main>
    );
  }

  return (
    <main className="flex-1 relative">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-subtle" />
      
      {/* Wave Animation Layer */}
      <div className="absolute inset-0">
        <WaveAnimation />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 h-full flex items-center justify-center p-8 pb-16">
        <div className="text-center max-w-2xl animate-fade-in mt-48">
          <h2 className="text-4xl font-bold mb-6 pb-1 bg-gradient-to-r from-primary via-primary-light to-secondary bg-clip-text text-transparent leading-relaxed">
            {t('tagline')}
          </h2>

          <p className="text-muted-foreground text-lg leading-relaxed pb-2">
            {t('createFirst')}
          </p>
        </div>
      </div>
    </main>
  );
};

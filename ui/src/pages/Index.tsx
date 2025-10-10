import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { MainContent } from "@/components/MainContent";
import { CreateExtractorDialog } from "@/components/CreateExtractorDialog";
import { LanguageProvider } from "@/contexts/LanguageContext";
import type { Extractor } from "@/types/extractor";
import { getExtractors } from "@/services/api";
import { toast } from "sonner";

const Index = () => {
  const [extractors, setExtractors] = useState<Extractor[]>([]);
  const [activeExtractorId, setActiveExtractorId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExtractorId, setEditingExtractorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load extractors from backend on mount
  useEffect(() => {
    const loadExtractors = async () => {
      try {
        const extractorsData = await getExtractors();
        // Convert extractors object to array
        const extractorsArray = Object.entries(extractorsData).map(([key, extractor]) => ({
          id: extractor.id,
          name: extractor.name,
          icon: extractor.icon,
          prompt: extractor.prompt || '',
          description: extractor.description
        }));
        setExtractors(extractorsArray);
      } catch (error) {
        console.error('Failed to load extractors:', error);
        toast.error('Failed to load extractors from server');
      } finally {
        setIsLoading(false);
      }
    };
    loadExtractors();
  }, []);

  const activeExtractor = extractors.find(e => e.id === activeExtractorId) || null;
  const editingExtractor = extractors.find(e => e.id === editingExtractorId) || null;

  const handleCreateExtractor = (newExtractor: Omit<Extractor, 'id'>) => {
    if (editingExtractorId) {
      // Edit existing extractor
      setExtractors(prev => 
        prev.map(e => e.id === editingExtractorId ? { ...newExtractor, id: e.id } : e)
      );
      setEditingExtractorId(null);
    } else {
      // Create new extractor
      const extractor: Extractor = {
        ...newExtractor,
        id: `extractor-${Date.now()}`,
      };
      setExtractors(prev => [...prev, extractor]);
      setActiveExtractorId(extractor.id);
    }
  };

  const handleEditExtractor = (id: string) => {
    setEditingExtractorId(id);
    setIsDialogOpen(true);
  };

  const handleDeleteExtractor = (id: string) => {
    setExtractors(prev => prev.filter(e => e.id !== id));
    if (activeExtractorId === id) {
      setActiveExtractorId(null);
    }
  };

  return (
    <LanguageProvider>
      <div className="h-screen flex flex-col overflow-hidden bg-background">
        <Header />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar 
            extractors={extractors}
            activeExtractorId={activeExtractorId}
            onSelectExtractor={setActiveExtractorId}
            onCreateExtractor={() => {
              setEditingExtractorId(null);
              setIsDialogOpen(true);
            }}
            onEditExtractor={handleEditExtractor}
          />
          <MainContent key={activeExtractorId} activeExtractor={activeExtractor} />
        </div>
        
        <CreateExtractorDialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingExtractorId(null);
          }}
          onSave={handleCreateExtractor}
          onDelete={handleDeleteExtractor}
          editingExtractor={editingExtractor}
        />
      </div>
    </LanguageProvider>
  );
};

export default Index;

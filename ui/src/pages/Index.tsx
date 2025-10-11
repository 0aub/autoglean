import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/NewSidebar";
import { MainContent } from "@/components/MainContent";
import { CreateExtractorDialog } from "@/components/CreateExtractorDialog";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import type { Extractor } from "@/types/extractor";
import { getExtractors, createExtractor, updateExtractor, deleteExtractor } from "@/services/api";
import { toggleFavorite as toggleFavoriteAPI } from "@/services/favorites";
import { toast } from "sonner";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [extractors, setExtractors] = useState<Extractor[]>([]);
  const [activeExtractorId, setActiveExtractorId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExtractorId, setEditingExtractorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  // Load extractors from backend on mount
  useEffect(() => {
    const loadExtractors = async () => {
      try {
        const extractorsData = await getExtractors();
        setExtractors(extractorsData);

        // Extract favorites from extractors data
        const favoriteIds = new Set(
          extractorsData.filter(e => e.is_favorited).map(e => Number(e.id))
        );
        setFavorites(favoriteIds);

        // Check if there's an extractor ID in URL params
        const extractorIdParam = searchParams.get('extractor');
        if (extractorIdParam) {
          // Verify the extractor exists in the loaded data
          const extractorExists = extractorsData.some(e => String(e.id) === extractorIdParam);
          if (extractorExists) {
            setActiveExtractorId(extractorIdParam);
          }
          // Clear the URL parameter after setting the active extractor
          setSearchParams({});
        }
      } catch (error) {
        console.error('Failed to load extractors:', error);
        toast.error('Failed to load extractors from server');
      } finally {
        setIsLoading(false);
      }
    };
    loadExtractors();
  }, [searchParams, setSearchParams]);

  const activeExtractor = extractors.find(e => String(e.id) === activeExtractorId) || null;
  const editingExtractor = extractors.find(e => String(e.id) === editingExtractorId) || null;

  const handleCreateExtractor = async (newExtractor: Omit<Extractor, 'id'>) => {
    try {
      if (editingExtractorId) {
        // Edit existing extractor
        const updated = await updateExtractor(Number(editingExtractorId), newExtractor);
        setExtractors(prev =>
          prev.map(e => String(e.id) === editingExtractorId ? updated : e)
        );
        setEditingExtractorId(null);
        toast.success('Extractor updated successfully');
      } else {
        // Create new extractor
        const created = await createExtractor(newExtractor);
        setExtractors(prev => [...prev, created]);
        setActiveExtractorId(String(created.id));
        toast.success('Extractor created successfully');
      }
    } catch (error) {
      console.error('Failed to save extractor:', error);
      toast.error(`Failed to ${editingExtractorId ? 'update' : 'create'} extractor`);
    }
  };

  const handleEditExtractor = (id: string) => {
    setEditingExtractorId(id);
    setIsDialogOpen(true);
  };

  const handleDeleteExtractor = async (id: string) => {
    try {
      await deleteExtractor(Number(id));
      setExtractors(prev => prev.filter(e => String(e.id) !== id));
      if (activeExtractorId === id) {
        setActiveExtractorId(null);
      }
      toast.success('Extractor deleted successfully');
    } catch (error) {
      console.error('Failed to delete extractor:', error);
      toast.error('Failed to delete extractor');
    }
  };

  const handleToggleFavorite = async (id: number) => {
    const isFavorited = favorites.has(id);

    // Optimistically update UI
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(id)) {
        newFavorites.delete(id);
      } else {
        newFavorites.add(id);
      }
      return newFavorites;
    });

    // Update extractors list
    setExtractors(prev =>
      prev.map(e =>
        e.id === id ? { ...e, is_favorited: !isFavorited } : e
      )
    );

    // Call backend API
    try {
      await toggleFavoriteAPI(id, isFavorited);
      toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites');
    } catch (error) {
      // Revert on error
      setFavorites(prev => {
        const newFavorites = new Set(prev);
        if (isFavorited) {
          newFavorites.add(id);
        } else {
          newFavorites.delete(id);
        }
        return newFavorites;
      });
      setExtractors(prev =>
        prev.map(e =>
          e.id === id ? { ...e, is_favorited: isFavorited } : e
        )
      );
      console.error('Failed to toggle favorite:', error);
      toast.error('Failed to update favorite');
    }
  };

  return (
    <ThemeProvider>
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
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
            />
            <MainContent key={activeExtractorId} activeExtractor={activeExtractor} />
          </div>

          <CreateExtractorDialog
            key={editingExtractorId || 'new'}
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
    </ThemeProvider>
  );
};

export default Index;

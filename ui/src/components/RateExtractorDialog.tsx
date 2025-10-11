import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { rateExtractor, getExtractorRatings } from "@/services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RateExtractorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractorId: number;
  extractorName: string;
  onRatingSubmitted?: () => void;
}

interface Rating {
  id: number;
  extractor_id: number;
  user_id: number;
  user_name_en: string;
  user_name_ar: string;
  rating: number;
  review: string | null;
  created_at: string;
}

export const RateExtractorDialog = ({
  open,
  onOpenChange,
  extractorId,
  extractorName,
  onRatingSubmitted,
}: RateExtractorDialogProps) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [review, setReview] = useState("");
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUserRated, setHasUserRated] = useState(false);

  useEffect(() => {
    if (open) {
      loadRatings();
      setRating(0);
      setReview("");
    }
  }, [open]);

  const loadRatings = async () => {
    try {
      const ratingsData = await getExtractorRatings(extractorId);
      setRatings(ratingsData);

      // Check if current user has already rated
      const userRating = ratingsData.find((r) => r.user_id === user?.id);
      setHasUserRated(!!userRating);

      if (userRating) {
        setRating(userRating.rating);
        setReview(userRating.review || "");
      }
    } catch (error) {
      console.error('Failed to load ratings:', error);
      toast.error('Failed to load ratings');
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error(language === 'en' ? 'Please select a rating' : 'الرجاء اختيار تقييم');
      return;
    }

    setIsLoading(true);
    try {
      await rateExtractor(extractorId, rating, review || undefined);
      toast.success(
        hasUserRated
          ? language === 'en' ? 'Rating updated successfully' : 'تم تحديث التقييم بنجاح'
          : language === 'en' ? 'Rating submitted successfully' : 'تم إرسال التقييم بنجاح'
      );
      await loadRatings();
      if (onRatingSubmitted) {
        onRatingSubmitted();
      }
    } catch (error) {
      console.error('Failed to submit rating:', error);
      toast.error(language === 'en' ? 'Failed to submit rating' : 'فشل في إرسال التقييم');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const averageRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : '0';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {language === 'en' ? 'Rate Extractor' : 'تقييم المستخرج'}
          </DialogTitle>
          <DialogDescription>
            {language === 'en'
              ? `Rate and review "${extractorName}"`
              : `تقييم ومراجعة "${extractorName}"`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Average Rating Display */}
          {ratings.length > 0 && (
            <div className="flex items-center justify-center gap-2 p-4 bg-accent/30 rounded-lg">
              <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
              <span className="text-2xl font-bold">{averageRating}</span>
              <span className="text-sm text-muted-foreground">
                ({ratings.length} {language === 'en' ? 'ratings' : 'تقييمات'})
              </span>
            </div>
          )}

          {/* Rating Input */}
          <div>
            <h3 className="text-sm font-semibold mb-2">
              {hasUserRated
                ? language === 'en' ? 'Update your rating' : 'تحديث تقييمك'
                : language === 'en' ? 'Your rating' : 'تقييمك'}
            </h3>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "h-8 w-8",
                      (hoverRating || rating) >= star
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Review Input */}
          <div>
            <h3 className="text-sm font-semibold mb-2">
              {language === 'en' ? 'Review (optional)' : 'المراجعة (اختياري)'}
            </h3>
            <Textarea
              placeholder={
                language === 'en'
                  ? 'Share your experience with this extractor...'
                  : 'شارك تجربتك مع هذا المستخرج...'
              }
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isLoading || rating === 0}
            className="w-full"
          >
            {isLoading
              ? language === 'en' ? 'Submitting...' : 'جاري الإرسال...'
              : hasUserRated
              ? language === 'en' ? 'Update Rating' : 'تحديث التقييم'
              : language === 'en' ? 'Submit Rating' : 'إرسال التقييم'}
          </Button>

          {/* Ratings List */}
          {ratings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">
                {language === 'en' ? 'User Reviews' : 'مراجعات المستخدمين'}
              </h3>
              <ScrollArea className="h-64 border rounded-md p-2">
                {ratings.map((r) => (
                  <div key={r.id} className="p-3 border-b last:border-b-0">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-medium">
                        {language === 'en' ? r.user_name_en : r.user_name_ar}
                        {r.user_id === user?.id && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({language === 'en' ? 'You' : 'أنت'})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                    </div>
                    <div className="flex gap-0.5 mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "h-3 w-3",
                            star <= r.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-gray-300"
                          )}
                        />
                      ))}
                    </div>
                    {r.review && (
                      <p className="text-sm text-muted-foreground">{r.review}</p>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

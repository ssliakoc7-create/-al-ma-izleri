import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Send, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

interface ReviewSectionProps {
  cafeName: string;
}

export default function ReviewSection({ cafeName }: ReviewSectionProps) {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem(`reviews_${cafeName}`);
    if (saved) {
      setReviews(JSON.parse(saved));
    } else {
      // Mock initial reviews
      const mockReviews: Review[] = [
        {
          id: '1',
          userName: 'Zeynep K.',
          rating: 5,
          comment: 'Çalışmak için harika bir ortam, interneti çok hızlı.',
          date: '2024-03-15'
        },
        {
          id: '2',
          userName: 'Mert A.',
          rating: 4,
          comment: 'Sessiz ama bazen çok kalabalık olabiliyor.',
          date: '2024-03-20'
        }
      ];
      setReviews(mockReviews);
    }
  }, [cafeName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRating === 0 || !newComment.trim()) return;

    const review: Review = {
      id: Date.now().toString(),
      userName: 'Siz',
      rating: newRating,
      comment: newComment,
      date: new Date().toISOString().split('T')[0]
    };

    const updated = [review, ...reviews];
    setReviews(updated);
    localStorage.setItem(`reviews_${cafeName}`, JSON.stringify(updated));
    setNewRating(0);
    setNewComment('');
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between border-t-4 border-black pt-6">
        <h3 className="font-black text-lg uppercase tracking-widest flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          {t('map.reviews')} ({reviews.length})
        </h3>
        <div className="bg-[#FFD700] border-4 border-black px-3 py-1 font-black shadow-[4px_4px_0_0_#000]">
          {averageRating} ★
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 border-4 border-black p-4 shadow-[6px_6px_0_0_#000] space-y-4">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setNewRating(s)}
              onMouseEnter={() => setHoverRating(s)}
              onMouseLeave={() => setHoverRating(0)}
              className="focus:outline-none transition-transform hover:scale-125"
            >
              <Star 
                className={`w-6 h-6 ${
                  s <= (hoverRating || newRating) 
                    ? 'fill-yellow-400 text-yellow-400' 
                    : 'text-slate-300 dark:text-slate-600'
                }`} 
              />
            </button>
          ))}
          <span className="ml-2 font-black text-xs uppercase text-slate-500">
            {newRating > 0 ? `${newRating}/5` : t('map.ratingPlaceholder')}
          </span>
        </div>

        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={t('map.reviewPlaceholder')}
          className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-black p-3 font-bold text-sm outline-none focus:bg-[#FFD700] dark:focus:bg-yellow-600 transition-colors h-24 placeholder:text-slate-400"
        />

        <button
          type="submit"
          disabled={newRating === 0 || !newComment.trim()}
          className="w-full bg-black text-white py-3 font-black text-xs uppercase tracking-widest hover:bg-[#FFD700] hover:text-black transition-all disabled:opacity-50 disabled:hover:bg-black disabled:hover:text-white flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          {t('map.submitReview')}
        </button>
      </form>

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-center py-8 font-bold text-slate-400 uppercase italic">
            {t('map.noReviews')}
          </p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="bg-[#F2F2EC] dark:bg-slate-900 border-2 border-black p-4 relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2 font-black text-sm uppercase">
                  <div className="w-8 h-8 bg-white border-2 border-black rounded-full flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  {r.userName}
                </div>
                <div className="flex items-center gap-1 font-black text-xs">
                  {r.rating} <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                </div>
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 pl-10">
                {r.comment}
              </p>
              <div className="mt-2 pl-10 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                {r.date}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

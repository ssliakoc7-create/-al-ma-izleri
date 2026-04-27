import React, { createContext, useContext, useState, useEffect } from 'react';

interface FavoritesContextType {
  favorites: string[];
  toggleFavorite: (cafeName: string) => void;
  isFavorite: (cafeName: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('cafe_favorites');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load favorites', e);
      }
    }
  }, []);

  const toggleFavorite = (cafeName: string) => {
    setFavorites(prev => {
      const next = prev.includes(cafeName)
        ? prev.filter(n => n !== cafeName)
        : [...prev, cafeName];
      localStorage.setItem('cafe_favorites', JSON.stringify(next));
      return next;
    });
  };

  const isFavorite = (cafeName: string) => favorites.includes(cafeName);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
}

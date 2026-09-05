import { useState, useEffect } from "react";
import { DEFAULT_PINNED_IDS } from "@/components/layout/navigation";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(DEFAULT_PINNED_IDS);

  useEffect(() => {
    const load = () => {
      try {
        const stored = localStorage.getItem("tradeos-favorites");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setFavorites(parsed);
            return;
          }
        }
        // Fallback to default pinned IDs
        setFavorites(DEFAULT_PINNED_IDS);
      } catch (e) {
        setFavorites(DEFAULT_PINNED_IDS);
      }
    };

    load();
    window.addEventListener("favorites-updated", load);
    return () => window.removeEventListener("favorites-updated", load);
  }, []);

  const toggleFavorite = (id: string) => {
    try {
      const stored = localStorage.getItem("tradeos-favorites");
      let current: string[] = stored ? JSON.parse(stored) : [...DEFAULT_PINNED_IDS];

      if (current.includes(id)) {
        current = current.filter((i) => i !== id);
      } else {
        current.push(id);
      }

      localStorage.setItem("tradeos-favorites", JSON.stringify(current));
      setFavorites(current);
      window.dispatchEvent(new Event("favorites-updated"));
    } catch (e) {}
  };

  const isFavorite = (id: string) => favorites.includes(id);

  return { favorites, toggleFavorite, isFavorite };
}

import { useState, useEffect } from "react";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const load = () => {
      try {
        const stored = localStorage.getItem("tradeos-favorites");
        if (stored) {
          setFavorites(JSON.parse(stored));
        }
      } catch (e) {}
    };
    
    load();
    window.addEventListener("favorites-updated", load);
    return () => window.removeEventListener("favorites-updated", load);
  }, []);

  const toggleFavorite = (id: string) => {
    try {
      const stored = localStorage.getItem("tradeos-favorites");
      let current: string[] = stored ? JSON.parse(stored) : ["calendar", "calculator", "validation", "journal"]; // Default
      
      if (current.includes(id)) {
        current = current.filter(i => i !== id);
      } else {
        current.push(id);
      }
      
      localStorage.setItem("tradeos-favorites", JSON.stringify(current));
      setFavorites(current);
      window.dispatchEvent(new Event("favorites-updated"));
    } catch (e) {}
  };

  return { favorites, toggleFavorite };
}

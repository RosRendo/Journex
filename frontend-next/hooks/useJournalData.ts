import { useState, useEffect } from "react";

export interface JournalEntry {
    strategy: string;
    reason: string;
    images: string[]; // Base64 images
}

export function useJournalData(tradeId: string | number | undefined) {
    const [entry, setEntry] = useState<JournalEntry>({
        strategy: "",
        reason: "",
        images: [],
    });

    // Load from localStorage on mount or when tradeId changes
    useEffect(() => {
        if (!tradeId) return;
        const stored = localStorage.getItem(`journal_${tradeId}`);
        if (stored) {
            try {
                setEntry(JSON.parse(stored));
            } catch (err) {
                console.error("Failed to parse journal entry", err);
            }
        } else {
            setEntry({ strategy: "", reason: "", images: [] });
        }
    }, [tradeId]);

    const saveEntry = (newEntry: Partial<JournalEntry>) => {
        if (!tradeId) return;
        const updated = { ...entry, ...newEntry };
        setEntry(updated);
        try {
            localStorage.setItem(`journal_${tradeId}`, JSON.stringify(updated));
        } catch (err) {
            console.error("Failed to save journal entry. It may be too large.", err);
            alert("Failed to save. If you uploaded a very large image, try a smaller one.");
        }
    };

    return { entry, saveEntry };
}

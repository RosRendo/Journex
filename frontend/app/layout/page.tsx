"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Plus, Trash2, Upload, X, Save } from "lucide-react";

export default function LayoutGalleryPage() {
  const defaultLayouts = [
    {
      id: "default-1",
      src: "/layout/layout1.png",
      alt: "Chart 1",
      title: "Market Structure Layout",
      description: "Market Structure BOS/CHOCH/MSB/FVG/OB/BB (Nephew_Sam_) + Volumne Ticks + DIY Custom Strategy Builder",
      isCustom: false,
    },
    {
      id: "default-2",
      src: "/layout/layout2.png",
      alt: "Chart 2",
      title: "Orderflow & TDI",
      description: "Orderflow/book + TDI Traders Dynamic Index [Goldminds]",
      isCustom: false,
    },
  ];

  const [layouts, setLayouts] = useState<any[]>(defaultLayouts);
  const [zoomedImage, setZoomedImage] = useState<any>(null);

  // Upload modal state
  const [showUpload, setShowUpload] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newImageBase64, setNewImageBase64] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load custom layouts on mount
  useEffect(() => {
    const stored = localStorage.getItem("custom_layouts");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setLayouts([...defaultLayouts, ...parsed]);
      } catch (e) {
        console.error("Failed to parse custom layouts");
      }
    }
  }, []);

  // Close zoomed image on ESC
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoomedImage(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image is too large. Please use an image under 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setNewImageBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUpload = () => {
    if (!newImageBase64 || !newTitle) {
      alert("Please provide an image and a title.");
      return;
    }

    const newLayout = {
      id: "custom-" + Date.now(),
      src: newImageBase64,
      alt: newTitle,
      title: newTitle,
      description: newDesc,
      isCustom: true,
    };

    const stored = localStorage.getItem("custom_layouts");
    let parsed: any[] = [];
    if (stored) {
      try {
        parsed = JSON.parse(stored);
      } catch (e) { }
    }

    parsed.push(newLayout);
    localStorage.setItem("custom_layouts", JSON.stringify(parsed));

    setLayouts([...defaultLayouts, ...parsed]);

    // Reset and close
    setNewTitle("");
    setNewDesc("");
    setNewImageBase64(null);
    setShowUpload(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this custom layout?")) return;

    const stored = localStorage.getItem("custom_layouts");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const updated = parsed.filter((l: any) => l.id !== id);
        localStorage.setItem("custom_layouts", JSON.stringify(updated));
        setLayouts([...defaultLayouts, ...updated]);
      } catch (e) { }
    }
  };

  return (
    <div className="space-y-6 relative h-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
            Custom Layouts
          </h1>
          <p className="text-muted-foreground mt-1">
            Build and store your favorite TradingView desktop layouts
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold transition-all shadow-[0_0_10px_rgba(59,130,246,0.3)] hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:bg-primary/90 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Add Layout
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {layouts.map((layout) => (
          <div
            key={layout.id}
            className="flex flex-col bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/30 transition-all group"
          >
            {/* Image Container */}
            <div className="relative aspect-video bg-black/20 overflow-hidden cursor-pointer" onClick={() => setZoomedImage(layout)}>
              <Image
                src={layout.src}
                alt={layout.alt}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-foreground text-sm font-medium">
                  Click to Expand
                </div>
              </div>

              {layout.isCustom && (
                <button
                  onClick={(e) => handleDelete(layout.id, e)}
                  className="absolute top-3 right-3 p-2 bg-red-500/80 hover:bg-red-600 text-foreground rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-lg"
                  title="Delete custom layout"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Info */}
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold">{layout.title || "Layout Idea"}</h3>
                {layout.isCustom && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">Custom</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{layout.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal Overlay */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center py-4 px-4 overflow-y-auto">
          {/* Using a fixed container for backdrop */}
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowUpload(false)} />

          <div className="relative w-full max-w-lg bg-card border border-border/50 shadow-2xl rounded-2xl p-6 animate-in zoom-in-95 duration-200 z-10 m-auto mt-[40px] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Upload className="text-primary w-6 h-6" />
                Add Custom Layout
              </h2>
              <button onClick={() => setShowUpload(false)} className="p-2 hover:bg-secondary rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Layout Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. 3-Screen ICT Layout"
                  className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Description & Notes</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Indicators used, intervals, workflow..."
                  rows={3}
                  className="w-full bg-secondary/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-muted-foreground">Screenshot Image</label>

                {newImageBase64 ? (
                  <div className="relative rounded-xl overflow-hidden border border-border/50 aspect-video group">
                    <img src={newImageBase64} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => setNewImageBase64(null)}
                        className="bg-red-500 hover:bg-red-600 text-foreground px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-transform hover:scale-105"
                      >
                        <Trash2 className="w-4 h-4" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border/60 bg-secondary/20 rounded-xl p-8 flex flex-col items-center justify-center text-muted-foreground hover:bg-secondary/40 hover:border-primary/50 transition-all cursor-pointer group"
                  >
                    <div className="bg-secondary p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Click to upload screenshot</p>
                    <p className="text-xs opacity-60 mt-1">(Max 2MB per image)</p>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowUpload(false)}
                  className="px-5 py-2.5 rounded-xl font-medium hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUpload}
                  disabled={!newTitle || !newImageBase64}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold transition-all shadow-md shadow-primary/20 hover:shadow-primary/40 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Save className="w-4 h-4" />
                  Save Layout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Zoom Overlay */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 text-foreground rounded-full transition-colors z-50"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="w-full max-w-6xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="mb-4 text-foreground">
              <h3 className="text-2xl font-bold">{zoomedImage.title || "Layout Option"}</h3>
              <p className="text-foreground/70 mt-1 whitespace-pre-wrap">{zoomedImage.description}</p>
            </div>
            <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-white/10 shadow-2xl">
              <Image
                src={zoomedImage.src}
                alt={zoomedImage.alt}
                fill
                className="object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";
import { Save, Loader2, X } from "lucide-react";

interface WhiteboardModalProps {
  initialImageUrl?: string;
  onSave: (file: File) => Promise<void>;
  onClose: () => void;
}

export function WhiteboardModal({ initialImageUrl, onSave, onClose }: WhiteboardModalProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleMount = (editorInstance: Editor) => {
    setEditor(editorInstance);
    
    // If an initial image URL is provided, load it into the canvas
    if (initialImageUrl) {
      (async () => {
        try {
          const response = await fetch(initialImageUrl);
          const blob = await response.blob();
          const file = new File([blob], "background.png", { type: blob.type });
          editorInstance.putExternalContent({
            type: "files",
            files: [file],
            point: { x: 0, y: 0 },
            ignoreParent: false,
          });
        } catch (err) {
          console.error("Failed to load initial image into whiteboard", err);
        }
      })();
    }
  };

  const handleSave = async () => {
    if (!editor) return;
    setIsSaving(true);
    try {
      const shapeIds = Array.from(editor.getCurrentPageShapeIds());
      if (shapeIds.length === 0) {
        setIsSaving(false);
        return;
      }

      // Export everything on the canvas to a blob using the new API
      const { blob } = await editor.toImage(shapeIds, {
        format: "png",
        background: true,
        padding: 20,
      });

      // Create a File object and pass it up
      const file = new File([blob], `whiteboard-${Date.now()}.png`, { type: "image/png" });
      await onSave(file);
    } catch (err) {
      console.error("Failed to save whiteboard drawing", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-950">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-zinc-900 border-b border-zinc-800 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h3 className="text-sm font-bold text-white tracking-wide">
            {initialImageUrl ? "Annotate Chart" : "Drawing Board"}
          </h3>
        </div>
        
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save as Image
        </button>
      </div>

      {/* Tldraw Canvas Area */}
      <div className="flex-1 relative">
        <Tldraw 
          onMount={handleMount} 
          persistenceKey={initialImageUrl ? undefined : "tldraw-board"} 
        />
      </div>
    </div>
  );
}

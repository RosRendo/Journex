"use client";

import React, { useState, useEffect, useRef } from "react";
import { BookOpen, UploadCloud, X, Maximize2, Trash2, Plus, Calendar, Tag, FileText, ImageIcon, Search, LayoutList, Check, Edit2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { fetchWithAuth, getBackendUrl } from "@/lib/utils";
import { WhiteboardModal } from "@/components/WhiteboardModal";
import { toast } from "sonner";

interface LessonImage {
  id: string;
  url: string;
  note: string;
  uploadedAt?: string;
  timeframe?: string;
  profit?: number;
  tradeDate?: string;
  pair?: string;
  direction?: string;
  strategy?: string;
  emotion?: string;
}

interface Lesson {
  id: number;
  title: string;
  concept: string | null;
  notes: string | null;
  images: LessonImage[];
  createdAt: string;
}

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fast Entry State (Top Row)
  const [newTitle, setNewTitle] = useState("");
  const [newConcept, setNewConcept] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Inline Editing State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editConcept, setEditConcept] = useState("");

  // Modal states
  const [viewingLesson, setViewingLesson] = useState<Lesson | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "detail">("grid");
  const [selectedImageIdx, setSelectedImageIdx] = useState<number | null>(null);
  const [imageNoteUpdate, setImageNoteUpdate] = useState("");
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [whiteboardInitialUrl, setWhiteboardInitialUrl] = useState<string | undefined>();
  const [galleryFilter, setGalleryFilter] = useState<string>("All");
  
  // Drag and drop state
  const [draggedLessonId, setDraggedLessonId] = useState<number | null>(null);
  const [dragOverLessonId, setDragOverLessonId] = useState<number | null>(null);
  
  // File upload state for side panel
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [notesUpdate, setNotesUpdate] = useState("");

  const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "D1", "W1"];

  const [strategies, setStrategies] = useState<string[]>([
    "Trend Following", "Breakout", "Reversal", "SMC",
    "Support / Resistance", "Supply / Demand", "News Trading",
  ]);

  useEffect(() => {
    loadLessons();
    fetchWithAuth(`${getBackendUrl()}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.strategies?.length) {
          setStrategies(data.data.strategies);
        }
      })
      .catch(console.error);
  }, []);

  const handleAddStrategy = async () => {
    const newVal = prompt("Enter new Strategy name:");
    if (!newVal || !newVal.trim()) return;
    const updated = [...strategies, newVal.trim()];
    setStrategies(updated);
    setNewTitle(newVal.trim());
    await fetchWithAuth(`${getBackendUrl()}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strategies: updated })
    });
  };

  const loadLessons = async () => {
    try {
      const res = await fetchWithAuth(`${getBackendUrl()}/api/lessons`);
      const data = await res.json();
      if (data.success) {
        setLessons(data.lessons);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load lessons");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error("Title is required to create a lesson");
      return;
    }
    
    setIsCreating(true);
    try {
      const payload = {
        title: newTitle,
        ...(newConcept ? { concept: newConcept } : {})
      };

      const res = await fetchWithAuth(`${getBackendUrl()}/api/lessons`, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json", "Accept": "application/json" }
      });

      const data = await res.json();
      if (data.success) {
        setLessons([data.lesson, ...lessons]);
        setNewTitle("");
        setNewConcept("");
        toast.success("Added new lesson");
      } else {
        toast.error(data.message || "Failed to add lesson");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    }
  };

  const startEditing = (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(lesson.id);
    setEditTitle(lesson.title);
    setEditConcept(lesson.concept || "");
  };

  const saveInlineEdit = async (id: number) => {
    setEditingId(null);
    try {
      const payload = {
        title: editTitle,
        ...(editConcept ? { concept: editConcept } : {})
      };

      const res = await fetchWithAuth(`${getBackendUrl()}/api/lessons/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json", "Accept": "application/json" }
      });

      const data = await res.json();
      if (data.success) {
        setLessons(lessons.map(l => l.id === id ? data.lesson : l));
        if (viewingLesson?.id === id) setViewingLesson(data.lesson);
      }
    } catch (err) {
      toast.error("Failed to update lesson");
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, id: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      saveInlineEdit(id);
    } else if (e.key === "Escape") {
      setEditingId(null);
    }
  };

  const saveDetailsUpdate = async (id: number, newNotes?: string, newImages?: LessonImage[]) => {
    try {
      const payload: any = {};
      if (newNotes !== undefined) payload.notes = newNotes;
      if (newImages !== undefined) payload.images = newImages;

      const res = await fetchWithAuth(`${getBackendUrl()}/api/lessons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setLessons(lessons.map(l => l.id === id ? data.lesson : l));
        setViewingLesson(data.lesson);
        toast.success("Updated successfully");
      }
    } catch (err) {
      toast.error("Failed to update details");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && viewingLesson) {
      setIsUploading(true);
      const newImages = [...(viewingLesson.images || [])];
      
      for (const file of Array.from(e.target.files)) {
        const formData = new FormData();
        formData.append("image", file);
        
        try {
          const uploadRes = await fetchWithAuth(`${getBackendUrl()}/api/upload`, {
            method: "POST",
            body: formData,
            headers: { "Accept": "application/json" }
          });
          
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            newImages.push({
              id: Date.now().toString() + Math.random().toString(),
              url: data.data.url,
              note: "",
              uploadedAt: new Date().toISOString()
            });
          }
        } catch (e) {
          console.error(e);
        }
      }
      
      await saveDetailsUpdate(viewingLesson.id, undefined, newImages);
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Are you sure you want to delete this lesson?")) return;
    try {
      const res = await fetchWithAuth(`${getBackendUrl()}/api/lessons/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setLessons(lessons.filter(l => l.id !== id));
        if (viewingLesson?.id === id) setViewingLesson(null);
        toast.success("Lesson deleted");
      }
    } catch (err) {
      toast.error("Failed to delete lesson");
    }
  };

  const handleDeleteImage = async () => {
    if (!viewingLesson || selectedImageIdx === null) return;
    if (!confirm("Are you sure you want to delete this chart?")) return;
    
    const newImages = [...viewingLesson.images];
    newImages.splice(selectedImageIdx, 1);
    
    await saveDetailsUpdate(viewingLesson.id, undefined, newImages);
    
    if (newImages.length === 0) {
      setViewMode("grid");
    } else {
      const nextIdx = Math.min(selectedImageIdx, newImages.length - 1);
      setSelectedImageIdx(nextIdx);
      setImageNoteUpdate(newImages[nextIdx]?.note || "");
    }
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    if (searchQuery !== "") {
      e.preventDefault();
      return;
    }
    setDraggedLessonId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    if (draggedLessonId === null || searchQuery !== "") return;
    if (draggedLessonId !== id) {
      setDragOverLessonId(id);
    }
  };

  const handleDragEnd = async () => {
    if (draggedLessonId !== null && dragOverLessonId !== null && draggedLessonId !== dragOverLessonId) {
      const draggedIdx = lessons.findIndex(l => l.id === draggedLessonId);
      const dropIdx = lessons.findIndex(l => l.id === dragOverLessonId);
      
      if (draggedIdx !== -1 && dropIdx !== -1) {
        const newLessons = [...lessons];
        const [draggedItem] = newLessons.splice(draggedIdx, 1);
        newLessons.splice(dropIdx, 0, draggedItem);
        
        const updatedLessons = newLessons.map((l, idx) => ({ ...l, orderIndex: idx }));
        setLessons(updatedLessons);

        const itemsToUpdate = updatedLessons.map(l => ({ id: l.id, orderIndex: l.orderIndex }));
        try {
          await fetchWithAuth(`${getBackendUrl()}/api/lessons/reorder`, {
            method: 'PUT',
            body: JSON.stringify({ items: itemsToUpdate })
          });
        } catch (err) {
          toast.error("Failed to save new order");
        }
      }
    }
    setDraggedLessonId(null);
    setDragOverLessonId(null);
  };

  const getFullImageUrl = (url: string | null) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return url;
  };

  const filteredLessons = lessons.filter(l => 
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (l.concept && l.concept.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen w-full bg-[#05050a] text-text-primary px-4 md:px-6 py-4 flex flex-col gap-4 animate-fade-in pb-16">
      
      {/* Header Area */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#111118]/80 p-4 border border-zinc-800/40 rounded-2xl backdrop-blur-xl mt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-white font-display">
              Trading Playbook
            </h1>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Playbook & Lesson Library
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px]">
          <div className="relative group">
            <Search className="w-3.5 h-3.5 text-zinc-550 absolute left-2.5 top-1/2 -translate-y-1/2 group-focus-within:text-blue-450 transition-colors" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search lessons..." 
              className="bg-black/35 border border-zinc-800/60 rounded-lg pl-8 pr-3 py-1.5 text-xs w-48 focus:border-blue-450 outline-none text-white font-mono placeholder:text-zinc-655"
            />
          </div>
        </div>
      </div>

      {/* Notion/Excel-style Data Table */}
      <div className="bg-[#111118] border border-zinc-800/40 rounded-xl overflow-hidden shadow-xl mt-2">
        
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-zinc-800 bg-black/25 text-[9px] uppercase font-bold tracking-widest text-zinc-500 font-mono">
          <div className="col-span-8 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> Title</div>
          <div className="col-span-2 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Date</div>
          <div className="col-span-2 flex items-center gap-1.5 justify-end"><ImageIcon className="w-3.5 h-3.5"/> Details</div>
        </div>

        <div className="divide-y divide-zinc-900/40 font-mono">
          
          {/* FAST ENTRY ROW (Always at the top) */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 items-center bg-blue-500/[0.01] border-b border-zinc-850 text-xs">
            <div className="col-span-8 flex items-center gap-3">
              <div className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-blue-500/40">
                <Plus className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={handleCreateKeyDown}
                placeholder="Enter Lesson Title..."
                className="w-full bg-transparent border-none outline-none text-xs font-bold text-white placeholder:text-zinc-650"
              />
            </div>
            <div className="col-span-2 text-[9px] text-zinc-600 font-bold uppercase tracking-wider">Now</div>
            <div className="col-span-2 flex justify-end">
              <button 
                onClick={handleCreate}
                disabled={!newTitle.trim() || isCreating}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-400 text-blue-950 text-[10px] font-black uppercase rounded-lg disabled:opacity-30 transition-all flex items-center gap-1 font-mono cursor-pointer"
              >
                {isCreating ? <Loader2 className="w-3 h-3 animate-spin"/> : <Check className="w-3.5 h-3.5" />}
                Add
              </button>
            </div>
          </div>

          {/* SAVED LESSONS */}
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin w-6 h-6 border border-zinc-800 border-t-transparent rounded-full" />
            </div>
          ) : filteredLessons.length === 0 ? (
            <div className="py-16 text-center text-zinc-650 flex flex-col items-center">
              <p className="text-xs">No saved lessons. Use the row above to quickly add one.</p>
            </div>
          ) : (
            filteredLessons.map((lesson) => (
              <div 
                key={lesson.id} 
                draggable={searchQuery === ""}
                onDragStart={(e) => handleDragStart(e, lesson.id)}
                onDragOver={(e) => handleDragOver(e, lesson.id)}
                onDragEnd={handleDragEnd}
                className={`grid grid-cols-12 gap-4 px-5 py-3 items-center hover:bg-white/[0.01] border-b border-zinc-900/60 transition-colors group relative ${
                  dragOverLessonId === lesson.id ? "border-t border-blue-500 bg-blue-500/10" : ""
                }`}
              >
                <div 
                  className={`absolute inset-0 z-0 ${searchQuery === "" ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                  onClick={() => {
                    setViewingLesson(lesson);
                    setNotesUpdate(lesson.notes || "");
                  }} 
                />

                {/* TITLE */}
                <div className="col-span-8 flex items-center gap-3 relative z-10">
                  <div className="w-8 h-8 rounded bg-black/25 border border-zinc-800/40 flex flex-shrink-0 items-center justify-center text-zinc-600 group-hover:text-blue-400 transition-colors">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  
                  {editingId === lesson.id ? (
                    <input 
                      type="text"
                      autoFocus
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, lesson.id)}
                      onBlur={() => saveInlineEdit(lesson.id)}
                      className="w-full bg-zinc-900 border border-blue-500/50 rounded px-2.5 py-1 text-xs outline-none text-white font-mono"
                    />
                  ) : (
                    <span 
                      onClick={(e) => startEditing(lesson, e)}
                      className="font-medium text-xs text-zinc-200 group-hover:text-blue-300 transition-colors truncate cursor-text"
                      title="Click to edit"
                    >
                      {lesson.title}
                    </span>
                  )}
                </div>

                <div className="col-span-2 text-[10px] text-zinc-550 relative z-10 pointer-events-none">
                  {new Date(lesson.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>

                <div className="col-span-2 flex items-center justify-end gap-3 relative z-10">
                  <div className="flex gap-2 mr-2">
                    {lesson.notes && <span title="Has Notes"><FileText className="w-3.5 h-3.5 text-zinc-600" /></span>}
                    {lesson.images && lesson.images.length > 0 && (
                      <div className="flex items-center gap-1" title="Has Images">
                        <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                        {lesson.images.length > 1 && <span className="text-[9px] font-bold text-blue-450 bg-blue-500/10 px-1 rounded border border-blue-500/20">{lesson.images.length}</span>}
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => {
                      setViewingLesson(lesson);
                      setViewMode("grid");
                      setSelectedImageIdx(null);
                      setNotesUpdate(lesson.notes || "");
                    }}
                    className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-[10px] font-bold"
                  >
                    Open
                  </button>
                  
                  <button 
                    onClick={(e) => handleDelete(lesson.id, e)}
                    className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* VIEW / EDIT DETAILS PANEL (Centered Glass Modal) */}
      <AnimatePresence>
        {viewingLesson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm" onClick={() => setViewingLesson(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-5xl h-full max-h-[80vh] bg-[#0A0C10]/95 border border-zinc-800/45 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-900/30">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <BookOpen className="w-5 h-5 text-blue-450" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white leading-tight font-mono">{viewingLesson.title}</h2>
                    <div className="flex items-center gap-3 mt-1 font-mono text-[10px]">
                      {viewingLesson.concept && (
                        <span className="text-[8px] font-black uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          {viewingLesson.concept}
                        </span>
                      )}
                      <span className="text-zinc-550 flex items-center gap-1 font-bold">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        {new Date(viewingLesson.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setViewingLesson(null)} className="p-2 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-hidden flex flex-col bg-[#0A0C10]/40 relative">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  multiple
                  className="hidden" 
                />

                {viewMode === "grid" ? (
                  <div className="flex-1 p-6 overflow-y-auto scroll-thin">
                    <div className="flex flex-col md:flex-row gap-6 mb-6">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-4 border-b border-zinc-850 pb-2">
                          <h3 className="text-xs font-bold text-zinc-450 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                            <ImageIcon className="w-3.5 h-3.5 text-zinc-500" /> Chart Gallery
                          </h3>
                          <div className="flex items-center gap-2 font-mono text-[9px] font-bold">
                            <button 
                              onClick={() => setIsEditMode(!isEditMode)}
                              className={`px-3 py-1.5 rounded-lg border transition-all ${isEditMode ? 'bg-red-500/90 text-white border-red-500' : 'text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20'}`}
                            >
                              {isEditMode ? "Done" : "Edit Gallery"}
                            </button>
                            <button 
                              onClick={() => {
                                setWhiteboardInitialUrl(undefined);
                                setShowWhiteboard(true);
                              }}
                              className="text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-lg hover:bg-purple-500/20 transition-all"
                            >
                              Whiteboard
                            </button>
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading}
                              className="text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 disabled:opacity-50 transition-all"
                            >
                              Add Charts
                            </button>
                          </div>
                        </div>

                        {/* Timeframe Filter Tabs */}
                        <div className="flex items-center gap-1.5 overflow-x-auto scroll-thin pb-2">
                          {["All", ...TIMEFRAMES].map(tf => {
                            const count = tf === "All" 
                              ? viewingLesson.images.length 
                              : viewingLesson.images.filter(img => img.timeframe === tf).length;
                              
                            if (count === 0 && tf !== "All") return null;

                            return (
                              <button
                                key={tf}
                                onClick={() => setGalleryFilter(tf)}
                                className={`px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded border transition-all flex items-center gap-1 ${
                                  galleryFilter === tf
                                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                                    : "bg-black/25 border-zinc-800/40 text-zinc-550 hover:text-white"
                                }`}
                              >
                                {tf}
                                <span className={`px-1 rounded-sm text-[8px] ${galleryFilter === tf ? "bg-black/20 text-white" : "bg-zinc-800 text-zinc-600"}`}>
                                  {count}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Main Concept Image */}
                      {viewingLesson.images && viewingLesson.images.length > 0 && (
                        <div className="w-full md:w-1/3 flex-shrink-0">
                          <div 
                            onClick={() => {
                              setSelectedImageIdx(0);
                              setImageNoteUpdate(viewingLesson.images[0].note || "");
                              setViewMode("detail");
                            }}
                            className="rounded-xl overflow-hidden border border-zinc-800/40 bg-black/35 relative group shadow-lg cursor-pointer aspect-video"
                          >
                            <img 
                              src={getFullImageUrl(viewingLesson.images[0].url)} 
                              alt={`${viewingLesson.title} - Main Concept`} 
                              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                            />
                            {isEditMode && (
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newImages = viewingLesson.images.filter((_, i) => i !== 0);
                                    saveDetailsUpdate(viewingLesson.id, undefined, newImages);
                                  }}
                                  className="p-2.5 bg-red-500 rounded-full text-white hover:bg-red-650 transition-colors shadow-lg pointer-events-auto"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            <div className="absolute top-2 right-2 pointer-events-none z-10 font-mono">
                              <span className="text-[8px] font-black tracking-widest uppercase text-white bg-purple-600 px-2 py-1 rounded shadow-lg border border-purple-400">
                                Concept View
                              </span>
                            </div>
                            {viewingLesson.images[0].timeframe && (
                              <div className="absolute top-2 left-2 bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded shadow-lg border border-blue-500 pointer-events-none font-mono">
                                {viewingLesson.images[0].timeframe}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Images Grid */}
                    <div className="grid grid-cols-5 md:grid-cols-8 gap-3 mt-4">
                      {viewingLesson.images && viewingLesson.images.map((img, idx) => {
                        if (idx === 0) return null;
                        if (galleryFilter !== "All" && img.timeframe !== galleryFilter) return null;
                        
                        return (
                          <div 
                            key={img.id} 
                            onClick={() => {
                              setSelectedImageIdx(idx);
                              setImageNoteUpdate(img.note || "");
                              setViewMode("detail");
                            }}
                            className="rounded-xl overflow-hidden border border-zinc-800/40 bg-black/25 relative group shadow-lg cursor-pointer aspect-video"
                          >
                            <img 
                              src={getFullImageUrl(img.url)} 
                              alt={`${viewingLesson.title} - Image ${idx + 1}`} 
                              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                            />
                            {isEditMode && (
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newImages = viewingLesson.images.filter((_, i) => i !== idx);
                                    saveDetailsUpdate(viewingLesson.id, undefined, newImages);
                                  }}
                                  className="p-1.5 bg-red-505 bg-red-500 rounded-full text-white hover:bg-red-600 pointer-events-auto"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                      
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-video border border-dashed border-zinc-800 hover:border-zinc-700 bg-[#111118]/50 hover:bg-[#111118]/85 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all font-mono"
                      >
                        <UploadCloud className="w-4 h-4 text-zinc-550 mb-1" />
                        <p className="text-[9px] font-bold text-zinc-450 uppercase tracking-wider">Upload</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-black/10">
                    <div className="flex-1 p-6 flex flex-col border-b md:border-b-0 md:border-r border-zinc-800/60 bg-black/10 overflow-hidden">
                      <div className="flex items-center justify-between mb-4 font-mono text-[9px] font-bold">
                        <button 
                          onClick={() => setViewMode("grid")}
                          className="text-zinc-500 hover:text-white bg-[#111118] border border-zinc-800/40 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-wider"
                        >
                          ← Gallery
                        </button>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              const url = getFullImageUrl(viewingLesson.images[selectedImageIdx!].url);
                              const absoluteUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
                              setWhiteboardInitialUrl(absoluteUrl);
                              setShowWhiteboard(true);
                            }}
                            className="text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-lg hover:bg-purple-500/20 transition-all uppercase tracking-wider"
                          >
                            Annotate Chart
                          </button>
                          <a 
                            href={getFullImageUrl(viewingLesson.images[selectedImageIdx!].url)} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition-all uppercase tracking-wider flex items-center gap-1"
                          >
                            <Maximize2 className="w-3 h-3" /> Full Size
                          </a>
                          <button
                            onClick={handleDeleteImage}
                            className="text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/20 transition-all uppercase tracking-wider"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex-1 flex items-center justify-center overflow-hidden rounded-xl border border-zinc-800/40 bg-black/40 shadow-inner">
                        <img 
                          src={getFullImageUrl(viewingLesson.images[selectedImageIdx!].url)} 
                          alt="Detail View" 
                          className="w-full h-full object-contain p-2"
                        />
                      </div>
                    </div>

                    <div className="w-full md:w-[320px] p-6 flex flex-col bg-black/20 overflow-y-auto scroll-thin font-mono text-[10px]">
                      {/* Timeframe Selector */}
                      <div className="mb-5">
                        <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest mb-2 block">Timeframe</label>
                        <div className="flex flex-wrap gap-1.5">
                          {TIMEFRAMES.map(tf => (
                            <button
                              key={tf}
                              onClick={() => {
                                const newImages = [...viewingLesson.images];
                                newImages[selectedImageIdx!].timeframe = tf;
                                saveDetailsUpdate(viewingLesson.id, undefined, newImages);
                              }}
                              className={`px-2.5 py-1 text-[9px] font-bold rounded border transition-all ${
                                viewingLesson.images[selectedImageIdx!].timeframe === tf
                                  ? "bg-blue-600 border-blue-500 text-white shadow-lg"
                                  : "bg-black/25 border-zinc-800 text-zinc-550 hover:text-white"
                              }`}
                            >
                              {tf}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Trade Details Table */}
                      {(viewingLesson.images[selectedImageIdx!].pair || viewingLesson.images[selectedImageIdx!].profit !== undefined) && (
                        <div className="mb-5">
                          <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest mb-2 block flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" /> Trade Details
                          </label>
                          <div className="bg-black/20 rounded-lg border border-zinc-800/50 overflow-hidden divide-y divide-zinc-900/40 text-[10px]">
                            {viewingLesson.images[selectedImageIdx!].pair && (
                              <div className="flex justify-between items-center p-2.5">
                                <span className="text-zinc-500">Pair</span>
                                <span className="font-bold text-white">{viewingLesson.images[selectedImageIdx!].pair}</span>
                              </div>
                            )}
                            {viewingLesson.images[selectedImageIdx!].direction && (
                              <div className="flex justify-between items-center p-2.5">
                                <span className="text-zinc-500">Direction</span>
                                <span className={`font-bold ${viewingLesson.images[selectedImageIdx!].direction === 'Long' ? 'text-blue-400' : 'text-purple-400'}`}>
                                  {viewingLesson.images[selectedImageIdx!].direction}
                                </span>
                              </div>
                            )}
                            {viewingLesson.images[selectedImageIdx!].profit !== undefined && (
                              <div className="flex justify-between items-center p-2.5">
                                <span className="text-zinc-500">Profit/Loss</span>
                                <span className={`font-black ${viewingLesson.images[selectedImageIdx!].profit! >= 0 ? 'text-[--bull]' : 'text-[--bear]'}`}>
                                  {viewingLesson.images[selectedImageIdx!].profit! >= 0 ? '+' : ''}${Math.abs(viewingLesson.images[selectedImageIdx!].profit!).toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-3 border-t border-zinc-800/40 pt-4">
                        <h3 className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" /> Image Notes
                        </h3>
                        {imageNoteUpdate !== (viewingLesson.images[selectedImageIdx!].note || "") && (
                          <button 
                            onClick={() => {
                              const newImages = [...viewingLesson.images];
                              newImages[selectedImageIdx!].note = imageNoteUpdate;
                              saveDetailsUpdate(viewingLesson.id, undefined, newImages);
                            }}
                            className="text-[9px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-md transition-colors"
                          >
                            Save Note
                          </button>
                        )}
                      </div>
                      <textarea 
                        value={imageNoteUpdate}
                        onChange={e => setImageNoteUpdate(e.target.value)}
                        placeholder="Document observations..."
                        className="flex-1 w-full min-h-[180px] bg-black/25 border border-zinc-800/50 rounded-lg p-3 text-xs focus:border-blue-500/50 outline-none transition-all resize-none scroll-thin text-zinc-200 placeholder-zinc-700 leading-relaxed font-sans"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Whiteboard Modal Overlay */}
      {showWhiteboard && viewingLesson && (
        <WhiteboardModal 
          initialImageUrl={whiteboardInitialUrl}
          onClose={() => setShowWhiteboard(false)}
          onSave={async (file) => {
            setIsUploading(true);
            const newImages = [...viewingLesson.images];
            const formData = new FormData();
            formData.append("image", file);
            
            try {
              const uploadRes = await fetchWithAuth(`${getBackendUrl()}/api/upload`, {
                method: "POST",
                body: formData,
                headers: { "Accept": "application/json" }
              });
              
              if (uploadRes.ok) {
                const data = await uploadRes.json();
                newImages.push({
                  id: Date.now().toString() + Math.random().toString(),
                  url: data.data.url,
                  note: whiteboardInitialUrl ? "Annotated Chart" : "Whiteboard Drawing",
                  uploadedAt: new Date().toISOString()
                });
                await saveDetailsUpdate(viewingLesson.id, undefined, newImages);
              }
            } catch (e) {
              console.error(e);
            }
            setIsUploading(false);
            setShowWhiteboard(false);
          }}
        />
      )}

    </div>
  );
}

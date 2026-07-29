"use client";

import React, { useState, useEffect, useRef } from "react";
import { BookOpen, UploadCloud, X, Maximize2, Trash2, Plus, Calendar, Tag, FileText, ImageIcon, Search, LayoutList, Check, Edit2 } from "lucide-react";
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

  // CREATE NEW LESSON (Inline)
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

  // UPDATE EXISTING LESSON (Inline)
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
        // Also update viewing lesson if it's open
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

  // UPDATE NOTES OR IMAGE (Side Panel)
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
    return url; // Return relative path to trigger Next.js proxy
  };

  const filteredLessons = lessons.filter(l => 
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (l.concept && l.concept.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-black text-zinc-200">
      
      {/* Header Area */}
      <div className="px-8 py-6 border-b border-zinc-800/60 bg-zinc-950/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Trading Playbook</h1>
            <p className="text-xs text-zinc-400">Fast, Excel-style entry for your setups and concepts</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group hidden md:block">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-blue-400 transition-colors" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search lessons..." 
              className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm w-64 focus:border-blue-500 outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Notion/Excel-style Data Table */}
      <div className="flex-1 overflow-y-auto p-8 scroll-thin">
        <div className="max-w-[1200px] mx-auto">
          
          <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl overflow-hidden shadow-2xl">
            
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-zinc-800 bg-zinc-900/50 text-xs font-bold uppercase tracking-wider text-zinc-500">
              <div className="col-span-8 flex items-center gap-2"><FileText className="w-3.5 h-3.5"/> Title</div>
              <div className="col-span-2 flex items-center gap-2"><Calendar className="w-3.5 h-3.5"/> Date</div>
              <div className="col-span-2 flex items-center gap-2 justify-end"><ImageIcon className="w-3.5 h-3.5"/> Details</div>
            </div>

            <div className="divide-y divide-zinc-800/50">
              
              {/* FAST ENTRY ROW (Always at the top) */}
              <div className="grid grid-cols-12 gap-4 px-6 py-3 items-center bg-blue-500/5 border-b border-blue-500/10">
                <div className="col-span-8 flex items-center gap-3">
                  <div className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-blue-500 opacity-50">
                    <Plus className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={handleCreateKeyDown}
                    placeholder="Enter Lesson Title..."
                    className="w-full bg-transparent border-none outline-none text-sm text-white font-medium placeholder:text-zinc-500"
                  />
                </div>
                <div className="col-span-2 text-xs text-zinc-600 italic">Now</div>
                <div className="col-span-2 flex justify-end">
                  <button 
                    onClick={handleCreate}
                    disabled={!newTitle.trim() || isCreating}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    {isCreating ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Check className="w-3 h-3" />}
                    Add
                  </button>
                </div>
              </div>

              {/* SAVED LESSONS */}
              {loading ? (
                <div className="py-12 flex justify-center">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : filteredLessons.length === 0 ? (
                <div className="py-16 text-center text-zinc-500 flex flex-col items-center">
                  <p className="text-sm">No saved lessons. Use the row above to quickly add one.</p>
                </div>
              ) : (
                filteredLessons.map((lesson) => (
                  <div 
                    key={lesson.id} 
                    draggable={searchQuery === ""}
                    onDragStart={(e) => handleDragStart(e, lesson.id)}
                    onDragOver={(e) => handleDragOver(e, lesson.id)}
                    onDragEnd={handleDragEnd}
                    className={`grid grid-cols-12 gap-4 px-6 py-3 items-center hover:bg-zinc-800/30 transition-colors group relative ${
                      dragOverLessonId === lesson.id ? "border-t-2 border-blue-500 bg-blue-500/10" : ""
                    }`}
                  >
                    {/* Click background to open details panel */}
                    <div 
                      className={`absolute inset-0 z-0 ${searchQuery === "" ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                      onClick={() => {
                        setViewingLesson(lesson);
                        setNotesUpdate(lesson.notes || "");
                      }} 
                    />

                    {/* TITLE */}
                    <div className="col-span-8 flex items-center gap-3 relative z-10">
                      <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex flex-shrink-0 items-center justify-center text-zinc-600 group-hover:text-blue-400 transition-colors">
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
                          className="w-full bg-zinc-900 border border-blue-500/50 rounded px-2 py-1 text-sm outline-none text-white"
                        />
                      ) : (
                        <span 
                          onClick={(e) => startEditing(lesson, e)}
                          className="font-medium text-sm text-zinc-200 group-hover:text-blue-300 transition-colors truncate cursor-text"
                          title="Click to edit"
                        >
                          {lesson.title}
                        </span>
                      )}
                    </div>

                    <div className="col-span-2 text-xs text-zinc-500 relative z-10 pointer-events-none">
                      {new Date(lesson.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-3 relative z-10">
                      <div className="flex gap-2 mr-2">
                        {lesson.notes && <FileText className="w-3.5 h-3.5 text-zinc-500" title="Has Notes" />}
                        {lesson.images && lesson.images.length > 0 && (
                          <div className="flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 text-blue-400" title="Has Images" />
                            {lesson.images.length > 1 && <span className="text-[9px] font-bold text-blue-400 bg-blue-500/20 px-1 rounded">{lesson.images.length}</span>}
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
                        className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 text-xs font-medium"
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
        </div>
      </div>

      {/* VIEW / EDIT DETAILS PANEL (Centered Glass Modal) */}
      <AnimatePresence>
        {viewingLesson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12 bg-black/70 backdrop-blur-lg" onClick={() => setViewingLesson(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-6xl h-full max-h-[85vh] bg-[#0A0C10]/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-8 py-5 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-900/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                    <BookOpen className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white leading-tight">{viewingLesson.title}</h2>
                    <div className="flex items-center gap-3 mt-1.5">
                      {viewingLesson.concept && (
                        <span className="text-xs text-blue-400 font-bold bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                          {viewingLesson.concept}
                        </span>
                      )}
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(viewingLesson.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setViewingLesson(null)} className="p-2.5 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-hidden flex flex-col bg-[#0A0C10]/40 relative">
                
                {/* Global File Input (Hidden) */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  multiple
                  className="hidden" 
                />

                {viewMode === "grid" ? (
                  <div className="flex-1 p-8 overflow-y-auto scroll-thin">
                    <div className="flex flex-col md:flex-row gap-8 mb-8">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-zinc-500" /> Chart Gallery
                          </h3>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => setIsEditMode(!isEditMode)}
                              className={`text-xs font-bold px-4 py-1.5 rounded-lg flex items-center gap-2 transition-all ${isEditMode ? 'bg-red-500/90 text-white shadow-lg' : 'text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20'}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              {isEditMode ? "Done Editing" : "Edit Gallery"}
                            </button>
                            <button 
                              onClick={() => {
                                setWhiteboardInitialUrl(undefined);
                                setShowWhiteboard(true);
                              }}
                              className="text-xs font-bold text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 px-4 py-1.5 rounded-lg flex items-center gap-2 transition-all"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              Draw on Board
                            </button>
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading}
                              className="text-xs font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-4 py-1.5 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-all"
                            >
                              {isUploading ? <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"/> : <Plus className="w-3.5 h-3.5" />}
                              Add Charts
                            </button>
                          </div>
                        </div>

                        {/* Timeframe Filter Tabs */}
                        <div className="flex items-center gap-2 overflow-x-auto scroll-thin pb-2">
                          {["All", ...TIMEFRAMES].map(tf => {
                            const count = tf === "All" 
                              ? viewingLesson.images.length 
                              : viewingLesson.images.filter(img => img.timeframe === tf).length;
                              
                            if (count === 0 && tf !== "All") return null;

                            return (
                              <button
                                key={tf}
                                onClick={() => setGalleryFilter(tf)}
                                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all flex items-center gap-1.5 flex-shrink-0 ${
                                  galleryFilter === tf
                                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                                }`}
                              >
                                {tf}
                                <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${galleryFilter === tf ? "bg-black/20 text-white" : "bg-zinc-800 text-zinc-500"}`}>
                                  {count}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Top Right: Main Concept Image */}
                      {viewingLesson.images && viewingLesson.images.length > 0 && (
                        <div className="w-full md:w-1/3 flex-shrink-0">
                          <div 
                            onClick={() => {
                              setSelectedImageIdx(0);
                              setImageNoteUpdate(viewingLesson.images[0].note || "");
                              setViewMode("detail");
                            }}
                            className="rounded-2xl overflow-hidden border border-zinc-800/80 bg-zinc-950 relative group shadow-lg cursor-pointer aspect-video"
                          >
                            <img 
                              src={getFullImageUrl(viewingLesson.images[0].url)} 
                              alt={`${viewingLesson.title} - Main Concept`} 
                              className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500"
                            />
                            {isEditMode && (
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newImages = viewingLesson.images.filter((_, i) => i !== 0);
                                    saveDetailsUpdate(viewingLesson.id, undefined, newImages);
                                  }}
                                  className="p-3 bg-red-500/80 rounded-full text-white hover:bg-red-500 transition-colors shadow-lg pointer-events-auto"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            )}
                            <div className="absolute top-3 right-3 pointer-events-none z-10">
                              <span className="text-[10px] font-black tracking-widest uppercase text-white bg-purple-600 px-3 py-1.5 rounded-lg shadow-lg border border-purple-400">
                                Main Concept
                              </span>
                            </div>
                            {/* Top Left: Timeframe Badge */}
                            {viewingLesson.images[0].timeframe && (
                              <div className="absolute top-3 left-3 bg-blue-600/90 text-white text-[10px] font-black px-2.5 py-1 rounded-md backdrop-blur-md shadow-lg border border-blue-500 pointer-events-none">
                                {viewingLesson.images[0].timeframe}
                              </div>
                            )}

                            {/* Bottom Right: Profit */}
                            {viewingLesson.images[0].profit !== undefined && (
                              <div className={`absolute bottom-3 right-3 text-[10px] font-black px-2.5 py-1 rounded-md backdrop-blur-md shadow-lg pointer-events-none ${viewingLesson.images[0].profit >= 0 ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                                {viewingLesson.images[0].profit >= 0 ? '+' : ''}${Math.abs(viewingLesson.images[0].profit).toFixed(2)}
                              </div>
                            )}

                            {/* Bottom Left: Date */}
                            {viewingLesson.images[0].tradeDate && (
                              <div className="absolute bottom-3 left-3 bg-black/70 text-white text-[10px] font-bold px-2.5 py-1 rounded-md backdrop-blur-md pointer-events-none">
                                {new Date(viewingLesson.images[0].tradeDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* The Rest of Images Grid */}
                    <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
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
                            className="rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-950 relative group shadow-lg cursor-pointer aspect-video"
                          >
                            <img 
                              src={getFullImageUrl(img.url)} 
                              alt={`${viewingLesson.title} - Image ${idx + 1}`} 
                              className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500"
                            />
                            {isEditMode && (
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newImages = viewingLesson.images.filter((_, i) => i !== idx);
                                    saveDetailsUpdate(viewingLesson.id, undefined, newImages);
                                  }}
                                  className="p-2 bg-red-500/80 rounded-full text-white hover:bg-red-500 transition-colors shadow-lg pointer-events-auto"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            
                            {/* Top Right: Timeframe Badge */}
                            {img.timeframe && (
                              <div className="absolute top-1.5 right-1.5 bg-blue-600/90 text-white text-[8px] font-black px-1.5 py-0.5 rounded backdrop-blur-md shadow-lg border border-blue-500 pointer-events-none">
                                {img.timeframe}
                              </div>
                            )}

                            {/* Bottom Right: Profit Badge */}
                            {img.profit !== undefined && (
                              <div className={`absolute bottom-1.5 right-1.5 text-[8px] font-black px-1.5 py-0.5 rounded backdrop-blur-md shadow-lg pointer-events-none ${img.profit >= 0 ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
                                {img.profit >= 0 ? '+' : ''}${Math.abs(img.profit).toFixed(2)}
                              </div>
                            )}

                            {/* Top Left: Date Badge */}
                            {img.tradeDate && (
                              <div className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[8px] font-bold px-1.5 py-0.5 rounded backdrop-blur-md pointer-events-none">
                                {new Date(img.tradeDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </div>
                            )}

                            {/* Bottom Left: Note Icon */}
                            {img.note && img.profit === undefined && (
                              <div className="absolute bottom-1.5 left-1.5 p-1 bg-blue-500/80 rounded shadow-lg backdrop-blur-md">
                                <FileText className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </div>
                        )
                      })}
                      
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-video border-2 border-dashed border-zinc-800/80 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/50 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all"
                      >
                        <div className="w-10 h-10 bg-zinc-800/50 rounded-full flex items-center justify-center mb-3">
                          <UploadCloud className="w-5 h-5 text-zinc-400" />
                        </div>
                        <p className="text-sm font-medium text-zinc-300">Upload charts</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    {/* Image Detail Mode */}
                    <div className="flex-1 p-8 flex flex-col border-b md:border-b-0 md:border-r border-zinc-800/60 bg-zinc-950/40">
                      <div className="flex items-center justify-between mb-4">
                        <button 
                          onClick={() => setViewMode("grid")}
                          className="text-xs font-bold text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-700/50 px-4 py-1.5 rounded-lg transition-all flex items-center gap-2"
                        >
                          ← Back to Gallery
                        </button>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              const url = getFullImageUrl(viewingLesson.images[selectedImageIdx!].url);
                              const absoluteUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
                              setWhiteboardInitialUrl(absoluteUrl);
                              setShowWhiteboard(true);
                            }}
                            className="text-xs font-bold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Annotate Chart
                          </button>
                          <a 
                            href={getFullImageUrl(viewingLesson.images[selectedImageIdx!].url)} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                          >
                            <Maximize2 className="w-3.5 h-3.5" /> Full Size
                          </a>
                          <button
                            onClick={handleDeleteImage}
                            className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Chart
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex-1 flex items-center justify-center overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950 shadow-inner">
                        <img 
                          src={getFullImageUrl(viewingLesson.images[selectedImageIdx!].url)} 
                          alt="Detail View" 
                          className="w-full h-full object-contain p-2"
                        />
                      </div>
                    </div>

                    <div className="w-full md:w-[400px] p-8 flex flex-col bg-zinc-950/20 overflow-y-auto scroll-thin">
                      {/* Timeframe Selector */}
                      <div className="mb-6">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 block">Timeframe</label>
                        <div className="flex flex-wrap gap-2">
                          {TIMEFRAMES.map(tf => (
                            <button
                              key={tf}
                              onClick={() => {
                                const newImages = [...viewingLesson.images];
                                newImages[selectedImageIdx!].timeframe = tf;
                                saveDetailsUpdate(viewingLesson.id, undefined, newImages);
                              }}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                viewingLesson.images[selectedImageIdx!].timeframe === tf
                                  ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20"
                                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                              }`}
                            >
                              {tf}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Trade Details Table */}
                      {(viewingLesson.images[selectedImageIdx!].pair || viewingLesson.images[selectedImageIdx!].profit !== undefined) && (
                        <div className="mb-6">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 block flex items-center gap-2">
                            <FileText className="w-4 h-4 text-zinc-500" /> Trade Details
                          </label>
                          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/80 overflow-hidden text-sm divide-y divide-zinc-800/80">
                            {viewingLesson.images[selectedImageIdx!].pair && (
                              <div className="flex justify-between items-center p-3">
                                <span className="text-zinc-400">Pair</span>
                                <span className="font-bold text-white">{viewingLesson.images[selectedImageIdx!].pair}</span>
                              </div>
                            )}
                            {viewingLesson.images[selectedImageIdx!].direction && (
                              <div className="flex justify-between items-center p-3">
                                <span className="text-zinc-400">Direction</span>
                                <span className={`font-bold ${viewingLesson.images[selectedImageIdx!].direction === 'Long' ? 'text-green-400' : 'text-red-400'}`}>
                                  {viewingLesson.images[selectedImageIdx!].direction}
                                </span>
                              </div>
                            )}
                            {viewingLesson.images[selectedImageIdx!].tradeDate && (
                              <div className="flex justify-between items-center p-3">
                                <span className="text-zinc-400">Date</span>
                                <span className="font-bold text-white">
                                  {new Date(viewingLesson.images[selectedImageIdx!].tradeDate!).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {viewingLesson.images[selectedImageIdx!].profit !== undefined && (
                              <div className="flex justify-between items-center p-3">
                                <span className="text-zinc-400">Profit/Loss</span>
                                <span className={`font-black ${viewingLesson.images[selectedImageIdx!].profit! >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                  {viewingLesson.images[selectedImageIdx!].profit! >= 0 ? '+' : ''}${Math.abs(viewingLesson.images[selectedImageIdx!].profit!).toFixed(2)}
                                </span>
                              </div>
                            )}
                            {viewingLesson.images[selectedImageIdx!].strategy && (
                              <div className="flex justify-between items-center p-3">
                                <span className="text-zinc-400">Strategy</span>
                                <span className="font-bold text-purple-300 text-right">
                                  {viewingLesson.images[selectedImageIdx!].strategy}
                                </span>
                              </div>
                            )}
                            {viewingLesson.images[selectedImageIdx!].emotion && (
                              <div className="flex justify-between items-center p-3">
                                <span className="text-zinc-400">Emotion</span>
                                <span className="font-bold text-orange-300 text-right">
                                  {viewingLesson.images[selectedImageIdx!].emotion}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                          <FileText className="w-4 h-4 text-zinc-500" /> Image Notes
                        </h3>
                        {imageNoteUpdate !== (viewingLesson.images[selectedImageIdx!].note || "") && (
                          <button 
                            onClick={() => {
                              const newImages = [...viewingLesson.images];
                              newImages[selectedImageIdx!].note = imageNoteUpdate;
                              saveDetailsUpdate(viewingLesson.id, undefined, newImages);
                            }}
                            className="text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                          >
                            Save Note
                          </button>
                        )}
                      </div>
                      <textarea 
                        value={imageNoteUpdate}
                        onChange={e => setImageNoteUpdate(e.target.value)}
                        placeholder="Document specific observations, entry triggers, or insights for this exact chart..."
                        className="flex-1 w-full min-h-[250px] bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 text-sm focus:border-blue-500/50 focus:bg-zinc-900/80 outline-none transition-all resize-none scroll-thin text-zinc-200 placeholder-zinc-600 leading-relaxed"
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

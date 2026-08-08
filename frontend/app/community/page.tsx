"use client";

import React, { useState, useEffect } from "react";
import { resolveLocalUrl } from "@/lib/utils";
import { Menu, Zap, TrendingUp, Compass, Users, Clock, Filter, Sparkles, MessageSquare, Play, RefreshCw, BarChart2, Briefcase, Plus, Send, Heart, Reply, Share, Activity, Search, AlertCircle, Bookmark, Eye, CornerDownRight, ThumbsUp, ChevronDown, User, Edit3, Image as ImageIcon, Share2, TrendingDown, Crosshair, Target, Trash2, Save, X, MoreHorizontal, UserCheck, UserPlus, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/lib/useSession";

interface Comment {
    id: string;
    author: string;
    avatar: string;
    content: string;
    timestamp: string;
}

interface Post {
    id: string;
    authorId: string;
    author: {
        userId: string;
        name: string;
        tradeStyle: string;
        avatar: string;
    };
    content: string;
    image?: string;
    pair?: string;
    direction?: "Long" | "Short";
    entry?: string;
    tp?: string;
    sl?: string;
    result?: string;
    _count: { likes: number };
    comments: Comment[];
    createdAt: string;
}

interface Community {
    id: string;
    name: string;
    description: string;
    image?: string;
    _count?: { members: number, posts: number };
}

interface UserProfile {
    name: string;
    bio: string;
    avatar: string;
    tradeStyle: string;
    communities?: Community[];
}

const DEFAULT_PROFILE: UserProfile = {
    name: "TraderX",
    bio: "Scalping Gold and trading NY session reversals.",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=TraderX",
    tradeStyle: "Day Trader",
};

const BACKEND_URL = resolveLocalUrl(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
const BRIDGE_URL = resolveLocalUrl(process.env.NEXT_PUBLIC_BRIDGE_URL || "/api/bridge");

export default function CommunityPage() {
    const { data: session } = useSession();
    const isPro = (session?.user as any)?.isPro === true;

    const getTraderTier = (userId: string) => {
        const hl = userId.length;
        if (hl % 3 === 0) return { name: "Elite", icon: "👑", color: "bg-amber-500/10 text-amber-400 border border-amber-500/20" };
        if (hl % 2 === 0) return { name: "Pro", icon: "⚡", color: "bg-blue-500/10 text-blue-400 border border-blue-500/20" };
        return { name: "Novice", icon: "🌱", color: "bg-emerald-500/10 text-emerald-450 border border-emerald-500/20" };
    };

    const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
    const [posts, setPosts] = useState<Post[]>([]);
    const [communities, setCommunities] = useState<Community[]>([]);
    const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);

    // New post state
    const [newPostContent, setNewPostContent] = useState("");
    const [newPostImage, setNewPostImage] = useState("");
    const [uploadingPostImage, setUploadingPostImage] = useState(false);
    const [editingPostId, setEditingPostId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [isSignal, setIsSignal] = useState(false);
    const [signalPair, setSignalPair] = useState("XAUUSD");
    const [signalDirection, setSignalDirection] = useState<"Long" | "Short">("Long");
    const [signalEntry, setSignalEntry] = useState("");
    const [signalTP, setSignalTP] = useState("");
    const [signalSL, setSignalSL] = useState("");

    const [signalStrategy, setSignalStrategy] = useState("Custom");
    const [priceLoading, setPriceLoading] = useState(false);

    // Create Community state
    const [isCreateCommunityModalOpen, setIsCreateCommunityModalOpen] = useState(false);
    const [newCommunityName, setNewCommunityName] = useState("");
    const [newCommunityDesc, setNewCommunityDesc] = useState("");
    const [newCommunityImage, setNewCommunityImage] = useState("");
    const [uploadingCommImage, setUploadingCommImage] = useState(false);

    // Commenting state
    const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
    const [commentText, setCommentText] = useState("");

    // Execution risk adjustment
    const [executionRisk, setExecutionRisk] = useState<Record<string, number>>({});

    const [followingIds, setFollowingIds] = useState<string[]>([]);
    const [feedFilter, setFeedFilter] = useState<"Global" | "Following">("Global");
    const [copiedSignals, setCopiedSignals] = useState<string[]>([]);
    const [globalRisk, setGlobalRisk] = useState<number>(1.0);

    useEffect(() => {
        try {
            const savedFollows = localStorage.getItem("community_follows");
            if (savedFollows) setFollowingIds(JSON.parse(savedFollows));
            const savedCopies = localStorage.getItem("community_copies");
            if (savedCopies) setCopiedSignals(JSON.parse(savedCopies));
            const savedRisk = localStorage.getItem("global_risk");
            if (savedRisk) setGlobalRisk(parseFloat(savedRisk));
        } catch(e) {}
    }, []);

    const toggleFollow = (userId: string) => {
        const newIds = followingIds.includes(userId) ? followingIds.filter(id => id !== userId) : [...followingIds, userId];
        setFollowingIds(newIds);
        localStorage.setItem("community_follows", JSON.stringify(newIds));
    };

    const fetchProfile = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/community/profile`);
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
            }
        } catch (e) { }
    };

    const fetchCommunities = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/community/list`);
            if (res.ok) setCommunities(await res.json());
        } catch (e) { }
    };

    const fetchPosts = async (cid?: string | null) => {
        try {
            const url = cid ? `${BACKEND_URL}/api/community/posts?communityId=${cid}` : `${BACKEND_URL}/api/community/posts`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setPosts(data);
            }
        } catch (e) { }
    };

    useEffect(() => {
        fetchProfile();
        fetchCommunities();
    }, []);

    useEffect(() => {
        fetchPosts(activeCommunityId);
    }, [activeCommunityId]);

    const uploadImageHandler = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void, loadingSetter: (loading: boolean) => void) => {
        const file = e.target.files?.[0];
        if (!file) return;

        loadingSetter(true);
        const formData = new FormData();
        formData.append("image", file);

        try {
            const uploadRes = await fetch(`${BACKEND_URL}/api/upload`, { headers: { "ngrok-skip-browser-warning": "true" }, 
                method: "POST",
                body: formData
            });
            if (uploadRes.ok) {
                const data = await uploadRes.json();
                if (data.success) {
                    setter(`${BACKEND_URL}${data.data.url}`);
                }
            }
        } catch (err) {
            console.error("Upload failed", err);
        } finally {
            loadingSetter(false);
        }
    };

    const handleAutoStrategyFill = async (strategy: string) => {
        setSignalStrategy(strategy);
        if (strategy === "Custom") {
            setSignalTP("");
            setSignalSL("");
            return;
        }

        const strategyPips: Record<string, { sl: number; tp: number }> = {
            "Scalp (1:1.5)":  { sl: 10, tp: 15 },
            "Day Trade (1:2)": { sl: 20, tp: 40 },
            "Swing (1:3)":    { sl: 50, tp: 150 },
        };
        const pips = strategyPips[strategy];
        if (!pips) return;

        try {
            setPriceLoading(true);
            const res = await fetch(`${BRIDGE_URL}/api/symbol-price?symbol=${signalPair.toUpperCase()}`, { headers: { "ngrok-skip-browser-warning": "true" } });
            if (!res.ok) throw new Error("Bridge not reachable");
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Price fetch failed");

            const midPrice: number = (data.ask + data.bid) / 2;
            const pipSize: number = data.pip_size;
            const digits: number = data.digits;

            const slPrice  = signalDirection === "Long"
                ? midPrice - pips.sl * pipSize
                : midPrice + pips.sl * pipSize;
            const tpPrice  = signalDirection === "Long"
                ? midPrice + pips.tp * pipSize
                : midPrice - pips.tp * pipSize;

            setSignalTP(tpPrice.toFixed(digits));
            setSignalSL(slPrice.toFixed(digits));
        } catch {
            setSignalTP("");
            setSignalSL("");
        } finally {
            setPriceLoading(false);
        }
    };

    const handlePost = async () => {
        if (!newPostContent.trim()) return;

        try {
            const res = await fetch(`${BACKEND_URL}/api/community/posts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: newPostContent,
                    image: newPostImage || undefined,
                    communityId: activeCommunityId,
                    ...(isSignal && {
                        pair: signalPair.toUpperCase(),
                        direction: signalDirection,
                        entry: signalEntry || undefined,
                        tp: signalTP || undefined,
                        sl: signalSL || undefined,
                    })
                }),
            });
            if (res.ok) {
                const created = await res.json();

                if (session?.user?.email === "rousrendo@gmail.com" && !activeCommunityId && isSignal) {
                    try {
                        const message = `🚨 **NEW SIGNAL ALERT: ${signalPair.toUpperCase()}** 🚨\n\n**Direction:** ${signalDirection}\n**Entry Target:** ${signalEntry || "Market Price"}\n**Take Profit:** ${signalTP || "Open"}\n**Stop Loss:** ${signalSL || "Open"}\n\n📝 **Notes:** ${newPostContent}\n\n⚡ Execute this exact trade instantly with auto-calculated risk on Journex Pro:\nhttps://tradekiller.com/community`;
                        fetch(`${BRIDGE_URL}/api/notify`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ message, channel: "signal" })
                        }).catch(err => console.error("Webhook broadcast failed:", err));
                    } catch (err) {}
                }

                setPosts([created, ...posts]);
                setNewPostContent("");
                setNewPostImage("");
                setIsSignal(false);
                setSignalEntry("");
                setSignalTP("");
                setSignalSL("");
            }
        } catch (e) { }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm("Are you sure you want to delete this post?")) return;
        
        try {
            const uid = session?.user?.email || "demo-user-1";
            const res = await fetch(`${BACKEND_URL}/api/community/posts/${postId}`, {
                method: "DELETE",
                headers: { "x-user-id": uid }
            });
            if (res.ok) {
                setPosts(posts.filter(p => p.id !== postId));
            } else {
                alert("Failed to delete post");
            }
        } catch (error) {
            console.error("Error deleting post:", error);
        }
    };

    const handleEditPost = async (postId: string) => {
        if (!editContent.trim()) return;

        try {
            const uid = session?.user?.email || "demo-user-1";
            const res = await fetch(`${BACKEND_URL}/api/community/posts/${postId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: uid, content: editContent })
            });
            
            if (res.ok) {
                const updated = await res.json();
                setPosts(posts.map(p => p.id === postId ? updated : p));
                setEditingPostId(null);
                setEditContent("");
            } else {
                alert("Failed to edit post");
            }
        } catch (error) {
            console.error("Error editing post:", error);
        }
    };

    const handleCreateCommunity = async () => {
        if (!newCommunityName.trim()) return;
        try {
            const res = await fetch(`${BACKEND_URL}/api/community/list`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    name: newCommunityName, 
                    description: newCommunityDesc,
                    image: newCommunityImage || undefined,
                    isPro: isPro,
                    userId: session?.user?.email 
                }),
            });
            if (res.ok) {
                const newComm = await res.json();
                setIsCreateCommunityModalOpen(false);
                setNewCommunityName("");
                setNewCommunityDesc("");
                setNewCommunityImage("");
                fetchCommunities();
                fetchProfile();
                setActiveCommunityId(newComm.id);
            }
        } catch (e) { }
    };

    const joinCommunity = async (cid: string) => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/community/list/${cid}/join`, { method: "POST" });
            if (res.ok) { fetchProfile(); fetchCommunities(); }
        } catch (e) { }
    };

    const leaveCommunity = async (cid: string) => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/community/list/${cid}/leave`, { method: "POST" });
            if (res.ok) { fetchProfile(); fetchCommunities(); }
        } catch (e) { }
    };

    const handleLike = async (postId: string) => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/community/posts/${postId}/like`, { method: "POST" });
            if (res.ok) {
                fetchPosts();
            }
        } catch (e) { }
    };

    const handleComment = async (postId: string) => {
        if (!commentText.trim()) return;

        try {
            const res = await fetch(`${BACKEND_URL}/api/community/posts/${postId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: commentText }),
            });
            if (res.ok) {
                fetchPosts();
                setCommentText("");
                setActiveCommentPostId(null);
            }
        } catch (e) { }
    };

    const formatTime = (isoString: string) => {
        const d = new Date(isoString);
        const now = new Date();
        const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);

        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
        return d.toLocaleDateString();
    };

    const executeSignal = async (post: Post) => {
        if (!post.pair || !post.tp || !post.sl) return;
        
        const risk = executionRisk[post.id] || globalRisk;

        if (!window.confirm(`Execute ${post.direction} on ${post.pair} risking ${risk}% of your balance?\nTP: ${post.tp} | SL: ${post.sl}`)) {
            return;
        }

        try {
            const res = await fetch(`${BRIDGE_URL}/api/execute-signal`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    symbol: post.pair,
                    action: post.direction?.toLowerCase() || 'buy',
                    tp: parseFloat(post.tp),
                    sl: parseFloat(post.sl),
                    risk: risk,
                }),
            });
            const data = await res.json();
            if (data.success) {
                alert(`Trade Executed!\nTicket: ${data.ticket}\nPrice: ${data.price}`);
                const newCopies = Array.from(new Set([...copiedSignals, post.id]));
                setCopiedSignals(newCopies);
                localStorage.setItem("community_copies", JSON.stringify(newCopies));
            } else {
                alert(`Execution failed: ${data.error}`);
            }
        } catch (e: any) {
            alert(`Execution error: ${e.message}`);
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#05050a] text-text-primary px-4 md:px-6 py-4 flex flex-col lg:flex-row gap-4 animate-fade-in pb-16">

            {/* ─── MAIN FEED ─── */}
            <div className="flex-1 flex flex-col min-w-0 lg:max-h-full">
                
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#111118]/80 p-4 border border-zinc-800/40 rounded-2xl backdrop-blur-xl mt-4 mb-4">
                    <div>
                        <h1 className="text-lg font-black tracking-tight text-white font-display flex items-center gap-2">
                            <Users className="w-5 h-5 text-emerald-450" />
                            {activeCommunityId ? communities.find(c => c.id === activeCommunityId)?.name || "Community" : "Global Trader Hub"}
                        </h1>
                        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest font-mono flex items-center gap-1 mt-0.5">
                            {activeCommunityId ? communities.find(c => c.id === activeCommunityId)?.description || "Community discussions" : "Share setups, coordinate execution targets, and trade together"}
                        </p>
                    </div>
                    {!activeCommunityId && (
                        <div className="flex bg-black/35 border border-zinc-800/60 p-1 rounded-xl font-mono text-[10px]">
                            <button onClick={() => setFeedFilter("Global")} className={`px-4 py-1.5 rounded-lg font-bold transition-all ${feedFilter === "Global" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-350"}`}>Global</button>
                            <button onClick={() => setFeedFilter("Following")} className={`px-4 py-1.5 rounded-lg font-bold transition-all ${feedFilter === "Following" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-350"}`}>Following</button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4 pb-12">

                    {/* Create Post */}
                    <div className="bg-[#111118] border border-zinc-800/40 rounded-xl p-5 shadow-xl">
                        <div className="flex items-start gap-4">
                            <img src={profile.avatar} alt="Profile" className="w-9 h-9 rounded-full bg-black/25" />
                            <div className="flex-1">
                                <textarea
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                    placeholder="Share a trade setup, chart annotation, or market idea..."
                                    className="w-full bg-transparent border-none outline-none focus:ring-0 resize-none text-white placeholder:text-zinc-650 p-0 text-sm min-h-[60px]"
                                />

                                {/* Signal Inputs */}
                                {isSignal && (
                                    <div className="mt-3 bg-black/25 p-4 rounded-xl border border-zinc-850 flex flex-wrap gap-3 items-center font-mono text-[10px]">
                                        
                                        <div className="flex flex-col gap-1 w-full sm:w-auto flex-1">
                                            <label className="text-[8px] uppercase font-bold text-zinc-550 flex items-center gap-1"><Crosshair className="w-3 h-3"/> Strategy</label>
                                            <select 
                                                value={signalStrategy} 
                                                onChange={e => handleAutoStrategyFill(e.target.value)} 
                                                className="bg-[#111118] border border-zinc-800/60 rounded-lg px-2 py-1.5 text-xs text-zinc-305 focus:outline-none w-full"
                                            >
                                                <option value="Custom">Custom Entry</option>
                                                <option value="Scalp (1:1.5)">Scalp (1:1.5 RRR)</option>
                                                <option value="Day Trade (1:2)">Day Trade (1:2 RRR)</option>
                                                <option value="Swing (1:3)">Swing (1:3 RRR)</option>
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1 w-24">
                                            <label className="text-[8px] uppercase font-bold text-zinc-550">Pair</label>
                                            <select value={signalPair} onChange={e => {
                                                setSignalPair(e.target.value);
                                                if (signalStrategy !== "Custom") handleAutoStrategyFill(signalStrategy);
                                            }} className="bg-[#111118] border border-zinc-800/60 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
                                                <option value="XAUUSD">XAUUSD</option>
                                                <option value="EURUSD">EURUSD</option>
                                                <option value="GBPUSD">GBPUSD</option>
                                                <option value="USDJPY">USDJPY</option>
                                                <option value="AUDUSD">AUDUSD</option>
                                                <option value="USDCAD">USDCAD</option>
                                                <option value="BTCUSD">BTCUSD</option>
                                                <option value="ETHUSD">ETHUSD</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1 w-24">
                                            <label className="text-[8px] uppercase font-bold text-zinc-550">Dir.</label>
                                            <select value={signalDirection} onChange={e => {
                                                setSignalDirection(e.target.value as any);
                                                if (signalStrategy !== "Custom") handleAutoStrategyFill(signalStrategy);
                                            }} className="bg-[#111118] border border-zinc-800/60 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
                                                <option value="Long">Long</option>
                                                <option value="Short">Short</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1 w-32">
                                            <label className="text-[8px] uppercase font-bold text-emerald-500 flex items-center gap-1"><Target className="w-3 h-3"/> TP {priceLoading && <span className="text-[8px] animate-pulse text-zinc-600">fetching...</span>}</label>
                                            <input type="number" step="0.001" value={signalTP} onChange={e => setSignalTP(e.target.value)} className="bg-black/35 border border-zinc-800/60 rounded-lg px-2 py-1 text-xs font-mono focus:border-emerald-500/50 w-full" placeholder="0.00" />
                                        </div>
                                        <div className="flex flex-col gap-1 w-32">
                                            <label className="text-[8px] uppercase font-bold text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> SL {priceLoading && <span className="text-[8px] animate-pulse text-zinc-600">fetching...</span>}</label>
                                            <input type="number" step="0.001" value={signalSL} onChange={e => setSignalSL(e.target.value)} className="bg-black/35 border border-zinc-800/60 rounded-lg px-2 py-1 text-xs font-mono focus:border-red-500/50 w-full" placeholder="0.00" />
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-850">
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                id="post-image"
                                                className="hidden" 
                                                onChange={(e) => uploadImageHandler(e, setNewPostImage, setUploadingPostImage)}
                                            />
                                            <label 
                                                htmlFor="post-image"
                                                className={`p-2 rounded-lg cursor-pointer flex transition-colors ${newPostImage ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-500 hover:bg-black/20'}`}
                                                title="Attach Image"
                                            >
                                                <ImageIcon className={`w-4 h-4 ${uploadingPostImage ? 'animate-pulse' : ''}`} />
                                            </label>
                                            {newPostImage && (
                                                <button 
                                                    onClick={() => setNewPostImage("")}
                                                    className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center text-[10px] text-white"
                                                >
                                                    <X className="w-2 h-2" />
                                                </button>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => setIsSignal(!isSignal)}
                                            className={`p-2 rounded-lg transition-colors ${isSignal ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-500 hover:bg-black/20'}`}
                                            title="Attach Trade Signal"
                                        >
                                            <TrendingUp className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <button
                                        onClick={handlePost}
                                        disabled={!newPostContent.trim()}
                                        className="bg-emerald-500 text-emerald-950 font-mono font-black text-[10px] uppercase tracking-wider px-5 py-2 rounded-lg disabled:opacity-30 transition-all flex items-center gap-1.5"
                                    >
                                        <Send className="w-3.5 h-3.5" /> Post Feed
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Posts Feed */}
                    {(feedFilter === "Following" ? posts.filter(p => followingIds.includes(p.author.userId) || p.author.userId === (session?.user?.email || "demo-user-1")) : posts).map(post => (
                        <div key={post.id} className="bg-[#111118] border border-zinc-800/40 rounded-xl p-5 shadow-xl font-sans">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img src={post.author.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Unknown"} alt="Avatar" className="w-9 h-9 rounded-full bg-black/25" />
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2 font-mono">
                                            <span className="font-bold text-xs text-white">{post.author.name}</span>
                                            {(() => {
                                                const tier = getTraderTier(post.author.userId);
                                                return (
                                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1 ${tier.color}`}>
                                                       <span>{tier.icon}</span> {tier.name}
                                                    </span>
                                                );
                                            })()}
                                            {post.author.tradeStyle && (
                                                <span className="text-[8px] font-black px-2 py-0.5 rounded bg-black/25 text-zinc-400 uppercase tracking-widest border border-zinc-850">
                                                    {post.author.tradeStyle}
                                                </span>
                                            )}
                                            {post.author.userId !== (session?.user?.email || "demo-user-1") && (
                                                <button onClick={() => toggleFollow(post.author.userId)} className="text-[8px] font-black px-2 py-0.5 rounded bg-white/5 border border-white/5 text-zinc-350 hover:bg-white/10 transition-colors uppercase tracking-wider">
                                                    {followingIds.includes(post.author.userId) ? <span className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5"/> Following</span> : <span className="flex items-center gap-1"><UserPlus className="w-3.5 h-3.5"/> Follow</span>}
                                                </button>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-zinc-550 font-mono mt-0.5 block">{formatTime(post.createdAt)}</span>
                                    </div>
                                </div>
                                
                                {(session?.user?.email === post.author.userId || session?.user?.email === "rousrendo@gmail.com" || (!session?.user?.email && post.author.userId === "demo-user-1")) && (
                                    <div className="flex items-center gap-2 z-10">
                                        <button 
                                            onClick={() => {
                                                setEditingPostId(post.id);
                                                setEditContent(post.content);
                                            }}
                                            className="p-1.5 text-zinc-500 hover:text-white rounded transition-colors"
                                            title="Edit Post"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDeletePost(post.id)}
                                            className="p-1.5 text-red-500/70 hover:text-red-400 rounded transition-colors"
                                            title="Delete Post"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 text-xs leading-relaxed text-zinc-200">
                                {editingPostId === post.id ? (
                                    <div className="flex flex-col gap-2 font-mono">
                                        <textarea
                                            value={editContent}
                                            onChange={e => setEditContent(e.target.value)}
                                            className="w-full bg-black/25 border border-zinc-800/50 rounded-lg p-3 text-xs focus:outline-none focus:border-blue-500/55 min-h-[80px]"
                                        />
                                        <div className="flex justify-end gap-2 text-[9px] font-bold uppercase tracking-wider">
                                            <button 
                                                onClick={() => {
                                                    setEditingPostId(null);
                                                    setEditContent("");
                                                }}
                                                className="px-3 py-1.5 text-zinc-500 hover:text-white rounded"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                onClick={() => handleEditPost(post.id)}
                                                className="px-3 py-1.5 bg-blue-600 text-white rounded"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>{post.content}</>
                                )}
                            </div>

                            {/* Trade Pill Attachment */}
                            {post.pair && (
                                <div className="mt-4 flex flex-wrap gap-2 font-mono text-[10px] font-bold">
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded border ${post.direction === 'Long' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-405 border-red-500/20'}`}>
                                        {post.direction === 'Long' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                        {post.pair} {post.direction}
                                    </div>
                                    {post.entry && (
                                        <div className="flex items-center px-2.5 py-1 rounded bg-black/25 border border-zinc-800/40 text-zinc-450">
                                            Entry: <span className="ml-1 text-white">{post.entry}</span>
                                        </div>
                                    )}
                                    {post.tp && (
                                        <div className="flex items-center px-2.5 py-1 rounded bg-emerald-500/5 border border-emerald-500/15 text-emerald-400">
                                            TP: <span className="ml-1">{post.tp}</span>
                                        </div>
                                    )}
                                    {post.sl && (
                                        <div className="flex items-center px-2.5 py-1 rounded bg-red-500/5 border border-red-500/15 text-red-400">
                                            SL: <span className="ml-1">{post.sl}</span>
                                        </div>
                                    )}
                                    {post.result && (
                                        <div className="flex items-center px-2.5 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">
                                            {post.result}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Execute Signal Button */}
                            {post.pair && post.tp && post.sl && (
                                <div className="mt-4 bg-black/20 border border-zinc-850 rounded-xl p-4 font-mono text-[10px]">
                                    <div className="flex items-center justify-between mb-3 font-bold">
                                        <span className="text-zinc-500 flex items-center gap-1"><AlertCircle className="w-4 h-4"/> Auto-Risk Allocation</span>
                                        <span className={((executionRisk[post.id] || globalRisk) > 2) ? 'text-red-400' : 'text-emerald-450'}>
                                            {(executionRisk[post.id] || globalRisk).toFixed(1)}% of Balance
                                        </span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="0.1" 
                                        max="5" 
                                        step="0.1" 
                                        value={executionRisk[post.id] || globalRisk}
                                        onChange={(e) => setExecutionRisk({...executionRisk, [post.id]: parseFloat(e.target.value)})}
                                        className="w-full appearance-none bg-black/35 border border-zinc-850 h-2 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-emerald-500 cursor-pointer mb-4"
                                    />
                                    <button 
                                        onClick={() => executeSignal(post)}
                                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md uppercase tracking-wider text-[11px]"
                                    >
                                        <Zap className="w-4 h-4 fill-current animate-pulse" /> 1-Click Execution
                                    </button>
                                    {copiedSignals.includes(post.id) && (
                                        <div className="mt-3 text-[9px] font-bold text-center text-emerald-450 flex items-center justify-center gap-1">
                                            <CheckCircle2 className="w-3.5 h-3.5"/> You and {(post._count?.likes || 0) * 3 + 12} others copied this signal
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Image Attachment */}
                            {post.image && (
                                <div className="mt-4 rounded-lg overflow-hidden border border-zinc-850">
                                    <img src={post.image} alt="Post attachment" className="w-full object-cover max-h-[300px]" />
                                </div>
                            )}

                            {/* Actions */}
                            <div className="mt-5 flex items-center justify-between border-t border-zinc-850 pt-4">
                                <button
                                    onClick={() => handleLike(post.id)}
                                    className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-550 hover:text-red-400 transition-colors group"
                                >
                                    <Heart className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    {post._count?.likes > 0 && <span>{post._count.likes}</span>}
                                </button>
                                <button
                                    onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                                    className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-550 hover:text-blue-400 transition-colors group"
                                >
                                    <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    {post.comments.length > 0 && <span>{post.comments.length}</span>}
                                </button>
                                <button className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-550 hover:text-white transition-colors group">
                                    <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>

                            {/* Comments Section */}
                            {activeCommentPostId === post.id && (
                                <div className="mt-4 bg-black/20 border border-zinc-850 p-4 rounded-xl space-y-4 font-mono text-[10px]">
                                    {post.comments.length > 0 ? (
                                        <div className="space-y-3">
                                            {post.comments.map(c => (
                                                <div key={c.id} className="flex items-start gap-3">
                                                    <img src={c.avatar} alt="Avatar" className="w-7 h-7 rounded-full bg-black/25" />
                                                    <div className="bg-[#111118] border border-zinc-850 p-3 rounded-lg text-zinc-300 flex-1">
                                                        <div className="flex items-center justify-between mb-1 text-[9px] font-bold text-zinc-500">
                                                            <span className="font-bold text-zinc-300">{(c.author as any)?.name || c.author}</span>
                                                            <span>{formatTime((c as any).createdAt || c.timestamp)}</span>
                                                        </div>
                                                        <p className="text-zinc-200 text-xs">{c.content}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-zinc-650 text-center italic py-2">No comments yet. Be the first!</p>
                                    )}

                                    <div className="flex gap-2 items-center mt-2">
                                        <img src={profile.avatar} alt="Me" className="w-7 h-7 rounded-full bg-black/25" />
                                        <input
                                            type="text"
                                            className="flex-1 bg-black/25 border border-zinc-800/50 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-blue-500/50 text-white font-mono placeholder-zinc-700"
                                            placeholder="Write a comment..."
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleComment(post.id); }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                </div>
            </div>

            {/* ─── SIDEBAR / PROFILE ─── */}
            <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4 lg:mt-4">

                {/* Profile Link Card */}
                <div className="bg-[#111118] border border-zinc-800/40 rounded-xl overflow-hidden shadow-xl">
                    <div className="h-14 bg-gradient-to-br from-emerald-500/10 to-blue-600/5" />
                    <div className="px-5 pb-5 -mt-8 relative font-mono text-[10px] text-zinc-500">
                        <img
                            src={profile.avatar}
                            alt="Avatar"
                            className="w-14 h-14 rounded-lg border-2 border-zinc-800 bg-black shadow-md"
                        />
                        <div className="mt-2.5">
                            <h2 className="text-sm font-bold truncate text-white">{profile.name}</h2>
                            <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider mt-0.5">{profile.tradeStyle}</p>
                        </div>
                        <div className="w-full grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-zinc-850">
                            <div className="text-center">
                                <p className="text-base font-black text-white font-mono">
                                    {posts.filter(p => p.author.name === profile.name).length}
                                </p>
                                <p className="text-[8px] uppercase text-zinc-550 font-bold leading-none mt-0.5">Posts</p>
                            </div>
                            <div className="text-center">
                                <p className="text-base font-black text-white font-mono">
                                    {posts.reduce((acc, p) => p.author.name === profile.name ? acc + (p._count?.likes || 0) : acc, 0)}
                                </p>
                                <p className="text-[8px] uppercase text-zinc-555 font-bold leading-none mt-0.5">Likes</p>
                            </div>
                        </div>
                        <Link href="/profile" className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider text-[9px] transition-colors">
                            <User className="w-3.5 h-3.5" /> View Profile
                        </Link>
                    </div>
                </div>

                {/* Explore Communities */}
                <div className="bg-[#111118] border border-zinc-800/40 rounded-xl p-5 shadow-xl flex flex-col max-h-[400px]">
                    <div className="flex items-center justify-between mb-4 font-mono text-[9px] font-bold">
                        <h3 className="flex items-center gap-1.5 uppercase tracking-widest text-zinc-500">
                            <Users className="w-4 h-4" /> Explore Spaces
                        </h3>
                        {isPro && (
                            <button onClick={() => setIsCreateCommunityModalOpen(true)} className="text-[9px] text-emerald-450 border border-emerald-500/25 px-2 py-0.5 bg-emerald-500/5 rounded font-black hover:bg-emerald-500/10">
                                + NEW
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => setActiveCommunityId(null)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all mb-3 ${!activeCommunityId ? 'bg-emerald-505 bg-emerald-500 text-emerald-950' : 'hover:bg-black/25 bg-black/10 text-zinc-450 border border-zinc-850'}`}
                    >
                        🌍 Global Feed
                    </button>

                    <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar shrink-0 flex-1 min-h-0 font-mono text-[10px]">
                        {communities.map(c => {
                            const isMember = profile.communities?.some(pc => pc.id === c.id);
                            const isActive = activeCommunityId === c.id;

                            return (
                                <div
                                    key={c.id}
                                    className={`p-3 rounded-lg border flex flex-col gap-1.5 transition-colors cursor-pointer ${isActive ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-black/20 border-zinc-850 hover:bg-black/35'}`}
                                    onClick={() => setActiveCommunityId(c.id)}
                                >
                                    {isActive && c.image && (
                                        <div className="w-full h-16 rounded-md bg-cover bg-center mb-1" style={{ backgroundImage: `url(${c.image})` }} />
                                    )}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            {!isActive && c.image && <img src={c.image} alt="Logo" className="w-5 h-5 rounded object-cover" />}
                                            <span className={`font-bold text-xs leading-tight ${isActive ? 'text-emerald-400' : 'text-zinc-200'}`}>{c.name}</span>
                                        </div>
                                        {!isMember ? (
                                            <button onClick={(e) => { e.stopPropagation(); joinCommunity(c.id); }} className="shrink-0 text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-black hover:bg-emerald-500 hover:text-emerald-950 transition-all uppercase tracking-wider">Join</button>
                                        ) : (
                                            <button onClick={(e) => { e.stopPropagation(); leaveCommunity(c.id); }} className="shrink-0 text-[8px] bg-red-500/10 text-red-405 border border-red-500/20 px-2 py-0.5 rounded font-black hover:bg-red-500 hover:text-white transition-all uppercase tracking-wider">Leave</button>
                                        )}
                                    </div>
                                    {c.description && <span className="text-[10px] text-zinc-550 line-clamp-2 leading-relaxed">{c.description}</span>}
                                    <span className="text-[9px] font-medium text-zinc-600 mt-0.5"><Users className="w-3 h-3 inline mr-1" />{c._count?.members || 0} members</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

            </div>

            {isCreateCommunityModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[#111118] border border-zinc-800/40 rounded-xl p-5 w-full max-w-sm shadow-2xl relative font-mono text-[10px]">
                        <h2 className="text-xs font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-white">
                            <Users className="w-4 h-4 text-emerald-450" /> Create Space
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest">Space Logo</label>
                                <div className="flex items-center gap-3 mt-1.5">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        id="comm-image"
                                        className="hidden" 
                                        onChange={(e) => uploadImageHandler(e, setNewCommunityImage, setUploadingCommImage)}
                                    />
                                    <label 
                                        htmlFor="comm-image"
                                        className="w-12 h-12 rounded-lg border border-dashed border-zinc-800 flex items-center justify-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-500/5 transition-colors flex-shrink-0 relative overflow-hidden"
                                    >
                                        {newCommunityImage ? (
                                            <img src={newCommunityImage} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className={`w-4 h-4 text-zinc-650 ${uploadingCommImage ? 'animate-pulse' : ''}`} />
                                        )}
                                    </label>
                                    <div className="flex-1 text-[9px] text-zinc-550 leading-relaxed">
                                        Upload a space emblem. Representative of your target instruments or session.
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest">Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. ICT Gold Hunters"
                                    value={newCommunityName}
                                    onChange={e => setNewCommunityName(e.target.value)}
                                    className="w-full bg-black/25 border border-zinc-800/50 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500/50 text-white"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest">Description</label>
                                <textarea
                                    placeholder="What is this space about?"
                                    value={newCommunityDesc}
                                    onChange={e => setNewCommunityDesc(e.target.value)}
                                    className="w-full bg-black/25 border border-zinc-800/50 rounded-lg px-3.5 py-2 text-xs focus:outline-none focus:border-emerald-500/50 text-white resize-none h-20"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6 uppercase font-bold tracking-wider text-[9px]">
                            <button
                                onClick={handleCreateCommunity}
                                disabled={!newCommunityName.trim() || uploadingCommImage}
                                className="flex-1 bg-emerald-500 text-emerald-950 py-2 rounded-lg disabled:opacity-50 font-black"
                            >
                                {uploadingCommImage ? "Uploading..." : "Create"}
                            </button>
                            <button
                                onClick={() => setIsCreateCommunityModalOpen(false)}
                                className="flex-1 bg-black/25 border border-zinc-800 text-zinc-350 py-2 rounded-lg"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

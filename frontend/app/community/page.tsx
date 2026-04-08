
"use client";

import React, { useState, useEffect } from "react";
import { Menu, Zap, TrendingUp, Compass, Users, Clock, Filter, Sparkles, MessageSquare, Play, RefreshCw, BarChart2, Briefcase, Plus, Send, Heart, Reply, Share, Activity, Search, AlertCircle, Bookmark, Eye, CornerDownRight, ThumbsUp, ChevronDown, User, Edit3, Image as ImageIcon, Share2, TrendingDown, Crosshair, Target, Trash2, Save, X, MoreHorizontal, UserCheck, UserPlus, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";

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

export default function CommunityPage() {
    const { data: session } = useSession();
    const isPro = (session?.user as any)?.isPro === true;

    const getTraderTier = (userId: string) => {
        // Deterministic UI badge mapping based on userId length
        const hl = userId.length;
        if (hl % 3 === 0) return { name: "Elite", icon: "👑", color: "bg-amber-500/20 text-amber-500 border border-amber-500/30" };
        if (hl % 2 === 0) return { name: "Pro", icon: "⚡", color: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" };
        return { name: "Novice", icon: "🌱", color: "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30" };
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
            const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
            const res = await fetch(`${backend}/api/community/profile`);
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
            }
        } catch (e) { }
    };

    const fetchCommunities = async () => {
        try {
            const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
            const res = await fetch(`${backend}/api/community/list`);
            if (res.ok) setCommunities(await res.json());
        } catch (e) { }
    };

    const fetchPosts = async (cid?: string | null) => {
        try {
            const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
            const url = cid ? `${backend}/api/community/posts?communityId=${cid}` : `${backend}/api/community/posts`;
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
            const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/upload`, { headers: { "ngrok-skip-browser-warning": "true" }, 
                method: "POST",
                body: formData
            });
            if (uploadRes.ok) {
                const data = await uploadRes.json();
                if (data.success) {
                    setter(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}${data.data.url}`);
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

        // Strategy → { slPips, tpPips }
        const strategyPips: Record<string, { sl: number; tp: number }> = {
            "Scalp (1:1.5)":  { sl: 10, tp: 15 },
            "Day Trade (1:2)": { sl: 20, tp: 40 },
            "Swing (1:3)":    { sl: 50, tp: 150 },
        };
        const pips = strategyPips[strategy];
        if (!pips) return;

        try {
            setPriceLoading(true);
            const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5003";
            const res = await fetch(`${bridgeUrl}/api/symbol-price?symbol=${signalPair.toUpperCase()}`, { headers: { "ngrok-skip-browser-warning": "true" } });
            if (!res.ok) throw new Error("Bridge not reachable");
            const data = await res.json();
            if (!data.success) throw new Error(data.error || "Price fetch failed");

            // Use mid-price (ask for long, bid for short estimate)
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
            // Fallback: if bridge unreachable, just clear so user types manually
            setSignalTP("");
            setSignalSL("");
        } finally {
            setPriceLoading(false);
        }
    };

    const handlePost = async () => {
        if (!newPostContent.trim()) return;

        try {
            const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
            const res = await fetch(`${backend}/api/community/posts`, {
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

                // 🚨 NEW AUTO-BROADCAST LOGIC:
                // If admin posts a Signal on the Global feed, ping Discord/Telegram directly!
                if (session?.user?.email === "rousrendo@gmail.com" && !activeCommunityId && isSignal) {
                    try {
                        const message = `🚨 **NEW SIGNAL ALERT: ${signalPair.toUpperCase()}** 🚨\n\n**Direction:** ${signalDirection}\n**Entry Target:** ${signalEntry || "Market Price"}\n**Take Profit:** ${signalTP || "Open"}\n**Stop Loss:** ${signalSL || "Open"}\n\n📝 **Notes:** ${newPostContent}\n\n⚡ Execute this exact trade instantly with auto-calculated risk on TradeKiller Pro:\nhttps://tradekiller.com/community`;
                        const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5003";
                        fetch(`${bridgeUrl}/api/notify`, {
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
            const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
            const res = await fetch(`${backend}/api/community/posts/${postId}`, {
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
            const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
            const res = await fetch(`${backend}/api/community/posts/${postId}`, {
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
            const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
            const res = await fetch(`${backend}/api/community/list`, {
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
            const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
            const res = await fetch(`${backend}/api/community/list/${cid}/join`, { method: "POST" });
            if (res.ok) { fetchProfile(); fetchCommunities(); }
        } catch (e) { }
    };

    const leaveCommunity = async (cid: string) => {
        try {
            const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
            const res = await fetch(`${backend}/api/community/list/${cid}/leave`, { method: "POST" });
            if (res.ok) { fetchProfile(); fetchCommunities(); }
        } catch (e) { }
    };

    const handleLike = async (postId: string) => {
        try {
            const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
            const res = await fetch(`${backend}/api/community/posts/${postId}/like`, { method: "POST" });
            if (res.ok) {
                fetchPosts(); // Refresh likes
            }
        } catch (e) { }
    };

    const handleComment = async (postId: string) => {
        if (!commentText.trim()) return;

        try {
            const backend = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
            const res = await fetch(`${backend}/api/community/posts/${postId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: commentText }),
            });
            if (res.ok) {
                fetchPosts(); // Refresh comments
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

        // Ensure user confirms
        if (!window.confirm(`Execute ${post.direction} on ${post.pair} risking ${risk}% of your balance?\nTP: ${post.tp} | SL: ${post.sl}`)) {
            return;
        }

        try {
            const bridgeUrl = process.env.NEXT_PUBLIC_BRIDGE_URL || "http://localhost:5003";
            const res = await fetch(`${bridgeUrl}/api/execute-signal`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    symbol: post.pair,
                    action: post.direction?.toLowerCase() || 'buy',
                    tp: parseFloat(post.tp),
                    sl: parseFloat(post.sl),
                    risk: risk,
                    // the python bridge will calculate lot size automatically based on SL distance and balance
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
        <div className="flex flex-col lg:flex-row gap-6 lg:max-h-[calc(100vh-6rem)] relative overflow-hidden lg:overflow-visible">

            {/* ─── MAIN FEED ─── */}
            <div className="flex-1 flex flex-col min-w-0 lg:max-h-full">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
                            <Users className="w-8 h-8 text-primary" />
                            {activeCommunityId ? communities.find(c => c.id === activeCommunityId)?.name || "Community" : "Global Hub"}
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            {activeCommunityId ? communities.find(c => c.id === activeCommunityId)?.description || "Community discussions" : "Share setups, get un-stuck, and trade together."}
                        </p>
                    </div>
                    {!activeCommunityId && (
                        <div className="flex bg-secondary/50 p-1 rounded-xl">
                            <button onClick={() => setFeedFilter("Global")} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${feedFilter === "Global" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Global</button>
                            <button onClick={() => setFeedFilter("Following")} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${feedFilter === "Following" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Following</button>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-12">

                    {/* Create Post */}
                    <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-start gap-4">
                            <img src={profile.avatar} alt="Profile" className="w-10 h-10 rounded-full bg-secondary" />
                            <div className="flex-1">
                                <textarea
                                    value={newPostContent}
                                    onChange={(e) => setNewPostContent(e.target.value)}
                                    placeholder="Share a trade setup or an idea..."
                                    className="w-full bg-transparent border-none focus:ring-0 resize-none text-foreground placeholder:text-muted-foreground/60 p-0 text-lg min-h-[60px]"
                                />

                                {/* Signal Inputs */}
                                {isSignal && (
                                    <div className="mt-3 bg-secondary/30 p-4 rounded-xl border border-secondary flex flex-wrap gap-3 items-center">
                                        
                                        <div className="flex flex-col gap-1 w-full sm:w-auto flex-1">
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1"><Crosshair className="w-3 h-3"/> Strategy</label>
                                            <select 
                                                value={signalStrategy} 
                                                onChange={e => handleAutoStrategyFill(e.target.value)} 
                                                className="bg-card border border-border/50 rounded-md px-2 py-1.5 text-sm font-bold text-foreground focus:outline-none w-full"
                                            >
                                                <option value="Custom">Custom Entry</option>
                                                <option value="Scalp (1:1.5)">Scalp (1:1.5 RRR)</option>
                                                <option value="Day Trade (1:2)">Day Trade (1:2 RRR)</option>
                                                <option value="Swing (1:3)">Swing (1:3 RRR)</option>
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1 w-24">
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Pair</label>
                                            <select value={signalPair} onChange={e => {
                                                setSignalPair(e.target.value);
                                                if (signalStrategy !== "Custom") handleAutoStrategyFill(signalStrategy);
                                            }} className="bg-card border border-border/50 rounded-md px-2 py-1.5 text-sm font-bold text-foreground focus:outline-none">
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
                                            <label className="text-[10px] uppercase font-bold text-muted-foreground">Dir.</label>
                                            <select value={signalDirection} onChange={e => {
                                                setSignalDirection(e.target.value as any);
                                                if (signalStrategy !== "Custom") handleAutoStrategyFill(signalStrategy);
                                            }} className="bg-card border border-border/50 rounded-md px-2 py-1.5 text-sm font-bold text-foreground focus:outline-none">
                                                <option value="Long">Long</option>
                                                <option value="Short">Short</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-1 w-32">
                                            <label className="text-[10px] uppercase font-bold text-emerald-500 flex items-center gap-1"><Target className="w-3 h-3"/> TP {priceLoading && <span className="text-[9px] animate-pulse text-muted-foreground">fetching...</span>}</label>
                                            <input type="number" step="0.001" value={signalTP} onChange={e => setSignalTP(e.target.value)} className="bg-card border border-border/50 rounded-md px-2 py-1.5 text-sm font-mono focus:border-emerald-500/50 w-full" placeholder="0.00" />
                                        </div>
                                        <div className="flex flex-col gap-1 w-32">
                                            <label className="text-[10px] uppercase font-bold text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> SL {priceLoading && <span className="text-[9px] animate-pulse text-muted-foreground">fetching...</span>}</label>
                                            <input type="number" step="0.001" value={signalSL} onChange={e => setSignalSL(e.target.value)} className="bg-card border border-border/50 rounded-md px-2 py-1.5 text-sm font-mono focus:border-red-500/50 w-full" placeholder="0.00" />
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
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
                                                className={`p-2 rounded-full cursor-pointer flex transition-colors ${newPostImage ? 'text-primary bg-primary/20' : 'text-muted-foreground hover:bg-secondary/80'}`}
                                                title="Attach Image"
                                            >
                                                <ImageIcon className={`w-5 h-5 ${uploadingPostImage ? 'animate-pulse' : ''}`} />
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
                                            className={`p-2 rounded-full transition-colors ${isSignal ? 'text-primary bg-primary/20' : 'text-muted-foreground hover:bg-secondary/80'}`}
                                            title="Attach Trade Signal"
                                        >
                                            <TrendingUp className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <button
                                        onClick={handlePost}
                                        disabled={!newPostContent.trim()}
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-2 rounded-xl text-sm flex items-center gap-2 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                                    >
                                        <Send className="w-4 h-4" /> Post
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Posts Feed */}
                    {(feedFilter === "Following" ? posts.filter(p => followingIds.includes(p.author.userId) || p.author.userId === (session?.user?.email || "demo-user-1")) : posts).map(post => (
                        <div key={post.id} className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img src={post.author.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Unknown"} alt="Avatar" className="w-10 h-10 rounded-full bg-secondary" />
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-bold text-[15px]">{post.author.name}</span>
                                            {(() => {
                                                const tier = getTraderTier(post.author.userId);
                                                return (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1 ${tier.color}`}>
                                                       <span>{tier.icon}</span> {tier.name}
                                                    </span>
                                                );
                                            })()}
                                            {post.author.tradeStyle && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/80 text-secondary-foreground uppercase tracking-wide">
                                                    {post.author.tradeStyle}
                                                </span>
                                            )}
                                            {post.author.userId !== (session?.user?.email || "demo-user-1") && (
                                                <button onClick={() => toggleFollow(post.author.userId)} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                                                    {followingIds.includes(post.author.userId) ? <span className="flex items-center gap-1"><UserCheck className="w-3 h-3"/> Following</span> : <span className="flex items-center gap-1"><UserPlus className="w-3 h-3"/> Follow</span>}
                                                </button>
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{formatTime(post.createdAt)}</span>
                                    </div>
                                </div>
                                
                                {/* Edit & Delete Actions (Only visible to Author or Admin) */}
                                {(session?.user?.email === post.author.userId || session?.user?.email === "rousrendo@gmail.com" || (!session?.user?.email && post.author.userId === "demo-user-1")) && (
                                    <div className="flex items-center gap-2 z-10">
                                        {/* Dropdown can be used, using simple buttons for speed */}
                                        <button 
                                            onClick={() => {
                                                setEditingPostId(post.id);
                                                setEditContent(post.content);
                                            }}
                                            className="p-1.5 text-muted-foreground hover:bg-secondary rounded-full transition-colors"
                                            title="Edit Post"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDeletePost(post.id)}
                                            className="p-1.5 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-colors"
                                            title="Delete Post"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 text-[15px] leading-relaxed text-foreground">
                                {editingPostId === post.id ? (
                                    <div className="flex flex-col gap-2">
                                        <textarea
                                            value={editContent}
                                            onChange={e => setEditContent(e.target.value)}
                                            className="w-full bg-secondary/30 rounded-lg p-3 text-sm border-none focus:outline-none focus:ring-1 focus:ring-primary min-h-[80px]"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => {
                                                    setEditingPostId(null);
                                                    setEditContent("");
                                                }}
                                                className="px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-secondary rounded-lg transition-colors flex items-center gap-1"
                                            >
                                                <X className="w-3 h-3" /> Cancel
                                            </button>
                                            <button 
                                                onClick={() => handleEditPost(post.id)}
                                                className="px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors flex items-center gap-1"
                                            >
                                                <Save className="w-3 h-3" /> Save Changes
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>{post.content}</>
                                )}
                            </div>

                            {/* Trade Pill Attachment */}
                            {post.pair && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold border ${post.direction === 'Long' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                        {post.direction === 'Long' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                        {post.pair} {post.direction}
                                    </div>
                                    {post.entry && (
                                        <div className="flex items-center px-3 py-1.5 rounded-lg bg-secondary/40 text-sm font-medium border border-border/50 text-muted-foreground">
                                            Entry: <span className="font-mono ml-1 text-foreground">{post.entry}</span>
                                        </div>
                                    )}
                                    {post.tp && (
                                        <div className="flex items-center px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm font-medium text-emerald-500">
                                            TP: <span className="font-mono ml-1">{post.tp}</span>
                                        </div>
                                    )}
                                    {post.sl && (
                                        <div className="flex items-center px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm font-medium text-red-500">
                                            SL: <span className="font-mono ml-1">{post.sl}</span>
                                        </div>
                                    )}
                                    {post.result && (
                                        <div className="flex items-center px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm font-bold text-primary">
                                            {post.result}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Execute Signal Button & Risk Adj */}
                            {post.pair && post.tp && post.sl && (
                                <div className="mt-4 bg-secondary/10 border border-border/50 rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-3 text-sm font-bold">
                                        <span className="text-muted-foreground flex items-center gap-1"><AlertCircle className="w-4 h-4"/> Auto-Risk Allocation</span>
                                        <span className={((executionRisk[post.id] || globalRisk) > 2) ? 'text-red-500' : 'text-primary'}>
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
                                        className="w-full appearance-none bg-secondary/80 h-2 rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary cursor-pointer mb-4"
                                    />
                                    <button 
                                        onClick={() => executeSignal(post)}
                                        className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-primary/20"
                                    >
                                        <Zap className="w-5 h-5 fill-current" /> Execute 1-Click Trade
                                    </button>
                                    {copiedSignals.includes(post.id) && (
                                        <div className="mt-3 text-[11px] font-bold text-center text-emerald-500 flex items-center justify-center gap-1">
                                            <CheckCircle2 className="w-3 h-3"/> You and {(post._count?.likes || 0) * 3 + 12} others copied this signal
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Image Attachment */}
                            {post.image && (
                                <div className="mt-4 rounded-xl overflow-hidden border border-border/50">
                                    <img src={post.image} alt="Post attachment" className="w-full object-cover max-h-[300px]" />
                                </div>
                            )}

                            {/* Actions */}
                            <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
                                <button
                                    onClick={() => handleLike(post.id)}
                                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-red-400 transition-colors group"
                                >
                                    <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    {post._count?.likes > 0 && <span>{post._count.likes}</span>}
                                </button>
                                <button
                                    onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group"
                                >
                                    <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    {post.comments.length > 0 && <span>{post.comments.length}</span>}
                                </button>
                                <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
                                    <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>

                            {/* Comments Section */}
                            {activeCommentPostId === post.id && (
                                <div className="mt-4 bg-secondary/20 p-4 rounded-xl space-y-4">
                                    {post.comments.length > 0 ? (
                                        <div className="space-y-4">
                                            {post.comments.map(c => (
                                                <div key={c.id} className="flex items-start gap-3">
                                                    <img src={c.avatar} alt="Avatar" className="w-8 h-8 rounded-full bg-secondary" />
                                                    <div className="bg-card border border-border/50 p-3 rounded-2xl rounded-tl-none text-sm text-foreground flex-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-bold">{(c.author as any)?.name || c.author}</span>
                                                            <span className="text-[10px] text-muted-foreground">{formatTime((c as any).createdAt || c.timestamp)}</span>
                                                        </div>
                                                        {c.content}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center italic py-2">No comments yet. Be the first!</p>
                                    )}

                                    <div className="flex gap-2 items-center mt-2">
                                        <img src={profile.avatar} alt="Me" className="w-8 h-8 rounded-full bg-secondary" />
                                        <input
                                            type="text"
                                            className="flex-1 bg-card border border-border/50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
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
            <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6">

                {/* Profile Link Card */}
                <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                    <div className="h-16 bg-gradient-to-br from-primary/30 to-blue-600/20" />
                    <div className="px-5 pb-5 -mt-8 relative">
                        <img
                            src={profile.avatar}
                            alt="Avatar"
                            className="w-16 h-16 rounded-xl border-4 border-card bg-secondary shadow-md"
                        />
                        <div className="mt-2">
                            <h2 className="text-lg font-bold truncate">{profile.name}</h2>
                            <p className="text-xs text-primary font-bold">{profile.tradeStyle}</p>
                        </div>
                        <div className="w-full grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border/50">
                            <div className="text-center">
                                <p className="text-xl font-black text-foreground">
                                    {posts.filter(p => p.author.name === profile.name).length}
                                </p>
                                <p className="text-[10px] uppercase text-muted-foreground font-bold leading-none">Posts</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-black text-foreground">
                                    {posts.reduce((acc, p) => p.author.name === profile.name ? acc + (p._count?.likes || 0) : acc, 0)}
                                </p>
                                <p className="text-[10px] uppercase text-muted-foreground font-bold leading-none">Likes</p>
                            </div>
                        </div>
                        <Link href="/profile" className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-sm font-bold transition-colors">
                            <User className="w-4 h-4" /> View My Profile
                        </Link>
                    </div>
                </div>

                {/* Explore Communities */}
                <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm flex flex-col max-h-[400px]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
                            <Users className="w-4 h-4" /> Explore Spaces
                        </h3>
                        {isPro && (
                            <button onClick={() => setIsCreateCommunityModalOpen(true)} className="text-xs text-primary font-bold hover:underline px-2 py-1 bg-primary/10 rounded-md">
                                + New
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => setActiveCommunityId(null)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold transition-colors mb-3 ${!activeCommunityId ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-secondary/80 bg-secondary/30 text-muted-foreground'}`}
                    >
                        🌍 Global Feed
                    </button>

                    <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar shrink-0 flex-1 min-h-0">
                        {communities.map(c => {
                            const isMember = profile.communities?.some(pc => pc.id === c.id);
                            const isActive = activeCommunityId === c.id;

                            return (
                                <div
                                    key={c.id}
                                    className={`p-3 rounded-xl border flex flex-col gap-1.5 transition-colors cursor-pointer ${isActive ? 'bg-primary/10 border-primary/40' : 'bg-secondary/20 border-border/50 hover:bg-secondary/60'}`}
                                    onClick={() => setActiveCommunityId(c.id)}
                                >
                                    {isActive && c.image && (
                                        <div className="w-full h-16 rounded-md bg-cover bg-center mb-1" style={{ backgroundImage: `url(${c.image})` }} />
                                    )}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            {!isActive && c.image && <img src={c.image} alt="Logo" className="w-6 h-6 rounded-md object-cover" />}
                                            <span className={`font-bold text-sm leading-tight ${isActive ? 'text-primary' : 'text-foreground'}`}>{c.name}</span>
                                        </div>
                                        {!isMember ? (
                                            <button onClick={(e) => { e.stopPropagation(); joinCommunity(c.id); }} className="shrink-0 text-[10px] bg-primary/20 text-primary border border-primary/30 px-2.5 py-1 rounded-md font-bold hover:bg-primary hover:text-white transition-all">Join</button>
                                        ) : (
                                            <button onClick={(e) => { e.stopPropagation(); leaveCommunity(c.id); }} className="shrink-0 text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-2.5 py-1 rounded-md font-bold hover:bg-red-500 hover:text-white transition-all">Leave</button>
                                        )}
                                    </div>
                                    {c.description && <span className="text-xs text-muted-foreground line-clamp-2">{c.description}</span>}
                                    <span className="text-[10px] font-medium text-muted-foreground mt-0.5"><Users className="w-3 h-3 inline mr-1" />{c._count?.members || 0} members</span>
                                </div>
                            )
                        })}
                    </div>
                </div>

            </div>

            {isCreateCommunityModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary" /> Create Community
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Community Image</label>
                                <div className="flex items-center gap-3 mt-1">
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        id="comm-image"
                                        className="hidden" 
                                        onChange={(e) => uploadImageHandler(e, setNewCommunityImage, setUploadingCommImage)}
                                    />
                                    <label 
                                        htmlFor="comm-image"
                                        className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors flex-shrink-0 relative overflow-hidden"
                                    >
                                        {newCommunityImage ? (
                                            <img src={newCommunityImage} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className={`w-5 h-5 text-muted-foreground ${uploadingCommImage ? 'animate-pulse' : ''}`} />
                                        )}
                                    </label>
                                    <div className="flex-1 text-xs text-muted-foreground">
                                        Optional. Upload a logo or banner to represent your community. Make it stand out!
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. ICT Snippets"
                                    value={newCommunityName}
                                    onChange={e => setNewCommunityName(e.target.value)}
                                    className="w-full bg-secondary border border-border/50 rounded-xl px-4 py-2 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</label>
                                <textarea
                                    placeholder="What is this community about?"
                                    value={newCommunityDesc}
                                    onChange={e => setNewCommunityDesc(e.target.value)}
                                    className="w-full bg-secondary border border-border/50 rounded-xl px-4 py-2 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-primary text-foreground resize-none h-24"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={handleCreateCommunity}
                                disabled={!newCommunityName.trim() || uploadingCommImage}
                                className="flex-1 bg-primary text-primary-foreground font-bold py-2.5 rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors"
                            >
                                {uploadingCommImage ? "Uploading..." : "Create"}
                            </button>
                            <button
                                onClick={() => setIsCreateCommunityModalOpen(false)}
                                className="flex-1 bg-secondary text-foreground font-bold py-2.5 rounded-xl hover:bg-secondary/80 transition-colors"
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

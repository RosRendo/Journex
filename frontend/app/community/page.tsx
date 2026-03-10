
"use client";

import React, { useState, useEffect } from "react";
import { Menu, Zap, TrendingUp, Compass, Users, Clock, Filter, Sparkles, MessageSquare, Play, RefreshCw, BarChart2, Briefcase, Plus, Send, Heart, Reply, Share, Activity, Search, AlertCircle, Bookmark, Eye, CornerDownRight, ThumbsUp, ChevronDown, User, Edit3, Image as ImageIcon, Share2, TrendingDown } from "lucide-react";
import Link from "next/link";

interface Comment {
    id: string;
    author: string;
    avatar: string;
    content: string;
    timestamp: string;
}

interface Post {
    id: string;
    author: {
        name: string;
        tradeStyle: string;
        avatar: string;
    };
    content: string;
    image?: string;
    pair?: string;
    direction?: "Long" | "Short";
    entry?: string;
    result?: string;
    _count: { likes: number };
    comments: Comment[];
    createdAt: string;
}

interface Community {
    id: string;
    name: string;
    description: string;
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
    const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
    const [posts, setPosts] = useState<Post[]>([]);
    const [communities, setCommunities] = useState<Community[]>([]);
    const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);

    // New post state
    const [newPostContent, setNewPostContent] = useState("");

    // Create Community state
    const [isCreateCommunityModalOpen, setIsCreateCommunityModalOpen] = useState(false);
    const [newCommunityName, setNewCommunityName] = useState("");
    const [newCommunityDesc, setNewCommunityDesc] = useState("");

    // Commenting state
    const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
    const [commentText, setCommentText] = useState("");

    const fetchProfile = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/community/profile");
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
            }
        } catch (e) { }
    };

    const fetchCommunities = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/community/list");
            if (res.ok) setCommunities(await res.json());
        } catch (e) { }
    };

    const fetchPosts = async (cid?: string | null) => {
        try {
            const url = cid ? `http://localhost:5000/api/community/posts?communityId=${cid}` : "http://localhost:5000/api/community/posts";
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

    const saveProfile = async (p: UserProfile) => {
        try {
            const res = await fetch("http://localhost:5000/api/community/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(p),
            });
            if (res.ok) {
                const updated = await res.json();
                setProfile(updated);
            }
        } catch (e) { }
    };

    const handlePost = async () => {
        if (!newPostContent.trim()) return;

        try {
            const res = await fetch("http://localhost:5000/api/community/posts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content: newPostContent,
                    communityId: activeCommunityId
                }),
            });
            if (res.ok) {
                const created = await res.json();
                setPosts([created, ...posts]);
                setNewPostContent("");
            }
        } catch (e) { }
    };

    const handleCreateCommunity = async () => {
        if (!newCommunityName.trim()) return;
        try {
            const res = await fetch("http://localhost:5000/api/community/list", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newCommunityName, description: newCommunityDesc }),
            });
            if (res.ok) {
                const newComm = await res.json();
                setIsCreateCommunityModalOpen(false);
                setNewCommunityName("");
                setNewCommunityDesc("");
                fetchCommunities();
                fetchProfile();
                setActiveCommunityId(newComm.id);
            }
        } catch (e) { }
    };

    const joinCommunity = async (cid: string) => {
        try {
            const res = await fetch(`http://localhost:5000/api/community/list/${cid}/join`, { method: "POST" });
            if (res.ok) { fetchProfile(); fetchCommunities(); }
        } catch (e) { }
    };

    const leaveCommunity = async (cid: string) => {
        try {
            const res = await fetch(`http://localhost:5000/api/community/list/${cid}/leave`, { method: "POST" });
            if (res.ok) { fetchProfile(); fetchCommunities(); }
        } catch (e) { }
    };

    const handleLike = async (postId: string) => {
        try {
            const res = await fetch(`http://localhost:5000/api/community/posts/${postId}/like`, { method: "POST" });
            if (res.ok) {
                fetchPosts(); // Refresh likes
            }
        } catch (e) { }
    };

    const handleComment = async (postId: string) => {
        if (!commentText.trim()) return;

        try {
            const res = await fetch(`http://localhost:5000/api/community/posts/${postId}/comments`, {
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

    return (
        <div className="flex flex-col lg:flex-row gap-6 max-h-[calc(100vh-6rem)] relative overflow-hidden">

            {/* ─── MAIN FEED ─── */}
            <div className="flex-1 flex flex-col min-w-0 max-h-full">
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

                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                                    <div className="flex items-center gap-2">
                                        <button className="p-2 text-muted-foreground hover:bg-secondary/80 rounded-full transition-colors">
                                            <ImageIcon className="w-5 h-5" />
                                        </button>
                                        <button className="p-2 text-muted-foreground hover:bg-secondary/80 rounded-full transition-colors">
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
                    {posts.map(post => (
                        <div key={post.id} className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img src={post.author.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Unknown"} alt="Avatar" className="w-10 h-10 rounded-full bg-secondary" />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-[15px]">{post.author.name}</span>
                                            {post.author.tradeStyle && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/80 text-secondary-foreground uppercase tracking-wide">
                                                    {post.author.tradeStyle}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground">{formatTime(post.createdAt)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 text-[15px] leading-relaxed text-foreground">
                                {post.content}
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
                                    {post.result && (
                                        <div className="flex items-center px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-sm font-bold text-primary">
                                            {post.result}
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
                        <button onClick={() => setIsCreateCommunityModalOpen(true)} className="text-xs text-primary font-bold hover:underline px-2 py-1 bg-primary/10 rounded-md">
                            + New
                        </button>
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
                                    <div className="flex items-start justify-between gap-2">
                                        <span className={`font-bold text-sm leading-tight ${isActive ? 'text-primary' : 'text-foreground'}`}>{c.name}</span>
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
                                disabled={!newCommunityName.trim()}
                                className="flex-1 bg-primary text-primary-foreground font-bold py-2.5 rounded-xl disabled:opacity-50 hover:bg-primary/90 transition-colors"
                            >
                                Create
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

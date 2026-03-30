"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
    User, Edit3, Save, X, Camera,
    Users, MessageSquare, Heart, TrendingUp,
    BarChart2, Calendar, Shield, Award, ArrowRight,
    Briefcase, Clock
} from "lucide-react";

const API = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/api/community`;

interface Community { id: string; name: string; description: string; }
interface Comment { id: string; content: string; createdAt: string; author: { name: string; avatar: string; }; }
interface Post {
    id: string; content: string; pair?: string; direction?: string;
    result?: string; createdAt: string;
    _count: { likes: number }; comments: Comment[];
    community?: { id: string; name: string; };
}
interface Profile {
    id: string; name: string; bio: string; avatar: string;
    tradeStyle: string; communities: Community[];
}

const TRADE_STYLES = ["Day Trader", "Swing Trader", "Scalper", "Position Trader", "News Trader", "Algo Trader"];
const AVATAR_SEEDS = ["TraderX", "GoldBull", "PipHunter", "NightOwl", "AlphaFX", "SmartMoney", "ICT_Pro", "ForexZen"];

export default function ProfilePage() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ name: "", bio: "", tradeStyle: "", avatarSeed: "TraderX", avatar: "" });
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [activeTab, setActiveTab] = useState<"posts" | "communities">("posts");

    const fetchProfile = async () => {
        try {
            const res = await fetch(`${API}/profile`, { headers: { "ngrok-skip-browser-warning": "true" } });
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
                const seed = data.avatar?.includes("seed=") ? data.avatar.split("seed=")[1] : "TraderX";
                setForm({ name: data.name, bio: data.bio || "", tradeStyle: data.tradeStyle || "Day Trader", avatarSeed: seed, avatar: data.avatar || "" });
            }
        } catch (_) { }
    };

    const fetchMyPosts = async () => {
        try {
            const res = await fetch(`${API}/posts`, { headers: { "ngrok-skip-browser-warning": "true" } });
            if (res.ok) {
                const all = await res.json();
                // show all for now — later filter by authorId once auth is wired
                setPosts(all.slice(0, 10));
            }
        } catch (_) { }
    };

    useEffect(() => {
        fetchProfile();
        fetchMyPosts();
    }, []);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
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
                    const fullUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}${data.data.url}`;
                    setForm({ ...form, avatar: fullUrl });
                }
            }
        } catch (err) {
            console.error("Upload failed", err);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const finalAvatar = form.avatar && !form.avatar.includes("dicebear") 
                ? form.avatar 
                : `https://api.dicebear.com/7.x/avataaars/svg?seed=${form.avatarSeed}`;

            const res = await fetch(`${API}/profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: form.name,
                    bio: form.bio,
                    tradeStyle: form.tradeStyle,
                    avatar: finalAvatar,
                }),
            });
            if (res.ok) {
                const updated = await res.json();
                setProfile(updated);
                setIsEditing(false);
            }
        } catch (_) { }
        setSaving(false);
    };

    const formatTime = (iso: string) => {
        const d = new Date(iso);
        const diff = Math.floor((Date.now() - d.getTime()) / 60000);
        if (diff < 60) return `${diff}m ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
        return d.toLocaleDateString();
    };

    if (!profile) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

    const totalLikes = posts.reduce((a, p) => a + (p._count?.likes || 0), 0);

    return (
        <div className="max-w-5xl mx-auto space-y-6">

            {/* ── Page Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
                        <User className="w-8 h-8 text-primary" />
                        My Profile
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">Manage your trader identity and community presence.</p>
                </div>
                <Link
                    href="/community"
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-card border border-border rounded-xl hover:bg-muted transition-colors"
                >
                    <Users className="w-4 h-4" /> Community Hub <ArrowRight className="w-3 h-3" />
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── LEFT: Profile Card ── */}
                <div className="lg:col-span-1 space-y-4">

                    {/* Profile Identity Card */}
                    <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">

                        {/* Banner */}
                        <div className="h-24 bg-gradient-to-br from-primary/40 via-violet-500/30 to-blue-600/20 relative">
                            <div className="absolute inset-0 opacity-20"
                                style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 11px)" }}
                            />
                        </div>

                        <div className="px-6 pb-6 -mt-12 relative">
                            {/* Avatar */}
                            <div className="relative w-fit">
                                <img
                                    src={isEditing ? (form.avatar && !form.avatar.includes("dicebear") ? form.avatar : `https://api.dicebear.com/7.x/avataaars/svg?seed=${form.avatarSeed}`) : profile.avatar}
                                    alt="Avatar"
                                    className="w-20 h-20 rounded-2xl border-4 border-card bg-secondary shadow-xl"
                                />
                                {isEditing && (
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center cursor-pointer">
                                        <Camera className="w-3 h-3 text-white" />
                                    </div>
                                )}
                            </div>

                            {!isEditing ? (
                                <>
                                    <div className="mt-4 flex items-start justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold">{profile.name}</h2>
                                            <span className="inline-block mt-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20 uppercase tracking-wider">
                                                {profile.tradeStyle}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {profile.bio && (
                                        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{profile.bio}</p>
                                    )}
                                </>
                            ) : (
                                /* Edit Form */
                                <div className="mt-4 space-y-3">
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Display Name</label>
                                        <input
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            className="mt-1 w-full bg-secondary border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Trading Style</label>
                                        <select
                                            value={form.tradeStyle}
                                            onChange={e => setForm({ ...form, tradeStyle: e.target.value })}
                                            className="mt-1 w-full bg-secondary border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                        >
                                            {TRADE_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Bio</label>
                                        <textarea
                                            value={form.bio}
                                            onChange={e => setForm({ ...form, bio: e.target.value })}
                                            rows={3}
                                            placeholder="Tell the community about your trading style..."
                                            className="mt-1 w-full bg-secondary border border-border/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2 block">
                                            Avatar
                                        </label>
                                        
                                        <div className="flex items-center gap-3 mb-3">
                                            <input 
                                                type="file" 
                                                accept="image/*" 
                                                onChange={handleImageUpload}
                                                className="hidden" 
                                                id="avatar-upload"
                                            />
                                            <label 
                                                htmlFor="avatar-upload"
                                                className="flex-1 max-w-[200px] flex items-center justify-center gap-2 px-3 py-2 bg-secondary border border-border/50 rounded-xl text-sm font-bold text-foreground cursor-pointer hover:bg-secondary/80 transition-colors"
                                            >
                                                <Camera className="w-4 h-4" />
                                                {uploadingImage ? "Uploading..." : "Upload Photo"}
                                            </label>
                                            
                                            {form.avatar && !form.avatar.includes("dicebear") && (
                                                <button 
                                                    onClick={() => setForm({...form, avatar: ""})}
                                                    className="px-3 py-2 text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>

                                        <p className="text-[10px] text-muted-foreground mb-2">Or select a generated avatar:</p>
                                        <div className="grid grid-cols-4 gap-1.5 opacity-90 hover:opacity-100 transition-opacity">
                                            {AVATAR_SEEDS.map(seed => (
                                                <button
                                                    key={seed}
                                                    onClick={() => setForm({ ...form, avatarSeed: seed, avatar: "" })}
                                                    className={`p-1 rounded-lg border-2 transition-all ${form.avatarSeed === seed && (!form.avatar || form.avatar.includes("dicebear")) ? "border-primary bg-primary/10" : "border-transparent hover:border-border"}`}
                                                >
                                                    <img
                                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`}
                                                        alt={seed}
                                                        className="w-10 h-10 rounded-md"
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-xl text-sm font-bold disabled:opacity-60"
                                        >
                                            <Save className="w-4 h-4" />
                                            {saving ? "Saving..." : "Save"}
                                        </button>
                                        <button
                                            onClick={() => { setIsEditing(false); }}
                                            className="px-3 py-2 rounded-xl bg-secondary text-foreground text-sm font-bold"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Stats Row */}
                            {!isEditing && (
                                <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border/50 pt-4">
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-foreground">{posts.length}</p>
                                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mt-0.5">Posts</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-foreground">{totalLikes}</p>
                                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mt-0.5">Likes</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-2xl font-black text-foreground">{profile.communities?.length || 0}</p>
                                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mt-0.5">Spaces</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-1">
                        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-3">Quick Links</p>
                        {[
                            { href: "/settings", label: "Account Settings", icon: Shield },
                            { href: "/accounts", label: "Broker Accounts", icon: Briefcase },
                            { href: "/journal", label: "Trade Journal", icon: BarChart2 },
                            { href: "/community", label: "Community Hub", icon: Users },
                        ].map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                            >
                                <Icon className="w-4 h-4 flex-shrink-0" />
                                <span>{label}</span>
                                <ArrowRight className="w-3 h-3 ml-auto opacity-50" />
                            </Link>
                        ))}
                    </div>
                </div>

                {/* ── RIGHT: Activity ── */}
                <div className="lg:col-span-2 space-y-4">

                    {/* Tabs */}
                    <div className="flex gap-1 bg-card border border-border/60 rounded-xl p-1 w-fit">
                        {([["posts", "Recent Posts", MessageSquare], ["communities", "My Communities", Users]] as const).map(([tab, label, Icon]) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === tab ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"}`}
                            >
                                <Icon className="w-4 h-4" /> {label}
                            </button>
                        ))}
                    </div>

                    {/* Posts Tab */}
                    {activeTab === "posts" && (
                        <div className="space-y-3">
                            {posts.length === 0 ? (
                                <div className="bg-card border border-border/50 rounded-2xl p-12 text-center">
                                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                                    <p className="font-semibold text-muted-foreground">No posts yet</p>
                                    <p className="text-sm text-muted-foreground/60 mt-1">Share your first trade setup in the community!</p>
                                    <Link href="/community" className="inline-flex items-center gap-2 mt-4 text-sm text-primary font-bold hover:underline">
                                        Go to Hub <ArrowRight className="w-3 h-3" />
                                    </Link>
                                </div>
                            ) : posts.map(post => (
                                <div key={post.id} className="bg-card border border-border/50 rounded-2xl p-5 hover:border-border transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm text-foreground leading-relaxed flex-1 line-clamp-3">{post.content}</p>
                                        {post.community && (
                                            <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">
                                                {post.community.name}
                                            </span>
                                        )}
                                    </div>

                                    {post.pair && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border ${post.direction === "Long" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                                                <TrendingUp className="w-3 h-3" /> {post.pair} {post.direction}
                                            </span>
                                            {post.result && (
                                                <span className="text-xs font-bold px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary">{post.result}</span>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post._count?.likes || 0}</span>
                                        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {post.comments?.length || 0}</span>
                                        <span className="flex items-center gap-1 ml-auto"><Clock className="w-3 h-3" /> {formatTime(post.createdAt)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Communities Tab */}
                    {activeTab === "communities" && (
                        <div className="space-y-3">
                            {(!profile.communities || profile.communities.length === 0) ? (
                                <div className="bg-card border border-border/50 rounded-2xl p-12 text-center">
                                    <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                                    <p className="font-semibold text-muted-foreground">No communities joined yet</p>
                                    <p className="text-sm text-muted-foreground/60 mt-1">Explore and join trading spaces that match your style.</p>
                                    <Link href="/community" className="inline-flex items-center gap-2 mt-4 text-sm text-primary font-bold hover:underline">
                                        Explore Spaces <ArrowRight className="w-3 h-3" />
                                    </Link>
                                </div>
                            ) : profile.communities.map(c => (
                                <Link key={c.id} href="/community" className="block bg-card border border-border/50 hover:border-border/80 rounded-2xl p-5 transition-colors group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                                <Users className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{c.name}</h3>
                                                {c.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{c.description}</p>}
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                </Link>
                            ))}

                            <Link
                                href="/community"
                                className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border border-dashed border-border/60 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-all"
                            >
                                <Users className="w-4 h-4" /> Explore more spaces
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

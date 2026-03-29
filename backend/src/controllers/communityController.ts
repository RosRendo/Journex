import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
// Helper: cast to any so TypeScript doesn't complain about newly-generated models
// while the IDE language server catches up with the freshly generated client.
const db = prisma as any;

export const getProfile = async (req: Request, res: Response) => {
    try {
        const uid = String((req as any).user?.id || req.query.userId || "demo-user-1");

        const exists = await db.userProfile.findUnique({ where: { userId: uid } });

        if (!exists) {
            await db.userProfile.create({
                data: {
                    userId: uid,
                    name: "TraderX",
                    bio: "Scalping Gold and trading NY session reversals.",
                    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=TraderX",
                    tradeStyle: "Day Trader",
                },
            });
        }

        const profile = await db.userProfile.findUnique({
            where: { userId: uid },
            include: { communities: true, createdCommunities: true }
        });

        res.json(profile);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const uid = String((req as any).user?.id || req.body.userId || "demo-user-1");
        const { name, bio, avatar, tradeStyle } = req.body;

        const profile = await db.userProfile.upsert({
            where: { userId: uid },
            update: { name, bio, avatar, tradeStyle },
            create: {
                userId: uid,
                name: name || "TraderX",
                bio: bio || "",
                avatar: avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=TraderX",
                tradeStyle: tradeStyle || "Day Trader"
            }
        });

        res.json(profile);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getPosts = async (req: Request, res: Response) => {
    try {
        const { communityId } = req.query;

        const posts = await db.post.findMany({
            where: communityId ? { communityId: String(communityId) } : {},
            include: {
                author: true,
                community: true,
                comments: {
                    include: { author: true },
                    orderBy: { createdAt: "asc" }
                },
                _count: {
                    select: { likes: true }
                }
            },
            orderBy: { createdAt: "desc" },
        });

        res.json(posts);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createPost = async (req: Request, res: Response) => {
    try {
        const uid = String((req as any).user?.id || req.body.userId || "demo-user-1");
        const profile = await db.userProfile.findUnique({ where: { userId: uid } });
        if (!profile) return res.status(404).json({ error: "Profile not found" });

        const { content, image, pair, direction, entry, tp, sl, result, communityId } = req.body;

        const post = await db.post.create({
            data: {
                content,
                image,
                pair,
                direction,
                entry,
                tp,
                sl,
                result,
                authorId: profile.id,
                communityId: communityId || null
            },
            include: {
                author: true,
                community: true,
                comments: { include: { author: true } },
                _count: { select: { likes: true } }
            }
        });

        res.json(post);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updatePost = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const uid = String((req as any).user?.id || req.body.userId || "demo-user-1");
        const profile = await db.userProfile.findUnique({ where: { userId: uid } });
        if (!profile) return res.status(404).json({ error: "Profile not found" });

        const post = await db.post.findUnique({ where: { id }, include: { author: true } });
        if (!post) return res.status(404).json({ error: "Post not found" });

        if (post.authorId !== profile.id && uid !== "rousrendo@gmail.com") {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { content } = req.body;
        const updated = await db.post.update({
            where: { id },
            data: { content },
            include: {
                author: true,
                community: true,
                comments: { include: { author: true } },
                _count: { select: { likes: true } }
            }
        });

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deletePost = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const uid = String((req as any).user?.id || req.headers["x-user-id"] || "demo-user-1");
        
        const profile = await db.userProfile.findUnique({ where: { userId: uid } });
        if (!profile) return res.status(404).json({ error: "Profile not found" });

        const post = await db.post.findUnique({ where: { id } });
        if (!post) return res.status(404).json({ error: "Post not found" });

        if (post.authorId !== profile.id && uid !== "rousrendo@gmail.com") {
            return res.status(403).json({ error: "Unauthorized" });
        }

        // Must delete related likes, comments first due to constraints
        await db.postLike.deleteMany({ where: { postId: id } });
        await db.comment.deleteMany({ where: { postId: id } });
        await db.post.delete({ where: { id } });

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const likePost = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const uid = String((req as any).user?.id || req.body.userId || "demo-user-1");

        const profile = await db.userProfile.findUnique({ where: { userId: uid } });
        if (!profile) return res.status(404).json({ error: "Profile not found" });

        const existing = await db.postLike.findUnique({
            where: {
                postId_userId: {
                    postId: id,
                    userId: profile.id
                }
            }
        });

        if (existing) {
            await db.postLike.delete({ where: { id: existing.id } });
        } else {
            await db.postLike.create({
                data: { postId: id, userId: profile.id }
            });
        }

        res.json({ success: true, liked: !existing });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createComment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const uid = String((req as any).user?.id || req.body.userId || "demo-user-1");
        const { content } = req.body;

        const profile = await db.userProfile.findUnique({ where: { userId: uid } });
        if (!profile) return res.status(404).json({ error: "Profile not found" });

        const comment = await db.comment.create({
            data: {
                content,
                postId: id,
                authorId: profile.id,
            },
            include: { author: true }
        });

        res.json(comment);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getCommunities = async (req: Request, res: Response) => {
    try {
        const communities = await db.community.findMany({
            include: {
                _count: { select: { members: true, posts: true } },
                members: { select: { id: true, name: true, avatar: true } }
            },
            orderBy: { createdAt: "desc" }
        });
        res.json(communities);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createCommunity = async (req: Request, res: Response) => {
    try {
        const uid = String((req as any).user?.id || req.body.userId || "demo-user-1");
        const profile = await db.userProfile.findUnique({ where: { userId: uid } });
        if (!profile) return res.status(404).json({ error: "Profile not found" });

        const { name, description, isPro, image } = req.body;

        if (!isPro && uid !== "demo-user-1") {
            return res.status(403).json({ error: "Only Pro users can create communities." });
        }

        const community = await db.community.create({
            data: {
                name,
                description,
                image,
                creatorId: profile.id,
                members: { connect: { id: profile.id } }
            },
            include: {
                _count: { select: { members: true, posts: true } }
            }
        });

        res.json(community);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateCommunity = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const uid = String((req as any).user?.id || req.body.userId || "demo-user-1");
        const profile = await db.userProfile.findUnique({ where: { userId: uid } });
        if (!profile) return res.status(404).json({ error: "Profile not found" });

        const community = await db.community.findUnique({ where: { id } });
        if (!community) return res.status(404).json({ error: "Community not found" });

        if (community.creatorId !== profile.id && uid !== "rousrendo@gmail.com") {
            return res.status(403).json({ error: "Unauthorized: Only the creator can edit this community." });
        }

        const { name, description, image } = req.body;

        const updated = await db.community.update({
            where: { id },
            data: { name, description, image },
            include: {
                _count: { select: { members: true, posts: true } }
            }
        });

        res.json(updated);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const joinCommunity = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const uid = String((req as any).user?.id || req.body.userId || "demo-user-1");
        const profile = await db.userProfile.findUnique({ where: { userId: uid } });
        if (!profile) return res.status(404).json({ error: "Profile not found" });

        const community = await db.community.update({
            where: { id },
            data: { members: { connect: { id: profile.id } } }
        });

        res.json({ success: true, community });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const leaveCommunity = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const uid = String((req as any).user?.id || req.body.userId || "demo-user-1");
        const profile = await db.userProfile.findUnique({ where: { userId: uid } });
        if (!profile) return res.status(404).json({ error: "Profile not found" });

        const community = await db.community.update({
            where: { id },
            data: { members: { disconnect: { id: profile.id } } }
        });

        res.json({ success: true, community });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getCommunityMembers = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const community = await db.community.findUnique({
            where: { id },
            include: { members: true }
        });

        if (!community) return res.status(404).json({ error: "Community not found" });

        res.json(community.members);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

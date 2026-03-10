import { Router } from "express";
import {
    getProfile, updateProfile,
    getPosts, createPost,
    likePost, createComment,
    getCommunities, createCommunity,
    joinCommunity, leaveCommunity, getCommunityMembers
} from "../controllers/communityController";

const router = Router();

router.get("/profile", getProfile);
router.post("/profile", updateProfile);

router.get("/posts", getPosts);
router.post("/posts", createPost);

router.post("/posts/:id/like", likePost);
router.post("/posts/:id/comments", createComment);

router.get("/list", getCommunities);
router.post("/list", createCommunity);
router.post("/list/:id/join", joinCommunity);
router.post("/list/:id/leave", leaveCommunity);
router.get("/list/:id/members", getCommunityMembers);

export default router;

import type { WarRoomPost } from "@/data/frontofficeData";

/**
 * Build 4 feed views.
 *
 * Each feed has a distinct job:
 * - New: strict chronology
 * - Following: the user's network
 * - Trending: active debate with freshness and momentum
 * - Saved: personal archive, newest saved calls first
 */
export type WarRoomFeedView = "new" | "following" | "trending" | "saved";

/**
 * Strict reverse chronology for the New feed.
 */
export function sortPostsNewestFirst(posts: WarRoomPost[]) {
   return [...posts].sort((firstPost, secondPost) => getPostTime(secondPost.createdAt) - getPostTime(firstPost.createdAt));
}

/**
 * Saved is a personal archive, so the most recently posted saved calls
 * appear first. Engagement should never reorder someone's archive.
 */
export function sortSavedPostsNewestFirst(posts: WarRoomPost[]) {
   return sortPostsNewestFirst(posts);
}

/**
 * Trending rewards debate, support, freshness, and momentum.
 *
 * Comments matter more than votes because an active discussion is a
 * stronger War Room signal than passive agreement.
 */
export function sortTrendingPosts(posts: WarRoomPost[]) {
   return [...posts].sort((firstPost, secondPost) => getTrendingScore(secondPost) - getTrendingScore(firstPost));
}

function getTrendingScore(post: WarRoomPost) {
   const votes = Math.max(0, post.votes);
   const comments = Math.max(0, post.comments);

   const createdTime = getPostTime(post.createdAt);

   const ageInHours = Math.max(0, (Date.now() - createdTime) / 3_600_000);

   const debateScore = comments * 4 + votes * 1.5;

   const momentumScore = (comments * 2 + votes) / Math.max(ageInHours + 2, 2);

   const freshnessWeight = 1 / Math.pow(ageInHours + 2, 0.42);

   return debateScore * freshnessWeight + momentumScore * 5;
}

function getPostTime(createdAt: string) {
   const timestamp = new Date(createdAt).getTime();

   return Number.isNaN(timestamp) ? 0 : timestamp;
}

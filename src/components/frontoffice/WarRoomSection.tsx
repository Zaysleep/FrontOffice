"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Bookmark, Check, Eye, MessageCircle, Send, Share2, SlidersHorizontal, Trash2 } from "lucide-react";
import { type FrontOfficeProfile, type Receipt, type WarRoomComment, type WarRoomPost } from "@/data/frontofficeData";
import { moderateText, FRONT_OFFICE_MODERATION_MESSAGE } from "@/lib/moderation";
import ReportDialog, { type ReportReason } from "@/components/frontoffice/ReportDialog";

/**
 * WarRoomSection
 *
 * Active social feed for FrontOffice.
 *
 * MK II direction:
 * - Following, Trending, and Saved feeds
 * - Sticky feed navigation
 * - Voting
 * - Post ownership and deletion
 * - Working bookmarks with dedicated Saved feed
 * - Expandable inline discussions
 * - Add and delete comments
 * - Working feed sorting
 * - Real Following feed based on followed handles
 * - Clickable post and comment authors
 * - Native share with clipboard fallback
 * - Persistent user vote selections
 * - Clickable author avatars on War Room posts
 * - Real post timestamps and relative time labels
 * - Engagement + recency Trending ranking
 * - Newspaper-inspired editorial hierarchy
 * - Strong rules, section labels, and headline-style takes
 * - Reduced pill/card-heavy styling
 */

type WarRoomSectionProps = {
   posts: WarRoomPost[];
   comments: ThreadedWarRoomComment[];
   savedBookmarks: number[];
   followedHandles: string[];
   currentUserVotes: Record<number, UserVoteValue>;
   interactionCounts: Record<number, number>;
   publicProfilesByHandle?: Record<string, FrontOfficeProfile>;
   receiptStatusByPostId?: Record<number, Receipt["status"]>;
   blockedHandles?: string[];
   focusRequest?: {
      postId: number;
      requestId: number;
   } | null;
   teamFilter?: string | null;
   onClearTeamFilter?: () => void;
   onVote: (postId: number, nextVote: UserVoteValue) => void;
   onDeletePost: (postId: number) => void;
   onToggleBookmark: (postId: number) => void;
   onAddComment: (postId: number, body: string, parentCommentId?: number | null) => void | Promise<void>;
   onDeleteComment: (commentId: number) => void;
   onReportPost: (postId: number, reason: ReportReason, note: string) => void | Promise<void>;
   onReportComment: (commentId: number, reason: ReportReason, note: string) => void | Promise<void>;
   onOpenProfile: (handle: string) => void;
   currentUserProfile: FrontOfficeProfile;
};

type FeedView = "following" | "trending" | "saved";

type SortMode = "most-active" | "newest" | "most-debated" | "top-voted";

type UserVoteValue = 1 | -1 | 0;

type ThreadedWarRoomComment = WarRoomComment & {
   parentCommentId?: number | null;
};

export default function WarRoomSection({
   posts,
   comments,
   savedBookmarks,
   followedHandles,
   currentUserVotes,
   interactionCounts,
   publicProfilesByHandle = {},
   receiptStatusByPostId = {},
   blockedHandles = [],
   focusRequest,
   teamFilter = null,
   onClearTeamFilter,
   onVote,
   onDeletePost,
   onToggleBookmark,
   onAddComment,
   onDeleteComment,
   onReportPost,
   onReportComment,
   onOpenProfile,
   currentUserProfile,
}: WarRoomSectionProps) {
   const [activeFeed, setActiveFeed] = useState<FeedView>("following");

   const [sortMode, setSortMode] = useState<SortMode>("newest");

   const [openDiscussionPostId, setOpenDiscussionPostId] = useState<number | null>(null);

   const [copiedPostId, setCopiedPostId] = useState<number | null>(null);

   useEffect(() => {
      if (!teamFilter) {
         return;
      }

      setActiveFeed("trending");
      setOpenDiscussionPostId(null);
   }, [teamFilter]);

   useEffect(() => {
      if (!focusRequest) {
         return;
      }

      setActiveFeed("trending");
      setOpenDiscussionPostId(focusRequest.postId);

      const scrollToPost = () => {
         const target = document.getElementById(`war-room-post-${focusRequest.postId}`);

         target?.scrollIntoView({
            behavior: "smooth",
            block: "center",
         });
      };

      const frameId = window.requestAnimationFrame(() => {
         window.setTimeout(scrollToPost, 80);
      });

      return () => {
         window.cancelAnimationFrame(frameId);
      };
   }, [focusRequest]);

   /**
    * Builds the current feed first,
    * then applies the selected sort mode.
    */
   const visiblePosts = useMemo(() => {
      let feedPosts: WarRoomPost[];

      if (activeFeed === "trending") {
         feedPosts = sortTrendingPosts(posts);
      } else if (activeFeed === "saved") {
         const savedPosts = posts.filter((post) => savedBookmarks.includes(post.id));

         feedPosts = sortWarRoomPosts(savedPosts, sortMode);
      } else {
         const followingPosts = posts.filter((post) => {
            const authorHandle = post.author?.handle ?? "";

            return post.author?.isCurrentUser === true || followedHandles.includes(authorHandle);
         });

         feedPosts = sortWarRoomPosts(followingPosts, sortMode);
      }

      if (!teamFilter) {
         return feedPosts;
      }

      const normalizedFilter = normalizeTeamName(teamFilter);

      return feedPosts.filter((post) => normalizeTeamName(post.team) === normalizedFilter);
   }, [activeFeed, followedHandles, posts, savedBookmarks, sortMode, teamFilter]);

   function handleUserVote(postId: number, nextVote: UserVoteValue) {
      const previousVote = currentUserVotes[postId] ?? 0;
      const finalVote = previousVote === nextVote ? 0 : nextVote;

      onVote(postId, finalVote);
   }

   function handleToggleDiscussion(postId: number) {
      setOpenDiscussionPostId((currentPostId) => (currentPostId === postId ? null : postId));
   }

   async function handleSharePost(post: WarRoomPost) {
      const authorName = post.author?.name ?? post.user;
      const authorHandle = post.author?.handle ? ` ${post.author.handle}` : "";

      const shareText = `${authorName}${authorHandle} on FrontOffice:

“${post.take}”

Team: ${post.team}`;

      try {
         if (navigator.share) {
            await navigator.share({
               title: `${authorName} on FrontOffice`,
               text: shareText,
            });

            return;
         }

         await navigator.clipboard.writeText(shareText);

         setCopiedPostId(post.id);

         window.setTimeout(() => {
            setCopiedPostId((currentPostId) => (currentPostId === post.id ? null : currentPostId));
         }, 1800);
      } catch (error) {
         if (error instanceof DOMException && error.name === "AbortError") {
            return;
         }

         try {
            await navigator.clipboard.writeText(shareText);

            setCopiedPostId(post.id);

            window.setTimeout(() => {
               setCopiedPostId((currentPostId) => (currentPostId === post.id ? null : currentPostId));
            }, 1800);
         } catch {
            setCopiedPostId(null);
         }
      }
   }

   return (
      <section aria-labelledby="war-room-heading" className="space-y-4 sm:space-y-6">
         <header className="border border-[#111827] bg-white px-4 py-5 shadow-sm sm:px-6 md:px-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
               <div>
                  <h3 id="war-room-heading" className="text-3xl font-black uppercase leading-[0.98] tracking-[-0.04em] text-[#111827] sm:text-4xl md:text-5xl">
                     The Debate Floor
                  </h3>
               </div>

               <label className="flex flex-wrap items-center gap-3 border-t border-[#E7DCCB] pt-4 text-sm font-bold text-[#111827] md:border-t-0 md:pt-0">
                  <SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-[#5B6475]" />

                  <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#5B6475]">Sort Edition</span>

                  <select
                     value={sortMode}
                     onChange={(event) => setSortMode(event.target.value as SortMode)}
                     className="min-h-12 border-0 border-b border-[#111827] bg-transparent px-0 text-sm font-black text-[#111827] outline-none focus:border-[#1E40AF] focus:ring-0"
                  >
                     <option value="most-active">Most active</option>
                     <option value="newest">Newest</option>
                     <option value="most-debated">Most debated</option>
                     <option value="top-voted">Top voted</option>
                  </select>
               </label>
            </div>
         </header>

         <div className="sticky top-[72px] z-30 border border-[#111827] bg-[#FFF8EE]/95 backdrop-blur sm:top-[68px]">
            <nav aria-label="War Room feed views" className="grid grid-cols-3">
               <FeedTab label="Following" isActive={activeFeed === "following"} onClick={() => setActiveFeed("following")} />

               <FeedTab label="Trending" isActive={activeFeed === "trending"} onClick={() => setActiveFeed("trending")} />

               <FeedTab label="Saved" isActive={activeFeed === "saved"} onClick={() => setActiveFeed("saved")} />
            </nav>
         </div>

         {teamFilter && (
            <section aria-label={`War Room discussion filtered to ${teamFilter}`} className="flex flex-col gap-3 border border-[#111827] bg-[#FFF8EE] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 md:px-7">
               <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#C2410C]">Team Discussion</p>

                  <p className="mt-1 text-lg font-black uppercase tracking-[-0.01em] text-[#111827]">{teamFilter}</p>
               </div>

               {onClearTeamFilter && (
                  <button
                     type="button"
                     onClick={onClearTeamFilter}
                     className="min-h-12 w-full border border-[#111827] bg-white px-4 text-xs sm:w-auto font-black uppercase tracking-[0.1em] text-[#111827] transition hover:bg-[#F6F7F8] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
                  >
                     View All Discussions
                  </button>
               )}
            </section>
         )}

         <div className="divide-y divide-[#111827] border border-[#111827] bg-white shadow-sm">
            {visiblePosts.length > 0 ? (
               visiblePosts.map((post) => {
                  const postComments = comments.filter((comment) => comment.postId === post.id);

                  return (
                     <div key={post.id} id={`war-room-post-${post.id}`} className="scroll-mt-28">
                        <PostCard
                           post={post}
                           interactionCount={interactionCounts[post.id] ?? 0}
                           comments={postComments}
                           publicProfilesByHandle={publicProfilesByHandle}
                           receiptStatus={receiptStatusByPostId[post.id]}
                           blockedHandles={blockedHandles}
                           feedView={activeFeed}
                           userVote={currentUserVotes[post.id] ?? 0}
                           isBookmarked={savedBookmarks.includes(post.id)}
                           isDiscussionOpen={openDiscussionPostId === post.id}
                           onUserVote={handleUserVote}
                           onDeletePost={onDeletePost}
                           onToggleBookmark={onToggleBookmark}
                           onToggleDiscussion={handleToggleDiscussion}
                           onAddComment={onAddComment}
                           onDeleteComment={onDeleteComment}
                           onReportPost={onReportPost}
                           onReportComment={onReportComment}
                           onOpenProfile={onOpenProfile}
                           currentUserProfile={currentUserProfile}
                           isShareCopied={copiedPostId === post.id}
                           onSharePost={handleSharePost}
                        />
                     </div>
                  );
               })
            ) : teamFilter ? (
               <div className="px-5 py-10 text-center sm:px-6 lg:px-7">
                  <p className="text-lg font-black uppercase tracking-[-0.01em] text-[#111827]">No {teamFilter} takes yet</p>

                  <p className="mt-2 text-sm leading-6 text-[#5B6475]">The conversation is quiet for now. The next call can start it.</p>
               </div>
            ) : (
               <EmptyFeed activeFeed={activeFeed} />
            )}
         </div>
      </section>
   );
}

function normalizeTeamName(value: string) {
   return value.trim().toLowerCase();
}

function FeedTab({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
   return (
      <button
         type="button"
         onClick={onClick}
         className={`min-h-12 border-r border-[#111827] px-2 text-center text-[11px] sm:px-3 sm:text-xs font-black uppercase tracking-[0.16em] transition last:border-r-0 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#1E40AF]/30 ${
            isActive ? "bg-[#111827] text-white" : "bg-[#FFF8EE] text-[#111827] hover:bg-white"
         }`}
         aria-current={isActive ? "page" : undefined}
      >
         {label}
      </button>
   );
}

function PostCard({
   post,
   interactionCount,
   comments,
   publicProfilesByHandle,
   receiptStatus,
   blockedHandles,
   feedView,
   userVote,
   isBookmarked,
   isDiscussionOpen,
   onUserVote,
   onDeletePost,
   onToggleBookmark,
   onToggleDiscussion,
   onAddComment,
   onDeleteComment,
   onReportPost,
   onReportComment,
   onOpenProfile,
   currentUserProfile,
   isShareCopied,
   onSharePost,
}: {
   post: WarRoomPost;
   interactionCount: number;
   comments: ThreadedWarRoomComment[];
   publicProfilesByHandle: Record<string, FrontOfficeProfile>;
   receiptStatus?: Receipt["status"];
   blockedHandles: string[];
   feedView: FeedView;
   userVote: UserVoteValue;
   isBookmarked: boolean;
   isDiscussionOpen: boolean;
   onUserVote: (postId: number, nextVote: UserVoteValue) => void;
   onDeletePost: (postId: number) => void;
   onToggleBookmark: (postId: number) => void;
   onToggleDiscussion: (postId: number) => void;
   onAddComment: (postId: number, body: string, parentCommentId?: number | null) => void | Promise<void>;
   onDeleteComment: (commentId: number) => void;
   onReportPost: (postId: number, reason: ReportReason, note: string) => void | Promise<void>;
   onReportComment: (commentId: number, reason: ReportReason, note: string) => void | Promise<void>;
   onOpenProfile: (handle: string) => void;
   currentUserProfile: FrontOfficeProfile;
   isShareCopied: boolean;
   onSharePost: (post: WarRoomPost) => void | Promise<void>;
}) {
   const interactions = interactionCount;

   const authorName = post.author?.name ?? post.user;

   const authorHandle = post.author?.handle;

   const publicAuthorProfile = authorHandle ? publicProfilesByHandle[authorHandle] : undefined;

   const canDeletePost = post.author?.isCurrentUser === true;

   const isBlockedAuthor = Boolean(authorHandle) && blockedHandles.includes(authorHandle ?? "") && !canDeletePost;

   return (
      <article className="overflow-hidden bg-white transition hover:bg-[#FFFCF6]">
         <div className="p-4 sm:p-6 md:p-7">
            <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 sm:gap-5">
               <VoteColumn post={post} userVote={userVote} onUserVote={onUserVote} isDisabled={isBlockedAuthor} />

               <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start gap-3">
                     <div className="shrink-0">
                        {authorHandle ? (
                           <button
                              type="button"
                              onClick={() => onOpenProfile(authorHandle)}
                              aria-label={`Open ${authorName}'s profile`}
                              className="flex min-h-11 min-w-11 items-center justify-center rounded-full transition hover:ring-4 hover:ring-[#1E40AF]/20 focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30"
                           >
                              <UserAvatar
                                 name={post.author?.isCurrentUser ? currentUserProfile.name : authorName}
                                 initials={post.author?.isCurrentUser ? currentUserProfile.initials : (post.author?.initials ?? getInitials(authorName))}
                                 profileImageUrl={post.author?.isCurrentUser ? currentUserProfile.profileImageUrl : publicAuthorProfile?.profileImageUrl}
                                 size="post"
                              />
                           </button>
                        ) : (
                           <UserAvatar name={authorName} initials={post.author?.initials ?? getInitials(authorName)} size="post" />
                        )}
                     </div>

                     <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                           {authorHandle ? (
                              <button
                                 type="button"
                                 onClick={() => onOpenProfile(authorHandle)}
                                 className="w-fit max-w-full truncate text-left text-sm font-black text-[#111827] transition hover:text-[#1E40AF] hover:underline focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
                              >
                                 {authorName}
                              </button>
                           ) : (
                              <p className="truncate text-sm font-black text-[#111827]">{authorName}</p>
                           )}

                           {authorHandle && (
                              <>
                                 <span className="hidden text-[#5B6475] sm:inline">·</span>

                                 <button
                                    type="button"
                                    onClick={() => onOpenProfile(authorHandle)}
                                    className="w-fit max-w-full truncate text-left text-sm font-medium text-[#5B6475] transition hover:text-[#1E40AF] hover:underline focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
                                 >
                                    {authorHandle}
                                 </button>
                              </>
                           )}

                           <span className="hidden text-[#5B6475] sm:inline">·</span>

                           <p className="truncate text-sm font-medium text-[#5B6475]">{post.team}</p>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                           <time dateTime={post.createdAt} className="text-xs font-medium text-[#8A93A3]">
                              {formatPostDate(post.createdAt)}
                           </time>

                           {canDeletePost && (
                              <button
                                 type="button"
                                 onClick={() => onDeletePost(post.id)}
                                 className="flex min-h-11 min-w-11 shrink-0 items-center justify-center border border-transparent text-[#5B6475] transition hover:border-[#C2410C] hover:bg-[#FFF1E8] hover:text-[#C2410C] focus:outline-none focus:ring-4 focus:ring-[#C2410C]/20"
                                 aria-label="Delete this post"
                                 title="Delete post"
                              >
                                 <Trash2 aria-hidden="true" className="h-4 w-4" />
                              </button>
                           )}

                           {!canDeletePost && <ReportDialog title="Report Post" description="Tell us why this War Room post should be reviewed." triggerLabel="Report" onSubmit={(reason, note) => onReportPost(post.id, reason, note)} />}
                        </div>
                     </div>
                  </div>

                  <p className="mt-4 break-words text-[1.05rem] font-black leading-7 tracking-[-0.02em] text-[#111827] sm:text-2xl sm:leading-8">{post.take}</p>

                  <div className="mt-3 flex flex-col items-start gap-1.5 text-[11px] font-black uppercase tracking-[0.12em] sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2">
                     <span className="text-[#5B6475]">Confidence · {post.tag}</span>

                     {receiptStatus && <span className="text-[#1E40AF]">{receiptStatus}</span>}
                  </div>

                  {isBlockedAuthor && <div className="mt-4 border border-[#C2410C] bg-[#FFF1E8] px-4 py-3 text-sm font-bold leading-6 text-[#9A3412]">You can view this post, but interactions are unavailable because this account is blocked.</div>}

                  <div className="mt-5 flex flex-col gap-3 border-t border-[#111827] pt-3 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
                     <div className="flex w-full flex-wrap items-center gap-1 sm:w-auto">
                        <CommentButton commentCount={post.comments} isOpen={isDiscussionOpen} onClick={() => onToggleDiscussion(post.id)} />

                        <BookmarkButton isBookmarked={isBookmarked} isDisabled={isBlockedAuthor} onClick={() => onToggleBookmark(post.id)} />

                        <ShareButton isCopied={isShareCopied} onClick={() => onSharePost(post)} />
                     </div>

                     <div className="hidden items-center gap-2 text-sm font-medium text-[#5B6475] sm:flex">
                        <Eye aria-hidden="true" className="h-4 w-4" />

                        <span>{interactions} interactions</span>
                     </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-sm font-medium text-[#5B6475] sm:hidden">
                     <Eye aria-hidden="true" className="h-4 w-4" />

                     <span>{interactions} interactions</span>
                  </div>
               </div>
            </div>
         </div>

         {isDiscussionOpen && (
            <DiscussionThread
               post={post}
               comments={comments}
               onAddComment={onAddComment}
               onDeleteComment={onDeleteComment}
               onReportComment={onReportComment}
               blockedHandles={blockedHandles}
               isPostAuthorBlocked={isBlockedAuthor}
               onOpenProfile={onOpenProfile}
               currentUserProfile={currentUserProfile}
               publicProfilesByHandle={publicProfilesByHandle}
            />
         )}
      </article>
   );
}

function DiscussionThread({
   post,
   comments,
   onAddComment,
   onDeleteComment,
   onReportComment,
   blockedHandles,
   isPostAuthorBlocked,
   onOpenProfile,
   currentUserProfile,
   publicProfilesByHandle,
}: {
   post: WarRoomPost;
   comments: ThreadedWarRoomComment[];
   onAddComment: (postId: number, body: string, parentCommentId?: number | null) => void | Promise<void>;
   onDeleteComment: (commentId: number) => void;
   onReportComment: (commentId: number, reason: ReportReason, note: string) => void | Promise<void>;
   blockedHandles: string[];
   isPostAuthorBlocked: boolean;
   onOpenProfile: (handle: string) => void;
   currentUserProfile: FrontOfficeProfile;
   publicProfilesByHandle: Record<string, FrontOfficeProfile>;
}) {
   const [commentDraft, setCommentDraft] = useState("");
   const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
   const [replyingToCommentId, setReplyingToCommentId] = useState<number | null>(null);
   const [openReplyThreads, setOpenReplyThreads] = useState<Record<number, boolean>>({});
   const [moderationMessage, setModerationMessage] = useState("");

   const commentInputRef = useRef<HTMLTextAreaElement | null>(null);

   async function handleSubmit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();

      const trimmedComment = commentDraft.trim();

      if (!trimmedComment) {
         return;
      }

      if (isPostAuthorBlocked) {
         setModerationMessage("Interactions are unavailable because this account is blocked.");
         return;
      }

      const moderation = moderateText(trimmedComment);

      if (!moderation.allowed) {
         setModerationMessage(moderation.message ?? FRONT_OFFICE_MODERATION_MESSAGE);
         return;
      }

      try {
         await onAddComment(post.id, trimmedComment, null);
         setCommentDraft("");
         setModerationMessage("");
      } catch {
         setModerationMessage(FRONT_OFFICE_MODERATION_MESSAGE);
      }
   }

   async function handleReplySubmit(event: FormEvent<HTMLFormElement>, parentCommentId: number) {
      event.preventDefault();

      const trimmedReply = (replyDrafts[parentCommentId] ?? "").trim();

      if (!trimmedReply) {
         return;
      }

      const parentComment = comments.find((comment) => comment.id === parentCommentId);

      const isBlockedReplyTarget = Boolean(parentComment?.author.handle) && blockedHandles.includes(parentComment?.author.handle ?? "");

      if (isPostAuthorBlocked || isBlockedReplyTarget) {
         setModerationMessage("Interactions are unavailable because this account is blocked.");
         return;
      }

      const moderation = moderateText(trimmedReply);

      if (!moderation.allowed) {
         setModerationMessage(moderation.message ?? FRONT_OFFICE_MODERATION_MESSAGE);
         return;
      }

      try {
         await onAddComment(post.id, trimmedReply, parentCommentId);

         setReplyDrafts((drafts) => ({
            ...drafts,
            [parentCommentId]: "",
         }));
         setReplyingToCommentId(null);
         setOpenReplyThreads((threads) => ({
            ...threads,
            [parentCommentId]: true,
         }));
         setModerationMessage("");
      } catch {
         setModerationMessage(FRONT_OFFICE_MODERATION_MESSAGE);
      }
   }

   const sortedComments = [...comments].sort((firstComment, secondComment) => new Date(firstComment.createdAt).getTime() - new Date(secondComment.createdAt).getTime());

   const topLevelComments = sortedComments.filter((comment) => !comment.parentCommentId);

   const repliesByParentId = sortedComments.reduce<Record<number, ThreadedWarRoomComment[]>>((groups, comment) => {
      if (!comment.parentCommentId) {
         return groups;
      }

      groups[comment.parentCommentId] = [...(groups[comment.parentCommentId] ?? []), comment];

      return groups;
   }, {});

   return (
      <section aria-label={`Discussion for ${post.user}'s post`} className="border-t border-[#111827] bg-[#FFF8EE]">
         <div className="px-4 py-5 sm:px-6 md:px-7">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
               <h4 className="text-xs font-black uppercase tracking-[0.16em] text-[#111827]">Discussion Desk</h4>

               <p className="text-sm font-medium text-[#5B6475]">
                  {comments.length} {comments.length === 1 ? "response" : "responses"}
               </p>
            </div>

            {moderationMessage && (
               <div role="alert" className="mb-4 border border-[#C2410C] bg-[#FFF1E8] px-4 py-3 text-sm font-bold leading-6 text-[#9A3412]">
                  {moderationMessage}
               </div>
            )}

            {topLevelComments.length > 0 ? (
               <div className="divide-y divide-[#111827]">
                  {topLevelComments.map((comment) => {
                     const replies = repliesByParentId[comment.id] ?? [];
                     const isReplyThreadOpen = openReplyThreads[comment.id] === true;
                     const isReplying = replyingToCommentId === comment.id;

                     return (
                        <div key={comment.id}>
                           <CommentRow
                              comment={comment}
                              onReply={(handle) => {
                                 setReplyingToCommentId(comment.id);
                                 setReplyDrafts((drafts) => ({
                                    ...drafts,
                                    [comment.id]: drafts[comment.id] || `${handle} `,
                                 }));
                              }}
                              onDeleteComment={onDeleteComment}
                              onReportComment={onReportComment}
                              blockedHandles={blockedHandles}
                              onOpenProfile={onOpenProfile}
                              currentUserProfile={currentUserProfile}
                              publicProfilesByHandle={publicProfilesByHandle}
                           />

                           {replies.length > 0 && (
                              <div className="ml-4 border-l border-[#D6CCBC] pl-3 sm:ml-14 sm:pl-4">
                                 <button
                                    type="button"
                                    onClick={() =>
                                       setOpenReplyThreads((threads) => ({
                                          ...threads,
                                          [comment.id]: !threads[comment.id],
                                       }))
                                    }
                                    className="mb-2 min-h-11 text-xs font-black uppercase tracking-[0.1em] text-[#1E40AF] transition hover:underline focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
                                    aria-expanded={isReplyThreadOpen}
                                 >
                                    {isReplyThreadOpen ? "Hide replies" : `View ${replies.length} ${replies.length === 1 ? "reply" : "replies"}`}
                                 </button>

                                 {isReplyThreadOpen && (
                                    <div className="divide-y divide-[#D6CCBC]">
                                       {replies.map((reply) => (
                                          <CommentRow
                                             key={reply.id}
                                             comment={reply}
                                             isNested
                                             onReply={(handle) => {
                                                setReplyingToCommentId(comment.id);
                                                setReplyDrafts((drafts) => ({
                                                   ...drafts,
                                                   [comment.id]: drafts[comment.id] || `${handle} `,
                                                }));
                                             }}
                                             onDeleteComment={onDeleteComment}
                                             onReportComment={onReportComment}
                                             blockedHandles={blockedHandles}
                                             onOpenProfile={onOpenProfile}
                                             currentUserProfile={currentUserProfile}
                                             publicProfilesByHandle={publicProfilesByHandle}
                                          />
                                       ))}
                                    </div>
                                 )}
                              </div>
                           )}

                           {isReplying && (
                              <form onSubmit={(event) => handleReplySubmit(event, comment.id)} className="ml-4 mb-4 border-l border-[#111827] pl-3 sm:ml-14 sm:pl-4">
                                 <div className="flex gap-3">
                                    <UserAvatar name={currentUserProfile.name} initials={currentUserProfile.initials} profileImageUrl={currentUserProfile.profileImageUrl} size="medium" />

                                    <div className="min-w-0 flex-1">
                                       <textarea
                                          value={replyDrafts[comment.id] ?? ""}
                                          onChange={(event) => {
                                             setModerationMessage("");
                                             setReplyDrafts((drafts) => ({
                                                ...drafts,
                                                [comment.id]: event.target.value,
                                             }));
                                          }}
                                          rows={2}
                                          maxLength={500}
                                          autoFocus
                                          onFocus={(event) => {
                                             const textarea = event.currentTarget;
                                             const end = textarea.value.length;

                                             window.requestAnimationFrame(() => {
                                                textarea.setSelectionRange(end, end);
                                             });
                                          }}
                                          placeholder={`Reply to ${comment.author.handle}...`}
                                          className="w-full resize-none border-b border-[#D6CCBC] bg-transparent px-0 py-2 text-sm leading-6 text-[#111827] outline-none placeholder:text-[#8A93A3] focus:border-[#1E40AF]"
                                       />

                                       <div className="mt-2 flex items-center justify-end gap-2">
                                          <button type="button" onClick={() => setReplyingToCommentId(null)} className="min-h-11 px-3 text-xs font-black uppercase tracking-[0.1em] text-[#5B6475] hover:text-[#111827]">
                                             Cancel
                                          </button>

                                          <button
                                             type="submit"
                                             disabled={!(replyDrafts[comment.id] ?? "").trim()}
                                             className="inline-flex min-h-11 items-center gap-2 border border-[#1E40AF] bg-[#1E40AF] px-3 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#173487] disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                             <Send aria-hidden="true" className="h-4 w-4" />
                                             Reply
                                          </button>
                                       </div>
                                    </div>
                                 </div>
                              </form>
                           )}
                        </div>
                     );
                  })}
               </div>
            ) : (
               <div className="border border-[#111827] py-6 text-center">
                  <p className="font-black text-[#111827]">Start the discussion</p>
                  <p className="mt-1 text-sm text-[#5B6475]">Be the first to respond to this take.</p>
               </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row">
               <UserAvatar name={currentUserProfile.name} initials={currentUserProfile.initials} profileImageUrl={currentUserProfile.profileImageUrl} size="medium" />

               <div className="min-w-0 flex-1">
                  <textarea
                     ref={commentInputRef}
                     value={commentDraft}
                     onChange={(event) => {
                        setModerationMessage("");
                        setCommentDraft(event.target.value);
                     }}
                     rows={2}
                     maxLength={500}
                     placeholder="Add a comment to the discussion..."
                     className="w-full resize-none border-b border-[#D6CCBC] bg-transparent px-0 py-2 text-base leading-6 text-[#111827] outline-none placeholder:text-[#8A93A3] focus:border-[#1E40AF]"
                  />

                  <div className="mt-3 flex items-center justify-between">
                     <p className="text-xs text-[#5B6475]">{commentDraft.length}/500</p>

                     <button
                        type="submit"
                        disabled={!commentDraft.trim()}
                        className="inline-flex min-h-11 items-center gap-2 border border-[#1E40AF] bg-[#1E40AF] px-4 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#173487] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30 disabled:cursor-not-allowed disabled:opacity-50"
                     >
                        <Send aria-hidden="true" className="h-4 w-4" />
                        Comment
                     </button>
                  </div>
               </div>
            </form>
         </div>
      </section>
   );
}

function CommentRow({
   comment,
   isNested = false,
   onReply,
   onDeleteComment,
   onReportComment,
   blockedHandles,
   onOpenProfile,
   currentUserProfile,
   publicProfilesByHandle,
}: {
   comment: ThreadedWarRoomComment;
   isNested?: boolean;
   onReply: (handle: string) => void;
   onDeleteComment: (commentId: number) => void;
   onReportComment: (commentId: number, reason: ReportReason, note: string) => void | Promise<void>;
   blockedHandles: string[];
   onOpenProfile: (handle: string) => void;
   currentUserProfile: FrontOfficeProfile;
   publicProfilesByHandle: Record<string, FrontOfficeProfile>;
}) {
   const canDelete = comment.author.isCurrentUser === true;

   const publicCommentAuthor = publicProfilesByHandle[comment.author.handle];

   const isBlockedAuthor = blockedHandles.includes(comment.author.handle) && !comment.author.isCurrentUser;

   return (
      <article className={`flex gap-3 ${isNested ? "py-3" : "py-4"}`}>
         <button
            type="button"
            onClick={() => onOpenProfile(comment.author.handle)}
            aria-label={`Open ${comment.author.name}'s profile`}
            className="shrink-0 rounded-full transition hover:ring-4 hover:ring-[#1E40AF]/20 focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30"
         >
            <UserAvatar
               name={comment.author.isCurrentUser ? currentUserProfile.name : comment.author.name}
               initials={comment.author.isCurrentUser ? currentUserProfile.initials : comment.author.initials}
               profileImageUrl={comment.author.isCurrentUser ? currentUserProfile.profileImageUrl : publicCommentAuthor?.profileImageUrl}
               size="medium"
            />
         </button>

         <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
               <div className="flex flex-wrap items-center gap-2 text-sm">
                  <button type="button" onClick={() => onOpenProfile(comment.author.handle)} className="font-bold text-[#111827] transition hover:text-[#1E40AF] hover:underline focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20">
                     {comment.author.name}
                  </button>

                  <span className="text-[#5B6475]">·</span>

                  <button type="button" onClick={() => onOpenProfile(comment.author.handle)} className="font-medium text-[#5B6475] transition hover:text-[#1E40AF] hover:underline focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20">
                     {comment.author.handle}
                  </button>

                  <span className="text-[#5B6475]">·</span>

                  <p className="font-medium text-[#5B6475]">{formatCommentTime(comment.createdAt)}</p>
               </div>

               <div className="flex items-center gap-2">
                  {!comment.author.isCurrentUser && !isBlockedAuthor && (
                     <button
                        type="button"
                        onClick={() => onReply(comment.author.handle)}
                        className="min-h-8 px-2 text-[11px] font-black uppercase tracking-[0.1em] text-[#1E40AF] transition hover:underline focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
                     >
                        Reply
                     </button>
                  )}

                  {isBlockedAuthor && <span className="px-2 text-[11px] font-black uppercase tracking-[0.1em] text-[#C2410C]">Blocked · View Only</span>}

                  {!comment.author.isCurrentUser && (
                     <ReportDialog title={isNested ? "Report Reply" : "Report Comment"} description="Tell us why this response should be reviewed." triggerLabel="Report" onSubmit={(reason, note) => onReportComment(comment.id, reason, note)} />
                  )}

                  {canDelete && (
                     <button
                        type="button"
                        onClick={() => onDeleteComment(comment.id)}
                        className="flex min-h-8 min-w-8 shrink-0 items-center justify-center border border-transparent text-[#5B6475] transition hover:border-[#C2410C] hover:bg-[#FFF1E8] hover:text-[#C2410C] focus:outline-none focus:ring-4 focus:ring-[#C2410C]/20"
                        aria-label="Delete your comment"
                        title="Delete comment"
                     >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                     </button>
                  )}
               </div>
            </div>

            <p className={`mt-2 leading-6 text-[#111827] ${isNested ? "text-sm" : "text-sm"}`}>{comment.body}</p>
         </div>
      </article>
   );
}

function CommentButton({ commentCount, isOpen, onClick }: { commentCount: number; isOpen: boolean; onClick: () => void }) {
   return (
      <button
         type="button"
         onClick={onClick}
         aria-expanded={isOpen}
         aria-label={isOpen ? "Close discussion" : `Open discussion with ${commentCount} comments`}
         className={`flex min-h-10 items-center gap-2 border-b-2 border-transparent px-2 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30 disabled:cursor-not-allowed disabled:opacity-40 ${
            isOpen ? "bg-[#EAF0FF] text-[#1E40AF]" : "text-[#5B6475] hover:bg-[#FFF8EE] hover:text-[#111827]"
         }`}
      >
         <MessageCircle aria-hidden="true" className="h-4 w-4" />

         <span>{commentCount}</span>
      </button>
   );
}

function VoteColumn({ post, userVote, onUserVote, isDisabled = false }: { post: WarRoomPost; userVote: UserVoteValue; onUserVote: (postId: number, nextVote: UserVoteValue) => void; isDisabled?: boolean }) {
   const hasUpvoted = userVote === 1;

   const hasDownvoted = userVote === -1;

   return (
      <div className="flex w-11 shrink-0 flex-col items-center">
         <button
            type="button"
            onClick={() => onUserVote(post.id, 1)}
            disabled={isDisabled}
            className={`flex min-h-9 min-w-9 items-center justify-center border border-[#111827] transition focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30 disabled:cursor-not-allowed disabled:opacity-40 ${
               hasUpvoted ? "bg-[#EAF0FF] text-[#1E40AF]" : "bg-white text-[#5B6475] hover:bg-[#EAF0FF] hover:text-[#1E40AF]"
            }`}
            aria-label={hasUpvoted ? "Remove upvote" : "Upvote this take"}
            aria-pressed={hasUpvoted}
            title={isDisabled ? "Interactions unavailable" : undefined}
         >
            <ArrowUp aria-hidden="true" className="h-5 w-5" />
         </button>

         <p className="my-2 text-sm font-black text-[#111827]">{post.votes}</p>

         <button
            type="button"
            onClick={() => onUserVote(post.id, -1)}
            disabled={isDisabled}
            className={`flex min-h-9 min-w-9 items-center justify-center border border-[#111827] transition focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30 ${
               hasDownvoted ? "bg-[#FFF1E8] text-[#C2410C]" : "bg-white text-[#5B6475] hover:bg-[#FFF1E8] hover:text-[#C2410C]"
            }`}
            aria-label={hasDownvoted ? "Remove downvote" : "Downvote this take"}
            aria-pressed={hasDownvoted}
            title={isDisabled ? "Interactions unavailable" : undefined}
         >
            <ArrowDown aria-hidden="true" className="h-5 w-5" />
         </button>
      </div>
   );
}

function BookmarkButton({ isBookmarked, isDisabled = false, onClick }: { isBookmarked: boolean; isDisabled?: boolean; onClick: () => void }) {
   return (
      <button
         type="button"
         onClick={onClick}
         disabled={isDisabled}
         aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this take"}
         aria-pressed={isBookmarked}
         title={isDisabled ? "Interactions unavailable" : isBookmarked ? "Remove bookmark" : "Bookmark"}
         className={`flex min-h-10 items-center border-b-2 border-transparent px-2 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30 disabled:cursor-not-allowed disabled:opacity-40 ${
            isBookmarked ? "bg-[#EAF0FF] text-[#1E40AF]" : "text-[#5B6475] hover:bg-[#FFF8EE] hover:text-[#111827]"
         }`}
      >
         <Bookmark aria-hidden="true" className="h-4 w-4" fill={isBookmarked ? "currentColor" : "none"} />
      </button>
   );
}

function ShareButton({ isCopied, onClick }: { isCopied: boolean; onClick: () => void }) {
   return (
      <button
         type="button"
         onClick={onClick}
         aria-label={isCopied ? "Post copied" : "Share this take"}
         className={`flex min-h-10 items-center gap-2 border-b-2 border-transparent px-2 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30 ${
            isCopied ? "bg-[#EAF0FF] text-[#1E40AF]" : "text-[#5B6475] hover:bg-[#FFF8EE] hover:text-[#111827]"
         }`}
      >
         {isCopied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Share2 aria-hidden="true" className="h-4 w-4" />}

         {isCopied && <span>Copied</span>}
      </button>
   );
}

function UserAvatar({ name, initials, profileImageUrl, size }: { name: string; initials: string; profileImageUrl?: string; size: "medium" | "post" }) {
   const sizeClasses = size === "post" ? "h-11 w-11" : "h-10 w-10";

   const imageSize = size === "post" ? "44px" : "40px";

   const textClasses = size === "post" ? "text-sm" : "text-xs";

   if (profileImageUrl) {
      return (
         <div className={`${sizeClasses} relative overflow-hidden rounded-full bg-[#1E40AF]`}>
            <Image src={profileImageUrl} alt={`${name} profile`} fill sizes={imageSize} unoptimized className="object-cover" />
         </div>
      );
   }

   return (
      <div aria-hidden="true" className={`${sizeClasses} ${textClasses} flex items-center justify-center rounded-full bg-[#1E40AF] font-bold text-white`}>
         {initials}
      </div>
   );
}

function getInitials(name: string) {
   return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
}

function EmptyFeed({ activeFeed }: { activeFeed: FeedView }) {
   const title = activeFeed === "following" ? "No following takes yet" : activeFeed === "saved" ? "No saved takes yet" : "No trending takes yet";

   const description = activeFeed === "following" ? "Follow more users to build your personal War Room feed." : activeFeed === "saved" ? "Bookmark a take in the War Room and it will appear here." : "Trending takes will appear here as the feed grows.";

   return (
      <div className="bg-white p-10 text-center">
         <p className="text-lg font-black uppercase tracking-[-0.01em] text-[#111827]">{title}</p>

         <p className="mt-2 text-base leading-7 text-[#5B6475]">{description}</p>
      </div>
   );
}

/**
 * Applies the selected sort mode without mutating
 * the original post array.
 *
 * Newest uses actual post timestamps.
 */
function sortWarRoomPosts(posts: WarRoomPost[], sortMode: SortMode) {
   const sortedPosts = [...posts];

   if (sortMode === "newest") {
      return sortedPosts.sort((firstPost, secondPost) => new Date(secondPost.createdAt).getTime() - new Date(firstPost.createdAt).getTime());
   }

   if (sortMode === "most-debated") {
      return sortedPosts.sort((firstPost, secondPost) => {
         if (secondPost.comments !== firstPost.comments) {
            return secondPost.comments - firstPost.comments;
         }

         return secondPost.votes - firstPost.votes;
      });
   }

   if (sortMode === "top-voted") {
      return sortedPosts.sort((firstPost, secondPost) => {
         if (secondPost.votes !== firstPost.votes) {
            return secondPost.votes - firstPost.votes;
         }

         return secondPost.comments - firstPost.comments;
      });
   }

   /**
    * Most active combines voting and discussion activity.
    * Comments receive extra weight because active debate
    * is a major part of the War Room experience.
    */
   return sortedPosts.sort((firstPost, secondPost) => {
      const firstScore = Math.abs(firstPost.votes) + firstPost.comments * 2;

      const secondScore = Math.abs(secondPost.votes) + secondPost.comments * 2;

      return secondScore - firstScore;
   });
}

/**
 * Trending combines engagement and freshness.
 *
 * Comments receive extra weight because active discussion
 * is a major part of the War Room experience.
 *
 * A recency multiplier gradually reduces the influence
 * of older posts so the feed does not become permanently
 * locked to historically popular takes.
 */
function sortTrendingPosts(posts: WarRoomPost[]) {
   return [...posts].sort((firstPost, secondPost) => getTrendingScore(secondPost) - getTrendingScore(firstPost));
}

function getTrendingScore(post: WarRoomPost) {
   const engagementScore = Math.max(0, post.votes) + post.comments * 3;

   const createdTime = new Date(post.createdAt).getTime();

   const ageInHours = Math.max(0, (Date.now() - createdTime) / 3_600_000);

   const recencyMultiplier = 1 / Math.pow(ageInHours + 2, 0.45);

   return engagementScore * recencyMultiplier;
}

function formatPostDate(createdAt: string) {
   const date = new Date(createdAt);

   if (Number.isNaN(date.getTime())) {
      return "";
   }

   return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
   }).format(date);
}

function formatRelativeTime(createdAt: string) {
   const createdTime = new Date(createdAt).getTime();

   if (Number.isNaN(createdTime)) {
      return "now";
   }

   const differenceInMinutes = Math.max(0, Math.floor((Date.now() - createdTime) / 60_000));

   if (differenceInMinutes < 1) {
      return "now";
   }

   if (differenceInMinutes < 60) {
      return `${differenceInMinutes}m`;
   }

   const differenceInHours = Math.floor(differenceInMinutes / 60);

   if (differenceInHours < 24) {
      return `${differenceInHours}h`;
   }

   const differenceInDays = Math.floor(differenceInHours / 24);

   if (differenceInDays < 7) {
      return `${differenceInDays}d`;
   }

   const differenceInWeeks = Math.floor(differenceInDays / 7);

   return `${differenceInWeeks}w`;
}

function formatCommentTime(createdAt: string) {
   const createdTime = new Date(createdAt).getTime();

   const differenceInMinutes = Math.max(0, Math.floor((Date.now() - createdTime) / 60000));

   if (differenceInMinutes < 1) {
      return "now";
   }

   if (differenceInMinutes < 60) {
      return `${differenceInMinutes}m`;
   }

   const differenceInHours = Math.floor(differenceInMinutes / 60);

   if (differenceInHours < 24) {
      return `${differenceInHours}h`;
   }

   const differenceInDays = Math.floor(differenceInHours / 24);

   return `${differenceInDays}d`;
}

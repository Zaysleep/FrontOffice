"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Building2, ClipboardList, MessageSquareText, Search, UserCircle, type LucideIcon } from "lucide-react";
import { initialCallForm, mockTeamUpdates, teamBriefs, type FrontOfficeProfile, type Receipt, type Sport, type WarRoomComment, type WarRoomPost } from "@/data/frontofficeData";
import { getTeamUpdates } from "@/lib/frontofficeUpdates";
import TeamManagerSwitcher from "@/components/frontoffice/TeamManagerSwitcher";
import FrontOfficeSection, { type FrontOfficeReportCopy } from "@/components/frontoffice/FrontOfficeSection";
import MakeTheCallSection from "@/components/frontoffice/MakeTheCallSection";
import WarRoomSection from "@/components/frontoffice/WarRoomSection";
import SearchSection from "@/components/frontoffice/SearchSection";
import ProfileSection from "@/components/frontoffice/ProfileSection";
import NotificationCenter, { type FrontOfficeNotification } from "@/components/frontoffice/NotificationCenter";
import AuthGate from "@/components/frontoffice/AuthGate";
import AccountMenu from "@/components/frontoffice/AccountMenu";
import { supabase } from "@/lib/supabase/client";
import { type ReportReason } from "@/components/frontoffice/ReportDialog";

/**
 * FrontOffice App Shell
 *
 * MK II direction:
 * - Prep for online user use
 * - Keep the app lean
 * - Move report/update logic into helper files
 * - Support personalized report copy
 * - Support post ownership
 * - Support bookmarks
 * - Support War Room comments
 * - Support follow / unfollow state
 * - Support own-profile and public-profile viewing state
 * - Persist core social state in LocalStorage
 * - Connect social activity across War Room, Search, and Profile
 * - Generate vote milestone notifications every 50 votes
 * - Generate comment notifications for comments on current-user takes
 * - Generate follow notifications from the shared follower relationship data
 */

type AppSection = "front-office" | "make-the-call" | "war-room" | "search" | "profile";

const emptyUserProfile: FrontOfficeProfile = {
   name: "",
   handle: "",
   initials: "",
   bio: "",
   favoriteTeams: [],
   isCurrentUser: true,
};

const navigationItems: {
   id: AppSection;
   label: string;
   icon: LucideIcon;
}[] = [
   {
      id: "front-office",
      label: "Front Office",
      icon: Building2,
   },
   {
      id: "make-the-call",
      label: "Make the Call",
      icon: ClipboardList,
   },
   {
      id: "war-room",
      label: "War Room",
      icon: MessageSquareText,
   },
   {
      id: "search",
      label: "Search",
      icon: Search,
   },
   {
      id: "profile",
      label: "Profile",
      icon: UserCircle,
   },
];

const frontOfficeCopyOptions: FrontOfficeReportCopy[] = [
   {
      eyebrow: "Front Office Report",
      greeting: "Welcome back to the office.",
      summary: "Your report is ready. Scan the headlines, check the pressure points, and decide what needs to be said in the War Room.",
      leadLabel: "Lead Story",
      leadTitle: "What matters before the next move",
      whyTitle: "Why this matters",
      whyBody: "A good front office call has to balance the roster, salary situation, injury risk, timing, and public pressure.",
      trendingTitle: "Trending in your office",
      notesTitle: "Top 5 office notes",
      notesDescription: "The main things to watch before making a post.",
      moveEyebrow: "Your move",
      moveTitle: "Read the room. Make the call.",
      moveBody: "Turn this report into a take. Post your assessment, explain the logic, and let the War Room react.",
   },
   {
      eyebrow: "Morning Brief",
      greeting: "The office is open.",
      summary: "The latest team context is on your desk. Read the room, spot the pressure, and make the call when you are ready.",
      leadLabel: "Top Report",
      leadTitle: "The storyline driving the conversation",
      whyTitle: "What the front office should notice",
      whyBody: "The best move is not always the loudest one. Money, timing, roster fit, and fan pressure all matter before a take goes public.",
      trendingTitle: "What people are watching",
      notesTitle: "Top 5 things to watch",
      notesDescription: "The clearest points shaping today’s office report.",
      moveEyebrow: "Next step",
      moveTitle: "Turn the report into a take.",
      moveBody: "Use the latest context to post a sharp call and let the feed respond.",
   },
   {
      eyebrow: "Office Briefing",
      greeting: "Back in the chair.",
      summary: "The board has changed since your last check-in. Review the lead story, scan the noise, and decide where you stand.",
      leadLabel: "Main Headline",
      leadTitle: "The issue shaping today’s debate",
      whyTitle: "Why the room is talking",
      whyBody: "Every front office decision has a cost. The question is whether the current pressure is worth the long-term tradeoff.",
      trendingTitle: "Today’s office chatter",
      notesTitle: "Top 5 front office notes",
      notesDescription: "A quick read on the issues that deserve attention.",
      moveEyebrow: "Make it public",
      moveTitle: "You have the report. Now make the call.",
      moveBody: "Post your take to the War Room and keep the receipt on your profile.",
   },
   {
      eyebrow: "Front Office Desk",
      greeting: "Welcome back, boss.",
      summary: "The feed is moving and the office has decisions to make. Catch up fast, then decide what take belongs in the War Room.",
      leadLabel: "Featured Update",
      leadTitle: "The update that deserves your attention",
      whyTitle: "Why it changes the conversation",
      whyBody: "Context matters. A smart take should account for roster needs, cap or salary pressure, performance trends, and public reaction.",
      trendingTitle: "Stories gaining traction",
      notesTitle: "Top 5 office notes",
      notesDescription: "The strongest talking points from today’s report.",
      moveEyebrow: "On the clock",
      moveTitle: "Make the post before the room moves on.",
      moveBody: "Turn this report into a clear stance and send it to the War Room.",
   },
];

function getRandomReportCopy() {
   const randomIndex = Math.floor(Math.random() * frontOfficeCopyOptions.length);

   return frontOfficeCopyOptions[randomIndex];
}

function getNextVoteMilestone(previousVotes: number, nextVotes: number) {
   if (nextVotes <= previousVotes) {
      return null;
   }

   const previousMilestone = Math.floor(previousVotes / 50) * 50;
   const nextMilestone = Math.floor(nextVotes / 50) * 50;

   if (nextMilestone <= previousMilestone || nextMilestone < 50) {
      return null;
   }

   return nextMilestone;
}

type ProfileRow = {
   name: string;
   handle: string;
   initials: string;
   bio: string;
   profile_image_url: string | null;
   banner_image_url: string | null;
};

type UserTeamRow = {
   team_id: string;
   sort_order: number;
};

type TeamRow = {
   id: string;
   name: string;
   sport: Sport;
};

type PostRow = {
   id: string;
   author_id: string;
   team_id: string | null;
   team_name_snapshot: string;
   call_type: string;
   confidence: string;
   take: string;
   tag: string;
   created_at: string;
};

type CommentRow = {
   id: string;
   post_id: string;
   author_id: string;
   parent_comment_id: string | null;
   body: string;
   created_at: string;
};

type ThreadedWarRoomComment = WarRoomComment & {
   parentCommentId?: number | null;
};

type SocialProfileRow = {
   id: string;
   name: string;
   handle: string;
   initials: string;
   bio: string;
   profile_image_url: string | null;
   banner_image_url: string | null;
};

type PublicUserTeamRow = {
   user_id: string;
   team_id: string;
   sort_order: number;
};

type VoteRow = {
   post_id: string;
   user_id: string;
   value: 1 | -1;
};

type BookmarkRow = {
   post_id: string;
};

type FollowRow = {
   follower_id: string;
   following_id: string;
};

type UserVoteValue = 1 | -1 | 0;

type InteractionCountRow = {
   post_id: string;
   interaction_count: number;
};

type NotificationRow = {
   id: string;
   recipient_id: string;
   actor_id: string | null;
   type: "comment" | "follow" | "milestone" | "reply";
   title: string;
   body: string;
   post_id: string | null;
   comment_id: string | null;
   profile_id: string | null;
   is_read: boolean;
   created_at: string;
};

type BlockRow = {
   blocked_id: string;
};

type BlockedProfileSummary = {
   id: string;
   name: string;
   handle: string;
   initials: string;
   profileImageUrl?: string;
};

type ReceiptRow = {
   id: string;
   post_id: string;
   author_id: string;
   status: Receipt["status"];
   reaction: string;
   outcome_note: string | null;
   resolved_at: string | null;
   created_at: string;
   updated_at: string;
};

function stableNumericId(uuid: string) {
   return Number.parseInt(uuid.replaceAll("-", "").slice(0, 12), 16);
}

function FrontOfficeApp() {
   const [activeSection, setActiveSection] = useState<AppSection>("front-office");

   const [warRoomFocusRequest, setWarRoomFocusRequest] = useState<{
      postId: number;
      requestId: number;
      targetFeed?: "new" | "following" | "trending" | "saved";
   } | null>(null);

   const [warRoomTeamFilter, setWarRoomTeamFilter] = useState<string | null>(null);

   const [selectedSport, setSelectedSport] = useState<Sport>("NBA");

   const [selectedTeam, setSelectedTeam] = useState(teamBriefs[0]?.team ?? "");

   const [warRoomPosts, setWarRoomPosts] = useState<WarRoomPost[]>([]);

   const [warRoomComments, setWarRoomComments] = useState<ThreadedWarRoomComment[]>([]);

   const [savedReceipts, setSavedReceipts] = useState<Receipt[]>([]);

   const [savedBookmarks, setSavedBookmarks] = useState<number[]>([]);

   const [notifications, setNotifications] = useState<FrontOfficeNotification[]>([]);

   const [blockedProfiles, setBlockedProfiles] = useState<BlockedProfileSummary[]>([]);

   /**
    * Handles followed users across Search and the War Room.
    *
    * Maya starts followed so the Following feed has useful content
    * before the user makes any changes.
    */
   const [followedHandles, setFollowedHandles] = useState<string[]>([]);

   const [userProfile, setUserProfile] = useState<FrontOfficeProfile>(emptyUserProfile);

   const [isAccountLoading, setIsAccountLoading] = useState(true);

   const [isSocialLoading, setIsSocialLoading] = useState(true);

   const [postUuidByNumericId, setPostUuidByNumericId] = useState<Record<number, string>>({});

   const [commentUuidByNumericId, setCommentUuidByNumericId] = useState<Record<number, string>>({});

   const [currentUserVotes, setCurrentUserVotes] = useState<Record<number, UserVoteValue>>({});

   const [followerHandlesByProfile, setFollowerHandlesByProfile] = useState<Record<string, string[]>>({});

   const [followingHandlesByProfile, setFollowingHandlesByProfile] = useState<Record<string, string[]>>({});

   const [interactionCounts, setInteractionCounts] = useState<Record<number, number>>({});

   const [notificationUuidByNumericId, setNotificationUuidByNumericId] = useState<Record<number, string>>({});

   const [notificationActorIdByNumericId, setNotificationActorIdByNumericId] = useState<Record<number, string | null>>({});

   const [receiptUuidByNumericId, setReceiptUuidByNumericId] = useState<Record<number, string>>({});

   const [receiptPostIdByReceiptId, setReceiptPostIdByReceiptId] = useState<Record<number, number>>({});

   const [receiptStatusByPostId, setReceiptStatusByPostId] = useState<Record<number, Receipt["status"]>>({});

   const [publicProfilesByHandle, setPublicProfilesByHandle] = useState<Record<string, FrontOfficeProfile>>({});

   /**
    * Controls which user's profile is currently being viewed.
    *
    * The Profile navigation item always returns to the current user's profile.
    * Search and War Room profile links will update this value in the next wiring step.
    */
   const [viewedProfileHandle, setViewedProfileHandle] = useState("");

   const [callForm, setCallForm] = useState(initialCallForm);

   const [frontOfficeCopy, setFrontOfficeCopy] = useState<FrontOfficeReportCopy>(() => getRandomReportCopy());

   const [hasHandledPushDeepLink, setHasHandledPushDeepLink] = useState(false);

   useEffect(() => {
      let isMounted = true;

      async function loadAccount() {
         const {
            data: { user },
            error: userError,
         } = await supabase.auth.getUser();

         if (!isMounted) {
            return;
         }

         if (userError || !user) {
            console.error("FrontOffice could not load the authenticated user.", userError);
            setIsAccountLoading(false);
            return;
         }

         const { data: profileData, error: profileError } = await supabase.from("profiles").select("name, handle, initials, bio, profile_image_url, banner_image_url").eq("id", user.id).single();

         const { data: userTeamData, error: userTeamsError } = await supabase.from("user_teams").select("team_id, sort_order").eq("user_id", user.id).order("sort_order", { ascending: true });

         if (!isMounted) {
            return;
         }

         if (profileError || !profileData) {
            console.error("FrontOffice could not load the user profile.", profileError);
            setIsAccountLoading(false);
            return;
         }

         if (userTeamsError) {
            console.error("FrontOffice could not load My Teams.", userTeamsError);
         }

         const profileRow = profileData as ProfileRow;
         const userTeamRows = (userTeamData ?? []) as UserTeamRow[];
         const teamIds = userTeamRows.map((item) => item.team_id);

         let favoriteTeams: string[] = [];

         if (teamIds.length > 0) {
            const { data: teamData, error: teamsError } = await supabase.from("teams").select("id, name, sport").in("id", teamIds);

            if (!isMounted) {
               return;
            }

            if (teamsError) {
               console.error("FrontOffice could not load team records.", teamsError);
            } else {
               const teamRows = (teamData ?? []) as TeamRow[];
               const teamsById = new Map(teamRows.map((team) => [team.id, team]));

               favoriteTeams = userTeamRows.map((item) => teamsById.get(item.team_id)?.name).filter((teamName): teamName is string => Boolean(teamName));
            }
         }

         const nextProfile: FrontOfficeProfile = {
            name: profileRow.name,
            handle: profileRow.handle,
            initials: profileRow.initials,
            bio: profileRow.bio,
            profileImageUrl: profileRow.profile_image_url ?? undefined,
            bannerImageUrl: profileRow.banner_image_url ?? undefined,
            favoriteTeams,
            isCurrentUser: true,
         };

         setUserProfile(nextProfile);
         setViewedProfileHandle(nextProfile.handle);

         const firstTeam = teamBriefs.find((brief) => favoriteTeams.includes(brief.team));

         if (firstTeam) {
            setSelectedSport(firstTeam.sport);
            setSelectedTeam(firstTeam.team);
         }

         setIsAccountLoading(false);
      }

      void loadAccount();

      return () => {
         isMounted = false;
      };
   }, []);

   useEffect(() => {
      let isMounted = true;

      async function loadSharedWarRoom(isSilentRefresh = false) {
         if (isAccountLoading || !userProfile.handle) {
            return;
         }

         /**
          * Build 4 Batch 2:
          * Background refreshes should not replace the app with the
          * social-loading screen while a user is reading the War Room.
          */
         if (!isSilentRefresh) {
            setIsSocialLoading(true);
         }

         const {
            data: { user },
            error: userError,
         } = await supabase.auth.getUser();

         if (!isMounted) {
            return;
         }

         if (userError || !user) {
            console.error("FrontOffice could not load the current social user.", userError);
            setIsSocialLoading(false);
            return;
         }

         const [
            { data: postData, error: postsError },
            { data: commentData, error: commentsError },
            { data: profileData, error: profilesError },
            { data: voteData, error: votesError },
            { data: bookmarkData, error: bookmarksError },
            { data: followData, error: followsError },
            { data: interactionData, error: interactionsError },
            { data: notificationData, error: notificationsError },
            { data: publicUserTeamData, error: publicUserTeamsError },
            { data: publicTeamData, error: publicTeamsError },
            { data: receiptData, error: receiptsError },
            { data: blockData, error: blocksError },
         ] = await Promise.all([
            supabase.from("posts").select("id, author_id, team_id, team_name_snapshot, call_type, confidence, take, tag, created_at").order("created_at", { ascending: false }),
            supabase.from("comments").select("id, post_id, author_id, parent_comment_id, body, created_at").order("created_at", { ascending: true }),
            supabase.from("profiles").select("id, name, handle, initials, bio, profile_image_url, banner_image_url"),
            supabase.from("post_votes").select("post_id, user_id, value"),
            supabase.from("bookmarks").select("post_id").eq("user_id", user.id),
            supabase.from("follows").select("follower_id, following_id"),
            supabase.rpc("get_post_interaction_counts"),
            supabase.from("notifications").select("id, recipient_id, actor_id, type, title, body, post_id, comment_id, profile_id, is_read, created_at").eq("recipient_id", user.id).order("created_at", { ascending: false }),
            supabase.from("user_teams").select("user_id, team_id, sort_order").order("sort_order", { ascending: true }),
            supabase.from("teams").select("id, name, sport"),
            supabase.from("receipts").select("id, post_id, author_id, status, reaction, outcome_note, resolved_at, created_at, updated_at").order("created_at", { ascending: false }),
            supabase.from("blocks").select("blocked_id").eq("blocker_id", user.id),
         ]);

         if (!isMounted) {
            return;
         }

         if (postsError || commentsError || profilesError || votesError || bookmarksError || followsError || interactionsError || notificationsError || publicUserTeamsError || publicTeamsError || receiptsError || blocksError) {
            console.error("FrontOffice could not load the shared social data.", {
               postsError,
               commentsError,
               profilesError,
               votesError,
               bookmarksError,
               followsError,
               interactionsError,
               notificationsError,
               publicUserTeamsError,
               publicTeamsError,
               receiptsError,
               blocksError,
            });
            setIsSocialLoading(false);
            return;
         }

         const blockRows = (blockData ?? []) as BlockRow[];
         const blockedIdSet = new Set(blockRows.map((block) => block.blocked_id));

         const postRows = (postData ?? []) as PostRow[];
         const commentRows = (commentData ?? []) as CommentRow[];
         const profileRows = (profileData ?? []) as SocialProfileRow[];
         const voteRows = (voteData ?? []) as VoteRow[];
         const bookmarkRows = (bookmarkData ?? []) as BookmarkRow[];

         const followRows = ((followData ?? []) as FollowRow[]).filter((follow) => !blockedIdSet.has(follow.follower_id) && !blockedIdSet.has(follow.following_id));

         const interactionRows = (interactionData ?? []) as InteractionCountRow[];

         const notificationRows = ((notificationData ?? []) as NotificationRow[]).filter((notification) => !notification.actor_id || !blockedIdSet.has(notification.actor_id));

         const publicUserTeamRows = (publicUserTeamData ?? []) as PublicUserTeamRow[];

         const publicTeamRows = (publicTeamData ?? []) as TeamRow[];
         const receiptRows = (receiptData ?? []) as ReceiptRow[];

         const profilesById = new Map(profileRows.map((profile) => [profile.id, profile]));

         const nextBlockedProfiles: BlockedProfileSummary[] = blockRows.reduce<BlockedProfileSummary[]>((profiles, block) => {
            const profile = profilesById.get(block.blocked_id);

            if (!profile) {
               return profiles;
            }

            profiles.push({
               id: profile.id,
               name: profile.name,
               handle: profile.handle,
               initials: profile.initials,
               profileImageUrl: profile.profile_image_url ?? undefined,
            });

            return profiles;
         }, []);

         const publicTeamsById = new Map(publicTeamRows.map((team) => [team.id, team]));

         const teamNamesByUserId = publicUserTeamRows.reduce<Record<string, string[]>>((groups, item) => {
            const teamName = publicTeamsById.get(item.team_id)?.name;

            if (!teamName) {
               return groups;
            }

            groups[item.user_id] = [...(groups[item.user_id] ?? []), teamName];

            return groups;
         }, {});

         const nextPublicProfilesByHandle = profileRows.reduce<Record<string, FrontOfficeProfile>>((directory, profile) => {
            directory[profile.handle] = {
               name: profile.name,
               handle: profile.handle,
               initials: profile.initials,
               bio: profile.bio,
               profileImageUrl: profile.profile_image_url ?? undefined,
               bannerImageUrl: profile.banner_image_url ?? undefined,
               favoriteTeams: teamNamesByUserId[profile.id] ?? [],
               isCurrentUser: profile.id === user.id,
            };

            return directory;
         }, {});

         const nextPostUuidMap: Record<number, string> = {};
         const nextCommentUuidMap: Record<number, string> = {};
         const nextCurrentUserVotes: Record<number, UserVoteValue> = {};

         const commentCountByPostId = commentRows.reduce<Record<string, number>>((counts, comment) => {
            counts[comment.post_id] = (counts[comment.post_id] ?? 0) + 1;
            return counts;
         }, {});

         const voteTotalByPostId = voteRows.reduce<Record<string, number>>((totals, vote) => {
            totals[vote.post_id] = (totals[vote.post_id] ?? 0) + vote.value;
            return totals;
         }, {});

         const nextPosts: WarRoomPost[] = postRows.map((post) => {
            const numericId = stableNumericId(post.id);
            const author = profilesById.get(post.author_id);

            nextPostUuidMap[numericId] = post.id;

            return {
               id: numericId,
               user: author?.name.split(" ")[0] || author?.name || "FrontOffice User",
               author: {
                  name: author?.name ?? "FrontOffice User",
                  handle: author?.handle ?? "@frontoffice",
                  initials: author?.initials ?? "FO",
                  isCurrentUser: post.author_id === user.id,
               },
               team: post.team_name_snapshot,
               take: post.take,
               votes: voteTotalByPostId[post.id] ?? 0,
               comments: commentCountByPostId[post.id] ?? 0,
               tag: post.tag,
               createdAt: post.created_at,
            };
         });

         const postNumericIdByUuid = new Map(postRows.map((post) => [post.id, stableNumericId(post.id)]));

         const commentNumericIdByUuid = new Map(commentRows.map((comment) => [comment.id, stableNumericId(comment.id)]));

         const nextComments: ThreadedWarRoomComment[] = commentRows
            .map((comment) => {
               const numericPostId = postNumericIdByUuid.get(comment.post_id);
               const author = profilesById.get(comment.author_id);

               if (!numericPostId) {
                  return null;
               }

               const numericCommentId = commentNumericIdByUuid.get(comment.id);

               if (!numericCommentId) {
                  return null;
               }

               nextCommentUuidMap[numericCommentId] = comment.id;

               const mappedComment: ThreadedWarRoomComment = {
                  id: numericCommentId,
                  postId: numericPostId,
                  parentCommentId: comment.parent_comment_id ? commentNumericIdByUuid.get(comment.parent_comment_id) : undefined,
                  author: {
                     name: author?.name ?? "FrontOffice User",
                     handle: author?.handle ?? "@frontoffice",
                     initials: author?.initials ?? "FO",
                     isCurrentUser: comment.author_id === user.id,
                  },
                  body: comment.body,
                  createdAt: comment.created_at,
               };

               return mappedComment;
            })
            .filter((comment): comment is ThreadedWarRoomComment => comment !== null);

         voteRows
            .filter((vote) => vote.user_id === user.id)
            .forEach((vote) => {
               const numericPostId = postNumericIdByUuid.get(vote.post_id);

               if (numericPostId) {
                  nextCurrentUserVotes[numericPostId] = vote.value;
               }
            });

         const nextBookmarks = bookmarkRows.map((bookmark) => postNumericIdByUuid.get(bookmark.post_id)).filter((postId): postId is number => Boolean(postId));

         const nextNotificationUuidMap: Record<number, string> = {};
         const nextNotificationActorMap: Record<number, string | null> = {};

         const nextNotifications: FrontOfficeNotification[] = notificationRows.map((notification) => {
            const numericNotificationId = stableNumericId(notification.id);
            nextNotificationUuidMap[numericNotificationId] = notification.id;
            nextNotificationActorMap[numericNotificationId] = notification.actor_id;

            if (notification.type === "follow") {
               const actorHandle = notification.actor_id ? profilesById.get(notification.actor_id)?.handle : undefined;

               return {
                  id: numericNotificationId,
                  type: notification.type,
                  title: notification.title,
                  body: notification.body,
                  createdAt: notification.created_at,
                  isRead: notification.is_read,
                  destination: {
                     section: "profile",
                     handle: actorHandle ?? userProfile.handle,
                  },
               };
            }

            const numericPostId = notification.post_id ? postNumericIdByUuid.get(notification.post_id) : undefined;

            return {
               id: numericNotificationId,
               type: notification.type,
               title: notification.title,
               body: notification.body,
               createdAt: notification.created_at,
               isRead: notification.is_read,
               destination: {
                  section: "war-room",
                  postId: numericPostId,
               },
            };
         });

         const nextReceiptUuidMap: Record<number, string> = {};
         const nextReceiptPostMap: Record<number, number> = {};

         const postsByUuid = new Map(postRows.map((post) => [post.id, post]));

         const nextReceiptStatusByPostId: Record<number, Receipt["status"]> = {};

         const nextReceipts: Receipt[] = receiptRows
            .map((receipt) => {
               const post = postsByUuid.get(receipt.post_id);
               const numericPostId = postNumericIdByUuid.get(receipt.post_id);

               if (!post || !numericPostId) {
                  return null;
               }

               nextReceiptStatusByPostId[numericPostId] = receipt.status;

               if (receipt.author_id !== user.id) {
                  return null;
               }

               const numericReceiptId = stableNumericId(receipt.id);

               nextReceiptUuidMap[numericReceiptId] = receipt.id;
               nextReceiptPostMap[numericReceiptId] = numericPostId;

               /**
                * Combined Build 3B + 3C:
                * Reuse receipts.updated_at as the last review timestamp.
                * This avoids a new migration while still giving resurfacing
                * logic a reliable cooldown memory.
                */
               const mappedReceipt: Receipt & {
                  lastRevisitedAt?: string | null;
               } = {
                  id: numericReceiptId,
                  type: post.call_type,
                  team: post.team_name_snapshot,
                  call: post.take,
                  confidence: post.confidence,
                  status: receipt.status,
                  reaction: "",
                  createdAt: receipt.created_at,
                  lastRevisitedAt: receipt.updated_at,
               };

               return mappedReceipt;
            })
            .filter((receipt): receipt is Receipt => receipt !== null);

         const nextInteractionCounts: Record<number, number> = {};

         interactionRows.forEach((interaction) => {
            const numericPostId = postNumericIdByUuid.get(interaction.post_id);

            if (numericPostId) {
               nextInteractionCounts[numericPostId] = Number(interaction.interaction_count);
            }
         });

         const nextFollowerHandlesByProfile: Record<string, string[]> = {};
         const nextFollowingHandlesByProfile: Record<string, string[]> = {};

         followRows.forEach((follow) => {
            const followerProfile = profilesById.get(follow.follower_id);
            const followingProfile = profilesById.get(follow.following_id);

            if (!followerProfile || !followingProfile) {
               return;
            }

            nextFollowerHandlesByProfile[followingProfile.handle] = [...(nextFollowerHandlesByProfile[followingProfile.handle] ?? []), followerProfile.handle];

            nextFollowingHandlesByProfile[followerProfile.handle] = [...(nextFollowingHandlesByProfile[followerProfile.handle] ?? []), followingProfile.handle];
         });

         const nextFollowedHandles = nextFollowingHandlesByProfile[userProfile.handle] ?? [];

         setWarRoomPosts(nextPosts);
         setWarRoomComments(nextComments);
         setPostUuidByNumericId(nextPostUuidMap);
         setCommentUuidByNumericId(nextCommentUuidMap);
         setCurrentUserVotes(nextCurrentUserVotes);
         setSavedBookmarks(nextBookmarks);
         setFollowedHandles(nextFollowedHandles);
         setFollowerHandlesByProfile(nextFollowerHandlesByProfile);
         setFollowingHandlesByProfile(nextFollowingHandlesByProfile);
         setInteractionCounts(nextInteractionCounts);
         setNotifications(nextNotifications);
         setBlockedProfiles(nextBlockedProfiles);
         setNotificationUuidByNumericId(nextNotificationUuidMap);
         setNotificationActorIdByNumericId(nextNotificationActorMap);
         setPublicProfilesByHandle(nextPublicProfilesByHandle);
         setSavedReceipts(nextReceipts);
         setReceiptUuidByNumericId(nextReceiptUuidMap);
         setReceiptPostIdByReceiptId(nextReceiptPostMap);
         setReceiptStatusByPostId(nextReceiptStatusByPostId);
         setIsSocialLoading(false);
      }

      void loadSharedWarRoom();

      /**
       * Lightweight live-feed refresh.
       *
       * WarRoomSection buffers newly arrived post IDs and shows the user
       * a Show New banner instead of reordering the feed under them.
       */
      const refreshIntervalId = window.setInterval(() => {
         void loadSharedWarRoom(true);
      }, 30_000);

      return () => {
         isMounted = false;
         window.clearInterval(refreshIntervalId);
      };
   }, [isAccountLoading, userProfile.handle]);

   useEffect(() => {
      if (hasHandledPushDeepLink || isAccountLoading || isSocialLoading || typeof window === "undefined") {
         return;
      }

      const params = new URLSearchParams(window.location.search);

      const section = params.get("section");

      if (!section) {
         setHasHandledPushDeepLink(true);
         return;
      }

      if (section === "war-room") {
         setWarRoomTeamFilter(null);
         setActiveSection("war-room");

         const postUuid = params.get("post");

         if (postUuid) {
            const matchingEntry = Object.entries(postUuidByNumericId).find(([, uuid]) => uuid === postUuid);

            if (matchingEntry) {
               setWarRoomFocusRequest({
                  postId: Number(matchingEntry[0]),
                  requestId: Date.now(),
               });
            }
         }

         setHasHandledPushDeepLink(true);
         return;
      }

      if (section === "profile") {
         const handle = params.get("handle");

         if (handle && (handle === userProfile.handle || publicProfilesByHandle[handle])) {
            setViewedProfileHandle(handle);
         } else {
            setViewedProfileHandle(userProfile.handle);
         }

         setActiveSection("profile");
         setHasHandledPushDeepLink(true);
         return;
      }

      setHasHandledPushDeepLink(true);
   }, [hasHandledPushDeepLink, isAccountLoading, isSocialLoading, postUuidByNumericId, publicProfilesByHandle, userProfile.handle]);

   async function handleMarkNotificationRead(notificationId: number) {
      const notificationUuid = notificationUuidByNumericId[notificationId];

      if (!notificationUuid) {
         return;
      }

      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationUuid);

      if (error) {
         console.error("FrontOffice could not mark the notification as read.", error);
         return;
      }

      setNotifications((items) =>
         items.map((notification) =>
            notification.id === notificationId
               ? {
                    ...notification,
                    isRead: true,
                 }
               : notification,
         ),
      );
   }

   async function handleMarkAllNotificationsRead() {
      const {
         data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
         return;
      }

      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("recipient_id", user.id).eq("is_read", false);

      if (error) {
         console.error("FrontOffice could not mark notifications as read.", error);
         return;
      }

      setNotifications((items) =>
         items.map((notification) => ({
            ...notification,
            isRead: true,
         })),
      );
   }

   function handleOpenNotification(notification: FrontOfficeNotification) {
      if (notification.destination.section === "profile") {
         handleOpenProfile(notification.destination.handle);
         return;
      }

      setActiveSection("war-room");

      if (notification.destination.postId) {
         setWarRoomFocusRequest({
            postId: notification.destination.postId,
            requestId: Date.now(),
         });
      }
   }

   const currentBrief = useMemo(() => {
      return teamBriefs.find((brief) => brief.sport === selectedSport && brief.team === selectedTeam) ?? teamBriefs.find((brief) => brief.sport === selectedSport) ?? teamBriefs[0];
   }, [selectedSport, selectedTeam]);

   const myTeams = useMemo(() => {
      const selectedTeamNames = new Set(userProfile.favoriteTeams);

      const selectedTeams = teamBriefs.filter((brief) => selectedTeamNames.has(brief.team));

      if (selectedTeams.length > 0) {
         return selectedTeams;
      }

      return teamBriefs.filter((brief) => brief.team === selectedTeam);
   }, [selectedTeam, userProfile.favoriteTeams]);

   const selectedTeamUpdates = useMemo(() => {
      return getTeamUpdates({
         selectedSport,
         selectedTeam,
         currentBrief,
         allUpdates: mockTeamUpdates,
      });
   }, [selectedSport, selectedTeam, currentBrief]);

   function handleTeamChange(team: string) {
      const matchingTeam = teamBriefs.find((brief) => brief.team === team);

      if (matchingTeam) {
         setSelectedSport(matchingTeam.sport);
      }

      setSelectedTeam(team);
      setFrontOfficeCopy(getRandomReportCopy());
   }

   async function handleSaveMyTeams(teamNames: string[]) {
      const nextTeams = teamNames.slice(0, 5);

      if (nextTeams.length === 0) {
         return;
      }

      const selectedTeams = nextTeams
         .map((teamName) => teamBriefs.find((brief) => brief.team === teamName))
         .filter((team): team is (typeof teamBriefs)[number] => Boolean(team))
         .map((team) => ({
            sport: team.sport,
            name: team.team,
         }));

      const { error } = await supabase.rpc("complete_onboarding", {
         profile_name: userProfile.name,
         profile_handle: userProfile.handle,
         selected_teams: selectedTeams,
      });

      if (error) {
         console.error("FrontOffice could not save My Teams.", error);
         return;
      }

      setUserProfile((profile) => ({
         ...profile,
         favoriteTeams: nextTeams,
      }));

      if (!nextTeams.includes(selectedTeam)) {
         const nextActiveTeam = teamBriefs.find((brief) => nextTeams.includes(brief.team));

         if (nextActiveTeam) {
            setSelectedSport(nextActiveTeam.sport);
            setSelectedTeam(nextActiveTeam.team);
            setFrontOfficeCopy(getRandomReportCopy());
         }
      }
   }

   function handleSectionChange(section: AppSection) {
      setActiveSection(section);

      if (section === "front-office") {
         setFrontOfficeCopy(getRandomReportCopy());
      }

      if (section === "profile") {
         setViewedProfileHandle(userProfile.handle);
      }

      if (section === "war-room") {
         setWarRoomTeamFilter(null);
         setWarRoomFocusRequest(null);
      }
   }

   function handleOpenSearchPost(postId: number) {
      setWarRoomTeamFilter(null);
      setActiveSection("war-room");
      setWarRoomFocusRequest({
         postId,
         requestId: Date.now(),
      });
   }

   function handleOpenReceiptDiscussion(postId: number) {
      setWarRoomTeamFilter(null);
      setActiveSection("war-room");
      setWarRoomFocusRequest({
         postId,
         requestId: Date.now(),
      });
   }

   function handleOpenTeamDiscussion(teamName: string) {
      setWarRoomFocusRequest(null);
      setWarRoomTeamFilter(teamName);
      setActiveSection("war-room");
   }

   /**
    * Opens a profile from Search or the War Room.
    */
   function handleOpenProfile(handle: string) {
      if (handle !== userProfile.handle && !publicProfilesByHandle[handle]) {
         return;
      }

      setViewedProfileHandle(handle);
      setActiveSection("profile");
   }

   /**
    * Saves profile edits and updates the current user's existing
    * posts and comments so the new identity appears across the app.
    */
   async function handleSaveProfile(profile: FrontOfficeProfile) {
      const selectedTeams = profile.favoriteTeams
         .map((teamName) => teamBriefs.find((brief) => brief.team === teamName))
         .filter((team): team is (typeof teamBriefs)[number] => Boolean(team))
         .map((team) => ({
            sport: team.sport,
            name: team.team,
         }));

      const { error: onboardingError } = await supabase.rpc("complete_onboarding", {
         profile_name: profile.name,
         profile_handle: profile.handle,
         selected_teams: selectedTeams,
      });

      if (onboardingError) {
         console.error("FrontOffice could not save the profile identity.", onboardingError);
         throw new Error(onboardingError.message);
      }

      const {
         data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
         return;
      }

      const { error: profileError } = await supabase
         .from("profiles")
         .update({
            bio: profile.bio,
            profile_image_url: profile.profileImageUrl ?? null,
            banner_image_url: profile.bannerImageUrl ?? null,
         })
         .eq("id", user.id);

      if (profileError) {
         console.error("FrontOffice could not save the profile details.", profileError);
         throw new Error(profileError.message);
      }

      const nextProfile: FrontOfficeProfile = {
         ...profile,
         isCurrentUser: true,
      };

      setUserProfile(nextProfile);
      setViewedProfileHandle(nextProfile.handle);

      setPublicProfilesByHandle((profiles) => ({
         ...profiles,
         [nextProfile.handle]: nextProfile,
      }));

      setWarRoomPosts((posts) =>
         posts.map((post) =>
            post.author?.isCurrentUser
               ? {
                    ...post,
                    user: nextProfile.name.split(" ")[0] || nextProfile.name,
                    author: {
                       ...post.author,
                       name: nextProfile.name,
                       handle: nextProfile.handle,
                       initials: nextProfile.initials,
                    },
                 }
               : post,
         ),
      );

      setWarRoomComments((comments) =>
         comments.map((comment) =>
            comment.author.isCurrentUser
               ? {
                    ...comment,
                    author: {
                       ...comment.author,
                       name: nextProfile.name,
                       handle: nextProfile.handle,
                       initials: nextProfile.initials,
                    },
                 }
               : comment,
         ),
      );
   }

   async function handleVote(postId: number, nextVote: UserVoteValue) {
      const postUuid = postUuidByNumericId[postId];

      if (!postUuid) {
         return;
      }

      const {
         data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
         return;
      }

      const previousVote = currentUserVotes[postId] ?? 0;
      const voteDifference = nextVote - previousVote;

      if (nextVote === 0) {
         const { error } = await supabase.from("post_votes").delete().eq("post_id", postUuid).eq("user_id", user.id);

         if (error) {
            console.error("FrontOffice could not remove the vote.", error);
            return;
         }
      } else {
         const { error } = await supabase.from("post_votes").upsert(
            {
               post_id: postUuid,
               user_id: user.id,
               value: nextVote,
            },
            {
               onConflict: "post_id,user_id",
            },
         );

         if (error) {
            console.error("FrontOffice could not save the vote.", error);
            return;
         }
      }

      setCurrentUserVotes((votes) => ({
         ...votes,
         [postId]: nextVote,
      }));

      if (previousVote === 0 && nextVote !== 0) {
         setInteractionCounts((counts) => ({
            ...counts,
            [postId]: (counts[postId] ?? 0) + 1,
         }));
      } else if (previousVote !== 0 && nextVote === 0) {
         setInteractionCounts((counts) => ({
            ...counts,
            [postId]: Math.max(0, (counts[postId] ?? 0) - 1),
         }));
      }

      setWarRoomPosts((posts) =>
         posts.map((post) => {
            if (post.id !== postId) {
               return post;
            }

            const nextVotes = post.votes + voteDifference;

            if (post.author?.isCurrentUser) {
               const milestone = getNextVoteMilestone(post.votes, nextVotes);

               if (milestone) {
                  const milestoneNotificationId = post.id * 100_000 + milestone;

                  setNotifications((items) => {
                     const alreadyExists = items.some((notification) => notification.id === milestoneNotificationId);

                     if (alreadyExists) {
                        return items;
                     }

                     const milestoneNotification: FrontOfficeNotification = {
                        id: milestoneNotificationId,
                        type: "milestone",
                        title: `Your take has reached ${milestone} votes`,
                        body: "",
                        createdAt: new Date().toISOString(),
                        isRead: false,
                        destination: {
                           section: "war-room",
                           postId: post.id,
                        },
                     };

                     return [milestoneNotification, ...items];
                  });
               }
            }

            return {
               ...post,
               votes: nextVotes,
            };
         }),
      );
   }

   async function handleToggleBookmark(postId: number) {
      const postUuid = postUuidByNumericId[postId];

      if (!postUuid) {
         return;
      }

      const {
         data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
         return;
      }

      const isAlreadySaved = savedBookmarks.includes(postId);

      if (isAlreadySaved) {
         const { error } = await supabase.from("bookmarks").delete().eq("user_id", user.id).eq("post_id", postUuid);

         if (error) {
            console.error("FrontOffice could not remove the bookmark.", error);
            return;
         }

         setSavedBookmarks((bookmarks) => bookmarks.filter((savedPostId) => savedPostId !== postId));

         setInteractionCounts((counts) => ({
            ...counts,
            [postId]: Math.max(0, (counts[postId] ?? 0) - 1),
         }));

         return;
      }

      const { error } = await supabase.from("bookmarks").insert({
         user_id: user.id,
         post_id: postUuid,
      });

      if (error) {
         console.error("FrontOffice could not save the bookmark.", error);
         return;
      }

      setSavedBookmarks((bookmarks) => [...bookmarks, postId]);

      setInteractionCounts((counts) => ({
         ...counts,
         [postId]: (counts[postId] ?? 0) + 1,
      }));
   }

   /**
    * Adds or removes a user from the current user's following list.
    *
    * SearchSection uses this to update Follow / Following buttons.
    * WarRoomSection will use the same list for the Following feed.
    */
   async function handleToggleFollow(handle: string) {
      if (handle === userProfile.handle) {
         return;
      }

      if (blockedProfiles.some((profile) => profile.handle === handle)) {
         return;
      }

      const {
         data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
         return;
      }

      const { data: targetProfile, error: profileError } = await supabase.from("profiles").select("id").eq("handle", handle).single();

      if (profileError || !targetProfile) {
         console.error("FrontOffice could not find the profile to follow.", profileError);
         return;
      }

      const isFollowing = followedHandles.includes(handle);

      if (isFollowing) {
         const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetProfile.id);

         if (error) {
            console.error("FrontOffice could not unfollow the profile.", error);
            return;
         }

         setFollowedHandles((handles) => handles.filter((followedHandle) => followedHandle !== handle));

         setFollowerHandlesByProfile((relationships) => ({
            ...relationships,
            [handle]: (relationships[handle] ?? []).filter((followerHandle) => followerHandle !== userProfile.handle),
         }));

         setFollowingHandlesByProfile((relationships) => ({
            ...relationships,
            [userProfile.handle]: (relationships[userProfile.handle] ?? []).filter((followingHandle) => followingHandle !== handle),
         }));

         return;
      }

      const { error } = await supabase.from("follows").insert({
         follower_id: user.id,
         following_id: targetProfile.id,
      });

      if (error) {
         console.error("FrontOffice could not follow the profile.", error);
         return;
      }

      setFollowedHandles((handles) => [...handles, handle]);

      setFollowerHandlesByProfile((relationships) => ({
         ...relationships,
         [handle]: Array.from(new Set([...(relationships[handle] ?? []), userProfile.handle])),
      }));

      setFollowingHandlesByProfile((relationships) => ({
         ...relationships,
         [userProfile.handle]: Array.from(new Set([...(relationships[userProfile.handle] ?? []), handle])),
      }));
   }

   /**
    * Adds a new top-level comment to a War Room post.
    *
    * The comment is owned by the current user
    * and the post comment count increases immediately.
    */
   async function handleAddComment(postId: number, body: string, parentCommentId?: number | null) {
      const trimmedBody = body.trim();
      const postUuid = postUuidByNumericId[postId];
      const parentCommentUuid = parentCommentId ? commentUuidByNumericId[parentCommentId] : null;

      if (!trimmedBody || !postUuid || (parentCommentId && !parentCommentUuid)) {
         return;
      }

      const {
         data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
         return;
      }

      const { data, error } = await supabase
         .from("comments")
         .insert({
            post_id: postUuid,
            author_id: user.id,
            parent_comment_id: parentCommentUuid,
            body: trimmedBody,
         })
         .select("id, post_id, author_id, parent_comment_id, body, created_at")
         .single();

      if (error || !data) {
         console.error("FrontOffice could not post the comment.", error);
         throw new Error(error?.message ?? "FrontOffice could not post the comment.");
      }

      const commentRow = data as CommentRow;
      const numericCommentId = stableNumericId(commentRow.id);

      const newComment: ThreadedWarRoomComment = {
         id: numericCommentId,
         postId,
         parentCommentId: parentCommentId ?? undefined,
         author: {
            name: userProfile.name,
            handle: userProfile.handle,
            initials: userProfile.initials,
            isCurrentUser: true,
         },
         body: commentRow.body,
         createdAt: commentRow.created_at,
      };

      setCommentUuidByNumericId((items) => ({
         ...items,
         [numericCommentId]: commentRow.id,
      }));

      setWarRoomComments((comments) => [...comments, newComment]);

      setInteractionCounts((counts) => ({
         ...counts,
         [postId]: (counts[postId] ?? 0) + 1,
      }));

      setWarRoomPosts((posts) =>
         posts.map((post) =>
            post.id === postId
               ? {
                    ...post,
                    comments: post.comments + 1,
                 }
               : post,
         ),
      );
   }

   async function handleBlockProfile(handle: string) {
      const {
         data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
         throw new Error("Sign in again to block this account.");
      }

      const { data: targetProfile, error: profileError } = await supabase.from("profiles").select("id, name, handle, initials, profile_image_url").eq("handle", handle).maybeSingle();

      if (profileError || !targetProfile) {
         throw new Error(profileError?.message ?? "FrontOffice could not find this profile.");
      }

      if (targetProfile.id === user.id) {
         throw new Error("You cannot block your own account.");
      }

      const { error } = await supabase.from("blocks").insert({
         blocker_id: user.id,
         blocked_id: targetProfile.id,
      });

      if (error) {
         if (error.message.toLowerCase().includes("duplicate") || error.message.toLowerCase().includes("unique")) {
            throw new Error("This account is already blocked.");
         }

         throw new Error(error.message);
      }

      setBlockedProfiles((profiles) => {
         const alreadyBlocked = profiles.some((profile) => profile.id === targetProfile.id);

         if (alreadyBlocked) {
            return profiles;
         }

         return [
            ...profiles,
            {
               id: targetProfile.id,
               name: targetProfile.name,
               handle: targetProfile.handle,
               initials: targetProfile.initials,
               profileImageUrl: targetProfile.profile_image_url ?? undefined,
            },
         ];
      });

      setFollowedHandles((handles) => handles.filter((item) => item !== targetProfile.handle));

      setFollowerHandlesByProfile((relationships) => {
         const nextRelationships: Record<string, string[]> = {};

         Object.entries(relationships).forEach(([profileHandle, handles]) => {
            nextRelationships[profileHandle] = handles.filter((item) => item !== targetProfile.handle);
         });

         return nextRelationships;
      });

      setFollowingHandlesByProfile((relationships) => {
         const nextRelationships: Record<string, string[]> = {};

         Object.entries(relationships).forEach(([profileHandle, handles]) => {
            nextRelationships[profileHandle] = handles.filter((item) => item !== targetProfile.handle);
         });

         return nextRelationships;
      });

      setNotifications((items) => items.filter((notification) => notificationActorIdByNumericId[notification.id] !== targetProfile.id));

      setNotificationActorIdByNumericId((actors) => {
         const nextActors = { ...actors };

         Object.entries(nextActors).forEach(([notificationId, actorId]) => {
            if (actorId === targetProfile.id) {
               delete nextActors[Number(notificationId)];
            }
         });

         return nextActors;
      });
   }

   async function handleUnblockProfile(handle: string) {
      const {
         data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
         throw new Error("Sign in again to unblock this account.");
      }

      const targetProfile = blockedProfiles.find((profile) => profile.handle === handle);

      if (!targetProfile) {
         throw new Error("FrontOffice could not find this blocked account.");
      }

      const { error } = await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", targetProfile.id);

      if (error) {
         throw new Error(error.message);
      }

      setBlockedProfiles((profiles) => profiles.filter((profile) => profile.id !== targetProfile.id));
   }

   async function handleReportPost(postId: number, reason: ReportReason, note: string) {
      const postUuid = postUuidByNumericId[postId];

      if (!postUuid) {
         throw new Error("FrontOffice could not find this post.");
      }

      const {
         data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
         throw new Error("Sign in again to submit a report.");
      }

      const { error } = await supabase.from("reports").insert({
         reporter_id: user.id,
         target_type: "post",
         post_id: postUuid,
         reason,
         note: note || null,
      });

      if (error) {
         throw new Error(error.message);
      }
   }

   async function handleReportComment(commentId: number, reason: ReportReason, note: string) {
      const commentUuid = commentUuidByNumericId[commentId];

      if (!commentUuid) {
         throw new Error("FrontOffice could not find this response.");
      }

      const {
         data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
         throw new Error("Sign in again to submit a report.");
      }

      const { error } = await supabase.from("reports").insert({
         reporter_id: user.id,
         target_type: "comment",
         comment_id: commentUuid,
         reason,
         note: note || null,
      });

      if (error) {
         throw new Error(error.message);
      }
   }

   async function handleReportProfile(handle: string, reason: ReportReason, note: string) {
      const {
         data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
         throw new Error("Sign in again to submit a report.");
      }

      const { data: targetProfile, error: profileError } = await supabase.from("profiles").select("id").eq("handle", handle).maybeSingle();

      if (profileError || !targetProfile) {
         throw new Error(profileError?.message ?? "FrontOffice could not find this profile.");
      }

      if (targetProfile.id === user.id) {
         throw new Error("You cannot report your own profile.");
      }

      const { error } = await supabase.from("reports").insert({
         reporter_id: user.id,
         target_type: "profile",
         profile_id: targetProfile.id,
         reason,
         note: note || null,
      });

      if (error) {
         throw new Error(error.message);
      }
   }

   /**
    * Deletes only comments owned by the current user.
    *
    * When a comment is removed,
    * the matching post count decreases by one.
    */
   async function handleDeleteComment(commentId: number) {
      const commentToDelete = warRoomComments.find((comment) => comment.id === commentId);
      const commentUuid = commentUuidByNumericId[commentId];

      if (!commentToDelete || !commentToDelete.author.isCurrentUser || !commentUuid) {
         return;
      }

      const { error } = await supabase.from("comments").delete().eq("id", commentUuid);

      if (error) {
         console.error("FrontOffice could not delete the comment.", error);
         return;
      }

      setWarRoomComments((comments) => comments.filter((comment) => comment.id !== commentId));

      setInteractionCounts((counts) => ({
         ...counts,
         [commentToDelete.postId]: Math.max(0, (counts[commentToDelete.postId] ?? 0) - 1),
      }));

      setCommentUuidByNumericId((items) => {
         const nextItems = { ...items };
         delete nextItems[commentId];
         return nextItems;
      });

      setWarRoomPosts((posts) =>
         posts.map((post) =>
            post.id === commentToDelete.postId
               ? {
                    ...post,
                    comments: Math.max(0, post.comments - 1),
                 }
               : post,
         ),
      );
   }

   /**
    * Deletes only posts owned by the current user.
    *
    * Also removes:
    * - attached comments
    * - matching receipt
    * - bookmark reference
    */
   async function handleDeletePost(postId: number) {
      const postToDelete = warRoomPosts.find((post) => post.id === postId);
      const postUuid = postUuidByNumericId[postId];

      if (!postToDelete || !postToDelete.author?.isCurrentUser || !postUuid) {
         return;
      }

      const { error } = await supabase.from("posts").delete().eq("id", postUuid);

      if (error) {
         console.error("FrontOffice could not delete the post.", error);
         return;
      }

      setWarRoomPosts((posts) => posts.filter((post) => post.id !== postId));
      setWarRoomComments((comments) => comments.filter((comment) => comment.postId !== postId));

      setInteractionCounts((counts) => {
         const nextCounts = { ...counts };
         delete nextCounts[postId];
         return nextCounts;
      });

      setPostUuidByNumericId((items) => {
         const nextItems = { ...items };
         delete nextItems[postId];
         return nextItems;
      });

      const receiptIdsForPost = Object.entries(receiptPostIdByReceiptId)
         .filter(([, linkedPostId]) => linkedPostId === postId)
         .map(([receiptId]) => Number(receiptId));

      setSavedReceipts((receipts) => receipts.filter((receipt) => !receiptIdsForPost.includes(receipt.id)));

      setReceiptUuidByNumericId((items) => {
         const nextItems = { ...items };

         receiptIdsForPost.forEach((receiptId) => {
            delete nextItems[receiptId];
         });

         return nextItems;
      });

      setReceiptPostIdByReceiptId((items) => {
         const nextItems = { ...items };

         receiptIdsForPost.forEach((receiptId) => {
            delete nextItems[receiptId];
         });

         return nextItems;
      });

      setReceiptStatusByPostId((items) => {
         const nextItems = { ...items };
         delete nextItems[postId];
         return nextItems;
      });

      setSavedBookmarks((bookmarks) => bookmarks.filter((savedPostId) => savedPostId !== postId));
   }

   function getFormattedCall() {
      const trimmedCall = callForm.call.trim();

      const trimmedReason = callForm.reason.trim();

      if (!trimmedCall) {
         return "";
      }

      if (!trimmedReason) {
         return trimmedCall;
      }

      return `${trimmedCall} Reason: ${trimmedReason}`;
   }

   async function handlePostCallToWarRoom() {
      const formattedCall = getFormattedCall();

      if (!formattedCall) {
         return;
      }

      const {
         data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
         return;
      }

      const { data: teamData, error: teamError } = await supabase.from("teams").select("id").eq("sport", selectedSport).eq("name", currentBrief.team).maybeSingle();

      if (teamError) {
         console.error("FrontOffice could not match the selected team.", teamError);
         return;
      }

      const tag = callForm.confidence;

      const { data, error } = await supabase
         .from("posts")
         .insert({
            author_id: user.id,
            team_id: teamData?.id ?? null,
            team_name_snapshot: currentBrief.team,
            call_type: callForm.callType,
            confidence: callForm.confidence,
            take: formattedCall,
            tag,
         })
         .select("id, author_id, team_id, team_name_snapshot, call_type, confidence, take, tag, created_at")
         .single();

      if (error || !data) {
         console.error("FrontOffice could not post the take.", error);
         throw new Error(error?.message ?? "FrontOffice could not post the take.");
      }

      const postRow = data as PostRow;
      const numericPostId = stableNumericId(postRow.id);

      const newPost: WarRoomPost = {
         id: numericPostId,
         user: userProfile.name.split(" ")[0] || userProfile.name,
         author: {
            name: userProfile.name,
            handle: userProfile.handle,
            initials: userProfile.initials,
            isCurrentUser: true,
         },
         team: postRow.team_name_snapshot,
         take: postRow.take,
         votes: 0,
         comments: 0,
         tag: postRow.tag,
         createdAt: postRow.created_at,
      };

      const { data: receiptDataForPost, error: receiptLoadError } = await supabase.from("receipts").select("id, post_id, author_id, status, reaction, outcome_note, resolved_at, created_at, updated_at").eq("post_id", postRow.id).single();

      if (receiptLoadError || !receiptDataForPost) {
         console.error("FrontOffice posted the take but could not load its receipt.", receiptLoadError);
      }

      const createdReceiptRow = receiptDataForPost as ReceiptRow | null;
      const numericReceiptId = createdReceiptRow ? stableNumericId(createdReceiptRow.id) : null;

      const newReceipt: Receipt | null =
         createdReceiptRow && numericReceiptId
            ? {
                 id: numericReceiptId,
                 type: postRow.call_type,
                 team: postRow.team_name_snapshot,
                 call: postRow.take,
                 confidence: postRow.confidence,
                 status: createdReceiptRow.status,
                 reaction: createdReceiptRow.reaction,
                 createdAt: createdReceiptRow.created_at,
              }
            : null;

      setPostUuidByNumericId((items) => ({
         ...items,
         [numericPostId]: postRow.id,
      }));

      setInteractionCounts((counts) => ({
         ...counts,
         [numericPostId]: 0,
      }));

      setWarRoomPosts((posts) => [newPost, ...posts]);

      if (newReceipt && createdReceiptRow && numericReceiptId) {
         setSavedReceipts((receipts) => [newReceipt, ...receipts]);

         setReceiptUuidByNumericId((items) => ({
            ...items,
            [numericReceiptId]: createdReceiptRow.id,
         }));

         setReceiptPostIdByReceiptId((items) => ({
            ...items,
            [numericReceiptId]: numericPostId,
         }));

         setReceiptStatusByPostId((items) => ({
            ...items,
            [numericPostId]: newReceipt.status,
         }));
      }

      setCallForm(initialCallForm);

      /**
       * Build 4:
       * A newly created call opens the chronological New feed and
       * scrolls directly to the exact post that was just created.
       */
      setWarRoomFocusRequest({
         postId: numericPostId,
         requestId: Date.now(),
         targetFeed: "new",
      });

      setActiveSection("war-room");
   }

   async function handleDeleteReceipt(receiptId: number) {
      const linkedPostId = receiptPostIdByReceiptId[receiptId];

      if (!linkedPostId) {
         throw new Error("FrontOffice could not find the War Room post linked to this receipt.");
      }

      const postBeforeDelete = warRoomPosts.find((post) => post.id === linkedPostId);

      if (!postBeforeDelete || !postBeforeDelete.author?.isCurrentUser) {
         throw new Error("You can only delete receipts that belong to your account.");
      }

      await handleDeletePost(linkedPostId);

      const postStillExists = warRoomPosts.some((post) => post.id === linkedPostId);

      // State updates are asynchronous, so database deletion remains the
      // authoritative operation. handleDeletePost performs all linked
      // local-state cleanup after a successful delete.
      void postStillExists;
   }

   async function handleUpdateReceiptStatus(receiptId: number, status: Receipt["status"]) {
      const receiptUuid = receiptUuidByNumericId[receiptId];

      if (!receiptUuid) {
         return;
      }

      /**
       * MK II Build 3A
       *
       * Only terminal receipt outcomes set resolved_at.
       * "Looking Good" and "On the Ropes" are still active calls,
       * so they remain eligible for future resurfacing.
       */
      const terminalStatuses: Receipt["status"][] = ["Cold Take", "Called It", "Legendary"];

      const isResolved = terminalStatuses.includes(status);

      const revisitAt = new Date().toISOString();

      const { error } = await supabase
         .from("receipts")
         .update({
            status,
            resolved_at: isResolved ? revisitAt : null,

            // Status review also counts as a receipt revisit.
            updated_at: revisitAt,
         })
         .eq("id", receiptUuid);

      if (error) {
         console.error("FrontOffice could not update the receipt.", error);
         return;
      }

      setSavedReceipts((receipts) =>
         receipts.map((receipt) =>
            receipt.id === receiptId
               ? {
                    ...receipt,
                    status,

                    // Hide the reviewed receipt until its next cadence window.
                    lastRevisitedAt: revisitAt,
                 }
               : receipt,
         ),
      );

      const linkedPostId = receiptPostIdByReceiptId[receiptId];

      if (linkedPostId) {
         setReceiptStatusByPostId((items) => ({
            ...items,
            [linkedPostId]: status,
         }));
      }
   }

   /**
    * Stand By It
    *
    * Reaffirms the current status without changing the original take.
    * Updating `updated_at` starts the next resurfacing cooldown window.
    */
   async function handleStandByReceipt(receiptId: number) {
      const receiptUuid = receiptUuidByNumericId[receiptId];

      if (!receiptUuid) {
         return;
      }

      const revisitAt = new Date().toISOString();

      const { error } = await supabase
         .from("receipts")
         .update({
            updated_at: revisitAt,
         })
         .eq("id", receiptUuid);

      if (error) {
         console.error("FrontOffice could not reaffirm the receipt.", error);
         return;
      }

      setSavedReceipts((receipts) =>
         receipts.map((receipt) =>
            receipt.id === receiptId
               ? {
                    ...receipt,
                    lastRevisitedAt: revisitAt,
                 }
               : receipt,
         ),
      );
   }

   if (isAccountLoading || isSocialLoading) {
      return (
         <main className="flex min-h-screen items-center justify-center bg-[#F6F7F8] px-4 text-[#111827]">
            <div className="border border-[#111827] bg-white px-6 py-8 text-center">
               <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#C2410C]">FrontOffice</p>
               <p className="mt-2 text-xl font-black uppercase tracking-[-0.02em]">Loading the War Room...</p>
            </div>
         </main>
      );
   }

   return (
      <main className="min-h-screen bg-[#F6F7F8] text-[#111827]">
         <div className="flex min-h-screen w-full">
            <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-[#111827] bg-white xl:flex xl:flex-col">
               <div className="border-b border-[#111827] bg-[#FFF8EE] px-5 py-6">
                  <Image src="/frontoffice-preview.png" alt="FrontOffice logo" width={240} height={96} priority className="h-24 w-full object-contain" />
               </div>

               <nav aria-label="Primary desktop navigation" className="divide-y divide-[#111827] border-b border-[#111827]">
                  {navigationItems.map((item, index) => {
                     const isActive = activeSection === item.id;

                     const Icon = item.icon;

                     return (
                        <button
                           key={item.id}
                           type="button"
                           onClick={() => handleSectionChange(item.id)}
                           className={`grid min-h-16 w-full grid-cols-[36px_1fr_28px] items-center gap-3 px-5 py-3 text-left transition focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#1E40AF]/30 ${
                              isActive ? "bg-[#111827] text-white" : "bg-white text-[#111827] hover:bg-[#FFF8EE]"
                           }`}
                           aria-current={isActive ? "page" : undefined}
                        >
                           <span className={`text-[11px] font-black tracking-[0.14em] ${isActive ? "text-white/70" : "text-[#C2410C]"}`}>{String(index + 1).padStart(2, "0")}</span>

                           <span className="flex items-center gap-3">
                              <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />

                              <span className="text-sm font-black uppercase tracking-[0.07em]">{item.label}</span>
                           </span>

                           <span aria-hidden="true" className={`h-px w-7 ${isActive ? "bg-white" : "bg-[#111827]"}`} />
                        </button>
                     );
                  })}
               </nav>

               <div className="mt-auto border-t border-[#111827] bg-[#FFF8EE] px-5 py-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#5B6475]">Be The GM</p>

                  <p className="mt-1 text-sm font-black leading-5 text-[#111827]">Make the call. Keep the receipts.</p>
               </div>
            </aside>

            <section className="flex min-h-screen min-w-0 flex-1 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] xl:pb-0">
               <header className="sticky top-0 z-40 border-b border-[#111827] bg-[#F6F7F8]/95 px-3 py-3 backdrop-blur sm:px-5 md:px-6 xl:px-7">
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                     <TeamManagerSwitcher selectedTeam={selectedTeam} myTeams={myTeams} availableTeams={teamBriefs} onTeamChange={handleTeamChange} onSaveMyTeams={handleSaveMyTeams} />

                     <div className="flex shrink-0 items-center justify-end gap-2 self-end sm:self-auto">
                        <AccountMenu blockedProfiles={blockedProfiles} onUnblockProfile={handleUnblockProfile} />

                        <NotificationCenter notifications={notifications} onMarkRead={handleMarkNotificationRead} onMarkAllRead={handleMarkAllNotificationsRead} onOpenNotification={handleOpenNotification} />
                     </div>
                  </div>
               </header>

               <div className="flex-1 px-3 py-4 sm:px-5 sm:py-5 md:px-6 md:py-6 xl:px-7 xl:py-7">
                  {activeSection === "front-office" && (
                     <FrontOfficeSection
                        currentBrief={currentBrief}
                        teamUpdates={selectedTeamUpdates}
                        userName={userProfile.name.split(" ")[0] || userProfile.name}
                        reportCopy={frontOfficeCopy}
                        onMakeCall={() => setActiveSection("make-the-call")}
                        // Build 3B: pass current-user receipts and the
                        // existing receipt-to-post discussion mapping.
                        receipts={savedReceipts}
                        receiptPostIdByReceiptId={receiptPostIdByReceiptId}
                        onOpenReceiptDiscussion={handleOpenReceiptDiscussion}
                        onStandByReceipt={handleStandByReceipt}
                        onUpdateReceiptStatus={handleUpdateReceiptStatus}
                     />
                  )}

                  {activeSection === "make-the-call" && <MakeTheCallSection currentBrief={currentBrief} callForm={callForm} setCallForm={setCallForm} onPostCall={handlePostCallToWarRoom} currentUserProfile={userProfile} />}

                  {activeSection === "war-room" && (
                     <WarRoomSection
                        posts={warRoomPosts}
                        comments={warRoomComments}
                        savedBookmarks={savedBookmarks}
                        followedHandles={followedHandles}
                        currentUserVotes={currentUserVotes}
                        interactionCounts={interactionCounts}
                        publicProfilesByHandle={publicProfilesByHandle}
                        receiptStatusByPostId={receiptStatusByPostId}
                        blockedHandles={blockedProfiles.map((profile) => profile.handle)}
                        focusRequest={warRoomFocusRequest}
                        teamFilter={warRoomTeamFilter}
                        onClearTeamFilter={() => setWarRoomTeamFilter(null)}
                        onVote={handleVote}
                        onDeletePost={handleDeletePost}
                        onToggleBookmark={handleToggleBookmark}
                        onAddComment={handleAddComment}
                        onDeleteComment={handleDeleteComment}
                        onReportPost={handleReportPost}
                        onReportComment={handleReportComment}
                        onOpenProfile={handleOpenProfile}
                        currentUserProfile={userProfile}
                     />
                  )}

                  {activeSection === "search" && (
                     <SearchSection
                        teams={teamBriefs}
                        posts={warRoomPosts}
                        followedHandles={followedHandles}
                        onToggleFollow={handleToggleFollow}
                        onOpenProfile={handleOpenProfile}
                        onOpenPost={handleOpenSearchPost}
                        onOpenTeamDiscussion={handleOpenTeamDiscussion}
                        currentUserProfile={userProfile}
                        publicProfilesByHandle={publicProfilesByHandle}
                     />
                  )}

                  {activeSection === "profile" && (
                     <ProfileSection
                        posts={warRoomPosts}
                        viewedProfileHandle={viewedProfileHandle}
                        followedHandles={followedHandles}
                        followerHandlesByProfile={followerHandlesByProfile}
                        followingHandlesByProfile={followingHandlesByProfile}
                        interactionCounts={interactionCounts}
                        publicProfilesByHandle={publicProfilesByHandle}
                        receipts={savedReceipts}
                        receiptPostIdByReceiptId={receiptPostIdByReceiptId}
                        receiptStatusByPostId={receiptStatusByPostId}
                        onOpenReceiptDiscussion={handleOpenReceiptDiscussion}
                        onCommentOnReceipt={handleAddComment}
                        onUpdateReceiptStatus={handleUpdateReceiptStatus}
                        onDeleteReceipt={handleDeleteReceipt}
                        onReportProfile={handleReportProfile}
                        onBlockProfile={handleBlockProfile}
                        onUnblockProfile={handleUnblockProfile}
                        blockedProfiles={blockedProfiles}
                        availableTeams={teamBriefs}
                        currentUserProfile={userProfile}
                        onToggleFollow={handleToggleFollow}
                        onDeletePost={handleDeletePost}
                        onSaveProfile={handleSaveProfile}
                        onOpenProfile={handleOpenProfile}
                     />
                  )}
               </div>
            </section>
         </div>

         <nav aria-label="Primary mobile navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-[#111827] bg-white/98 pb-[env(safe-area-inset-bottom)] backdrop-blur xl:hidden">
            <div className="mx-auto grid max-w-4xl grid-cols-5 divide-x divide-[#111827]">
               {navigationItems.map((item, index) => {
                  const isActive = activeSection === item.id;

                  const Icon = item.icon;

                  const mobileLabel = item.id === "front-office" ? "Office" : item.id === "make-the-call" ? "Call" : item.id === "war-room" ? "Room" : item.label;

                  return (
                     <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSectionChange(item.id)}
                        className={`relative flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-center transition md:min-h-[4.5rem] md:flex-row md:gap-2 md:px-3 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#1E40AF]/30 ${
                           isActive ? "bg-[#111827] text-white" : "bg-white text-[#111827] hover:bg-[#FFF8EE]"
                        }`}
                        aria-current={isActive ? "page" : undefined}
                     >
                        <span className={`absolute left-1.5 top-1 text-[9px] font-black tracking-[0.12em] md:static md:text-[10px] ${isActive ? "text-white/60" : "text-[#C2410C]"}`}>{String(index + 1).padStart(2, "0")}</span>

                        <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />

                        <span className="text-[10px] font-black uppercase leading-none tracking-[0.06em] md:text-[11px] md:tracking-[0.08em]">{mobileLabel}</span>
                     </button>
                  );
               })}
            </div>
         </nav>
      </main>
   );
}

export default function Home() {
   return (
      <AuthGate>
         <FrontOfficeApp />
      </AuthGate>
   );
}

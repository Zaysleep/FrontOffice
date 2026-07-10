"use client";

import Image from "next/image";
import { useMemo, useState, type ChangeEvent } from "react";
import { Camera, Check, Eye, MessageCircle, ThumbsUp, Trash2, UserRound, X } from "lucide-react";
import { type FrontOfficeProfile, type Receipt, type TeamBrief, type WarRoomPost } from "@/data/frontofficeData";
import { supabase } from "@/lib/supabase/client";
import ImageCropper from "@/components/frontoffice/ImageCropper";
import { moderateFields, FRONT_OFFICE_MODERATION_MESSAGE } from "@/lib/moderation";
import ReportDialog, { type ReportReason } from "@/components/frontoffice/ReportDialog";
import BlockDialog from "@/components/frontoffice/BlockDialog";
import ReceiptStatusSelect from "@/components/frontoffice/ReceiptStatusSelect";

/**
 * ProfileSection
 *
 * Social profile view for FrontOffice.
 *
 * Current direction:
 * - Takes, Followers, and Following
 * - Editable name, handle, bio, and profile image
 * - Up to five teams marked on the account
 * - Current-user post deletion
 * - Public profile follow / unfollow controls
 * - Clickable Followers and Following lists
 * - White banner placeholder before an image is uploaded
 * - Newspaper-inspired profile file and opinion archive
 * - Strong editorial rules and section labels
 * - Reduced rounded-card styling
 */

type BlockedProfileSummary = {
   id: string;
   name: string;
   handle: string;
   initials: string;
   profileImageUrl?: string;
};

type ProfileSectionProps = {
   posts?: WarRoomPost[];
   viewedProfileHandle?: string;
   followedHandles?: string[];
   followerHandlesByProfile?: Record<string, string[]>;
   followingHandlesByProfile?: Record<string, string[]>;
   interactionCounts?: Record<number, number>;
   publicProfilesByHandle?: Record<string, FrontOfficeProfile>;
   receipts?: Receipt[];

   /**
    * Receipt discussion wiring from the production profile flow.
    * These mappings keep Profile receipts connected to their original
    * War Room posts while Build 3A changes the status vocabulary.
    */
   receiptPostIdByReceiptId?: Record<number, number>;
   receiptStatusByPostId?: Record<number, Receipt["status"]>;
   onOpenReceiptDiscussion?: (postId: number) => void;
   onCommentOnReceipt?: (postId: number, body: string) => void | Promise<void>;

   onUpdateReceiptStatus?: (receiptId: number, status: Receipt["status"]) => void | Promise<void>;
   onDeleteReceipt?: (receiptId: number) => void | Promise<void>;
   onReportProfile?: (handle: string, reason: ReportReason, note: string) => void | Promise<void>;
   onBlockProfile?: (handle: string) => void | Promise<void>;
   onUnblockProfile?: (handle: string) => void | Promise<void>;
   blockedProfiles?: BlockedProfileSummary[];
   availableTeams: TeamBrief[];
   currentUserProfile: FrontOfficeProfile;
   onToggleFollow?: (handle: string) => void;
   onDeletePost?: (postId: number) => void;
   onSaveProfile: (profile: FrontOfficeProfile) => void | Promise<void>;
   onOpenProfile?: (handle: string) => void;
};

const MAX_FAVORITE_TEAMS = 5;
const MAX_PROFILE_MEDIA_BYTES = 10 * 1024 * 1024;
const ALLOWED_PROFILE_MEDIA_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function validateProfileMediaFile(file: File) {
   if (!ALLOWED_PROFILE_MEDIA_TYPES.has(file.type)) {
      return "Choose a JPG, PNG, or WebP image.";
   }

   if (file.size > MAX_PROFILE_MEDIA_BYTES) {
      return "Choose an image smaller than 10 MB.";
   }

   return "";
}

export default function ProfileSection({
   posts = [],
   viewedProfileHandle,
   followedHandles = [],
   followerHandlesByProfile = {},
   followingHandlesByProfile = {},
   interactionCounts = {},
   publicProfilesByHandle = {},
   receipts = [],
   receiptPostIdByReceiptId = {},
   receiptStatusByPostId = {},
   onOpenReceiptDiscussion,
   onCommentOnReceipt,
   onUpdateReceiptStatus,
   onDeleteReceipt,
   onReportProfile,
   onBlockProfile,
   onUnblockProfile,
   blockedProfiles = [],
   availableTeams,
   currentUserProfile,
   onToggleFollow,
   onDeletePost,
   onSaveProfile,
   onOpenProfile,
}: ProfileSectionProps) {
   // Build 3A keeps the existing public-receipt discussion contract intact.
   // These values are used by the production page and remain available for
   // the next resurfacing/discussion refinement without changing page.tsx.
   void receiptStatusByPostId;
   void onCommentOnReceipt;

   const activeHandle = viewedProfileHandle ?? currentUserProfile.handle;

   const isOwnProfile = activeHandle === currentUserProfile.handle;

   const [isEditing, setIsEditing] = useState(false);

   const [draftProfile, setDraftProfile] = useState<FrontOfficeProfile>(currentUserProfile);

   const [cropRequest, setCropRequest] = useState<{
      file: File;
      kind: "profile" | "banner";
   } | null>(null);

   const [pendingMedia, setPendingMedia] = useState<{
      profile?: {
         blob: Blob;
         previewUrl: string;
      };
      banner?: {
         blob: Blob;
         previewUrl: string;
      };
   }>({});

   const [imageUploadError, setImageUploadError] = useState("");

   const [activeRelationshipView, setActiveRelationshipView] = useState<"followers" | "following" | null>(null);

   const viewedAuthor = useMemo(() => {
      if (isOwnProfile) {
         return currentUserProfile;
      }

      const publicProfile = publicProfilesByHandle[activeHandle];

      if (publicProfile) {
         return publicProfile;
      }

      const matchingPost = posts.find((post) => post.author?.handle === activeHandle);
      const fallbackName = matchingPost?.author?.name ?? activeHandle.replace("@", "");
      const fallbackInitials = matchingPost?.author?.initials ?? getInitials(fallbackName);

      return {
         name: fallbackName,
         handle: activeHandle,
         initials: fallbackInitials,
         bio: "Sharing front office takes and joining the conversation in the War Room.",
         favoriteTeams: [],
      };
   }, [activeHandle, currentUserProfile, isOwnProfile, posts, publicProfilesByHandle]);

   const profilePosts = useMemo(() => {
      if (isOwnProfile) {
         return posts.filter((post) => post.author?.isCurrentUser === true);
      }

      return posts.filter((post) => post.author?.handle === activeHandle);
   }, [activeHandle, isOwnProfile, posts]);

   const isFollowing = followedHandles.includes(viewedAuthor.handle);

   const isViewedProfileBlocked = blockedProfiles.some((profile) => profile.handle === viewedAuthor.handle);

   const followerHandles = useMemo(() => followerHandlesByProfile[viewedAuthor.handle] ?? [], [followerHandlesByProfile, viewedAuthor.handle]);

   const followingHandles = useMemo(() => {
      if (isOwnProfile) {
         return followedHandles;
      }

      return followingHandlesByProfile[viewedAuthor.handle] ?? [];
   }, [followedHandles, followingHandlesByProfile, isOwnProfile, viewedAuthor.handle]);

   const followerCount = followerHandles.length;

   const followingCount = followingHandles.length;

   function openEditor() {
      setDraftProfile(currentUserProfile);
      setIsEditing(true);
   }

   function clearPendingMedia() {
      if (pendingMedia.profile?.previewUrl) {
         URL.revokeObjectURL(pendingMedia.profile.previewUrl);
      }

      if (pendingMedia.banner?.previewUrl) {
         URL.revokeObjectURL(pendingMedia.banner.previewUrl);
      }

      setPendingMedia({});
   }

   function cancelEditor() {
      clearPendingMedia();
      setDraftProfile(currentUserProfile);
      setImageUploadError("");
      setIsEditing(false);
   }

   async function uploadProfileMedia(blob: Blob, kind: "profile" | "banner") {
      if (blob.size > MAX_PROFILE_MEDIA_BYTES) {
         throw new Error("The processed image is larger than 10 MB.");
      }

      if (blob.type && blob.type !== "image/jpeg") {
         throw new Error("The processed image format is not supported.");
      }

      const {
         data: { user },
         error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
         throw new Error("Your account session could not be verified.");
      }

      const fileName = `${kind}-${Date.now()}-${crypto.randomUUID()}.jpg`;
      const storagePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("profile-media").upload(storagePath, blob, {
         contentType: "image/jpeg",
         cacheControl: "3600",
         upsert: false,
      });

      if (uploadError) {
         throw new Error(uploadError.message);
      }

      const {
         data: { publicUrl },
      } = supabase.storage.from("profile-media").getPublicUrl(storagePath);

      return publicUrl;
   }

   async function saveEditor() {
      const trimmedName = draftProfile.name.trim();
      const trimmedHandle = normalizeHandle(draftProfile.handle);
      const trimmedBio = draftProfile.bio.trim();

      if (!trimmedName || !trimmedHandle) {
         return;
      }

      const moderation = moderateFields([trimmedName, trimmedHandle, trimmedBio]);

      if (!moderation.allowed) {
         setImageUploadError(moderation.message ?? FRONT_OFFICE_MODERATION_MESSAGE);
         return;
      }

      setImageUploadError("");

      try {
         let profileImageUrl = draftProfile.profileImageUrl;
         let bannerImageUrl = draftProfile.bannerImageUrl;

         if (pendingMedia.profile && draftProfile.profileImageUrl === pendingMedia.profile.previewUrl) {
            profileImageUrl = await uploadProfileMedia(pendingMedia.profile.blob, "profile");
         }

         if (pendingMedia.banner && draftProfile.bannerImageUrl === pendingMedia.banner.previewUrl) {
            bannerImageUrl = await uploadProfileMedia(pendingMedia.banner.blob, "banner");
         }

         await onSaveProfile({
            ...draftProfile,
            name: trimmedName,
            handle: trimmedHandle,
            initials: getInitials(trimmedName),
            bio: trimmedBio,
            profileImageUrl,
            bannerImageUrl,
         });

         clearPendingMedia();
         setIsEditing(false);
      } catch (error) {
         const message = error instanceof Error ? error.message : "";

         setImageUploadError(message.toLowerCase().includes("wording") ? FRONT_OFFICE_MODERATION_MESSAGE : message || "FrontOffice could not save your profile.");
      }
   }

   function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0];

      event.target.value = "";

      if (!file) {
         return;
      }

      const validationMessage = validateProfileMediaFile(file);

      if (validationMessage) {
         setImageUploadError(validationMessage);
         return;
      }

      setImageUploadError("");
      setCropRequest({
         file,
         kind: "profile",
      });
   }

   function handleBannerImageChange(event: ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0];

      event.target.value = "";

      if (!file) {
         return;
      }

      const validationMessage = validateProfileMediaFile(file);

      if (validationMessage) {
         setImageUploadError(validationMessage);
         return;
      }

      setImageUploadError("");
      setCropRequest({
         file,
         kind: "banner",
      });
   }

   async function handleCroppedImage(blob: Blob) {
      if (!cropRequest) {
         return;
      }

      const previewUrl = URL.createObjectURL(blob);
      const kind = cropRequest.kind;

      setPendingMedia((media) => {
         const previousPreview = kind === "profile" ? media.profile?.previewUrl : media.banner?.previewUrl;

         if (previousPreview) {
            URL.revokeObjectURL(previousPreview);
         }

         return {
            ...media,
            [kind]: {
               blob,
               previewUrl,
            },
         };
      });

      setDraftProfile((profile) => ({
         ...profile,
         ...(kind === "profile" ? { profileImageUrl: previewUrl } : { bannerImageUrl: previewUrl }),
      }));

      setCropRequest(null);
      setImageUploadError("");
   }

   function toggleFavoriteTeam(team: string) {
      setDraftProfile((profile) => {
         const alreadySelected = profile.favoriteTeams.includes(team);

         if (alreadySelected) {
            return {
               ...profile,
               favoriteTeams: profile.favoriteTeams.filter((favoriteTeam) => favoriteTeam !== team),
            };
         }

         if (profile.favoriteTeams.length >= MAX_FAVORITE_TEAMS) {
            return profile;
         }

         return {
            ...profile,
            favoriteTeams: [...profile.favoriteTeams, team],
         };
      });
   }

   return (
      <section aria-labelledby="profile-heading" className="space-y-4 sm:space-y-6">
         <div className="overflow-hidden border border-[#111827] bg-white shadow-sm">
            <div className="relative min-h-[260px] overflow-hidden bg-white sm:min-h-[300px] md:min-h-[340px]">
               {viewedAuthor.bannerImageUrl ? (
                  <>
                     <Image src={viewedAuthor.bannerImageUrl} alt={`${viewedAuthor.name} profile banner`} fill sizes="(max-width: 1024px) 100vw, 1200px" unoptimized className="object-cover" />

                     <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/15 to-black/55" />
                  </>
               ) : (
                  <div className="absolute inset-0 flex items-center justify-center border-b border-[#111827]"></div>
               )}

               <div className={`relative z-10 px-4 pb-5 pt-8 sm:px-6 sm:pb-6 sm:pt-10 md:px-7 md:pt-12 ${viewedAuthor.bannerImageUrl ? "text-white" : ""}`}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                     <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:gap-4">
                        <ProfileAvatar profile={viewedAuthor} size="large" />

                        <div className="pb-1">
                           <h3 id="profile-heading" className={`break-words text-2xl font-black uppercase leading-[1.02] tracking-[-0.035em] sm:text-3xl md:text-4xl ${viewedAuthor.bannerImageUrl ? "text-white" : "text-[#111827]"}`}>
                              {viewedAuthor.name}
                           </h3>

                           <p className={`mt-1 text-base font-medium leading-6 ${viewedAuthor.bannerImageUrl ? "text-white/85" : "text-[#5B6475]"}`}>{viewedAuthor.handle}</p>
                        </div>
                     </div>

                     {isOwnProfile ? (
                        <button
                           type="button"
                           onClick={openEditor}
                           className="min-h-11 w-full border border-[#111827] sm:w-fit bg-white px-4 text-xs font-black uppercase tracking-[0.1em] text-[#111827] transition hover:bg-[#FFF8EE] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30"
                        >
                           Edit profile
                        </button>
                     ) : (
                        <div className="flex flex-wrap items-center gap-2">
                           {isViewedProfileBlocked ? (
                              <button
                                 type="button"
                                 onClick={() => onUnblockProfile?.(viewedAuthor.handle)}
                                 className="min-h-11 border border-[#1E40AF] bg-[#1E40AF] px-4 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#173487] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30"
                              >
                                 Unblock
                              </button>
                           ) : (
                              <button
                                 type="button"
                                 onClick={() => onToggleFollow?.(viewedAuthor.handle)}
                                 aria-pressed={isFollowing}
                                 className={`min-h-11 w-fit border px-4 text-xs font-black uppercase tracking-[0.1em] transition focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30 ${
                                    isFollowing ? "border-[#111827] bg-white text-[#111827] hover:bg-[#FFF8EE]" : "border-[#1E40AF] bg-[#1E40AF] text-white hover:bg-[#173487]"
                                 }`}
                              >
                                 {isFollowing ? "Following" : "Follow"}
                              </button>
                           )}

                           {onReportProfile && (
                              <ReportDialog title="Report Profile" description={`Tell us why ${viewedAuthor.handle} should be reviewed.`} triggerLabel="Report" onSubmit={(reason, note) => onReportProfile(viewedAuthor.handle, reason, note)} />
                           )}

                           {!isViewedProfileBlocked && onBlockProfile && <BlockDialog handle={viewedAuthor.handle} onConfirm={onBlockProfile} />}
                        </div>
                     )}
                  </div>

                  <p className={`mt-4 max-w-2xl text-base leading-7 ${viewedAuthor.bannerImageUrl ? "text-white" : "text-[#111827]"}`}>{viewedAuthor.bio}</p>

                  {viewedAuthor.favoriteTeams.length > 0 && (
                     <div className="mt-4">
                        <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${viewedAuthor.bannerImageUrl ? "text-white/80" : "text-[#5B6475]"}`}>My Teams</p>

                        <div className="mt-2 flex flex-wrap gap-2">
                           {viewedAuthor.favoriteTeams.map((team) => (
                              <span key={team} className={`border-b px-1 py-1 text-sm font-bold ${viewedAuthor.bannerImageUrl ? "border-white/50 text-white" : "border-[#111827] text-[#111827]"}`}>
                                 {team}
                              </span>
                           ))}
                        </div>
                     </div>
                  )}
               </div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-[#111827] border-t border-[#111827] bg-[#FFF8EE]">
               <ProfileStat label="Receipts" value={String(profilePosts.length)} isActive={activeRelationshipView === null} onClick={() => setActiveRelationshipView(null)} />

               <ProfileStat label="Followers" value={String(followerCount)} isActive={activeRelationshipView === "followers"} onClick={() => setActiveRelationshipView("followers")} />

               <ProfileStat label="Following" value={String(followingCount)} isActive={activeRelationshipView === "following"} onClick={() => setActiveRelationshipView("following")} />
            </div>
         </div>

         {activeRelationshipView && (
            <RelationshipPanel
               title={activeRelationshipView === "followers" ? "Followers" : "Following"}
               handles={activeRelationshipView === "followers" ? followerHandles : followingHandles}
               currentUserProfile={currentUserProfile}
               publicProfilesByHandle={publicProfilesByHandle}
               followedHandles={followedHandles}
               onToggleFollow={onToggleFollow}
               onOpenProfile={onOpenProfile}
               onClose={() => setActiveRelationshipView(null)}
            />
         )}

         {isOwnProfile && isEditing && (
            <>
               <ProfileEditor
                  draftProfile={draftProfile}
                  availableTeams={availableTeams}
                  onDraftChange={setDraftProfile}
                  onImageChange={handleImageChange}
                  onBannerImageChange={handleBannerImageChange}
                  onToggleFavoriteTeam={toggleFavoriteTeam}
                  onSave={saveEditor}
                  onCancel={cancelEditor}
               />

               {imageUploadError && (
                  <div role="status" className="border border-[#C2410C] bg-[#FFF1E8] px-4 py-3 text-sm font-bold text-[#C2410C]">
                     {imageUploadError}
                  </div>
               )}
            </>
         )}

         {cropRequest && (
            <ImageCropper
               file={cropRequest.file}
               aspectRatio={cropRequest.kind === "profile" ? 1 : 8 / 3}
               outputWidth={cropRequest.kind === "profile" ? 800 : 1600}
               outputHeight={cropRequest.kind === "profile" ? 800 : 600}
               cropShape={cropRequest.kind === "profile" ? "circle" : "rectangle"}
               title={cropRequest.kind === "profile" ? "Crop Profile Picture" : "Crop Profile Banner"}
               onCancel={() => setCropRequest(null)}
               onComplete={handleCroppedImage}
            />
         )}

         {!activeRelationshipView && (
            <section className="overflow-hidden border border-[#111827] bg-white shadow-sm">
               <div className="border-b border-[#111827] bg-[#FFF8EE] px-4 py-4 sm:px-6 md:px-7">
                  <h4 className="text-2xl font-black uppercase leading-[1.02] tracking-[-0.025em] text-[#111827]">Receipts</h4>
               </div>

               {isOwnProfile ? (
                  <div className="divide-y divide-[#111827]">
                     {receipts.length > 0 ? (
                        receipts.map((receipt) => (
                           <ReceiptRow key={receipt.id} receipt={receipt} postId={receiptPostIdByReceiptId[receipt.id]} onOpenDiscussion={onOpenReceiptDiscussion} onUpdateStatus={onUpdateReceiptStatus} onDeleteReceipt={onDeleteReceipt} />
                        ))
                     ) : (
                        <div className="px-5 py-8 text-center sm:px-6">
                           <p className="text-lg font-black uppercase tracking-[-0.01em] text-[#111827]">No receipts yet</p>

                           <p className="mt-2 text-sm leading-6 text-[#5B6475]">Make a call and post it to the War Room. Your receipt will appear here.</p>
                        </div>
                     )}
                  </div>
               ) : (
                  <div className="divide-y divide-[#111827]">
                     {profilePosts.length > 0 ? (
                        profilePosts.map((post) => <ProfileTake key={post.id} post={post} interactionCount={interactionCounts[post.id] ?? 0} currentUserProfile={currentUserProfile} canDelete={false} onDeletePost={onDeletePost} />)
                     ) : (
                        <EmptyProfile isOwnProfile={isOwnProfile} />
                     )}
                  </div>
               )}
            </section>
         )}
      </section>
   );
}

/**
 * ReceiptRow
 *
 * MK II Build 3A:
 * - Keeps receipt identity and deletion behavior in ProfileSection.
 * - Delegates status vocabulary and explanatory copy to ReceiptStatusSelect.
 * - Avoids duplicating receipt status arrays in multiple UI files.
 */
function ReceiptRow({
   receipt,
   postId,
   onOpenDiscussion,
   onUpdateStatus,
   onDeleteReceipt,
}: {
   receipt: Receipt;
   postId?: number;
   onOpenDiscussion?: (postId: number) => void;
   onUpdateStatus?: (receiptId: number, status: Receipt["status"]) => void | Promise<void>;
   onDeleteReceipt?: (receiptId: number) => void | Promise<void>;
}) {
   const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
   const [isDeleting, setIsDeleting] = useState(false);
   const [deleteError, setDeleteError] = useState("");

   async function handleConfirmDelete() {
      if (!onDeleteReceipt || isDeleting) {
         return;
      }

      setIsDeleting(true);
      setDeleteError("");

      try {
         await onDeleteReceipt(receipt.id);
      } catch (error) {
         setDeleteError(error instanceof Error ? error.message : "FrontOffice could not delete this receipt.");
         setIsDeleting(false);
      }
   }

   return (
      <article className="px-4 py-5 transition hover:bg-[#FFFCF6] sm:px-6 md:px-7">
         <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
               <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-[#5B6475]">
                  <span>{receipt.team}</span>
                  <span>·</span>
                  <span>{receipt.type}</span>
               </div>

               {/*
                * Keep the receipt connected to the original War Room thread.
                * The original take remains the source of truth.
                */}
               {postId && onOpenDiscussion ? (
                  <button
                     type="button"
                     onClick={() => onOpenDiscussion(postId)}
                     className="mt-3 block w-full text-left text-lg font-black leading-7 tracking-[-0.01em] text-[#111827] transition hover:text-[#1E40AF] hover:underline focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
                  >
                     {receipt.call}
                  </button>
               ) : (
                  <p className="mt-3 text-lg font-black leading-7 tracking-[-0.01em] text-[#111827]">{receipt.call}</p>
               )}

               <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[#1E40AF]">Confidence · {receipt.confidence}</p>
            </div>

            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:shrink-0 sm:items-start">
               <time dateTime={receipt.createdAt} className="pt-2 text-xs font-medium text-[#8A93A3]">
                  {formatReceiptDate(receipt.createdAt)}
               </time>

               {onDeleteReceipt && (
                  <button
                     type="button"
                     onClick={() => {
                        setDeleteError("");
                        setIsConfirmingDelete(true);
                     }}
                     aria-label="Delete this receipt"
                     title="Delete receipt"
                     className="flex min-h-9 min-w-9 items-center justify-center border border-transparent text-[#5B6475] transition hover:border-[#C2410C] hover:bg-[#FFF1E8] hover:text-[#C2410C] focus:outline-none focus:ring-4 focus:ring-[#C2410C]/20"
                  >
                     <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
               )}
            </div>
         </div>

         <div className="mt-4 border-t border-[#E7DCCB] pt-4">
            {/*
             * Only the receipt owner receives the update callback.
             * The shared selector keeps the six-status language consistent.
             */}
            <ReceiptStatusSelect value={receipt.status} disabled={!onUpdateStatus} onChange={(nextStatus) => onUpdateStatus?.(receipt.id, nextStatus)} />
         </div>

         {isConfirmingDelete && (
            <div role="alertdialog" aria-modal="true" aria-labelledby={`delete-receipt-title-${receipt.id}`} className="mt-5 border border-[#111827] bg-[#FFF8EE] p-4">
               <h5 id={`delete-receipt-title-${receipt.id}`} className="text-sm font-black uppercase tracking-[0.08em] text-[#111827]">
                  Delete this receipt?
               </h5>

               <p className="mt-2 text-sm leading-6 text-[#5B6475]">This will also remove the linked post from the War Room.</p>

               {deleteError && (
                  <p role="alert" className="mt-3 text-sm font-bold text-[#C2410C]">
                     {deleteError}
                  </p>
               )}

               <div className="mt-4 flex flex-wrap justify-end gap-3">
                  <button
                     type="button"
                     onClick={() => {
                        setDeleteError("");
                        setIsConfirmingDelete(false);
                     }}
                     disabled={isDeleting}
                     className="min-h-10 border border-[#111827] bg-white px-4 text-xs font-black uppercase tracking-[0.1em] text-[#111827] transition hover:bg-[#F6F7F8] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                     Cancel
                  </button>

                  <button
                     type="button"
                     onClick={() => {
                        void handleConfirmDelete();
                     }}
                     disabled={isDeleting}
                     className="min-h-10 border border-[#C2410C] bg-[#C2410C] px-4 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#9A3412] focus:outline-none focus:ring-4 focus:ring-[#C2410C]/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                     {isDeleting ? "Deleting..." : "Delete Receipt"}
                  </button>
               </div>
            </div>
         )}
      </article>
   );
}

function formatReceiptDate(createdAt: string) {
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

function ProfileEditor({
   draftProfile,
   availableTeams,
   onDraftChange,
   onImageChange,
   onBannerImageChange,
   onToggleFavoriteTeam,
   onSave,
   onCancel,
}: {
   draftProfile: FrontOfficeProfile;
   availableTeams: TeamBrief[];
   onDraftChange: (profile: FrontOfficeProfile) => void;
   onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
   onBannerImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
   onToggleFavoriteTeam: (team: string) => void;
   onSave: () => void;
   onCancel: () => void;
}) {
   const [teamQuery, setTeamQuery] = useState("");

   const filteredTeams = useMemo(() => {
      const normalizedQuery = teamQuery.trim().toLowerCase();

      if (!normalizedQuery) {
         return availableTeams;
      }

      return availableTeams.filter((team) => team.team.toLowerCase().includes(normalizedQuery) || team.sport.toLowerCase().includes(normalizedQuery));
   }, [availableTeams, teamQuery]);

   return (
      <section className="border border-[#111827] bg-white p-4 shadow-sm sm:p-6 md:p-7">
         <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div>
               <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C2410C]">Edit Desk</p>

               <h4 className="mt-1 text-2xl font-black uppercase leading-[1.02] tracking-[-0.025em] text-[#111827]">Edit Profile</h4>

               <p className="mt-1 text-sm leading-6 text-[#5B6475]">Update your identity and mark up to five teams.</p>
            </div>

            <button
               type="button"
               onClick={onCancel}
               aria-label="Close profile editor"
               className="flex min-h-11 min-w-11 items-center justify-center border border-[#111827] bg-white text-[#5B6475] transition hover:bg-[#FFF8EE] hover:text-[#111827] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
            >
               <X aria-hidden="true" className="h-5 w-5" />
            </button>
         </div>

         <div className="mt-6">
            <p className="text-sm font-bold text-[#111827]">Profile banner</p>

            <p className="mt-1 max-w-3xl text-sm leading-6 text-[#5B6475]">Choose any image, then zoom and position it inside the 8:3 banner frame before saving.</p>

            <div className="relative mt-3 h-44 overflow-hidden border border-[#111827] bg-white sm:h-56">
               {draftProfile.bannerImageUrl ? (
                  <Image src={draftProfile.bannerImageUrl} alt="Banner preview" fill sizes="(max-width: 1024px) 100vw, 1200px" unoptimized className="object-cover" />
               ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center">
                     <div>
                        <p className="font-bold text-[#111827]">Banner image placeholder</p>

                        <p className="mt-1 text-sm text-[#5B6475]">Upload a wide sports image, team collage, stadium shot, or personal graphic.</p>
                     </div>
                  </div>
               )}
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
               <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-[#111827] bg-white px-4 text-sm font-bold text-[#111827] transition hover:bg-[#FFF8EE] focus-within:ring-4 focus-within:ring-[#1E40AF]/20">
                  <Camera aria-hidden="true" className="h-4 w-4" />
                  Choose and crop banner
                  <input type="file" accept="image/*" onChange={onBannerImageChange} className="sr-only" />
               </label>

               {draftProfile.bannerImageUrl && (
                  <button
                     type="button"
                     onClick={() =>
                        onDraftChange({
                           ...draftProfile,
                           bannerImageUrl: undefined,
                        })
                     }
                     className="min-h-11 text-sm font-bold text-[#C2410C] hover:underline focus:outline-none focus:ring-4 focus:ring-[#C2410C]/20"
                  >
                     Remove banner
                  </button>
               )}
            </div>
         </div>

         <div className="mt-6 grid gap-6 md:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)]">
            <div>
               <p className="text-sm font-bold text-[#111827]">Profile picture</p>

               <div className="mt-3">
                  <ProfileAvatar profile={draftProfile} size="large" />
               </div>

               <label className="mt-4 inline-flex min-h-10 cursor-pointer items-center gap-2 border border-[#111827] bg-white px-4 text-sm font-bold text-[#111827] transition hover:bg-[#FFF8EE] focus-within:ring-4 focus-within:ring-[#1E40AF]/20">
                  <Camera aria-hidden="true" className="h-4 w-4" />
                  Choose and crop image
                  <input type="file" accept="image/*" onChange={onImageChange} className="sr-only" />
               </label>

               {draftProfile.profileImageUrl && (
                  <button
                     type="button"
                     onClick={() =>
                        onDraftChange({
                           ...draftProfile,
                           profileImageUrl: undefined,
                        })
                     }
                     className="mt-3 min-h-11 text-sm font-bold text-[#C2410C] hover:underline focus:outline-none focus:ring-4 focus:ring-[#C2410C]/20"
                  >
                     Remove picture
                  </button>
               )}
            </div>

            <div className="space-y-4 sm:space-y-6">
               <div className="grid gap-4 md:grid-cols-2">
                  <label>
                     <span className="text-sm font-bold text-[#111827]">Name</span>

                     <input
                        value={draftProfile.name}
                        onChange={(event) =>
                           onDraftChange({
                              ...draftProfile,
                              name: event.target.value,
                           })
                        }
                        maxLength={60}
                        className="mt-2 min-h-12 w-full border border-[#111827] bg-white px-3 text-base text-[#111827] outline-none focus:border-[#1E40AF] focus:ring-4 focus:ring-[#1E40AF]/10"
                     />
                  </label>

                  <label>
                     <span className="text-sm font-bold text-[#111827]">Handle</span>

                     <input
                        value={draftProfile.handle}
                        onChange={(event) =>
                           onDraftChange({
                              ...draftProfile,
                              handle: event.target.value,
                           })
                        }
                        maxLength={30}
                        className="mt-2 min-h-11 w-full border border-[#111827] bg-white px-3 text-base text-[#111827] outline-none focus:border-[#1E40AF] focus:ring-4 focus:ring-[#1E40AF]/10"
                     />
                  </label>
               </div>

               <label className="block">
                  <span className="text-sm font-bold text-[#111827]">Bio</span>

                  <textarea
                     value={draftProfile.bio}
                     onChange={(event) =>
                        onDraftChange({
                           ...draftProfile,
                           bio: event.target.value,
                        })
                     }
                     rows={3}
                     maxLength={220}
                     className="mt-2 w-full resize-none border border-[#111827] bg-white px-3 py-3 text-base leading-6 text-[#111827] outline-none focus:border-[#1E40AF] focus:ring-4 focus:ring-[#1E40AF]/10"
                  />

                  <span className="mt-1 block text-right text-xs text-[#5B6475]">{draftProfile.bio.length}/220</span>
               </label>

               <div>
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                     <div>
                        <p className="text-sm font-bold text-[#111827]">My Teams</p>

                        <p className="mt-1 text-sm text-[#5B6475]">
                           {draftProfile.favoriteTeams.length}/{MAX_FAVORITE_TEAMS} selected
                        </p>
                     </div>

                     <input
                        value={teamQuery}
                        onChange={(event) => setTeamQuery(event.target.value)}
                        placeholder="Search teams..."
                        aria-label="Search available teams"
                        className="min-h-11 w-full border border-[#111827] bg-white px-3 text-sm md:w-auto text-[#111827] outline-none focus:border-[#1E40AF] focus:ring-4 focus:ring-[#1E40AF]/10"
                     />
                  </div>

                  <div className="mt-3 max-h-72 overflow-y-auto border border-[#111827]">
                     <div className="divide-y divide-[#111827]">
                        {filteredTeams.map((team) => {
                           const isSelected = draftProfile.favoriteTeams.includes(team.team);

                           const selectionDisabled = !isSelected && draftProfile.favoriteTeams.length >= MAX_FAVORITE_TEAMS;

                           return (
                              <button
                                 key={`${team.sport}-${team.team}`}
                                 type="button"
                                 disabled={selectionDisabled}
                                 onClick={() => onToggleFavoriteTeam(team.team)}
                                 className="flex min-h-12 w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-[#FFF8EE] disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                 <div>
                                    <p className="font-bold text-[#111827]">{team.team}</p>

                                    <p className="mt-1 text-xs font-medium text-[#5B6475]">{team.sport}</p>
                                 </div>

                                 <span className={`flex h-6 w-6 shrink-0 items-center justify-center border ${isSelected ? "border-[#1E40AF] bg-[#1E40AF] text-white" : "border-[#D6CCBC] bg-white text-transparent"}`}>
                                    <Check aria-hidden="true" className="h-4 w-4" />
                                 </span>
                              </button>
                           );
                        })}
                     </div>
                  </div>
               </div>
            </div>
         </div>

         <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-[#111827] pt-5">
            <button
               type="button"
               onClick={onCancel}
               className="min-h-11 border border-[#111827] bg-white px-5 text-xs font-black uppercase tracking-[0.1em] text-[#111827] transition hover:bg-[#FFF8EE] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
            >
               Cancel
            </button>

            <button
               type="button"
               onClick={onSave}
               className="min-h-11 border border-[#1E40AF] bg-[#1E40AF] px-5 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#173487] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30"
            >
               Save profile
            </button>
         </div>
      </section>
   );
}

function ProfileAvatar({
   profile,
   size,
}: {
   profile: {
      name: string;
      initials: string;
      profileImageUrl?: string;
   };
   size: "large" | "small";
}) {
   const sizeClasses = size === "large" ? "h-20 w-20 text-2xl" : "h-11 w-11 text-sm";

   if (profile.profileImageUrl) {
      return (
         <div className={`${sizeClasses} relative shrink-0 overflow-hidden rounded-full border-4 border-white bg-[#1E40AF] shadow-sm`}>
            <Image src={profile.profileImageUrl} alt={`${profile.name} profile`} fill sizes={size === "large" ? "80px" : "44px"} unoptimized className="object-cover" />
         </div>
      );
   }

   return (
      <div aria-hidden="true" className={`${sizeClasses} flex shrink-0 items-center justify-center rounded-full border-4 border-white bg-[#1E40AF] font-bold text-white shadow-sm`}>
         {profile.initials}
      </div>
   );
}

function ProfileTake({ post, interactionCount, currentUserProfile, canDelete, onDeletePost }: { post: WarRoomPost; interactionCount: number; currentUserProfile: FrontOfficeProfile; canDelete: boolean; onDeletePost?: (postId: number) => void }) {
   const interactions = interactionCount;

   const authorName = post.author?.name ?? post.user;

   const authorHandle = post.author?.handle;

   const authorInitials = post.author?.initials ?? getInitials(authorName);

   return (
      <article className="px-5 py-6 transition hover:bg-[#FFFCF6] sm:px-6 lg:px-7">
         <div className="flex gap-3">
            {post.author?.isCurrentUser ? (
               <ProfileAvatar profile={currentUserProfile} size="small" />
            ) : (
               <div aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1E40AF] text-sm font-bold text-white">
                  {authorInitials}
               </div>
            )}

            <div className="min-w-0 flex-1">
               <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                     <div className="flex flex-wrap items-center gap-2 text-sm">
                        <p className="font-bold text-[#111827]">{authorName}</p>

                        {authorHandle && (
                           <>
                              <span className="text-[#5B6475]">·</span>

                              <p className="font-medium text-[#5B6475]">{authorHandle}</p>
                           </>
                        )}

                        <span className="text-[#5B6475]">·</span>

                        <p className="font-medium text-[#5B6475]">{post.team}</p>
                     </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                     <time dateTime={post.createdAt} className="text-xs font-medium text-[#8A93A3]">
                        {formatReceiptDate(post.createdAt)}
                     </time>

                     {canDelete && (
                        <button
                           type="button"
                           onClick={() => onDeletePost?.(post.id)}
                           aria-label="Delete this post"
                           title="Delete post"
                           className="flex min-h-9 min-w-9 shrink-0 items-center justify-center border border-transparent text-[#5B6475] transition hover:border-[#C2410C] hover:bg-[#FFF1E8] hover:text-[#C2410C] focus:outline-none focus:ring-4 focus:ring-[#C2410C]/20"
                        >
                           <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                     )}
                  </div>
               </div>

               <p className="mt-4 text-xl font-black leading-7 tracking-[-0.02em] text-[#111827] sm:text-2xl sm:leading-8">{post.take}</p>

               <div className="mt-4 flex flex-wrap items-center gap-5 text-sm font-medium text-[#5B6475]">
                  <span className="inline-flex items-center gap-1.5">
                     <MessageCircle aria-hidden="true" className="h-4 w-4" />
                     {post.comments} comments
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                     <ThumbsUp aria-hidden="true" className="h-4 w-4" />
                     {post.votes} votes
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                     <Eye aria-hidden="true" className="h-4 w-4" />
                     {interactions} interactions
                  </span>
               </div>
            </div>
         </div>
      </article>
   );
}

function EmptyProfile({ isOwnProfile }: { isOwnProfile: boolean }) {
   return (
      <div className="px-5 py-10 text-center sm:px-6 lg:px-7">
         <p className="text-lg font-black uppercase tracking-[-0.01em] text-[#111827]">No receipts yet</p>

         <p className="mt-2 text-base leading-7 text-[#5B6475]">{isOwnProfile ? "Post your first call to the War Room and your receipt will show up here." : "This user has not posted a receipt to the War Room yet."}</p>
      </div>
   );
}

function RelationshipPanel({
   title,
   handles,
   currentUserProfile,
   publicProfilesByHandle,
   followedHandles,
   onToggleFollow,
   onOpenProfile,
   onClose,
}: {
   title: string;
   handles: string[];
   currentUserProfile: FrontOfficeProfile;
   publicProfilesByHandle: Record<string, FrontOfficeProfile>;
   followedHandles: string[];
   onToggleFollow?: (handle: string) => void;
   onOpenProfile?: (handle: string) => void;
   onClose: () => void;
}) {
   return (
      <section className="overflow-hidden border border-[#111827] bg-white shadow-sm">
         <div className="flex items-center justify-between border-b border-[#111827] bg-[#FFF8EE] px-5 py-4 sm:px-6 lg:px-7">
            <div>
               <h4 className="mt-1 text-2xl font-black uppercase leading-[1.02] tracking-[-0.025em] text-[#111827]">{title}</h4>

               <p className="mt-1 text-sm text-[#5B6475]">
                  {handles.length} {handles.length === 1 ? "person" : "people"}
               </p>
            </div>

            <button
               type="button"
               onClick={onClose}
               aria-label={`Close ${title.toLowerCase()} list`}
               className="flex h-10 w-10 items-center justify-center border border-[#111827] bg-white text-[#5B6475] transition hover:bg-[#F6F7F8] hover:text-[#111827] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
            >
               <X aria-hidden="true" className="h-5 w-5" />
            </button>
         </div>

         <div className="divide-y divide-[#111827]">
            {handles.length > 0 ? (
               handles.map((handle) => {
                  const isCurrentUser = handle === currentUserProfile.handle;

                  const person = isCurrentUser
                     ? currentUserProfile
                     : (publicProfilesByHandle[handle] ?? {
                          name: handle.replace("@", ""),
                          handle,
                          initials: getInitials(handle.replace("@", "")),
                          bio: "FrontOffice user",
                          favoriteTeams: [],
                       });

                  const isFollowing = followedHandles.includes(handle);

                  return (
                     <article key={handle} className="flex items-center gap-3 px-5 py-4 transition hover:bg-[#FFFCF6] sm:px-6 lg:px-7">
                        <button
                           type="button"
                           onClick={() => onOpenProfile?.(handle)}
                           aria-label={`Open ${person.name}'s profile`}
                           className="shrink-0 rounded-full transition hover:ring-4 hover:ring-[#1E40AF]/20 focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30"
                        >
                           <ProfileAvatar profile={person} size="small" />
                        </button>

                        <div className="min-w-0 flex-1">
                           <button
                              type="button"
                              onClick={() => onOpenProfile?.(handle)}
                              className="block max-w-full truncate text-left font-black text-[#111827] transition hover:text-[#1E40AF] hover:underline focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
                           >
                              {person.name}
                           </button>

                           <p className="mt-1 truncate text-sm font-medium text-[#5B6475]">{person.handle}</p>
                        </div>

                        {!isCurrentUser && (
                           <button
                              type="button"
                              onClick={() => onToggleFollow?.(handle)}
                              aria-pressed={isFollowing}
                              className={`min-h-10 shrink-0 border px-4 text-xs font-black uppercase tracking-[0.1em] transition focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30 ${
                                 isFollowing ? "border-[#111827] bg-white text-[#111827] hover:bg-[#FFF8EE]" : "border-[#1E40AF] bg-[#1E40AF] text-white hover:bg-[#173487]"
                              }`}
                           >
                              {isFollowing ? "Following" : "Follow"}
                           </button>
                        )}
                     </article>
                  );
               })
            ) : (
               <div className="px-5 py-10 text-center sm:px-6 lg:px-7">
                  <UserRound aria-hidden="true" className="mx-auto h-7 w-7 text-[#5B6475]" />

                  <p className="mt-3 font-bold text-[#111827]">No one here yet</p>

                  <p className="mt-1 text-sm text-[#5B6475]">Social connections will appear here.</p>
               </div>
            )}
         </div>
      </section>
   );
}

function ProfileStat({ label, value, isActive, onClick }: { label: string; value: string; isActive: boolean; onClick: () => void }) {
   return (
      <button type="button" onClick={onClick} className={`px-4 py-4 text-center transition focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#1E40AF]/20 ${isActive ? "bg-[#111827] text-white" : "bg-[#FFF8EE] hover:bg-white"}`}>
         <p className={`text-2xl font-black ${isActive ? "text-white" : "text-[#111827]"}`}>{value}</p>

         <p className={`mt-1 text-xs font-black uppercase tracking-[0.14em] ${isActive ? "text-white/80" : "text-[#5B6475]"}`}>{label}</p>
      </button>
   );
}

function normalizeHandle(value: string) {
   const trimmedValue = value.trim().replace(/\s+/g, "");

   if (!trimmedValue) {
      return "";
   }

   return trimmedValue.startsWith("@") ? trimmedValue : `@${trimmedValue}`;
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

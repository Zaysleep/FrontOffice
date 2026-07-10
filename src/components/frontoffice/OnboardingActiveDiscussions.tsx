"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type OnboardingActiveDiscussionsProps = {
   favoriteTeams: string[];
};

type Discussion = {
   id: string;
   take: string;
   team: string;
   createdAt: string;
   authorName: string;
   authorHandle: string;
};

type PostRow = {
   id: string;
   author_id: string;
   team_name_snapshot: string;
   take: string;
   created_at: string;
};

type ProfileRow = {
   id: string;
   name: string;
   handle: string;
};

function normalize(value: string) {
   return value.trim().toLowerCase();
}

export default function OnboardingActiveDiscussions({
   favoriteTeams,
}: OnboardingActiveDiscussionsProps) {
   const [discussions, setDiscussions] = useState<Discussion[]>([]);
   const [isLoading, setIsLoading] = useState(true);

   useEffect(() => {
      let isMounted = true;

      async function loadDiscussions() {
         setIsLoading(true);

         const [
            { data: postData, error: postError },
            { data: profileData, error: profileError },
         ] = await Promise.all([
            supabase
               .from("posts")
               .select("id, author_id, team_name_snapshot, take, created_at")
               .order("created_at", { ascending: false })
               .limit(12),
            supabase.from("profiles").select("id, name, handle"),
         ]);

         if (!isMounted) return;

         if (postError || profileError) {
            console.error("FrontOffice onboarding could not load active discussions.", {
               postError,
               profileError,
            });
            setDiscussions([]);
            setIsLoading(false);
            return;
         }

         const profilesById = new Map(
            ((profileData ?? []) as ProfileRow[]).map((profile) => [
               profile.id,
               profile,
            ]),
         );

         const favoriteSet = new Set(favoriteTeams.map(normalize));

         const ranked = ((postData ?? []) as PostRow[])
            .map((post) => ({
               post,
               favoriteMatch: favoriteSet.has(
                  normalize(post.team_name_snapshot),
               ),
            }))
            .sort((first, second) => {
               if (first.favoriteMatch !== second.favoriteMatch) {
                  return first.favoriteMatch ? -1 : 1;
               }

               return (
                  new Date(second.post.created_at).getTime() -
                  new Date(first.post.created_at).getTime()
               );
            })
            .slice(0, 3)
            .map(({ post }) => {
               const profile = profilesById.get(post.author_id);

               return {
                  id: post.id,
                  take: post.take,
                  team: post.team_name_snapshot,
                  createdAt: post.created_at,
                  authorName: profile?.name ?? "FrontOffice User",
                  authorHandle: profile?.handle ?? "",
               } satisfies Discussion;
            });

         setDiscussions(ranked);
         setIsLoading(false);
      }

      void loadDiscussions();

      return () => {
         isMounted = false;
      };
   }, [favoriteTeams]);

   const newestLabel = useMemo(
      () => (discussions.length > 0 ? "Live now" : "Quiet for now"),
      [discussions.length],
   );

   function openDiscussion(postId: string) {
      window.location.assign(
         `/?section=war-room&post=${encodeURIComponent(postId)}`,
      );
   }

   return (
      <section
         aria-labelledby="active-discussions-heading"
         className="border border-[#111827] bg-white"
      >
         <header className="border-b border-[#111827] bg-[#FFF8EE] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
               <div className="flex items-center gap-3">
                  <MessageCircle aria-hidden="true" className="h-5 w-5" />

                  <div>
                     <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#C2410C]">
                        War Room
                     </p>

                     <h2
                        id="active-discussions-heading"
                        className="mt-1 text-xl font-black uppercase tracking-[-0.025em]"
                     >
                        What People Are Saying
                     </h2>
                  </div>
               </div>

               <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#1E40AF]">
                  {newestLabel}
               </span>
            </div>
         </header>

         <div className="divide-y divide-[#E7DCCB]">
            {isLoading && (
               <p className="px-4 py-5 text-sm font-bold text-[#5B6475]">
                  Pulling the latest calls...
               </p>
            )}

            {!isLoading && discussions.length === 0 && (
               <div className="px-4 py-5">
                  <p className="text-sm font-black text-[#111827]">
                     The room is waiting for a take.
                  </p>

                  <p className="mt-1 text-sm leading-6 text-[#5B6475]">
                     Enter FrontOffice and make the next call.
                  </p>
               </div>
            )}

            {discussions.map((discussion) => (
               <article key={discussion.id} className="px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                     <div className="min-w-0">
                        <p className="truncate text-xs font-black uppercase tracking-[0.1em] text-[#1E40AF]">
                           {discussion.team}
                        </p>

                        <p className="mt-1 truncate text-xs font-bold text-[#5B6475]">
                           {discussion.authorName}
                           {discussion.authorHandle
                              ? ` · ${discussion.authorHandle}`
                              : ""}
                        </p>
                     </div>

                     <time className="shrink-0 text-xs font-bold text-[#8A93A3]">
                        {formatRelativeTime(discussion.createdAt)}
                     </time>
                  </div>

                  <p className="mt-3 line-clamp-3 text-sm font-black leading-6 tracking-[-0.01em] text-[#111827]">
                     {discussion.take}
                  </p>

                  <button
                     type="button"
                     onClick={() => openDiscussion(discussion.id)}
                     className="mt-3 inline-flex min-h-11 items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-[#1E40AF] transition hover:underline focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
                  >
                     Open Discussion
                     <ArrowRight aria-hidden="true" className="h-4 w-4" />
                  </button>
               </article>
            ))}
         </div>
      </section>
   );
}

function formatRelativeTime(createdAt: string) {
   const createdTime = new Date(createdAt).getTime();

   if (Number.isNaN(createdTime)) {
      return "now";
   }

   const differenceInMinutes = Math.max(
      0,
      Math.floor((Date.now() - createdTime) / 60_000),
   );

   if (differenceInMinutes < 1) return "now";
   if (differenceInMinutes < 60) return `${differenceInMinutes}m`;

   const hours = Math.floor(differenceInMinutes / 60);

   if (hours < 24) return `${hours}h`;

   const days = Math.floor(hours / 24);

   return `${days}d`;
}

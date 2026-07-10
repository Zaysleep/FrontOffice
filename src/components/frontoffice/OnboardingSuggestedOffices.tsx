"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { UserPlus, UsersRound } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type OnboardingSuggestedOfficesProps = {
   favoriteTeams: string[];
};

type SuggestedOffice = {
   id: string;
   name: string;
   handle: string;
   initials: string;
   profileImageUrl?: string;
   favoriteTeams: string[];
};

type ProfileRow = {
   id: string;
   name: string;
   handle: string;
   initials: string;
   profile_image_url: string | null;
};

type UserTeamRow = {
   user_id: string;
   team_id: string;
};

type TeamRow = {
   id: string;
   name: string;
};

function normalize(value: string) {
   return value.trim().toLowerCase();
}

export default function OnboardingSuggestedOffices({
   favoriteTeams,
}: OnboardingSuggestedOfficesProps) {
   const [offices, setOffices] = useState<SuggestedOffice[]>([]);
   const [followedIds, setFollowedIds] = useState<string[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [message, setMessage] = useState("");

   useEffect(() => {
      let isMounted = true;

      async function loadSuggestions() {
         setIsLoading(true);
         setMessage("");

         const {
            data: { user },
         } = await supabase.auth.getUser();

         if (!user) {
            setIsLoading(false);
            return;
         }

         const [
            { data: profileData, error: profileError },
            { data: userTeamData, error: userTeamError },
            { data: teamData, error: teamError },
            { data: followData, error: followError },
         ] = await Promise.all([
            supabase
               .from("profiles")
               .select("id, name, handle, initials, profile_image_url")
               .neq("id", user.id)
               .limit(20),
            supabase.from("user_teams").select("user_id, team_id"),
            supabase.from("teams").select("id, name"),
            supabase
               .from("follows")
               .select("following_id")
               .eq("follower_id", user.id),
         ]);

         if (!isMounted) return;

         if (profileError || userTeamError || teamError || followError) {
            console.error("FrontOffice onboarding could not load suggested offices.", {
               profileError,
               userTeamError,
               teamError,
               followError,
            });
            setMessage("Suggested offices are still loading in. You can discover people from Search after entering FrontOffice.");
            setIsLoading(false);
            return;
         }

         const profiles = (profileData ?? []) as ProfileRow[];
         const userTeams = (userTeamData ?? []) as UserTeamRow[];
         const teams = (teamData ?? []) as TeamRow[];
         const followed = (followData ?? []).map((row) => String(row.following_id));

         const teamNameById = new Map(
            teams.map((team) => [team.id, team.name]),
         );

         const teamNamesByUserId = userTeams.reduce<Record<string, string[]>>(
            (groups, item) => {
               const teamName = teamNameById.get(item.team_id);

               if (!teamName) return groups;

               groups[item.user_id] = [
                  ...(groups[item.user_id] ?? []),
                  teamName,
               ];

               return groups;
            },
            {},
         );

         const favoriteSet = new Set(favoriteTeams.map(normalize));

         const ranked = profiles
            .map((profile) => {
               const profileTeams = teamNamesByUserId[profile.id] ?? [];

               const overlapCount = profileTeams.filter((team) =>
                  favoriteSet.has(normalize(team)),
               ).length;

               return {
                  office: {
                     id: profile.id,
                     name: profile.name,
                     handle: profile.handle,
                     initials: profile.initials,
                     profileImageUrl: profile.profile_image_url ?? undefined,
                     favoriteTeams: profileTeams,
                  } satisfies SuggestedOffice,
                  overlapCount,
                  alreadyFollowing: followed.includes(profile.id),
               };
            })
            .sort((first, second) => {
               if (second.overlapCount !== first.overlapCount) {
                  return second.overlapCount - first.overlapCount;
               }

               if (first.alreadyFollowing !== second.alreadyFollowing) {
                  return first.alreadyFollowing ? 1 : -1;
               }

               return first.office.name.localeCompare(second.office.name);
            })
            .slice(0, 3)
            .map((item) => item.office);

         setOffices(ranked);
         setFollowedIds(followed);
         setIsLoading(false);
      }

      void loadSuggestions();

      return () => {
         isMounted = false;
      };
   }, [favoriteTeams]);

   const favoriteSet = useMemo(
      () => new Set(favoriteTeams.map(normalize)),
      [favoriteTeams],
   );

   async function toggleFollow(office: SuggestedOffice) {
      const {
         data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const isFollowing = followedIds.includes(office.id);

      if (isFollowing) {
         const { error } = await supabase
            .from("follows")
            .delete()
            .eq("follower_id", user.id)
            .eq("following_id", office.id);

         if (error) {
            setMessage("FrontOffice could not update that follow yet.");
            return;
         }

         setFollowedIds((ids) => ids.filter((id) => id !== office.id));
         return;
      }

      const { error } = await supabase.from("follows").insert({
         follower_id: user.id,
         following_id: office.id,
      });

      if (error) {
         setMessage("FrontOffice could not update that follow yet.");
         return;
      }

      setFollowedIds((ids) => [...ids, office.id]);
   }

   return (
      <section
         aria-labelledby="suggested-offices-heading"
         className="border border-[#111827] bg-white"
      >
         <header className="border-b border-[#111827] bg-[#FFF8EE] px-4 py-4">
            <div className="flex items-center gap-3">
               <UsersRound aria-hidden="true" className="h-5 w-5" />

               <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#C2410C]">
                     First-Day Setup
                  </p>

                  <h2
                     id="suggested-offices-heading"
                     className="mt-1 text-xl font-black uppercase tracking-[-0.025em]"
                  >
                     Offices You May Like
                  </h2>
               </div>
            </div>
         </header>

         <div className="divide-y divide-[#E7DCCB]">
            {isLoading && (
               <p className="px-4 py-5 text-sm font-bold text-[#5B6475]">
                  Finding a few good offices...
               </p>
            )}

            {!isLoading && offices.length === 0 && (
               <p className="px-4 py-5 text-sm leading-6 text-[#5B6475]">
                  The directory is still growing. You can find more people from Search after entering FrontOffice.
               </p>
            )}

            {offices.map((office) => {
               const isFollowing = followedIds.includes(office.id);

               const sharedTeam = office.favoriteTeams.find((team) =>
                  favoriteSet.has(normalize(team)),
               );

               return (
                  <article
                     key={office.id}
                     className="flex items-center gap-3 px-4 py-4"
                  >
                     <Avatar office={office} />

                     <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[#111827]">
                           {office.name}
                        </p>

                        <p className="truncate text-sm text-[#5B6475]">
                           {office.handle}
                        </p>

                        {sharedTeam && (
                           <p className="mt-1 text-xs font-bold text-[#1E40AF]">
                              Also follows {sharedTeam}
                           </p>
                        )}
                     </div>

                     <button
                        type="button"
                        onClick={() => {
                           void toggleFollow(office);
                        }}
                        className={`inline-flex min-h-11 shrink-0 items-center gap-2 border px-3 text-[11px] font-black uppercase tracking-[0.08em] transition focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20 ${
                           isFollowing
                              ? "border-[#111827] bg-[#111827] text-white"
                              : "border-[#1E40AF] bg-white text-[#1E40AF] hover:bg-[#EAF0FF]"
                        }`}
                     >
                        <UserPlus aria-hidden="true" className="h-4 w-4" />
                        {isFollowing ? "Following" : "Follow"}
                     </button>
                  </article>
               );
            })}
         </div>

         {message && (
            <p
               role="status"
               aria-live="polite"
               className="border-t border-[#111827] bg-[#FFF8EE] px-4 py-3 text-sm font-bold text-[#C2410C]"
            >
               {message}
            </p>
         )}
      </section>
   );
}

function Avatar({ office }: { office: SuggestedOffice }) {
   if (office.profileImageUrl) {
      return (
         <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#1E40AF]">
            <Image
               src={office.profileImageUrl}
               alt={`${office.name} profile`}
               fill
               sizes="44px"
               unoptimized
               className="object-cover"
            />
         </div>
      );
   }

   return (
      <div
         aria-hidden="true"
         className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1E40AF] text-sm font-black text-white"
      >
         {office.initials}
      </div>
   );
}

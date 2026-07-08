"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Flame, MessageCircle, Search, TrendingUp, UserRound } from "lucide-react";
import { type FrontOfficeProfile, type TeamBrief, type WarRoomPost } from "@/data/frontofficeData";
import { supabase } from "@/lib/supabase/client";

/**
 * SearchSection
 *
 * Explore/Search page for FrontOffice.
 *
 * UX direction:
 * - No pills
 * - One clear search field
 * - Discovery-first layout when there is no query
 * - Results-first layout when the user searches
 * - Clean feed-style rows
 * - Working Follow / Following controls
 * - Clickable people and post authors
 * - Profile avatars beside take results
 * - Personalized discovery using favorite teams and engagement
 * - People ranking based on shared favorite teams
 * - Newspaper-inspired index and discovery layout
 * - Strong editorial rules and section hierarchy
 * - Reduced rounded-card styling
 */

type SearchSectionProps = {
   teams: TeamBrief[];
   posts: WarRoomPost[];
   followedHandles: string[];
   onToggleFollow: (handle: string) => void;
   onOpenProfile: (handle: string) => void;
   onOpenPost: (postId: number) => void;
   onOpenTeamDiscussion: (teamName: string) => void;
   currentUserProfile: FrontOfficeProfile;
   publicProfilesByHandle: Record<string, FrontOfficeProfile>;
};

type SearchTeam = {
   id: string;
   name: string;
   sport: string;
   league: string;
   abbreviation?: string;
};

type LiveTopic = {
   topic: string;
   meta: string;
   description: string;
};

function getEngagementScore(post: WarRoomPost) {
   return Math.max(0, post.votes) + post.comments * 3;
}

function normalizeTeamName(value: string) {
   return value.trim().toLowerCase();
}

function matchesFavoriteTeam(postTeam: string, favoriteTeams: string[]) {
   const normalizedPostTeam = normalizeTeamName(postTeam);

   return favoriteTeams.some((favoriteTeam) => {
      const normalizedFavorite = normalizeTeamName(favoriteTeam);

      return normalizedFavorite.includes(normalizedPostTeam) || normalizedPostTeam.includes(normalizedFavorite);
   });
}

function getOverlappingFavoriteTeams(person: FrontOfficeProfile, currentUserProfile: FrontOfficeProfile) {
   const currentFavorites = new Set(currentUserProfile.favoriteTeams.map(normalizeTeamName));

   return person.favoriteTeams.filter((team) => currentFavorites.has(normalizeTeamName(team)));
}

export default function SearchSection(props: SearchSectionProps) {
   const { posts, followedHandles, onToggleFollow, onOpenProfile, onOpenPost, onOpenTeamDiscussion, currentUserProfile, publicProfilesByHandle } = props;

   const [query, setQuery] = useState("");
   const [liveTeams, setLiveTeams] = useState<SearchTeam[]>([]);
   const [isTeamsLoading, setIsTeamsLoading] = useState(true);
   const [teamsError, setTeamsError] = useState("");

   useEffect(() => {
      let isMounted = true;

      async function loadTeams() {
         setIsTeamsLoading(true);
         setTeamsError("");

         const { data, error } = await supabase.from("teams").select("id, name, sport, league, abbreviation").order("sport", { ascending: true }).order("name", { ascending: true });

         if (!isMounted) {
            return;
         }

         if (error) {
            console.error("FrontOffice Search could not load teams.", error);
            setTeamsError("Teams are temporarily unavailable.");
            setLiveTeams([]);
            setIsTeamsLoading(false);
            return;
         }

         const uniqueTeams = new Map<string, SearchTeam>();

         (data ?? []).forEach((team) => {
            const nextTeam: SearchTeam = {
               id: String(team.id),
               name: String(team.name),
               sport: String(team.sport),
               league: String(team.league),
               abbreviation: team.abbreviation ? String(team.abbreviation) : undefined,
            };

            const key = normalizeTeamName(nextTeam.name);
            const existing = uniqueTeams.get(key);

            if (!existing) {
               uniqueTeams.set(key, nextTeam);
               return;
            }

            const existingQuality = Number(Boolean(existing.league && existing.league !== "null")) + Number(Boolean(existing.abbreviation));

            const nextQuality = Number(Boolean(nextTeam.league && nextTeam.league !== "null")) + Number(Boolean(nextTeam.abbreviation));

            if (nextQuality > existingQuality) {
               uniqueTeams.set(key, nextTeam);
            }
         });

         setLiveTeams(Array.from(uniqueTeams.values()));

         setIsTeamsLoading(false);
      }

      void loadTeams();

      return () => {
         isMounted = false;
      };
   }, []);

   const people = useMemo<FrontOfficeProfile[]>(() => {
      const realProfiles = Object.values(publicProfilesByHandle);

      const uniqueProfiles = new Map<string, FrontOfficeProfile>();

      realProfiles.forEach((profile) => {
         uniqueProfiles.set(profile.handle, profile);
      });

      uniqueProfiles.set(currentUserProfile.handle, {
         ...currentUserProfile,
         isCurrentUser: true,
      });

      return Array.from(uniqueProfiles.values());
   }, [currentUserProfile, publicProfilesByHandle]);

   const normalizedQuery = query.trim().toLowerCase();

   const isSearching = normalizedQuery.length > 0;

   const filteredTeams = useMemo(() => {
      if (!normalizedQuery) {
         return liveTeams.slice(0, 8);
      }

      return liveTeams.filter((team) => {
         const searchText = [team.name, team.sport, team.league, team.abbreviation ?? ""].join(" ").toLowerCase();

         return searchText.includes(normalizedQuery);
      });
   }, [liveTeams, normalizedQuery]);

   const filteredPosts = useMemo(() => {
      if (!normalizedQuery) {
         return posts.slice(0, 4);
      }

      return posts.filter(
         (post) =>
            post.take.toLowerCase().includes(normalizedQuery) ||
            post.team.toLowerCase().includes(normalizedQuery) ||
            post.user.toLowerCase().includes(normalizedQuery) ||
            post.tag.toLowerCase().includes(normalizedQuery) ||
            post.author?.name.toLowerCase().includes(normalizedQuery) ||
            post.author?.handle.toLowerCase().includes(normalizedQuery),
      );
   }, [normalizedQuery, posts]);

   const filteredPeople = useMemo(() => {
      if (!normalizedQuery) {
         return people;
      }

      return people.filter((person) => person.name.toLowerCase().includes(normalizedQuery) || person.handle.toLowerCase().includes(normalizedQuery) || person.bio.toLowerCase().includes(normalizedQuery));
   }, [normalizedQuery, people]);

   const personalizedTeams = useMemo(() => {
      const favoriteTeamSet = new Set(currentUserProfile.favoriteTeams.map(normalizeTeamName));

      return liveTeams.filter((team) => favoriteTeamSet.has(normalizeTeamName(team.name)));
   }, [currentUserProfile.favoriteTeams, liveTeams]);

   const personalizedPosts = useMemo(() => {
      return [...posts]
         .sort((firstPost, secondPost) => {
            const firstFavoriteMatch = matchesFavoriteTeam(firstPost.team, currentUserProfile.favoriteTeams) ? 1 : 0;

            const secondFavoriteMatch = matchesFavoriteTeam(secondPost.team, currentUserProfile.favoriteTeams) ? 1 : 0;

            if (secondFavoriteMatch !== firstFavoriteMatch) {
               return secondFavoriteMatch - firstFavoriteMatch;
            }

            return getEngagementScore(secondPost) - getEngagementScore(firstPost);
         })
         .slice(0, 4);
   }, [currentUserProfile.favoriteTeams, posts]);

   const peopleToWatch = useMemo(() => {
      return [...people]
         .filter((person) => !person.isCurrentUser)
         .sort((firstPerson, secondPerson) => {
            const firstOverlap = getOverlappingFavoriteTeams(firstPerson, currentUserProfile).length;

            const secondOverlap = getOverlappingFavoriteTeams(secondPerson, currentUserProfile).length;

            if (secondOverlap !== firstOverlap) {
               return secondOverlap - firstOverlap;
            }

            const firstFollowing = followedHandles.includes(firstPerson.handle) ? 1 : 0;

            const secondFollowing = followedHandles.includes(secondPerson.handle) ? 1 : 0;

            return firstFollowing - secondFollowing;
         });
   }, [currentUserProfile, followedHandles, people]);

   const personalizedTrendingTopics = useMemo<LiveTopic[]>(() => {
      const discussionByTeam = posts.reduce<
         Record<
            string,
            {
               count: number;
               reactions: number;
            }
         >
      >((groups, post) => {
         const current = groups[post.team] ?? {
            count: 0,
            reactions: 0,
         };

         groups[post.team] = {
            count: current.count + 1,
            reactions: current.reactions + Math.max(0, post.votes) + post.comments,
         };

         return groups;
      }, {});

      const favoriteNames = new Set(currentUserProfile.favoriteTeams.map(normalizeTeamName));

      return Object.entries(discussionByTeam)
         .map(([team, activity]) => ({
            team,
            ...activity,
            isFavorite: favoriteNames.has(normalizeTeamName(team)),
         }))
         .sort((first, second) => {
            if (first.isFavorite !== second.isFavorite) {
               return first.isFavorite ? -1 : 1;
            }

            return second.reactions - first.reactions || second.count - first.count;
         })
         .slice(0, 4)
         .map((item) => ({
            topic: `${item.team} conversation`,
            meta: `${item.count} ${item.count === 1 ? "take" : "takes"}`,
            description: item.reactions > 0 ? `${item.reactions} live interactions across current War Room discussion.` : "New War Room discussion is starting to form around this team.",
         }));
   }, [currentUserProfile.favoriteTeams, posts]);

   const totalResults = filteredTeams.length + filteredPosts.length + filteredPeople.length;

   return (
      <section aria-labelledby="search-heading" className="space-y-4 sm:space-y-6">
         <header className="border border-[#111827] bg-white px-4 py-5 shadow-sm sm:px-6 md:px-7">
            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] md:items-end">
               <div>
                  <h3 id="search-heading" className="text-3xl font-black uppercase leading-[0.98] tracking-[-0.04em] text-[#111827] sm:text-4xl md:text-5xl">
                     Explore The League
                  </h3>
               </div>

               <label className="block">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] text-[#5B6475]">Search The Index</span>

                  <div className="mt-2 flex min-h-12 items-center gap-3 border-b border-[#111827] bg-transparent px-0 focus-within:border-[#1E40AF]">
                     <Search aria-hidden="true" className="h-5 w-5 shrink-0 text-[#5B6475]" />

                     <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search teams, profiles, or takes..."
                        aria-label="Search teams, profiles, or takes"
                        className="min-h-12 w-full bg-transparent text-base font-medium leading-6 text-[#111827] outline-none placeholder:text-[#8A93A3]"
                     />
                  </div>
               </label>
            </div>
         </header>

         {isSearching ? (
            <SearchResults
               query={query}
               totalResults={totalResults}
               teams={filteredTeams}
               posts={filteredPosts}
               people={filteredPeople}
               followedHandles={followedHandles}
               onToggleFollow={onToggleFollow}
               onOpenProfile={onOpenProfile}
               onOpenPost={onOpenPost}
               currentUserProfile={currentUserProfile}
               publicProfilesByHandle={publicProfilesByHandle}
            />
         ) : (
            <ExploreHome
               teams={personalizedTeams}
               posts={personalizedPosts}
               trendingTopics={personalizedTrendingTopics}
               followedHandles={followedHandles}
               onToggleFollow={onToggleFollow}
               onOpenProfile={onOpenProfile}
               onOpenPost={onOpenPost}
               onOpenTeamDiscussion={onOpenTeamDiscussion}
               people={peopleToWatch}
               currentUserProfile={currentUserProfile}
               publicProfilesByHandle={publicProfilesByHandle}
               isTeamsLoading={isTeamsLoading}
               teamsError={teamsError}
            />
         )}
      </section>
   );
}

function ExploreHome({
   teams,
   posts,
   trendingTopics,
   followedHandles,
   onToggleFollow,
   onOpenProfile,
   onOpenPost,
   onOpenTeamDiscussion,
   people,
   currentUserProfile,
   publicProfilesByHandle,
   isTeamsLoading,
   teamsError,
}: {
   teams: SearchTeam[];
   posts: WarRoomPost[];
   trendingTopics: LiveTopic[];
   followedHandles: string[];
   onToggleFollow: (handle: string) => void;
   onOpenProfile: (handle: string) => void;
   onOpenPost: (postId: number) => void;
   onOpenTeamDiscussion: (teamName: string) => void;
   people: FrontOfficeProfile[];
   currentUserProfile: FrontOfficeProfile;
   publicProfilesByHandle: Record<string, FrontOfficeProfile>;
   isTeamsLoading: boolean;
   teamsError: string;
}) {
   return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
         <div className="space-y-4 sm:space-y-6">
            <FeedSection title="For Your Office">
               {trendingTopics.map((trend, index) => (
                  <TrendingRow key={trend.topic} rank={index + 1} topic={trend.topic} meta={trend.meta} description={trend.description} onOpen={() => onOpenTeamDiscussion(trend.topic.replace(/ conversation$/i, ""))} />
               ))}

               {trendingTopics.length === 0 && <StatusRow message="Live War Room activity will appear here as people start making calls." />}
            </FeedSection>

            <FeedSection title="Takes For You" kicker="Opinion Desk">
               {posts.map((post) => (
                  <PostResultRow key={post.id} post={post} onOpenProfile={onOpenProfile} onOpenPost={onOpenPost} currentUserProfile={currentUserProfile} publicProfilesByHandle={publicProfilesByHandle} />
               ))}
            </FeedSection>
         </div>

         <div className="space-y-4 sm:space-y-6">
            <FeedSection title="Your Teams">
               {teams.map((team) => (
                  <TeamResultRow key={team.id} team={team} />
               ))}

               {isTeamsLoading && <StatusRow message="Loading your teams…" />}

               {!isTeamsLoading && teamsError && <StatusRow message={teamsError} />}

               {!isTeamsLoading && !teamsError && teams.length === 0 && <StatusRow message="No selected teams are available yet." />}
            </FeedSection>

            <FeedSection title="People To Watch" kicker="Names In The News">
               {people.map((person) => (
                  <PersonResultRow key={person.handle} person={person} isFollowing={followedHandles.includes(person.handle)} onToggleFollow={onToggleFollow} onOpenProfile={onOpenProfile} currentUserProfile={currentUserProfile} />
               ))}
            </FeedSection>
         </div>
      </div>
   );
}

function SearchResults({
   query,
   totalResults,
   teams,
   posts,
   people,
   followedHandles,
   onToggleFollow,
   onOpenProfile,
   onOpenPost,
   currentUserProfile,
   publicProfilesByHandle,
}: {
   query: string;
   totalResults: number;
   teams: SearchTeam[];
   posts: WarRoomPost[];
   people: FrontOfficeProfile[];
   followedHandles: string[];
   onToggleFollow: (handle: string) => void;
   onOpenProfile: (handle: string) => void;
   onOpenPost: (postId: number) => void;
   currentUserProfile: FrontOfficeProfile;
   publicProfilesByHandle: Record<string, FrontOfficeProfile>;
}) {
   return (
      <div className="space-y-4 sm:space-y-6">
         <div className="border border-[#111827] bg-[#FFF8EE] px-4 py-4 text-sm font-medium leading-6 text-[#5B6475] sm:px-6 md:px-7">
            <span className="font-black uppercase tracking-[0.12em] text-[#111827]">Search Results</span>
            <span className="mx-2">·</span>
            {totalResults} results for <span className="font-bold text-[#111827]">“{query}”</span>
         </div>

         {posts.length > 0 && (
            <FeedSection title="Takes" kicker="Opinion Desk">
               {posts.map((post) => (
                  <PostResultRow key={post.id} post={post} onOpenProfile={onOpenProfile} onOpenPost={onOpenPost} currentUserProfile={currentUserProfile} publicProfilesByHandle={publicProfilesByHandle} />
               ))}
            </FeedSection>
         )}

         {teams.length > 0 && (
            <FeedSection title="Teams">
               {teams.map((team) => (
                  <TeamResultRow key={team.id} team={team} />
               ))}
            </FeedSection>
         )}

         {people.length > 0 && (
            <FeedSection title="People" kicker="Names In The News">
               {people.map((person) => (
                  <PersonResultRow key={person.handle} person={person} isFollowing={followedHandles.includes(person.handle)} onToggleFollow={onToggleFollow} onOpenProfile={onOpenProfile} currentUserProfile={currentUserProfile} />
               ))}
            </FeedSection>
         )}

         {totalResults === 0 && (
            <div className="border border-[#111827] bg-white p-8 text-center shadow-sm sm:p-10">
               <p className="text-lg font-black uppercase tracking-[-0.01em] text-[#111827]">No results found</p>

               <p className="mt-2 text-base leading-7 text-[#5B6475]">Try searching for a team, sport, profile, or take.</p>
            </div>
         )}
      </div>
   );
}

function FeedSection({ title, kicker, children }: { title: string; kicker?: string; children: ReactNode }) {
   return (
      <section className="overflow-hidden border border-[#111827] bg-white shadow-sm">
         <div className="border-b border-[#111827] bg-[#FFF8EE] px-4 py-4 sm:px-6 md:px-7">
            {kicker && <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C2410C]">{kicker}</p>}

            <h4 className={`${kicker ? "mt-1 " : ""}text-2xl font-black uppercase leading-[1.02] tracking-[-0.025em] text-[#111827]`}>{title}</h4>
         </div>

         <div className="divide-y divide-[#111827]">{children}</div>
      </section>
   );
}

function TrendingRow({ rank, topic, meta, description, onOpen }: { rank: number; topic: string; meta: string; description: string; onOpen: () => void }) {
   return (
      <button
         type="button"
         onClick={onOpen}
         className="grid min-h-16 w-full grid-cols-[32px_minmax(0,1fr)] gap-3 px-4 py-5 text-left transition hover:bg-[#FFFCF6] focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#1E40AF]/20 sm:grid-cols-[42px_minmax(0,1fr)_110px] sm:gap-4 sm:px-6 md:px-7"
      >
         <div className="text-2xl font-black text-[#C2410C]">{rank}</div>

         <div className="min-w-0">
            <div className="flex items-center gap-2">
               <TrendingUp aria-hidden="true" className="h-4 w-4 shrink-0 text-[#C2410C]" />

               <p className="text-lg font-black uppercase leading-[1.05] tracking-[-0.01em] text-[#111827]">{topic}</p>
            </div>

            <p className="mt-2 text-sm leading-6 text-[#5B6475]">{description}</p>

            <p className="mt-2 text-[11px] font-black uppercase tracking-[0.12em] text-[#1E40AF]">View team discussion</p>
         </div>

         <div className="sm:text-right">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#5B6475]">Activity</p>

            <p className="mt-1 text-sm font-bold text-[#111827]">{meta}</p>
         </div>
      </button>
   );
}

function PostResultRow({
   post,
   onOpenProfile,
   onOpenPost,
   currentUserProfile,
   publicProfilesByHandle,
}: {
   post: WarRoomPost;
   onOpenProfile: (handle: string) => void;
   onOpenPost: (postId: number) => void;
   currentUserProfile: FrontOfficeProfile;
   publicProfilesByHandle: Record<string, FrontOfficeProfile>;
}) {
   const authorName = post.author?.name ?? post.user;

   const authorHandle = post.author?.handle;

   const authorInitials = post.author?.isCurrentUser ? currentUserProfile.initials : (post.author?.initials ?? getInitials(authorName));

   const profileImageUrl = post.author?.isCurrentUser ? currentUserProfile.profileImageUrl : authorHandle ? publicProfilesByHandle[authorHandle]?.profileImageUrl : undefined;

   return (
      <article className="px-4 py-5 transition hover:bg-[#FFFCF6] sm:px-6 md:px-7">
         <div className="flex gap-3">
            {authorHandle ? (
               <button
                  type="button"
                  onClick={() => onOpenProfile(authorHandle)}
                  aria-label={`Open ${authorName}'s profile`}
                  className="min-h-11 min-w-11 h-fit shrink-0 rounded-full transition hover:ring-4 hover:ring-[#1E40AF]/20 focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30"
               >
                  <SearchAvatar name={post.author?.isCurrentUser ? currentUserProfile.name : authorName} initials={authorInitials} profileImageUrl={profileImageUrl} />
               </button>
            ) : (
               <SearchAvatar name={authorName} initials={authorInitials} />
            )}

            <div className="min-w-0 flex-1">
               <div className="flex flex-wrap items-center gap-2 text-sm">
                  {authorHandle ? (
                     <button type="button" onClick={() => onOpenProfile(authorHandle)} className="font-bold text-[#111827] transition hover:text-[#1E40AF] hover:underline focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20">
                        {authorName}
                     </button>
                  ) : (
                     <p className="font-bold text-[#111827]">{authorName}</p>
                  )}

                  {authorHandle && (
                     <>
                        <span className="text-[#5B6475]">·</span>

                        <button type="button" onClick={() => onOpenProfile(authorHandle)} className="font-medium text-[#5B6475] transition hover:text-[#1E40AF] hover:underline focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20">
                           {authorHandle}
                        </button>
                     </>
                  )}

                  <span className="text-[#5B6475]">·</span>

                  <p className="font-medium text-[#5B6475]">{post.team}</p>
               </div>

               <button
                  type="button"
                  onClick={() => onOpenPost(post.id)}
                  className="mt-3 block min-h-11 w-full break-words text-left text-lg font-black leading-7 sm:text-xl tracking-[-0.02em] text-[#111827] transition hover:text-[#1E40AF] hover:underline focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
               >
                  {post.take}
               </button>

               <button
                  type="button"
                  onClick={() => onOpenPost(post.id)}
                  className="mt-3 flex min-h-11 flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-[#5B6475] transition hover:text-[#1E40AF] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
               >
                  <span className="inline-flex items-center gap-1.5">
                     <Flame aria-hidden="true" className="h-4 w-4" />
                     {post.votes} reactions
                  </span>

                  <span className="inline-flex items-center gap-1.5">
                     <MessageCircle aria-hidden="true" className="h-4 w-4" />
                     {post.comments} comments
                  </span>
               </button>
            </div>
         </div>
      </article>
   );
}

function SearchAvatar({ name, initials, profileImageUrl }: { name: string; initials: string; profileImageUrl?: string }) {
   if (profileImageUrl) {
      return (
         <div className="relative h-10 w-10 overflow-hidden rounded-full bg-[#1E40AF]">
            <Image src={profileImageUrl} alt={`${name} profile`} fill sizes="40px" unoptimized className="object-cover" />
         </div>
      );
   }

   return (
      <div aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1E40AF] text-xs font-bold text-white">
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

function TeamResultRow({ team }: { team: SearchTeam }) {
   return (
      <article className="px-4 py-5 transition hover:bg-[#FFFCF6] sm:px-6 md:px-7">
         <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
               <p className="text-lg font-black uppercase leading-[1.05] tracking-[-0.01em] text-[#111827]">{team.name}</p>

               <p className="mt-1 text-sm font-medium text-[#5B6475]">{formatTeamMeta(team)}</p>
            </div>
         </div>
      </article>
   );
}

function StatusRow({ message }: { message: string }) {
   return <div className="px-4 py-5 text-sm leading-6 text-[#5B6475] sm:px-6 md:px-7">{message}</div>;
}

function formatTeamMeta(team: SearchTeam) {
   const values = [team.sport, team.league, team.abbreviation].filter((value): value is string => typeof value === "string" && value.length > 0 && value.toLowerCase() !== "null");

   const uniqueValues = values.filter((value, index, allValues) => allValues.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index);

   return uniqueValues.join(" · ");
}

function PersonResultRow({
   person,
   isFollowing,
   onToggleFollow,
   onOpenProfile,
   currentUserProfile,
}: {
   person: FrontOfficeProfile;
   isFollowing: boolean;
   onToggleFollow: (handle: string) => void;
   onOpenProfile: (handle: string) => void;
   currentUserProfile: FrontOfficeProfile;
}) {
   const overlappingFavoriteTeams = getOverlappingFavoriteTeams(person, currentUserProfile);

   return (
      <article className="flex flex-col gap-3 px-4 py-5 transition hover:bg-[#FFFCF6] sm:flex-row sm:px-6 md:px-7">
         <button
            type="button"
            onClick={() => onOpenProfile(person.handle)}
            aria-label={`Open ${person.name}'s profile`}
            className="min-h-11 min-w-11 shrink-0 rounded-full transition hover:ring-4 hover:ring-[#1E40AF]/20 focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30"
         >
            {person.profileImageUrl ? (
               <div className="relative h-10 w-10 overflow-hidden rounded-full bg-[#1E40AF]">
                  <Image src={person.profileImageUrl} alt={`${person.name} profile`} fill sizes="40px" unoptimized className="object-cover" />
               </div>
            ) : (
               <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1E40AF] text-white">
                  <UserRound aria-hidden="true" className="h-5 w-5" />
               </div>
            )}
         </button>

         <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
               <div className="min-w-0">
                  <button type="button" onClick={() => onOpenProfile(person.handle)} className="block text-left font-black text-[#111827] transition hover:text-[#1E40AF] hover:underline focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20">
                     {person.name}
                  </button>

                  <button
                     type="button"
                     onClick={() => onOpenProfile(person.handle)}
                     className="mt-1 block text-left text-sm font-medium text-[#5B6475] transition hover:text-[#1E40AF] hover:underline focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
                  >
                     {person.handle}
                  </button>
               </div>

               {!person.isCurrentUser && (
                  <button
                     type="button"
                     onClick={() => onToggleFollow(person.handle)}
                     aria-pressed={isFollowing}
                     className={`min-h-10 shrink-0 border px-4 text-xs font-black uppercase tracking-[0.1em] transition focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30 ${
                        isFollowing ? "border-[#111827] bg-white text-[#111827] hover:bg-[#FFF8EE]" : "border-[#1E40AF] bg-[#1E40AF] text-white hover:bg-[#173487]"
                     }`}
                  >
                     {isFollowing ? "Following" : "Follow"}
                  </button>
               )}
            </div>

            <p className="mt-2 text-sm leading-6 text-[#5B6475]">{person.bio}</p>

            {overlappingFavoriteTeams.length > 0 && <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-[#1E40AF]">Also follows {overlappingFavoriteTeams.join(", ")}</p>}
         </div>
      </article>
   );
}

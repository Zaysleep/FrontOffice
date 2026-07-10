"use client";

import type { BulletinData } from "@/lib/sports/types";

type MatchupStripProps = {
   teamName: string;
   bulletin: BulletinData | null;
   isLoading: boolean;
   error: string | null;
};

export default function MatchupStrip({ teamName, bulletin, isLoading, error }: MatchupStripProps) {
   const lastGame = bulletin?.lastGame;
   const nextGame = bulletin?.nextGame;
   const recentGameLabel = getRecentGameLabel(lastGame?.playedAt, bulletin?.seasonPhase);

   return (
      <section aria-label={`${teamName} recent result and next game`} className="overflow-hidden border border-[#111827] bg-white shadow-sm">
         <div className="grid md:grid-cols-2">
            <article className="border-b border-[#111827] p-4 sm:p-5 md:border-b-0 md:border-r md:p-6">
               <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C2410C]">{recentGameLabel}</p>

               {isLoading && !lastGame ? (
                  <LoadingState label="Checking the latest result..." />
               ) : lastGame ? (
                  <div className="mt-3">
                     <p className="text-sm font-bold text-[#5B6475]">vs. {lastGame.opponent}</p>

                     <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
                        {lastGame.score && <p className="text-3xl font-black tracking-[-0.04em] text-[#111827] sm:text-4xl">{lastGame.score}</p>}

                        {lastGame.result && <span className="border border-[#111827] bg-[#FFF8EE] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#111827]">{lastGame.result}</span>}
                     </div>

                     <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold text-[#5B6475]">
                        {lastGame.playedAt && <time dateTime={lastGame.playedAt}>{formatGameDate(lastGame.playedAt)}</time>}

                        {lastGame.competition && (
                           <>
                              {lastGame.playedAt && <span aria-hidden="true">·</span>}
                              <span>{lastGame.competition}</span>
                           </>
                        )}
                     </div>
                  </div>
               ) : (
                  <EmptyState>{bulletin?.seasonPhase === "Offseason" ? `No recent completed game is available for ${teamName}.` : `${teamName} has no recent completed game available right now.`}</EmptyState>
               )}
            </article>

            <article className="p-4 sm:p-5 md:p-6">
               <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1E40AF]">Next Up</p>

               {isLoading && !nextGame ? (
                  <LoadingState label="Checking the next matchup..." />
               ) : nextGame ? (
                  <div className="mt-3">
                     <p className="text-2xl font-black uppercase leading-tight tracking-[-0.03em] text-[#111827] sm:text-3xl">
                        {formatLocation(nextGame.location)} {nextGame.opponent}
                     </p>

                     <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm font-bold text-[#5B6475]">
                        {nextGame.scheduledAt && <time dateTime={nextGame.scheduledAt}>{formatNextGameDate(nextGame.scheduledAt)}</time>}

                        {nextGame.competition && (
                           <>
                              {nextGame.scheduledAt && <span aria-hidden="true">·</span>}
                              <span>{nextGame.competition}</span>
                           </>
                        )}
                     </div>
                  </div>
               ) : (
                  <EmptyState>No upcoming game is currently listed for {teamName}.</EmptyState>
               )}
            </article>
         </div>

         {error && !lastGame && !nextGame && <p className="border-t border-[#111827] bg-[#FFF8EE] px-4 py-3 text-xs leading-5 text-[#5B6475] sm:px-5">Game information is temporarily unavailable. The rest of your FrontOffice brief is still ready.</p>}
      </section>
   );
}

function LoadingState({ label }: { label: string }) {
   return <p className="mt-3 text-sm font-bold text-[#5B6475]">{label}</p>;
}

function EmptyState({ children }: { children: React.ReactNode }) {
   return <p className="mt-3 text-sm leading-6 text-[#5B6475]">{children}</p>;
}

function getRecentGameLabel(playedAt?: string, seasonPhase?: string) {
   if (seasonPhase === "Offseason") {
      return "Most Recent";
   }

   if (!playedAt) {
      return "Last Game";
   }

   const playedDate = new Date(playedAt);

   if (Number.isNaN(playedDate.getTime())) {
      return "Last Game";
   }

   const today = new Date();
   const yesterday = new Date();

   yesterday.setDate(today.getDate() - 1);

   const sameLocalDate = (first: Date, second: Date) => first.getFullYear() === second.getFullYear() && first.getMonth() === second.getMonth() && first.getDate() === second.getDate();

   if (sameLocalDate(playedDate, yesterday)) {
      return "Last Night";
   }

   return "Last Game";
}

function formatLocation(location?: "Home" | "Away" | "Neutral") {
   if (location === "Away") return "@";
   if (location === "Neutral") return "vs.";
   return "vs.";
}

function formatGameDate(value: string) {
   const date = new Date(value);

   if (Number.isNaN(date.getTime())) {
      return "";
   }

   return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
   }).format(date);
}

function formatNextGameDate(value: string) {
   const date = new Date(value);

   if (Number.isNaN(date.getTime())) {
      return "";
   }

   return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
   }).format(date);
}

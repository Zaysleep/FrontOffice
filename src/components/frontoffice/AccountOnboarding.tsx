"use client";

import { useMemo, useState } from "react";
import { Bell, Check, Search } from "lucide-react";
import { teamBriefs, type TeamBrief } from "@/data/frontofficeData";
import { supabase } from "@/lib/supabase/client";
import BrowserAlertsControl from "@/components/frontoffice/BrowserAlertsControl";

type AccountOnboardingProps = {
   onComplete: () => void;
};

const MAX_TEAMS = 5;

type SetupStep = "teams" | "alerts";

export default function AccountOnboarding({ onComplete }: AccountOnboardingProps) {
   const [query, setQuery] = useState("");
   const [selectedTeams, setSelectedTeams] = useState<TeamBrief[]>([]);
   const [isSaving, setIsSaving] = useState(false);
   const [message, setMessage] = useState("");
   const [setupStep, setSetupStep] = useState<SetupStep>("teams");

   const normalizedQuery = query.trim().toLowerCase();

   const filteredTeams = useMemo(() => {
      if (!normalizedQuery) {
         return teamBriefs;
      }

      return teamBriefs.filter((team) => team.team.toLowerCase().includes(normalizedQuery) || team.sport.toLowerCase().includes(normalizedQuery));
   }, [normalizedQuery]);

   function toggleTeam(team: TeamBrief) {
      setSelectedTeams((teams) => {
         const alreadySelected = teams.some((selectedTeam) => selectedTeam.team === team.team && selectedTeam.sport === team.sport);

         if (alreadySelected) {
            return teams.filter((selectedTeam) => !(selectedTeam.team === team.team && selectedTeam.sport === team.sport));
         }

         if (teams.length >= MAX_TEAMS) {
            return teams;
         }

         return [...teams, team];
      });
   }

   async function handleSaveTeams() {
      if (selectedTeams.length === 0) {
         setMessage("Choose at least one team.");
         return;
      }

      setIsSaving(true);
      setMessage("");

      const teamPayload = selectedTeams.map((team) => ({
         sport: team.sport,
         name: team.team,
      }));

      const { error } = await supabase.rpc("complete_team_onboarding", {
         selected_teams: teamPayload,
      });

      setIsSaving(false);

      if (error) {
         setMessage(error.message);
         return;
      }

      setSetupStep("alerts");
   }

   if (setupStep === "alerts") {
      return (
         <main className="min-h-screen bg-[#F6F7F8] px-3 py-4 text-[#111827] sm:px-6 sm:py-8">
            <div className="mx-auto max-w-3xl overflow-hidden border border-[#111827] bg-white">
               <header className="border-b border-[#111827] bg-[#FFF8EE] px-4 py-6 sm:px-7 sm:py-7">
                  <div className="flex h-11 w-11 items-center justify-center border border-[#111827] bg-white">
                     <Bell aria-hidden="true" className="h-5 w-5" />
                  </div>

                  <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-[#C2410C]">FrontOffice Setup · Step 2 of 2</p>

                  <h1 className="mt-2 text-3xl font-black uppercase tracking-[-0.035em] sm:text-4xl">Stay Close To The Conversation</h1>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5B6475] sm:text-base">Browser alerts are optional. Turn them on for this device to hear about receipt comments, replies, mentions, follows, and important discussion activity.</p>
               </header>

               <section className="p-4 sm:p-7">
                  <BrowserAlertsControl />

                  <p className="mt-4 text-sm leading-6 text-[#5B6475]">You can change browser alerts later from Account → Browser Alerts.</p>
               </section>

               <footer className="grid gap-3 border-t border-[#111827] bg-[#FFF8EE] px-4 py-4 sm:flex sm:items-center sm:justify-between sm:px-7">
                  <button
                     type="button"
                     onClick={onComplete}
                     className="min-h-12 border border-[#111827] bg-white px-5 text-xs font-black uppercase tracking-[0.12em] text-[#111827] transition hover:bg-[#F6F7F8] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
                  >
                     Maybe Later
                  </button>

                  <button
                     type="button"
                     onClick={onComplete}
                     className="min-h-12 border border-[#1E40AF] bg-[#1E40AF] px-6 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#173487] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30"
                  >
                     Enter FrontOffice
                  </button>
               </footer>
            </div>
         </main>
      );
   }

   return (
      <main className="min-h-screen bg-[#F6F7F8] px-3 py-4 text-[#111827] sm:px-6 sm:py-8">
         <div className="mx-auto max-w-6xl overflow-hidden border border-[#111827] bg-white">
            <header className="border-b border-[#111827] bg-[#FFF8EE] px-4 py-6 sm:px-7 lg:px-8">
               <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#C2410C]">FrontOffice Setup · Step 1 of 2</p>

               <h1 className="mt-2 text-3xl font-black uppercase tracking-[-0.035em] sm:text-4xl">Build Your Office</h1>

               <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5B6475] sm:text-base">Choose the teams you want FrontOffice to follow.</p>
            </header>

            <section className="p-4 sm:p-7">
               <div className="flex flex-col gap-3 border-b border-[#111827] pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                     <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#5B6475]">My Teams</p>

                     <h2 className="mt-1 text-2xl font-black uppercase tracking-[-0.025em]">Choose 1–5 Teams</h2>
                  </div>

                  <p className="text-sm font-black text-[#1E40AF]" aria-live="polite">
                     {selectedTeams.length}/{MAX_TEAMS}
                  </p>
               </div>

               <div className="relative mt-5">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6475]" />

                  <input
                     type="search"
                     value={query}
                     onChange={(event) => setQuery(event.target.value)}
                     placeholder="Search teams or sports"
                     aria-label="Search teams or sports"
                     className="min-h-12 w-full border border-[#111827] bg-white pl-10 pr-3 text-base outline-none focus:border-[#1E40AF] focus:ring-4 focus:ring-[#1E40AF]/10"
                  />
               </div>

               <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {filteredTeams.map((team) => {
                     const isSelected = selectedTeams.some((selectedTeam) => selectedTeam.team === team.team && selectedTeam.sport === team.sport);

                     const selectionDisabled = !isSelected && selectedTeams.length >= MAX_TEAMS;

                     return (
                        <button
                           key={`${team.sport}-${team.team}`}
                           type="button"
                           onClick={() => toggleTeam(team)}
                           disabled={selectionDisabled}
                           aria-pressed={isSelected}
                           className={`flex min-h-16 items-center justify-between gap-3 border px-4 py-3 text-left transition focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20 disabled:cursor-not-allowed disabled:opacity-45 ${
                              isSelected ? "border-[#1E40AF] bg-[#FFF8EE]" : "border-[#111827] bg-white hover:bg-[#F6F7F8]"
                           }`}
                        >
                           <span>
                              <span className="block text-sm font-black tracking-[-0.01em]">{team.team}</span>

                              <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#5B6475]">{team.sport}</span>
                           </span>

                           <span className={`flex h-6 w-6 shrink-0 items-center justify-center border ${isSelected ? "border-[#1E40AF] bg-[#1E40AF] text-white" : "border-[#111827] bg-white text-transparent"}`}>
                              <Check aria-hidden="true" className="h-4 w-4" />
                           </span>
                        </button>
                     );
                  })}
               </div>
            </section>

            <footer className="flex flex-col gap-4 border-t border-[#111827] bg-[#FFF8EE] px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-8">
               <div>
                  {message && (
                     <p role="status" aria-live="polite" className="text-sm font-bold text-[#C2410C]">
                        {message}
                     </p>
                  )}
               </div>

               <button
                  type="button"
                  onClick={() => {
                     void handleSaveTeams();
                  }}
                  disabled={isSaving}
                  className="min-h-12 w-full border border-[#1E40AF] bg-[#1E40AF] px-6 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#173487] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
               >
                  {isSaving ? "Saving Teams..." : "Continue"}
               </button>
            </footer>
         </div>
      </main>
   );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Menu, Search, X } from "lucide-react";
import { type TeamBrief } from "@/data/frontofficeData";

/**
 * TeamManagerSwitcher
 *
 * My Teams utility control.
 *
 * Normal use:
 * - Show only the teams the user selected
 * - Switch directly between those teams
 *
 * Edit mode:
 * - Search the full team directory
 * - Select up to five teams
 * - Save the list back to the user profile
 */

type TeamManagerSwitcherProps = {
   selectedTeam: string;
   myTeams: TeamBrief[];
   availableTeams: TeamBrief[];
   onTeamChange: (team: string) => void;
   onSaveMyTeams: (teams: string[]) => void;
};

const MAX_MY_TEAMS = 5;

export default function TeamManagerSwitcher({ selectedTeam, myTeams, availableTeams, onTeamChange, onSaveMyTeams }: TeamManagerSwitcherProps) {
   const [isOpen, setIsOpen] = useState(false);
   const [isEditing, setIsEditing] = useState(false);
   const [teamSearch, setTeamSearch] = useState("");
   const [draftTeams, setDraftTeams] = useState<string[]>(myTeams.map((team) => team.team));

   const switcherRef = useRef<HTMLDivElement | null>(null);
   const triggerRef = useRef<HTMLButtonElement | null>(null);

   useEffect(() => {
      if (!isOpen) {
         return;
      }

      function closeSwitcher({ restoreFocus = false } = {}) {
         setIsOpen(false);
         setIsEditing(false);
         setTeamSearch("");

         if (restoreFocus) {
            window.requestAnimationFrame(() => {
               triggerRef.current?.focus();
            });
         }
      }

      function handlePointerDown(event: PointerEvent) {
         if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
            closeSwitcher();
         }
      }

      function handleKeyDown(event: KeyboardEvent) {
         if (event.key === "Escape") {
            event.preventDefault();
            closeSwitcher({ restoreFocus: true });
         }
      }

      document.addEventListener("pointerdown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);

      return () => {
         document.removeEventListener("pointerdown", handlePointerDown);
         document.removeEventListener("keydown", handleKeyDown);
      };
   }, [isOpen]);

   const normalizedSearch = teamSearch.trim().toLowerCase();

   const filteredTeams = useMemo(() => {
      if (!normalizedSearch) {
         return availableTeams;
      }

      return availableTeams.filter((brief) => brief.team.toLowerCase().includes(normalizedSearch) || brief.sport.toLowerCase().includes(normalizedSearch));
   }, [availableTeams, normalizedSearch]);

   function openSwitcher() {
      setDraftTeams(myTeams.map((team) => team.team));
      setIsOpen((value) => !value);
      setIsEditing(false);
      setTeamSearch("");
   }

   function handleTeamSelect(team: string) {
      onTeamChange(team);
      setIsOpen(false);
      setIsEditing(false);
      setTeamSearch("");
   }

   function openEditor() {
      setDraftTeams(myTeams.map((team) => team.team));
      setTeamSearch("");
      setIsEditing(true);
   }

   function toggleDraftTeam(team: string) {
      setDraftTeams((teams) => {
         if (teams.includes(team)) {
            if (teams.length === 1) {
               return teams;
            }

            return teams.filter((selectedTeam) => selectedTeam !== team);
         }

         if (teams.length >= MAX_MY_TEAMS) {
            return teams;
         }

         return [...teams, team];
      });
   }

   function saveMyTeams() {
      onSaveMyTeams(draftTeams);
      setIsEditing(false);
      setTeamSearch("");
   }

   function closeEditor() {
      setDraftTeams(myTeams.map((team) => team.team));
      setTeamSearch("");
      setIsEditing(false);
   }

   return (
      <div ref={switcherRef} className="relative">
         <button
            ref={triggerRef}
            type="button"
            onClick={openSwitcher}
            className="flex min-h-12 w-full min-w-0 items-center gap-3 border-b border-transparent px-0 text-left transition hover:border-[#111827] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20 sm:w-auto sm:min-w-[260px]"
            aria-expanded={isOpen}
            aria-label="Open My Teams"
         >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#111827] bg-white">{isOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}</span>

            <div className="min-w-0">
               <p className="text-xs font-black uppercase tracking-[0.18em] text-[#5B6475]">Managing</p>

               <p className="mt-1 max-w-[220px] truncate text-sm font-black uppercase tracking-[0.04em] text-[#111827]">{selectedTeam}</p>
            </div>
         </button>

         {isOpen && (
            <div className="fixed inset-x-3 top-[4.75rem] z-50 max-h-[calc(100dvh-6rem)] overflow-y-auto border border-[#111827] bg-white shadow-xl sm:absolute sm:inset-x-auto sm:left-0 sm:top-[58px] sm:w-[min(92vw,420px)] sm:max-h-[min(42rem,calc(100dvh-6rem))]">
               {!isEditing ? (
                  <>
                     <div className="border-b border-[#111827] bg-[#FFF8EE] px-5 py-4">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C2410C]">My Teams</p>

                        <h3 className="mt-1 text-xl font-black uppercase tracking-[-0.02em] text-[#111827]">Choose Your Office</h3>
                     </div>

                     <div className="divide-y divide-[#111827]">
                        {myTeams.map((brief, index) => (
                           <button
                              key={`${brief.sport}-${brief.team}`}
                              type="button"
                              onClick={() => handleTeamSelect(brief.team)}
                              className={`grid min-h-14 w-full grid-cols-[34px_1fr_auto] items-center gap-3 px-4 py-3 text-left transition focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#1E40AF]/20 ${
                                 selectedTeam === brief.team ? "bg-[#111827] text-white" : "bg-white text-[#111827] hover:bg-[#FFF8EE]"
                              }`}
                           >
                              <span className={`text-xs font-black tracking-[0.14em] ${selectedTeam === brief.team ? "text-white/70" : "text-[#C2410C]"}`}>{String(index + 1).padStart(2, "0")}</span>

                              <span className="min-w-0">
                                 <span className="block truncate text-sm font-black uppercase tracking-[0.04em]">{brief.team}</span>

                                 <span className={`mt-1 block text-xs font-bold uppercase tracking-[0.1em] ${selectedTeam === brief.team ? "text-white/70" : "text-[#5B6475]"}`}>{brief.sport}</span>
                              </span>

                              {selectedTeam === brief.team && <Check aria-hidden="true" className="h-4 w-4" />}
                           </button>
                        ))}
                     </div>

                     <button
                        type="button"
                        onClick={openEditor}
                        className="min-h-12 w-full border-t border-[#111827] bg-[#FFF8EE] px-5 text-left text-xs font-black uppercase tracking-[0.14em] text-[#1E40AF] transition hover:bg-white focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#1E40AF]/20"
                     >
                        Edit My Teams
                     </button>
                  </>
               ) : (
                  <>
                     <div className="border-b border-[#111827] bg-[#FFF8EE] px-5 py-4">
                        <div className="flex items-start justify-between gap-4">
                           <div>
                              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C2410C]">My Teams</p>

                              <h3 className="mt-1 text-xl font-black uppercase tracking-[-0.02em] text-[#111827]">Edit My Teams</h3>

                              <p className="mt-2 text-sm font-bold text-[#5B6475]">
                                 {draftTeams.length}/{MAX_MY_TEAMS} selected
                              </p>
                           </div>

                           <button
                              type="button"
                              onClick={closeEditor}
                              aria-label="Close My Teams editor"
                              className="flex h-11 w-11 items-center justify-center border border-[#111827] bg-white text-[#111827] transition hover:bg-[#F6F7F8] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
                           >
                              <X aria-hidden="true" className="h-4 w-4" />
                           </button>
                        </div>
                     </div>

                     <div className="border-b border-[#111827] px-4 py-3">
                        <label className="block">
                           <span className="text-xs font-black uppercase tracking-[0.16em] text-[#5B6475]">Search Teams</span>

                           <div className="mt-2 flex min-h-11 items-center gap-3 border-b border-[#111827] focus-within:border-[#1E40AF]">
                              <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-[#5B6475]" />

                              <input
                                 value={teamSearch}
                                 onChange={(event) => setTeamSearch(event.target.value)}
                                 placeholder="Search team or sport..."
                                 aria-label="Search team or sport"
                                 className="min-h-10 w-full bg-transparent text-sm font-medium text-[#111827] outline-none placeholder:text-[#8A93A3]"
                              />
                           </div>
                        </label>
                     </div>

                     <div className="max-h-[min(360px,42dvh)] divide-y divide-[#111827] overflow-y-auto overscroll-contain">
                        {filteredTeams.map((brief) => {
                           const isSelected = draftTeams.includes(brief.team);
                           const selectionDisabled = !isSelected && draftTeams.length >= MAX_MY_TEAMS;

                           return (
                              <button
                                 key={`${brief.sport}-${brief.team}`}
                                 type="button"
                                 disabled={selectionDisabled}
                                 onClick={() => toggleDraftTeam(brief.team)}
                                 className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-[#FFF8EE] focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#1E40AF]/20 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                 <span className="min-w-0">
                                    <span className="block truncate text-sm font-black uppercase tracking-[0.04em] text-[#111827]">{brief.team}</span>

                                    <span className="mt-1 block text-xs font-bold uppercase tracking-[0.1em] text-[#5B6475]">{brief.sport}</span>
                                 </span>

                                 <span className={`flex h-6 w-6 shrink-0 items-center justify-center border ${isSelected ? "border-[#1E40AF] bg-[#1E40AF] text-white" : "border-[#111827] bg-white text-transparent"}`}>
                                    <Check aria-hidden="true" className="h-4 w-4" />
                                 </span>
                              </button>
                           );
                        })}
                     </div>

                     <div className="grid grid-cols-2 border-t border-[#111827]">
                        <button
                           type="button"
                           onClick={closeEditor}
                           className="min-h-12 border-r border-[#111827] bg-white px-4 text-xs font-black uppercase tracking-[0.12em] text-[#111827] transition hover:bg-[#F6F7F8] focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#1E40AF]/20"
                        >
                           Cancel
                        </button>

                        <button
                           type="button"
                           onClick={saveMyTeams}
                           className="min-h-12 bg-[#1E40AF] px-4 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#173487] focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#1E40AF]/20"
                        >
                           Save My Teams
                        </button>
                     </div>
                  </>
               )}
            </div>
         )}
      </div>
   );
}

"use client";

import { Newspaper, ReceiptText, UsersRound } from "lucide-react";
import type { TeamBrief } from "@/data/frontofficeData";
import OnboardingReceiptPrimer from "@/components/frontoffice/OnboardingReceiptPrimer";
import OnboardingSuggestedOffices from "@/components/frontoffice/OnboardingSuggestedOffices";
import OnboardingActiveDiscussions from "@/components/frontoffice/OnboardingActiveDiscussions";
import OnboardingFirstDayActions from "@/components/frontoffice/OnboardingFirstDayActions";
import OnboardingWelcomeNotice from "@/components/frontoffice/OnboardingWelcomeNotice";

type OnboardingWelcomeProps = {
   selectedTeams: TeamBrief[];
   onEnterFrontOffice: () => void;
};

export default function OnboardingWelcome({ selectedTeams, onEnterFrontOffice }: OnboardingWelcomeProps) {
   const visibleTeams = selectedTeams.slice(0, 3);

   return (
      <main className="min-h-screen bg-[#F6F7F8] px-3 py-4 text-[#111827] sm:px-6 sm:py-8">
         <div className="mx-auto max-w-6xl overflow-hidden border border-[#111827] bg-white">
            <header className="border-b border-[#111827] bg-[#FFF8EE] px-4 py-6 sm:px-7 lg:px-8">
               <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#C2410C]">FrontOffice Setup · Step 3 of 3</p>

               <h1 className="mt-2 text-3xl font-black uppercase tracking-[-0.035em] sm:text-5xl">Your Office Is Open</h1>

               <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5B6475] sm:text-base">Your teams are in place. Meet a few offices, see what the War Room is talking about, and make your first call.</p>

               {visibleTeams.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                     {visibleTeams.map((team) => (
                        <span key={`${team.sport}-${team.team}`} className="border border-[#111827] bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.08em]">
                           {team.team}
                        </span>
                     ))}

                     {selectedTeams.length > visibleTeams.length && <span className="border border-[#111827] bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-[#5B6475]">+{selectedTeams.length - visibleTeams.length} more</span>}
                  </div>
               )}
            </header>

            <section className="grid gap-px bg-[#111827] sm:grid-cols-3">
               <WelcomeStep icon={Newspaper} step="01" title="Check The Report" body="See what matters around your teams before you make the call." />

               <WelcomeStep icon={UsersRound} step="02" title="Find Your People" body="Follow a few offices and start building a feed that feels like yours." />

               <WelcomeStep icon={ReceiptText} step="03" title="Make Your First Call" body="Post what you believe now. FrontOffice will keep the receipt." />
            </section>

            <section className="space-y-6 p-4 sm:p-7 lg:p-8">
               <OnboardingWelcomeNotice />

               <OnboardingFirstDayActions onComplete={onEnterFrontOffice} />

               <div className="grid gap-6 lg:grid-cols-2">
                  <OnboardingSuggestedOffices favoriteTeams={selectedTeams.map((team) => team.team)} />

                  <OnboardingActiveDiscussions favoriteTeams={selectedTeams.map((team) => team.team)} />
               </div>
            </section>

            <section className="border-t border-[#111827] p-4 sm:p-7 lg:p-8">
               <OnboardingReceiptPrimer />
            </section>

            <footer className="border-t border-[#111827] bg-[#FFF8EE] px-4 py-5 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:px-7 lg:px-8">
               <div className="text-center sm:text-left">
                  <p className="text-sm font-bold leading-6 text-[#111827]">Pick your first move above, or continue straight into your FrontOffice.</p>

                  <p className="mt-1 text-sm leading-6 text-[#5B6475]">You can follow people, make a call, or enter the War Room anytime.</p>
               </div>

               <button
                  type="button"
                  onClick={() => {
                     onEnterFrontOffice();

                     window.setTimeout(() => {
                        window.location.assign("/?section=front-office");
                     }, 50);
                  }}
                  className="mt-4 min-h-12 w-full border border-[#1E40AF] bg-[#1E40AF] px-6 text-xs font-black uppercase tracking-[0.12em] text-white transition hover:bg-[#173487] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30 sm:mt-0 sm:w-auto"
               >
                  Continue To FrontOffice
               </button>
            </footer>
         </div>
      </main>
   );
}

function WelcomeStep({ icon: Icon, step, title, body }: { icon: typeof Newspaper; step: string; title: string; body: string }) {
   return (
      <article className="bg-white p-5 sm:p-6">
         <div className="flex items-center justify-between">
            <div className="flex h-11 w-11 items-center justify-center border border-[#111827] bg-[#FFF8EE]">
               <Icon aria-hidden="true" className="h-5 w-5" />
            </div>

            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C2410C]">{step}</span>
         </div>

         <h2 className="mt-5 text-xl font-black uppercase tracking-[-0.025em]">{title}</h2>

         <p className="mt-2 text-sm leading-6 text-[#5B6475]">{body}</p>
      </article>
   );
}

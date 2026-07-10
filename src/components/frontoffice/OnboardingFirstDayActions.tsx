"use client";

import { ClipboardList, MessageSquareText, Newspaper } from "lucide-react";

type OnboardingFirstDayActionsProps = {
   onComplete: () => void;
};

type FirstDayDestination = "front-office" | "make-the-call" | "war-room";

const FIRST_DAY_STARTED_KEY = "frontoffice_first_day_started";

export default function OnboardingFirstDayActions({ onComplete }: OnboardingFirstDayActionsProps) {
   function openDestination(destination: FirstDayDestination) {
      window.localStorage.setItem(FIRST_DAY_STARTED_KEY, new Date().toISOString());

      onComplete();

      window.setTimeout(() => {
         window.location.assign(`/?section=${destination}`);
      }, 50);
   }

   return (
      <section aria-labelledby="first-day-actions-heading" className="border border-[#111827] bg-white">
         <header className="border-b border-[#111827] bg-[#FFF8EE] px-4 py-4 sm:px-5">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#C2410C]">Start Here</p>

            <h2 id="first-day-actions-heading" className="mt-1 text-xl font-black uppercase tracking-[-0.025em]">
               Pick Your First Move
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#5B6475]">There is no wrong first move. Except running your office like the Padres.</p>
         </header>

         <div className="grid gap-px bg-[#111827] sm:grid-cols-3">
            <ActionButton icon={Newspaper} eyebrow="Read" title="Check The Report" body="See what matters around your teams first." onClick={() => openDestination("front-office")} />

            <ActionButton icon={ClipboardList} eyebrow="Post" title="Make Your First Call" body="Put a take on the record and start your receipt history." onClick={() => openDestination("make-the-call")} />

            <ActionButton icon={MessageSquareText} eyebrow="Debate" title="Enter The War Room" body="See the latest discussion and join the conversation." onClick={() => openDestination("war-room")} />
         </div>
      </section>
   );
}

function ActionButton({ icon: Icon, eyebrow, title, body, onClick }: { icon: typeof Newspaper; eyebrow: string; title: string; body: string; onClick: () => void }) {
   return (
      <button type="button" onClick={onClick} className="group bg-white p-5 text-left transition hover:bg-[#FFF8EE] focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#1E40AF]/20">
         <div className="flex h-11 w-11 items-center justify-center border border-[#111827] bg-[#FFF8EE] transition group-hover:bg-white">
            <Icon aria-hidden="true" className="h-5 w-5" />
         </div>

         <p className="mt-4 text-[10px] font-black uppercase tracking-[0.16em] text-[#C2410C]">{eyebrow}</p>

         <h3 className="mt-1 text-lg font-black uppercase tracking-[-0.02em] text-[#111827]">{title}</h3>

         <p className="mt-2 text-sm leading-6 text-[#5B6475]">{body}</p>
      </button>
   );
}

"use client";

import { BellRing } from "lucide-react";

export default function OnboardingWelcomeNotice() {
   return (
      <section
         aria-label="FrontOffice welcome message"
         className="border border-[#111827] bg-[#1E40AF] px-5 py-5 text-white sm:px-6"
      >
         <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-white/70 bg-white/10">
               <BellRing
                  aria-hidden="true"
                  className="h-5 w-5"
               />
            </div>

            <div>
               <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#FFF8EE]">
                  FrontOffice Welcome Desk
               </p>

               <h2 className="mt-1 text-xl font-black uppercase tracking-[-0.025em]">
                  Your Office Is Officially Open
               </h2>

               <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">
                  Follow a few people, check the room, and make your first call. We hope your tenure goes better than the Padres season.
               </p>
            </div>
         </div>
      </section>
   );
}

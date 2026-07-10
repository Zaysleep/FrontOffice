"use client";

import { ReceiptText } from "lucide-react";

export default function OnboardingReceiptPrimer() {
   return (
      <section
         aria-labelledby="receipt-primer-heading"
         className="border border-[#111827] bg-[#FFF8EE]"
      >
         <div className="grid gap-0 sm:grid-cols-[auto_1fr]">
            <div className="flex items-center justify-center border-b border-[#111827] p-5 sm:border-b-0 sm:border-r sm:p-6">
               <div className="flex h-14 w-14 items-center justify-center border border-[#111827] bg-white">
                  <ReceiptText aria-hidden="true" className="h-6 w-6" />
               </div>
            </div>

            <div className="p-5 sm:p-6">
               <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C2410C]">
                  How Receipts Work
               </p>

               <h2
                  id="receipt-primer-heading"
                  className="mt-2 text-2xl font-black uppercase tracking-[-0.03em]"
               >
                  Say It Now. Revisit It Later.
               </h2>

               <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5B6475] sm:text-base">
                  Every call you make becomes part of your receipt history. Time will decide whether you cooked or got cooked.
               </p>
            </div>
         </div>
      </section>
   );
}

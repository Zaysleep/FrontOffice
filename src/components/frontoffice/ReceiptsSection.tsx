"use client";

import type { Receipt } from "@/data/frontofficeData";

/**
 * ReceiptsSection
 *
 * MK II Build 3A:
 * - Uses the new six-status receipt lifecycle.
 * - Keeps status styling type-safe with Receipt["status"].
 * - Avoids stale mappings from the previous receipt vocabulary.
 */
export default function ReceiptsSection({ receipts }: { receipts: Receipt[] }) {
   return (
      <section aria-labelledby="receipts-heading" className="space-y-5">
         <header className="border border-[#111827] bg-white p-5 shadow-sm sm:p-6">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#C2410C]">Receipts</p>

            <h3 id="receipts-heading" className="mt-2 text-2xl font-black uppercase tracking-[-0.03em] text-[#111827] sm:text-3xl">
               Your Calls Are On The Record
            </h3>

            <p className="mt-3 max-w-3xl text-base leading-7 text-[#5B6475]">Track how every call is aging, from an open question to a legendary receipt.</p>
         </header>

         <div className="grid gap-4 lg:grid-cols-3">
            {receipts.map((receipt) => (
               <article key={receipt.id} className="border border-[#111827] bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                     <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-[#5B6475]">{receipt.type}</p>

                        <h4 className="mt-1 truncate text-lg font-black text-[#111827]">{receipt.team}</h4>
                     </div>

                     <ReceiptStatusBadge status={receipt.status} />
                  </div>

                  <p className="mt-4 text-base font-bold leading-7 text-[#111827]">{receipt.call}</p>

                  <div className="mt-5 border-t border-[#E7DCCB] pt-4">
                     <p className="text-xs font-black uppercase tracking-[0.12em] text-[#5B6475]">Top Reaction</p>

                     <p className="mt-1 font-black text-[#111827]">{receipt.reaction}</p>
                  </div>
               </article>
            ))}
         </div>
      </section>
   );
}

/**
 * ReceiptStatusBadge
 *
 * The map is explicitly keyed by Receipt["status"], so TypeScript
 * guarantees that every supported status has a visual treatment.
 */
function ReceiptStatusBadge({ status }: { status: Receipt["status"] }) {
   const toneClasses: Record<Receipt["status"], string> = {
      Open: "border-[#CA8A04]/40 bg-[#CA8A04]/10 text-[#713F12]",
      "Looking Good": "border-[#15803D]/30 bg-[#15803D]/10 text-[#14532D]",
      "On the Ropes": "border-[#C2410C]/30 bg-[#C2410C]/10 text-[#9A3412]",
      "Cold Take": "border-[#B91C1C]/30 bg-[#B91C1C]/10 text-[#7F1D1D]",
      "Called It": "border-[#1E40AF]/30 bg-[#1E40AF]/10 text-[#1E3A8A]",
      Legendary: "border-[#111827] bg-[#111827] text-white",
   };

   return <span className={`inline-flex shrink-0 border px-3 py-1 text-xs font-black uppercase tracking-[0.08em] ${toneClasses[status]}`}>{status}</span>;
}

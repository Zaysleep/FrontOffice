import { type Receipt } from "@/data/frontofficeData";

/**
 * ReceiptsSection
 *
 * This is the memory/reputation layer of FrontOffice.
 * It shows the calls users have put on record so they can track
 * whether those takes aged well, aged badly, or are still pending.
 *
 * For now, receipts are powered by local state from page.tsx.
 * Later, this can connect to user accounts and a database so receipts
 * persist across devices and sessions.
 */

type ReceiptsSectionProps = {
   receipts: Receipt[];
};

export default function ReceiptsSection({ receipts }: ReceiptsSectionProps) {
   return (
      <section aria-labelledby="receipts-heading" className="space-y-5">
         <div className="rounded-3xl border border-[#E7DCCB] bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-[#C2410C]">Receipts</p>
            <h3 id="receipts-heading" className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
               Your takes are on record now.
            </h3>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#5B6475]">Track whether your calls aged like wine, aged like milk, or still need more time in the group chat.</p>
         </div>

         <div className="grid gap-4 lg:grid-cols-3">
            {receipts.map((receipt) => (
               <ReceiptCard key={receipt.id} receipt={receipt} />
            ))}
         </div>
      </section>
   );
}

/**
 * ReceiptCard
 *
 * Displays one saved take.
 * The status badge uses both text and color so the meaning is not color-only.
 */
function ReceiptCard({ receipt }: { receipt: Receipt }) {
   return (
      <article className="rounded-3xl border border-[#E7DCCB] bg-white p-5 shadow-sm">
         <div className="flex items-start justify-between gap-3">
            <div>
               <p className="text-sm font-medium text-[#5B6475]">{receipt.type}</p>
               <h4 className="mt-1 text-lg font-bold">{receipt.team}</h4>
            </div>

            <ReceiptStatusBadge status={receipt.status} />
         </div>

         <p className="mt-4 text-base leading-7 text-[#111827]">{receipt.call}</p>

         <div className="mt-5 rounded-2xl bg-[#FFF8EE] p-4">
            <p className="text-sm font-medium text-[#5B6475]">Top reaction</p>
            <p className="mt-1 font-bold">{receipt.reaction}</p>
         </div>
      </article>
   );
}

/**
 * ReceiptStatusBadge
 *
 * Converts receipt status into a visual badge.
 * The status text is always shown directly for accessibility.
 */
function ReceiptStatusBadge({ status }: { status: Receipt["status"] }) {
   const toneClasses = {
      Pending: "border-[#CA8A04]/30 bg-[#CA8A04]/15 text-[#713F12]",
      "Still Cooking": "border-[#CA8A04]/30 bg-[#CA8A04]/15 text-[#713F12]",
      "Called It": "border-[#15803D]/30 bg-[#15803D]/10 text-[#14532D]",
      "Aged Like Wine": "border-[#15803D]/30 bg-[#15803D]/10 text-[#14532D]",
      "Aged Like Milk": "border-[#B91C1C]/30 bg-[#B91C1C]/10 text-[#7F1D1D]",
   };

   return <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-bold ${toneClasses[status]}`}>{status}</span>;
}

"use client";

import { useState } from "react";

import type { Receipt } from "@/data/frontofficeData";

/**
 * ReceiptWithRevisit
 *
 * `lastRevisitedAt` is populated from the existing receipts.updated_at
 * column. This lets FrontOffice remember the last review without adding
 * another database column or migration.
 */
export type ReceiptWithRevisit = Receipt & {
   lastRevisitedAt?: string | null;
};

/**
 * Resurfacing milestones and cooldowns.
 *
 * A receipt becomes more important as it ages, but FrontOffice still
 * avoids showing the same call every time the user opens the app.
 */
const RESURFACE_RULES = {
   light: {
      minimumAgeDays: 7,
      cooldownDays: 7,
      label: "7-Day Check-In",
   },
   strong: {
      minimumAgeDays: 30,
      cooldownDays: 14,
      label: "30-Day Review",
   },
   priority: {
      minimumAgeDays: 90,
      cooldownDays: 30,
      label: "90-Day File",
   },
} as const;

const ACTIVE_RECEIPT_STATUSES: Receipt["status"][] = ["Open", "Looking Good", "On the Ropes"];

export type ResurfacingTier = keyof typeof RESURFACE_RULES;

export type ResurfacedReceipt = {
   receipt: ReceiptWithRevisit;
   ageInDays: number;
   daysSinceReview: number;
   tier: ResurfacingTier;

   /**
    * Keep milestoneLabel tied to the exact labels in RESURFACE_RULES.
    * This preserves the literal union TypeScript infers from `as const`
    * and keeps the type predicate valid.
    */
   milestoneLabel: (typeof RESURFACE_RULES)[ResurfacingTier]["label"];
};

function getAgeInDays(dateValue: string | null | undefined, now: Date) {
   if (!dateValue) {
      return 0;
   }

   const date = new Date(dateValue);

   if (Number.isNaN(date.getTime())) {
      return 0;
   }

   const millisecondsPerDay = 1000 * 60 * 60 * 24;

   return Math.max(Math.floor((now.getTime() - date.getTime()) / millisecondsPerDay), 0);
}

/**
 * Returns the milestone tier based on the total age of the call.
 */
function getTier(ageInDays: number): ResurfacingTier | null {
   if (ageInDays >= RESURFACE_RULES.priority.minimumAgeDays) {
      return "priority";
   }

   if (ageInDays >= RESURFACE_RULES.strong.minimumAgeDays) {
      return "strong";
   }

   if (ageInDays >= RESURFACE_RULES.light.minimumAgeDays) {
      return "light";
   }

   return null;
}

/**
 * Picks one active receipt for the Front Office daily brief.
 *
 * Combined Build 3B + 3C rules:
 * - Only active statuses can resurface.
 * - First review begins after seven days.
 * - Older receipts receive stronger milestone treatment.
 * - A recent review starts a cooldown before the same call returns.
 * - The oldest eligible receipt wins.
 */
export function selectReceiptForResurfacing(receipts: ReceiptWithRevisit[], now = new Date()): ResurfacedReceipt | null {
   const eligibleReceipts = receipts
      .filter((receipt) => ACTIVE_RECEIPT_STATUSES.includes(receipt.status))
      .map((receipt) => {
         const ageInDays = getAgeInDays(receipt.createdAt, now);

         const tier = getTier(ageInDays);

         if (!tier) {
            return null;
         }

         const reviewDate = receipt.lastRevisitedAt ?? receipt.createdAt;

         const daysSinceReview = getAgeInDays(reviewDate, now);

         const rule = RESURFACE_RULES[tier];

         if (daysSinceReview < rule.cooldownDays) {
            return null;
         }

         return {
            receipt,
            ageInDays,
            daysSinceReview,
            tier,
            milestoneLabel: rule.label,
         };
      })
      .filter((item): item is ResurfacedReceipt => item !== null)
      .sort((first, second) => second.ageInDays - first.ageInDays);

   return eligibleReceipts[0] ?? null;
}

type ResurfacedReceiptCardProps = {
   resurfacedReceipt: ResurfacedReceipt;
   postId?: number;
   onOpenDiscussion?: (postId: number) => void;
   onStandByIt?: (receiptId: number) => void | Promise<void>;
   onUpdateStatus?: (receiptId: number, status: Receipt["status"]) => void | Promise<void>;
};

/**
 * ResurfacedReceiptCard
 *
 * The card keeps the original take unchanged while giving the user
 * quick FrontOffice actions to reaffirm or reassess the call.
 */
export default function ResurfacedReceiptCard({ resurfacedReceipt, postId, onOpenDiscussion, onStandByIt, onUpdateStatus }: ResurfacedReceiptCardProps) {
   const [isSaving, setIsSaving] = useState(false);

   const { receipt, ageInDays, tier, milestoneLabel } = resurfacedReceipt;

   const timingCopy =
      tier === "priority" ? `This call has been on the board for ${ageInDays} days. Time to open the file.` : tier === "strong" ? `You made this call ${ageInDays} days ago. The board wants an update.` : `This call has had ${ageInDays} days to breathe.`;

   async function runAction(action: () => void | Promise<void>) {
      try {
         setIsSaving(true);
         await action();
      } finally {
         setIsSaving(false);
      }
   }

   return (
      <article aria-labelledby={`resurfaced-receipt-${receipt.id}`} className="overflow-hidden border border-[#111827] bg-[#FFF8EE] shadow-sm">
         <div className="border-b border-[#111827] px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
               <div className="flex flex-wrap items-center gap-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#C2410C]">The Board Remembers</p>

                  <span className="border border-[#111827] bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#111827]">{milestoneLabel}</span>
               </div>

               <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#5B6475]">{receipt.status}</span>
            </div>
         </div>

         <div className="grid gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
            <div>
               <p className="text-sm font-bold text-[#5B6475]">{timingCopy}</p>

               <h3 id={`resurfaced-receipt-${receipt.id}`} className="mt-3 max-w-4xl text-2xl font-black leading-tight tracking-[-0.025em] text-[#111827] sm:text-3xl">
                  “{receipt.call}”
               </h3>

               <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-black uppercase tracking-[0.12em]">
                  <span className="text-[#1E40AF]">{receipt.team}</span>

                  <span className="text-[#5B6475]">{receipt.type}</span>
               </div>

               <p className="mt-4 text-base font-black text-[#111827]">Still standing by it?</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
               {onStandByIt && (
                  <button
                     type="button"
                     disabled={isSaving}
                     onClick={() => void runAction(() => onStandByIt(receipt.id))}
                     className="min-h-11 border border-[#111827] bg-[#111827] px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#1E40AF] disabled:cursor-wait disabled:opacity-60"
                  >
                     Stand By It
                  </button>
               )}

               {onUpdateStatus && (
                  <>
                     <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void runAction(() => onUpdateStatus(receipt.id, "Looking Good"))}
                        className="min-h-11 border border-[#111827] bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-[#111827] transition hover:bg-[#FFF8EE] disabled:cursor-wait disabled:opacity-60"
                     >
                        Looking Good
                     </button>

                     <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void runAction(() => onUpdateStatus(receipt.id, "On the Ropes"))}
                        className="min-h-11 border border-[#111827] bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-[#111827] transition hover:bg-[#FFF8EE] disabled:cursor-wait disabled:opacity-60"
                     >
                        On the Ropes
                     </button>
                  </>
               )}

               {postId && onOpenDiscussion && (
                  <button
                     type="button"
                     disabled={isSaving}
                     onClick={() => onOpenDiscussion(postId)}
                     className="min-h-11 border border-[#1E40AF] bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.1em] text-[#1E40AF] transition hover:bg-[#1E40AF] hover:text-white disabled:opacity-60"
                  >
                     Open Discussion
                  </button>
               )}
            </div>
         </div>
      </article>
   );
}

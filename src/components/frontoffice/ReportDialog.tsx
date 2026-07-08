"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Flag, X } from "lucide-react";

export type ReportReason = "hate_or_abusive_content" | "harassment" | "spam" | "impersonation" | "violence_or_threats" | "sexual_content" | "other";

const REPORT_REASONS: Array<{
   value: ReportReason;
   label: string;
}> = [
   { value: "hate_or_abusive_content", label: "Hate or abusive content" },
   { value: "harassment", label: "Harassment" },
   { value: "spam", label: "Spam" },
   { value: "impersonation", label: "Impersonation" },
   { value: "violence_or_threats", label: "Violence or threats" },
   { value: "sexual_content", label: "Sexual content" },
   { value: "other", label: "Other" },
];

type ReportDialogProps = {
   title: string;
   description: string;
   triggerLabel?: string;
   onSubmit: (reason: ReportReason, note: string) => void | Promise<void>;
};

export default function ReportDialog({ title, description, triggerLabel = "Report", onSubmit }: ReportDialogProps) {
   const [isOpen, setIsOpen] = useState(false);
   const [reason, setReason] = useState<ReportReason>("hate_or_abusive_content");
   const [note, setNote] = useState("");
   const [statusMessage, setStatusMessage] = useState("");
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [hasSubmitted, setHasSubmitted] = useState(false);

   const titleId = useId();
   const descriptionId = useId();
   const triggerRef = useRef<HTMLButtonElement | null>(null);
   const dialogRef = useRef<HTMLElement | null>(null);
   const closeButtonRef = useRef<HTMLButtonElement | null>(null);

   function resetDialog() {
      setReason("hate_or_abusive_content");
      setNote("");
      setStatusMessage("");
      setHasSubmitted(false);
      setIsSubmitting(false);
   }

   function closeDialog({ restoreFocus = true } = {}) {
      if (isSubmitting) {
         return;
      }

      setIsOpen(false);
      resetDialog();

      if (restoreFocus) {
         window.requestAnimationFrame(() => {
            triggerRef.current?.focus();
         });
      }
   }

   useEffect(() => {
      if (!isOpen) {
         return;
      }

      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      window.requestAnimationFrame(() => {
         closeButtonRef.current?.focus();
      });

      function handleKeyDown(event: KeyboardEvent) {
         if (event.key === "Escape") {
            event.preventDefault();
            closeDialog();
            return;
         }

         if (event.key !== "Tab" || !dialogRef.current) {
            return;
         }

         const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled]), textarea:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));

         if (focusable.length === 0) {
            return;
         }

         const first = focusable[0];
         const last = focusable[focusable.length - 1];

         if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
         } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
         }
      }

      document.addEventListener("keydown", handleKeyDown);

      return () => {
         document.body.style.overflow = previousOverflow;
         document.removeEventListener("keydown", handleKeyDown);
      };
   }, [isOpen, isSubmitting]);

   async function handleSubmit() {
      if (isSubmitting || hasSubmitted) {
         return;
      }

      setIsSubmitting(true);
      setStatusMessage("");

      try {
         await onSubmit(reason, note.trim());
         setHasSubmitted(true);
         setStatusMessage("Report submitted. Thanks for helping keep FrontOffice usable.");
      } catch (error) {
         const message = error instanceof Error ? error.message : "";

         setStatusMessage(message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("unique") ? "You already reported this item." : message || "FrontOffice could not submit this report.");
      } finally {
         setIsSubmitting(false);
      }
   }

   return (
      <>
         <button
            ref={triggerRef}
            type="button"
            onClick={() => {
               resetDialog();
               setIsOpen(true);
            }}
            aria-haspopup="dialog"
            className="inline-flex min-h-11 items-center gap-2 px-2 text-[11px] font-black uppercase tracking-[0.1em] text-[#5B6475] transition hover:bg-[#FFF1E8] hover:text-[#C2410C] focus:outline-none focus:ring-4 focus:ring-[#C2410C]/20"
         >
            <Flag aria-hidden="true" className="h-4 w-4" />
            {triggerLabel}
         </button>

         {isOpen && (
            <div
               className="fixed inset-0 z-[100] flex items-end justify-center bg-[#111827]/55 p-0 sm:items-center sm:p-4"
               role="presentation"
               onPointerDown={(event) => {
                  if (event.target === event.currentTarget) {
                     closeDialog();
                  }
               }}
            >
               <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="flex max-h-[92dvh] w-full flex-col overflow-hidden border border-[#111827] bg-white shadow-2xl sm:max-w-lg">
                  <div className="flex items-start justify-between gap-4 border-b border-[#111827] bg-[#FFF8EE] px-4 py-4 sm:px-5">
                     <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#C2410C]">Safety Desk</p>

                        <h3 id={titleId} className="mt-1 break-words text-xl font-black uppercase tracking-[-0.02em] text-[#111827] sm:text-2xl">
                           {title}
                        </h3>
                     </div>

                     <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={() => closeDialog()}
                        aria-label="Close report dialog"
                        className="flex min-h-11 min-w-11 shrink-0 items-center justify-center border border-[#111827] bg-white text-[#111827] transition hover:bg-[#F6F7F8] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
                     >
                        <X aria-hidden="true" className="h-5 w-5" />
                     </button>
                  </div>

                  <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-5">
                     <p id={descriptionId} className="text-sm leading-6 text-[#5B6475]">
                        {description}
                     </p>

                     {!hasSubmitted && (
                        <>
                           <label className="block">
                              <span className="text-sm font-bold text-[#111827]">Reason</span>

                              <select
                                 value={reason}
                                 onChange={(event) => setReason(event.target.value as ReportReason)}
                                 className="mt-2 min-h-12 w-full border border-[#111827] bg-white px-3 text-sm font-bold text-[#111827] outline-none focus:border-[#1E40AF] focus:ring-4 focus:ring-[#1E40AF]/10"
                              >
                                 {REPORT_REASONS.map((item) => (
                                    <option key={item.value} value={item.value}>
                                       {item.label}
                                    </option>
                                 ))}
                              </select>
                           </label>

                           <label className="block">
                              <span className="text-sm font-bold text-[#111827]">Optional note</span>

                              <textarea
                                 value={note}
                                 onChange={(event) => setNote(event.target.value)}
                                 maxLength={500}
                                 rows={4}
                                 placeholder="Add context for the review team."
                                 aria-describedby={`${descriptionId}-note-count`}
                                 className="mt-2 min-h-32 w-full resize-y border border-[#111827] bg-white px-3 py-3 text-sm leading-6 text-[#111827] outline-none focus:border-[#1E40AF] focus:ring-4 focus:ring-[#1E40AF]/10"
                              />

                              <span id={`${descriptionId}-note-count`} aria-live="polite" className="mt-1 block text-right text-xs text-[#5B6475]">
                                 {note.length}/500
                              </span>
                           </label>
                        </>
                     )}

                     {statusMessage && (
                        <div
                           role={hasSubmitted ? "status" : "alert"}
                           aria-live={hasSubmitted ? "polite" : "assertive"}
                           className={`border px-4 py-3 text-sm font-bold leading-6 ${hasSubmitted ? "border-[#1E40AF] bg-[#EAF0FF] text-[#1E40AF]" : "border-[#C2410C] bg-[#FFF1E8] text-[#9A3412]"}`}
                        >
                           {statusMessage}
                        </div>
                     )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 border-t border-[#111827] px-4 py-4 sm:flex sm:justify-end sm:px-5">
                     <button
                        type="button"
                        onClick={() => closeDialog()}
                        disabled={isSubmitting}
                        className="min-h-11 border border-[#111827] bg-white px-4 text-xs font-black uppercase tracking-[0.1em] text-[#111827] transition hover:bg-[#F6F7F8] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20 disabled:opacity-50"
                     >
                        {hasSubmitted ? "Close" : "Cancel"}
                     </button>

                     {!hasSubmitted && (
                        <button
                           type="button"
                           onClick={() => {
                              void handleSubmit();
                           }}
                           disabled={isSubmitting}
                           className="min-h-11 border border-[#C2410C] bg-[#C2410C] px-4 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#9A3412] focus:outline-none focus:ring-4 focus:ring-[#C2410C]/25 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                           {isSubmitting ? "Submitting..." : "Submit Report"}
                        </button>
                     )}
                  </div>
               </section>
            </div>
         )}
      </>
   );
}

"use client";

import { useState } from "react";
import { Ban, X } from "lucide-react";

type BlockDialogProps = {
   handle: string;
   onConfirm: (handle: string) => void | Promise<void>;
};

export default function BlockDialog({
   handle,
   onConfirm,
}: BlockDialogProps) {
   const [isOpen, setIsOpen] = useState(false);
   const [isBlocking, setIsBlocking] = useState(false);
   const [errorMessage, setErrorMessage] = useState("");

   async function handleConfirm() {
      if (isBlocking) {
         return;
      }

      setIsBlocking(true);
      setErrorMessage("");

      try {
         await onConfirm(handle);
         setIsOpen(false);
      } catch (error) {
         setErrorMessage(
            error instanceof Error
               ? error.message
               : "FrontOffice could not block this account.",
         );
         setIsBlocking(false);
      }
   }

   return (
      <>
         <button
            type="button"
            onClick={() => {
               setErrorMessage("");
               setIsOpen(true);
            }}
            className="inline-flex min-h-10 items-center gap-2 border border-[#111827] bg-white px-3 text-xs font-black uppercase tracking-[0.1em] text-[#111827] transition hover:border-[#C2410C] hover:bg-[#FFF1E8] hover:text-[#C2410C] focus:outline-none focus:ring-4 focus:ring-[#C2410C]/20"
         >
            <Ban aria-hidden="true" className="h-4 w-4" />
            Block
         </button>

         {isOpen && (
            <div
               className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111827]/55 p-4"
               role="presentation"
               onMouseDown={(event) => {
                  if (
                     event.target === event.currentTarget &&
                     !isBlocking
                  ) {
                     setIsOpen(false);
                  }
               }}
            >
               <section
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="frontoffice-block-title"
                  className="w-full max-w-md border border-[#111827] bg-white shadow-2xl"
               >
                  <div className="flex items-start justify-between gap-4 border-b border-[#111827] bg-[#FFF8EE] px-5 py-4">
                     <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#C2410C]">
                           Safety Desk
                        </p>

                        <h3
                           id="frontoffice-block-title"
                           className="mt-1 text-2xl font-black uppercase tracking-[-0.02em] text-[#111827]"
                        >
                           Block {handle}?
                        </h3>
                     </div>

                     <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        disabled={isBlocking}
                        aria-label="Close block dialog"
                        className="flex min-h-10 min-w-10 items-center justify-center border border-[#111827] bg-white text-[#111827] transition hover:bg-[#F6F7F8] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20 disabled:opacity-50"
                     >
                        <X aria-hidden="true" className="h-5 w-5" />
                     </button>
                  </div>

                  <div className="p-5">
                     <p className="text-sm leading-6 text-[#5B6475]">
                        Their posts, comments, profile, and notifications will be hidden from your FrontOffice. Existing follow relationships will also be removed.
                     </p>

                     {errorMessage && (
                        <div
                           role="alert"
                           className="mt-4 border border-[#C2410C] bg-[#FFF1E8] px-4 py-3 text-sm font-bold text-[#9A3412]"
                        >
                           {errorMessage}
                        </div>
                     )}
                  </div>

                  <div className="flex justify-end gap-3 border-t border-[#111827] px-5 py-4">
                     <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        disabled={isBlocking}
                        className="min-h-10 border border-[#111827] bg-white px-4 text-xs font-black uppercase tracking-[0.1em] text-[#111827] transition hover:bg-[#F6F7F8] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20 disabled:opacity-50"
                     >
                        Cancel
                     </button>

                     <button
                        type="button"
                        onClick={() => {
                           void handleConfirm();
                        }}
                        disabled={isBlocking}
                        className="min-h-10 border border-[#C2410C] bg-[#C2410C] px-4 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#9A3412] focus:outline-none focus:ring-4 focus:ring-[#C2410C]/25 disabled:cursor-not-allowed disabled:opacity-50"
                     >
                        {isBlocking ? "Blocking..." : "Block Account"}
                     </button>
                  </div>
               </section>
            </div>
         )}
      </>
   );
}

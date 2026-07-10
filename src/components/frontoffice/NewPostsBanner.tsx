"use client";

type NewPostsBannerProps = {
   count: number;
   onShowNewPosts: () => void;
};

/**
 * NewPostsBanner
 *
 * Build 4 mobile refinement:
 * - Keeps the control compact enough for narrow screens.
 * - Uses shorter mobile copy so the button never feels cramped.
 * - Preserves a slightly fuller label on larger screens.
 */
export default function NewPostsBanner({ count, onShowNewPosts }: NewPostsBannerProps) {
   if (count <= 0) {
      return null;
   }

   const mobileLabel = count === 1 ? "1 New Call · Show" : `${count} New Calls · Show`;

   const desktopLabel = count === 1 ? "1 New Call" : `${count} New Calls`;

   return (
      <button
         type="button"
         onClick={onShowNewPosts}
         aria-label={`${desktopLabel}. Show new posts.`}
         className="inline-flex min-h-8 items-center justify-center gap-2 border border-[#1E40AF]/30 bg-[#1E40AF]/5 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.06em] text-[#1E40AF] transition hover:border-[#1E40AF] hover:bg-[#1E40AF] hover:text-white focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20 sm:min-h-9 sm:px-3 sm:text-[10px] sm:tracking-[0.08em]"
      >
         <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />

         {/* Shorter copy keeps the control clean on narrow mobile screens. */}
         <span className="sm:hidden">{mobileLabel}</span>

         <span className="hidden sm:inline">{desktopLabel}</span>

         <span aria-hidden="true" className="hidden text-[10px] leading-none sm:inline">
            ↑
         </span>
      </button>
   );
}

"use client";

/**
 * FollowingFeedNotice
 *
 * Build 4 avoids a dead-end Following feed. Until the user's network
 * has activity, the tab shows a few trending calls beneath this note.
 * Build 5 will add actual people discovery and follow suggestions.
 */
export default function FollowingFeedNotice() {
   return (
      <aside aria-label="Following feed starter message" className="border-x border-b border-[#111827] bg-[#FFF8EE] px-4 py-4 sm:px-6">
         <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#C2410C]">Build Your Front Office</p>

         <h3 className="mt-1 text-lg font-black tracking-[-0.02em] text-[#111827]">Your network is quiet right now.</h3>

         <p className="mt-1 max-w-3xl text-sm leading-6 text-[#5B6475]">Until your Following feed fills up, here are a few calls getting attention across the War Room.</p>
      </aside>
   );
}

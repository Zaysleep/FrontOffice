"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, Settings, ShieldBan, UserRound, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import BrowserAlertsControl from "@/components/frontoffice/BrowserAlertsControl";

type BlockedProfileSummary = {
   id: string;
   name: string;
   handle: string;
   initials: string;
   profileImageUrl?: string;
};

type AccountMenuProps = {
   blockedProfiles?: BlockedProfileSummary[];
   onUnblockProfile?: (handle: string) => void | Promise<void>;
};

export default function AccountMenu({ blockedProfiles = [], onUnblockProfile }: AccountMenuProps) {
   const [handle, setHandle] = useState("");
   const [isOpen, setIsOpen] = useState(false);
   const [activePanel, setActivePanel] = useState<"menu" | "blocked-accounts" | "browser-alerts">("menu");
   const [isSigningOut, setIsSigningOut] = useState(false);
   const [pendingHandle, setPendingHandle] = useState("");
   const [errorMessage, setErrorMessage] = useState("");

   const menuRef = useRef<HTMLDivElement | null>(null);
   const triggerRef = useRef<HTMLButtonElement | null>(null);

   useEffect(() => {
      let isMounted = true;

      async function loadProfileHandle() {
         const {
            data: { user },
            error: userError,
         } = await supabase.auth.getUser();

         if (!isMounted) return;

         if (userError || !user) {
            setHandle("");
            return;
         }

         const { data: profile, error: profileError } = await supabase.from("profiles").select("handle").eq("id", user.id).maybeSingle();

         if (!isMounted) return;

         if (profileError) {
            console.error("FrontOffice could not load the account username.", profileError);
            setHandle("");
            return;
         }

         setHandle(profile?.handle ?? "");
      }

      void loadProfileHandle();

      return () => {
         isMounted = false;
      };
   }, []);

   useEffect(() => {
      function closeMenu({ restoreFocus = false } = {}) {
         setIsOpen(false);
         setActivePanel("menu");
         setErrorMessage("");

         if (restoreFocus) {
            window.requestAnimationFrame(() => {
               triggerRef.current?.focus();
            });
         }
      }

      function handlePointerDown(event: PointerEvent) {
         if (isOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
            closeMenu();
         }
      }

      function handleKeyDown(event: KeyboardEvent) {
         if (event.key === "Escape" && isOpen) {
            event.preventDefault();
            closeMenu({ restoreFocus: true });
         }
      }

      document.addEventListener("pointerdown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);

      return () => {
         document.removeEventListener("pointerdown", handlePointerDown);
         document.removeEventListener("keydown", handleKeyDown);
      };
   }, [isOpen]);

   async function handleSignOut() {
      setIsSigningOut(true);
      await supabase.auth.signOut();
      setIsSigningOut(false);
   }

   async function handleUnblock(handleToUnblock: string) {
      if (!onUnblockProfile || pendingHandle) {
         return;
      }

      setPendingHandle(handleToUnblock);
      setErrorMessage("");

      try {
         await onUnblockProfile(handleToUnblock);
      } catch (error) {
         setErrorMessage(error instanceof Error ? error.message : "FrontOffice could not unblock this account.");
      } finally {
         setPendingHandle("");
      }
   }

   function toggleMenu() {
      setIsOpen((open) => !open);
      setActivePanel("menu");
      setErrorMessage("");
   }

   return (
      <div ref={menuRef} className="relative">
         <button
            ref={triggerRef}
            type="button"
            onClick={toggleMenu}
            aria-expanded={isOpen}
            aria-haspopup="menu"
            className="flex min-h-11 max-w-[9.5rem] items-center gap-2 border border-[#111827] bg-white px-2.5 text-xs sm:max-w-[13rem] sm:px-3 md:max-w-[16rem] font-black uppercase tracking-[0.08em] text-[#111827] transition hover:bg-[#FFF8EE] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
         >
            <UserRound aria-hidden="true" className="h-4 w-4 text-[#5B6475]" />

            <span className="max-w-[5.5rem] truncate sm:max-w-[9rem] md:max-w-[12rem]">{handle || "Signed In"}</span>

            <ChevronDown aria-hidden="true" className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
         </button>

         {isOpen && (
            <div className="fixed inset-x-3 top-[4.75rem] z-[90] max-h-[calc(100dvh-6rem)] overflow-y-auto border border-[#111827] bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+0.5rem)] sm:w-[min(24rem,calc(100vw-2rem))] sm:max-h-[min(42rem,calc(100dvh-6rem))]">
               {activePanel === "menu" ? (
                  <div role="menu">
                     <div className="border-b border-[#111827] bg-[#FFF8EE] px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5B6475]">Account</p>

                        <p className="mt-1 truncate text-sm font-black text-[#111827]">{handle || "Signed In"}</p>
                     </div>

                     <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                           setActivePanel("browser-alerts");
                           setErrorMessage("");
                        }}
                        className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-[#111827] px-4 text-left transition hover:bg-[#FFF8EE] focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#1E40AF]/20"
                     >
                        <span className="flex items-center gap-3">
                           <Bell aria-hidden="true" className="h-4 w-4 text-[#5B6475]" />

                           <span className="text-sm font-bold text-[#111827]">Notifications</span>
                        </span>

                        <span className="text-xs font-bold text-[#5B6475]">Alerts & Topics</span>
                     </button>

                     <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                           setActivePanel("blocked-accounts");
                           setErrorMessage("");
                        }}
                        className="flex min-h-12 w-full items-center justify-between gap-3 border-b border-[#111827] px-4 text-left transition hover:bg-[#FFF8EE] focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#1E40AF]/20"
                     >
                        <span className="flex items-center gap-3">
                           <Settings aria-hidden="true" className="h-4 w-4 text-[#5B6475]" />

                           <span className="text-sm font-bold text-[#111827]">Settings</span>
                        </span>

                        <span className="text-xs font-bold text-[#5B6475]">Safety</span>
                     </button>

                     <button
                        type="button"
                        role="menuitem"
                        onClick={handleSignOut}
                        disabled={isSigningOut}
                        className="flex min-h-12 w-full items-center gap-3 px-4 text-left text-[#111827] transition hover:bg-[#FFF1E8] hover:text-[#C2410C] focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#C2410C]/20 disabled:cursor-not-allowed disabled:opacity-60"
                     >
                        <LogOut aria-hidden="true" className="h-4 w-4" />

                        <span className="text-sm font-bold">{isSigningOut ? "Signing Out..." : "Sign Out"}</span>
                     </button>
                  </div>
               ) : activePanel === "browser-alerts" ? (
                  <section aria-labelledby="browser-alerts-panel-heading">
                     <div className="flex items-start justify-between gap-4 border-b border-[#111827] bg-[#FFF8EE] px-4 py-3">
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1E40AF]">Settings · Notifications</p>

                           <h3 id="browser-alerts-panel-heading" className="mt-1 text-lg font-black uppercase tracking-[-0.01em] text-[#111827]">
                              Notification Settings
                           </h3>
                        </div>

                        <button
                           type="button"
                           onClick={() => {
                              setActivePanel("menu");
                              setErrorMessage("");
                           }}
                           aria-label="Back to account menu"
                           className="flex min-h-11 min-w-11 items-center justify-center border border-[#111827] bg-white text-[#111827] transition hover:bg-[#F6F7F8] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
                        >
                           <X aria-hidden="true" className="h-4 w-4" />
                        </button>
                     </div>

                     <div className="p-4">
                        <BrowserAlertsControl />
                     </div>
                  </section>
               ) : (
                  <section aria-labelledby="blocked-accounts-heading">
                     <div className="flex items-start justify-between gap-4 border-b border-[#111827] bg-[#FFF8EE] px-4 py-3">
                        <div>
                           <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#C2410C]">Settings · Safety</p>

                           <h3 id="blocked-accounts-heading" className="mt-1 text-lg font-black uppercase tracking-[-0.01em] text-[#111827]">
                              Blocked Accounts
                           </h3>
                        </div>

                        <button
                           type="button"
                           onClick={() => {
                              setActivePanel("menu");
                              setErrorMessage("");
                           }}
                           aria-label="Back to account menu"
                           className="flex min-h-11 min-w-11 items-center justify-center border border-[#111827] bg-white text-[#111827] transition hover:bg-[#F6F7F8] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
                        >
                           <X aria-hidden="true" className="h-4 w-4" />
                        </button>
                     </div>

                     <div className="px-4 py-3 text-sm leading-6 text-[#5B6475]">Blocked accounts can still have public posts visible, but interaction is disabled across the block.</div>

                     {errorMessage && (
                        <div role="alert" className="border-y border-[#C2410C] bg-[#FFF1E8] px-4 py-3 text-sm font-bold text-[#9A3412]">
                           {errorMessage}
                        </div>
                     )}

                     {blockedProfiles.length > 0 ? (
                        <div className="max-h-72 divide-y divide-[#111827] overflow-y-auto border-t border-[#111827]">
                           {blockedProfiles.map((profile) => (
                              <article key={profile.id} className="flex items-center justify-between gap-3 px-4 py-3">
                                 <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#111827] bg-[#F6F7F8] text-xs font-black text-[#111827]">{profile.initials}</div>

                                    <div className="min-w-0">
                                       <p className="truncate text-sm font-black text-[#111827]">{profile.name}</p>

                                       <p className="truncate text-xs font-medium text-[#5B6475]">{profile.handle}</p>
                                    </div>
                                 </div>

                                 <button
                                    type="button"
                                    onClick={() => {
                                       void handleUnblock(profile.handle);
                                    }}
                                    disabled={Boolean(pendingHandle) || !onUnblockProfile}
                                    className="min-h-11 shrink-0 border border-[#1E40AF] bg-white px-3 text-[11px] font-black uppercase tracking-[0.08em] text-[#1E40AF] transition hover:bg-[#EAF0FF] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20 disabled:cursor-not-allowed disabled:opacity-50"
                                 >
                                    {pendingHandle === profile.handle ? "Unblocking..." : "Unblock"}
                                 </button>
                              </article>
                           ))}
                        </div>
                     ) : (
                        <div className="border-t border-[#111827] px-4 py-6 text-center">
                           <ShieldBan aria-hidden="true" className="mx-auto h-5 w-5 text-[#5B6475]" />

                           <p className="mt-2 text-sm font-bold text-[#111827]">No blocked accounts</p>
                        </div>
                     )}
                  </section>
               )}
            </div>
         )}
      </div>
   );
}

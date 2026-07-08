"use client";

import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

const DISMISS_KEY =
   "frontoffice-browser-alerts-prompt-dismissed";

function urlBase64ToUint8Array(base64String: string) {
   const padding =
      "=".repeat((4 - (base64String.length % 4)) % 4);

   const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

   const rawData = window.atob(base64);

   return Uint8Array.from(
      [...rawData].map((character) =>
         character.charCodeAt(0)
      )
   );
}

export default function SmartBrowserAlertsPrompt() {
   const [isVisible, setIsVisible] = useState(false);
   const [isWorking, setIsWorking] = useState(false);
   const [errorMessage, setErrorMessage] = useState("");

   useEffect(() => {
      let isMounted = true;
      let timer: ReturnType<typeof setTimeout> | null = null;

      async function checkEligibility() {
         if (
            !("serviceWorker" in navigator) ||
            !("PushManager" in window) ||
            !("Notification" in window)
         ) {
            return;
         }

         if (Notification.permission !== "default") {
            return;
         }

         if (
            window.localStorage.getItem(DISMISS_KEY) ===
            "true"
         ) {
            return;
         }

         const {
            data: { user },
         } = await supabase.auth.getUser();

         if (!user || !isMounted) {
            return;
         }

         const registration =
            await navigator.serviceWorker.getRegistration(
               "/frontoffice-sw.js"
            );

         const subscription =
            await registration?.pushManager.getSubscription();

         if (subscription || !isMounted) {
            return;
         }

         timer = setTimeout(() => {
            if (isMounted) {
               setIsVisible(true);
            }
         }, 4000);
      }

      void checkEligibility();

      return () => {
         isMounted = false;

         if (timer) {
            clearTimeout(timer);
         }
      };
   }, []);

   async function enableBrowserAlerts() {
      const publicKey =
         process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!publicKey) {
         setErrorMessage(
            "Browser alerts are not configured yet."
         );
         return;
      }

      setIsWorking(true);
      setErrorMessage("");

      try {
         const {
            data: { user },
         } = await supabase.auth.getUser();

         if (!user) {
            throw new Error(
               "Sign in before enabling browser alerts."
            );
         }

         const permission =
            await Notification.requestPermission();

         if (permission !== "granted") {
            if (permission === "denied") {
               window.localStorage.setItem(
                  DISMISS_KEY,
                  "true"
               );
            }

            setIsVisible(false);
            return;
         }

         const registration =
            await navigator.serviceWorker.register(
               "/frontoffice-sw.js",
               {
                  scope: "/",
               }
            );

         await navigator.serviceWorker.ready;

         let subscription =
            await registration.pushManager.getSubscription();

         if (!subscription) {
            subscription =
               await registration.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey:
                     urlBase64ToUint8Array(publicKey),
               });
         }

         const json = subscription.toJSON();
         const p256dh = json.keys?.p256dh;
         const auth = json.keys?.auth;

         if (!p256dh || !auth) {
            throw new Error(
               "The browser did not return valid push keys."
            );
         }

         const { error } = await supabase
            .from("push_subscriptions")
            .upsert(
               {
                  user_id: user.id,
                  endpoint: subscription.endpoint,
                  p256dh,
                  auth,
                  user_agent: navigator.userAgent,
                  updated_at: new Date().toISOString(),
               },
               {
                  onConflict: "endpoint",
               }
            );

         if (error) {
            throw error;
         }

         window.localStorage.removeItem(DISMISS_KEY);
         setIsVisible(false);
      } catch (error) {
         console.error(
            "FrontOffice: Could not enable browser alerts.",
            error
         );

         setErrorMessage(
            error instanceof Error
               ? error.message
               : "Could not enable browser alerts."
         );
      } finally {
         setIsWorking(false);
      }
   }

   function dismissPrompt() {
      window.localStorage.setItem(
         DISMISS_KEY,
         "true"
      );

      setIsVisible(false);
   }

   if (!isVisible) {
      return null;
   }

   return (
      <aside
         role="dialog"
         aria-modal="false"
         aria-labelledby="browser-alerts-prompt-title"
         className="fixed bottom-4 right-4 z-[95] w-[min(24rem,calc(100vw-2rem))] border border-[#111827] bg-white shadow-2xl"
      >
         <div className="flex items-start justify-between gap-4 border-b border-[#111827] bg-[#FFF8EE] px-4 py-3">
            <div className="flex items-start gap-3">
               <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#111827] bg-white">
                  <Bell
                     aria-hidden="true"
                     className="h-5 w-5 text-[#1E40AF]"
                  />
               </div>

               <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1E40AF]">
                     FrontOffice Alerts
                  </p>

                  <h2
                     id="browser-alerts-prompt-title"
                     className="mt-1 text-lg font-black uppercase tracking-[-0.02em] text-[#111827]"
                  >
                     Stay in the loop
                  </h2>
               </div>
            </div>

            <button
               type="button"
               onClick={dismissPrompt}
               aria-label="Dismiss browser alerts prompt"
               className="flex min-h-9 min-w-9 items-center justify-center border border-[#111827] bg-white transition hover:bg-[#F6F7F8] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
            >
               <X
                  aria-hidden="true"
                  className="h-4 w-4"
               />
            </button>
         </div>

         <div className="px-4 py-4">
            <p className="text-sm leading-6 text-[#5B6475]">
               Get optional browser alerts for replies,
               mentions, follows, discussion activity,
               and important FrontOffice updates.
            </p>

            {errorMessage && (
               <p
                  role="alert"
                  className="mt-3 text-sm font-bold text-[#C2410C]"
               >
                  {errorMessage}
               </p>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
               <button
                  type="button"
                  onClick={() => {
                     void enableBrowserAlerts();
                  }}
                  disabled={isWorking}
                  className="min-h-11 border border-[#1E40AF] bg-[#1E40AF] px-4 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#173487] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30 disabled:cursor-not-allowed disabled:opacity-60"
               >
                  {isWorking
                     ? "Turning On..."
                     : "Turn On Alerts"}
               </button>

               <button
                  type="button"
                  onClick={dismissPrompt}
                  disabled={isWorking}
                  className="min-h-11 border border-[#111827] bg-white px-4 text-xs font-black uppercase tracking-[0.1em] text-[#111827] transition hover:bg-[#F6F7F8] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20 disabled:cursor-not-allowed disabled:opacity-60"
               >
                  Not Now
               </button>
            </div>
         </div>
      </aside>
   );
}

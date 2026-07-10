"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

type AlertState = "checking" | "unsupported" | "blocked" | "disabled" | "enabled" | "working";

type NotificationPreferences = {
   browser_push_enabled: boolean;
   receipt_comments_enabled: boolean;
   replies_enabled: boolean;
   mentions_enabled: boolean;
   follows_enabled: boolean;
   milestones_enabled: boolean;
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
   browser_push_enabled: false,
   receipt_comments_enabled: true,
   replies_enabled: true,
   mentions_enabled: true,
   follows_enabled: true,
   milestones_enabled: true,
};

const PREFERENCE_OPTIONS: Array<{
   key: "receipt_comments_enabled" | "replies_enabled" | "mentions_enabled" | "follows_enabled" | "milestones_enabled";
   label: string;
   description: string;
}> = [
   {
      key: "receipt_comments_enabled",
      label: "Receipt Comments",
      description: "Activity when someone comments on a receipt tied to one of your calls.",
   },
   {
      key: "replies_enabled",
      label: "Replies",
      description: "Direct replies to your comments and discussion threads.",
   },
   {
      key: "mentions_enabled",
      label: "Mentions",
      description: "Alerts when another user mentions your handle.",
   },
   {
      key: "follows_enabled",
      label: "New Followers",
      description: "Updates when another user follows your FrontOffice profile.",
   },
   {
      key: "milestones_enabled",
      label: "Receipt Milestones",
      description: "Important vote and engagement milestones on your calls.",
   },
];

function urlBase64ToUint8Array(base64String: string) {
   const padding = "=".repeat((4 - (base64String.length % 4)) % 4);

   const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

   const rawData = window.atob(base64);

   return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

export default function BrowserAlertsControl() {
   const [alertState, setAlertState] = useState<AlertState>("checking");
   const [message, setMessage] = useState("");
   const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
   const [preferencesLoading, setPreferencesLoading] = useState(true);
   const [savingPreference, setSavingPreference] = useState<keyof NotificationPreferences | null>(null);
   const [isIOSDevice, setIsIOSDevice] = useState(false);
   const [isStandaloneApp, setIsStandaloneApp] = useState(false);

   useEffect(() => {
      const userAgent = navigator.userAgent;

      const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

      const navigatorWithStandalone = navigator as Navigator & {
         standalone?: boolean;
      };

      const standalone = window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;

      setIsIOSDevice(isIOS);
      setIsStandaloneApp(standalone);

      void initializeNotificationSettings();
   }, []);

   async function initializeNotificationSettings() {
      await Promise.all([checkCurrentState(), loadPreferences()]);
   }

   async function getCurrentUserId() {
      const {
         data: { user },
      } = await supabase.auth.getUser();

      return user?.id ?? null;
   }

   async function loadPreferences() {
      setPreferencesLoading(true);

      try {
         const userId = await getCurrentUserId();

         if (!userId) {
            return;
         }

         const { data, error } = await supabase.from("notification_preferences").select("browser_push_enabled, receipt_comments_enabled, replies_enabled, mentions_enabled, follows_enabled, milestones_enabled").eq("user_id", userId).maybeSingle();

         if (error) {
            console.warn("FrontOffice: Notification preferences are not ready yet; using defaults.", error);

            setPreferences(DEFAULT_PREFERENCES);
            return;
         }

         if (data) {
            setPreferences(data as NotificationPreferences);
            return;
         }

         /*
          * A brand-new account may reach onboarding before a preferences row
          * has ever been written. That is a normal first-run state, not an
          * error. Keep the local defaults and create the row only when the
          * user actually enables browser push or changes a preference.
          */
         setPreferences(DEFAULT_PREFERENCES);
      } finally {
         setPreferencesLoading(false);
      }
   }

   async function savePreference(key: keyof NotificationPreferences, value: boolean) {
      if (savingPreference) {
         return;
      }

      setSavingPreference(key);
      setMessage("");

      const previousPreferences = preferences;

      setPreferences((current) => ({
         ...current,
         [key]: value,
      }));

      try {
         const userId = await getCurrentUserId();

         if (!userId) {
            throw new Error("Sign in again to update notification settings.");
         }

         const { error } = await supabase.from("notification_preferences").upsert(
            {
               user_id: userId,
               ...preferences,
               [key]: value,
            },
            {
               onConflict: "user_id",
            },
         );

         if (error) {
            throw error;
         }

         setMessage("Notification preference saved.");
      } catch (error) {
         setPreferences(previousPreferences);
         setMessage(error instanceof Error ? error.message : "Could not save notification preference.");
      } finally {
         setSavingPreference(null);
      }
   }

   async function checkCurrentState() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
         setAlertState("unsupported");
         return;
      }

      if (Notification.permission === "denied") {
         setAlertState("blocked");
         return;
      }

      try {
         const registration = await navigator.serviceWorker.getRegistration("/frontoffice-sw.js");

         if (!registration) {
            setAlertState("disabled");
            return;
         }

         const subscription = await registration.pushManager.getSubscription();

         setAlertState(subscription ? "enabled" : "disabled");
      } catch (error) {
         console.error("FrontOffice: Could not check browser alerts.", error);

         setAlertState("disabled");
      }
   }

   async function enableBrowserAlerts() {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!publicKey) {
         setMessage("Browser alerts are not configured yet.");
         return;
      }

      setAlertState("working");
      setMessage("");

      try {
         const userId = await getCurrentUserId();

         if (!userId) {
            throw new Error("Sign in before enabling browser alerts.");
         }

         const permission = await Notification.requestPermission();

         if (permission === "denied") {
            setAlertState("blocked");
            setMessage("Notifications are blocked in your browser settings.");
            return;
         }

         if (permission !== "granted") {
            setAlertState("disabled");
            return;
         }

         const registration = await navigator.serviceWorker.register("/frontoffice-sw.js", {
            scope: "/",
         });

         await navigator.serviceWorker.ready;

         let subscription = await registration.pushManager.getSubscription();

         if (!subscription) {
            subscription = await registration.pushManager.subscribe({
               userVisibleOnly: true,
               applicationServerKey: urlBase64ToUint8Array(publicKey),
            });
         }

         const json = subscription.toJSON();

         const p256dh = json.keys?.p256dh;
         const auth = json.keys?.auth;

         if (!p256dh || !auth) {
            throw new Error("The browser did not return valid push keys.");
         }

         const { error: subscriptionError } = await supabase.from("push_subscriptions").upsert(
            {
               user_id: userId,
               endpoint: subscription.endpoint,
               p256dh,
               auth,
               user_agent: navigator.userAgent,
               updated_at: new Date().toISOString(),
            },
            {
               onConflict: "endpoint",
            },
         );

         if (subscriptionError) {
            throw subscriptionError;
         }

         const { error: preferenceError } = await supabase.from("notification_preferences").upsert(
            {
               user_id: userId,
               ...preferences,
               browser_push_enabled: true,
            },
            {
               onConflict: "user_id",
            },
         );

         if (preferenceError) {
            throw preferenceError;
         }

         setPreferences((current) => ({
            ...current,
            browser_push_enabled: true,
         }));
         setAlertState("enabled");
         setMessage("Browser alerts are on for this device.");
      } catch (error) {
         console.error("FrontOffice: Could not enable browser alerts.", error);

         setAlertState("disabled");

         setMessage(error instanceof Error ? error.message : "Could not enable browser alerts.");
      }
   }

   async function disableBrowserAlerts() {
      setAlertState("working");
      setMessage("");

      try {
         const userId = await getCurrentUserId();

         const registration = await navigator.serviceWorker.getRegistration("/frontoffice-sw.js");

         const subscription = await registration?.pushManager.getSubscription();

         if (subscription) {
            if (userId) {
               const { error } = await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", subscription.endpoint);

               if (error) {
                  throw error;
               }
            }

            await subscription.unsubscribe();
         }

         if (userId) {
            const { error } = await supabase.from("notification_preferences").upsert(
               {
                  user_id: userId,
                  ...preferences,
                  browser_push_enabled: false,
               },
               {
                  onConflict: "user_id",
               },
            );

            if (error) {
               throw error;
            }
         }

         setPreferences((current) => ({
            ...current,
            browser_push_enabled: false,
         }));
         setAlertState("disabled");
         setMessage("Browser alerts are off for this device.");
      } catch (error) {
         console.error("FrontOffice: Could not disable browser alerts.", error);

         setAlertState("enabled");

         setMessage(error instanceof Error ? error.message : "Could not disable browser alerts.");
      }
   }

   if (alertState === "checking") {
      return (
         <section className="border border-[#111827] bg-white p-4 sm:p-5" aria-live="polite" aria-busy="true">
            <div className="flex items-center gap-3">
               <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />

               <p className="text-sm font-bold text-[#5B6475]">Checking notification settings…</p>
            </div>
         </section>
      );
   }

   const isEnabled = alertState === "enabled";
   const isWorking = alertState === "working";
   const isErrorMessage = message.includes("not") || message.includes("Could not") || message.includes("blocked");

   return (
      <section className="border border-[#111827] bg-white" aria-labelledby="browser-alerts-title" aria-busy={isWorking || preferencesLoading}>
         <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
               <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#111827] bg-[#FFF8EE]">{isEnabled ? <Bell className="h-5 w-5" aria-hidden="true" /> : <BellOff className="h-5 w-5" aria-hidden="true" />}</div>

               <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#1E40AF]">Delivery</p>

                  <h2 id="browser-alerts-title" className="mt-1 text-lg font-black uppercase tracking-[-0.02em] text-[#111827] sm:text-xl">
                     Browser Alerts
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-[#5B6475]">Control whether this browser can show push alerts. Your notification topics are managed separately below.</p>

                  {alertState === "unsupported" && (
                     <div role="status" className="mt-3 border border-[#111827] bg-[#FFF8EE] px-4 py-3">
                        {isIOSDevice && !isStandaloneApp ? (
                           <>
                              <p className="text-sm font-black text-[#111827]">Notifications on iPhone require the FrontOffice Home Screen app.</p>

                              <p className="mt-2 text-sm leading-6 text-[#5B6475]">Add FrontOffice to your Home Screen, open it from the new icon, then return here and enable alerts.</p>
                           </>
                        ) : (
                           <p className="text-sm font-bold text-[#C2410C]">This browser does not support Web Push.</p>
                        )}
                     </div>
                  )}

                  {alertState === "blocked" && (
                     <p role="alert" className="mt-3 text-sm font-bold text-[#C2410C]">
                        Notifications are blocked for this site. Update the browser permission, then reload FrontOffice.
                     </p>
                  )}

                  {alertState !== "unsupported" && alertState !== "blocked" && (
                     <div className="mt-4">
                        {isEnabled ? (
                           <button
                              type="button"
                              onClick={() => {
                                 void disableBrowserAlerts();
                              }}
                              disabled={isWorking}
                              className="min-h-12 w-full border border-[#111827] bg-white px-4 text-xs font-black uppercase tracking-[0.1em] text-[#111827] transition hover:bg-[#F6F7F8] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                           >
                              Turn Off Browser Alerts
                           </button>
                        ) : (
                           <button
                              type="button"
                              onClick={() => {
                                 void enableBrowserAlerts();
                              }}
                              disabled={isWorking}
                              className="min-h-12 w-full border border-[#1E40AF] bg-[#1E40AF] px-4 text-xs font-black uppercase tracking-[0.1em] text-white transition hover:bg-[#173487] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/30 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                           >
                              {isWorking ? "Turning On..." : "Turn On Browser Alerts"}
                           </button>
                        )}
                     </div>
                  )}
               </div>
            </div>
         </div>

         <div className="border-t border-[#111827]">
            <div className="border-b border-[#111827] bg-[#FFF8EE] px-4 py-3">
               <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5B6475]">Notify Me About</p>
            </div>

            {preferencesLoading ? (
               <div className="px-4 py-5 text-sm font-bold text-[#5B6475]">Loading preferences…</div>
            ) : (
               <div className="divide-y divide-[#111827]">
                  {PREFERENCE_OPTIONS.map((option) => {
                     const isOn = preferences[option.key];

                     return (
                        <label key={option.key} className="flex min-h-16 cursor-pointer items-center justify-between gap-4 px-4 py-3 transition hover:bg-[#FFFCF6]">
                           <span className="min-w-0">
                              <span className="block text-sm font-black text-[#111827]">{option.label}</span>

                              <span className="mt-1 block text-xs leading-5 text-[#5B6475]">{option.description}</span>
                           </span>

                           <input
                              type="checkbox"
                              checked={isOn}
                              disabled={Boolean(savingPreference)}
                              onChange={(event) => {
                                 void savePreference(option.key, event.target.checked);
                              }}
                              className="h-5 w-5 shrink-0 accent-[#1E40AF]"
                           />
                        </label>
                     );
                  })}
               </div>
            )}
         </div>

         {message && (
            <p
               role={isErrorMessage ? "alert" : "status"}
               aria-live={isErrorMessage ? "assertive" : "polite"}
               className={`border-t border-[#111827] px-4 py-3 text-sm font-bold ${isErrorMessage ? "bg-[#FFF1E8] text-[#C2410C]" : "bg-[#EAF0FF] text-[#1E40AF]"}`}
            >
               {message}
            </p>
         )}
      </section>
   );
}

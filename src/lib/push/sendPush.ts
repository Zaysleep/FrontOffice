import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

type PushSubscriptionRow = {
   id: string;
   endpoint: string;
   p256dh: string;
   auth: string;
};

type PushPayload = {
   title: string;
   body: string;
   url?: string;
   icon?: string;
   badge?: string;
};

export type PushPreferenceKey = "receipt_comments_enabled" | "replies_enabled" | "mentions_enabled" | "follows_enabled" | "milestones_enabled";

type NotificationPreferenceRow = {
   browser_push_enabled: boolean;
   receipt_comments_enabled: boolean;
   replies_enabled: boolean;
   mentions_enabled: boolean;
   follows_enabled: boolean;
   milestones_enabled: boolean;
};

type SendPushOptions = {
   preferenceKey?: PushPreferenceKey;
};

function getServerSupabase() {
   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

   const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

   if (!supabaseUrl) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
   }

   if (!serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
   }

   return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
         autoRefreshToken: false,
         persistSession: false,
      },
   });
}

function configureWebPush() {
   const subject = process.env.VAPID_SUBJECT;
   const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
   const privateKey = process.env.VAPID_PRIVATE_KEY;

   if (!subject) {
      throw new Error("VAPID_SUBJECT is not configured.");
   }

   if (!publicKey) {
      throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY is not configured.");
   }

   if (!privateKey) {
      throw new Error("VAPID_PRIVATE_KEY is not configured.");
   }

   webpush.setVapidDetails(subject, publicKey, privateKey);
}

export async function sendPushToUser(userId: string, payload: PushPayload, options: SendPushOptions = {}) {
   configureWebPush();

   const supabase = getServerSupabase();

   const { data: preferenceData, error: preferenceError } = await supabase
      .from("notification_preferences")
      .select("browser_push_enabled, receipt_comments_enabled, replies_enabled, mentions_enabled, follows_enabled, milestones_enabled")
      .eq("user_id", userId)
      .maybeSingle();

   if (preferenceError) {
      throw preferenceError;
   }

   const preferences = preferenceData as NotificationPreferenceRow | null;

   if (!preferences?.browser_push_enabled) {
      return {
         subscriptions: 0,
         delivered: 0,
         removed: 0,
         skippedReason: "browser_push_disabled" as const,
      };
   }

   if (options.preferenceKey && preferences[options.preferenceKey] !== true) {
      return {
         subscriptions: 0,
         delivered: 0,
         removed: 0,
         skippedReason: "topic_disabled" as const,
      };
   }

   const { data, error } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", userId);

   if (error) {
      throw error;
   }

   const subscriptions = (data ?? []) as PushSubscriptionRow[];

   let delivered = 0;
   let removed = 0;

   for (const subscription of subscriptions) {
      try {
         await webpush.sendNotification(
            {
               endpoint: subscription.endpoint,
               keys: {
                  p256dh: subscription.p256dh,
                  auth: subscription.auth,
               },
            },
            JSON.stringify({
               title: payload.title,
               body: payload.body,
               url: payload.url ?? "/",
               icon: payload.icon ?? "/frontoffice-notification-icon.png",
               badge: payload.badge ?? "/frontoffice-notification-badge.png",
            }),
         );

         delivered += 1;
      } catch (error) {
         const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? Number((error as { statusCode?: unknown }).statusCode) : null;

         if (statusCode === 404 || statusCode === 410) {
            const { error: removeError } = await supabase.from("push_subscriptions").delete().eq("id", subscription.id);

            if (removeError) {
               console.error("FrontOffice could not remove an expired push subscription.", removeError);
            } else {
               removed += 1;
            }

            continue;
         }

         console.error("FrontOffice push delivery failed.", error);
      }
   }

   return {
      subscriptions: subscriptions.length,
      delivered,
      removed,
      skippedReason: null,
   };
}

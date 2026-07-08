import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToUser } from "@/lib/push/sendPush";

type NotificationWebhookPayload = {
   type?: string;
   table?: string;
   schema?: string;
   record?: {
      id?: string;
      recipient_id?: string;
      actor_id?: string | null;
      type?: string;
      title?: string;
      body?: string;
      post_id?: string | null;
      comment_id?: string | null;
      profile_id?: string | null;
      created_at?: string;
   };
};

function getAdminSupabase() {
   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

   const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

   if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase server environment is not configured.");
   }

   return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
         autoRefreshToken: false,
         persistSession: false,
      },
   });
}

function getNotificationUrl(notification: NonNullable<NotificationWebhookPayload["record"]>) {
   if (notification.type === "follow") {
      return "/?section=profile";
   }

   if (notification.post_id) {
      return `/?section=war-room&post=${encodeURIComponent(notification.post_id)}`;
   }

   return "/?section=war-room";
}

export async function POST(request: NextRequest) {
   const expectedSecret = process.env.FRONTOFFICE_PUSH_WEBHOOK_SECRET;

   const providedSecret = request.headers.get("x-frontoffice-push-secret");

   if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json(
         {
            error: "Unauthorized webhook request.",
         },
         {
            status: 401,
         },
      );
   }

   try {
      const payload = (await request.json()) as NotificationWebhookPayload;

      const notification = payload.record;

      if (payload.type !== "INSERT" || payload.schema !== "public" || payload.table !== "notifications" || !notification?.id || !notification.recipient_id || !notification.title || !notification.body) {
         return NextResponse.json({
            ok: true,
            ignored: true,
         });
      }

      const admin = getAdminSupabase();

      const { data: delivery, error: deliveryInsertError } = await admin
         .from("push_deliveries")
         .insert({
            notification_id: notification.id,
            recipient_id: notification.recipient_id,
            status: "pending",
         })
         .select("id")
         .single();

      if (deliveryInsertError) {
         if (deliveryInsertError.code === "23505") {
            return NextResponse.json({
               ok: true,
               duplicate: true,
            });
         }

         throw deliveryInsertError;
      }

      try {
         const result = await sendPushToUser(notification.recipient_id, {
            title: notification.title,
            body: notification.body,
            url: getNotificationUrl(notification),
         });

         const status = result.delivered > 0 ? "delivered" : "no_subscription";

         await admin
            .from("push_deliveries")
            .update({
               status,
               delivered_count: result.delivered,
               removed_subscription_count: result.removed,
               completed_at: new Date().toISOString(),
               error_message: null,
            })
            .eq("id", delivery.id);

         return NextResponse.json({
            ok: true,
            status,
            ...result,
         });
      } catch (error) {
         const message = error instanceof Error ? error.message : "Unknown push delivery error.";

         await admin
            .from("push_deliveries")
            .update({
               status: "failed",
               error_message: message,
               completed_at: new Date().toISOString(),
            })
            .eq("id", delivery.id);

         throw error;
      }
   } catch (error) {
      console.error("FrontOffice notification push webhook failed.", error);

      return NextResponse.json(
         {
            error: error instanceof Error ? error.message : "Push delivery failed.",
         },
         {
            status: 500,
         },
      );
   }
}

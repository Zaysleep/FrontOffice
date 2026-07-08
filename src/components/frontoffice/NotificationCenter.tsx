"use client";

import { Bell, CheckCheck, MessageCircle, UserPlus, Vote, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type FrontOfficeNotification = {
   id: number;
   type: "comment" | "follow" | "milestone" | "reply";
   title: string;
   body: string;
   createdAt: string;
   isRead: boolean;
   destination:
      | {
           section: "war-room";
           postId?: number;
        }
      | {
           section: "profile";
           handle: string;
        };
};

type NotificationCenterProps = {
   notifications: FrontOfficeNotification[];
   onMarkRead: (notificationId: number) => void;
   onMarkAllRead: () => void;
   onOpenNotification: (notification: FrontOfficeNotification) => void;
};

type NotificationFilter = "all" | "unread";

export default function NotificationCenter({ notifications, onMarkRead, onMarkAllRead, onOpenNotification }: NotificationCenterProps) {
   const [isOpen, setIsOpen] = useState(false);
   const [filter, setFilter] = useState<NotificationFilter>("all");

   const triggerRef = useRef<HTMLButtonElement | null>(null);
   const panelRef = useRef<HTMLElement | null>(null);

   const unreadCount = notifications.filter((notification) => !notification.isRead).length;

   const visibleNotifications = useMemo(() => {
      if (filter === "unread") {
         return notifications.filter((notification) => !notification.isRead);
      }

      return notifications;
   }, [filter, notifications]);

   useEffect(() => {
      if (!isOpen) {
         return;
      }

      function handleKeyDown(event: KeyboardEvent) {
         if (event.key !== "Escape") {
            return;
         }

         event.preventDefault();
         setIsOpen(false);

         window.requestAnimationFrame(() => {
            triggerRef.current?.focus();
         });
      }

      document.addEventListener("keydown", handleKeyDown);

      return () => {
         document.removeEventListener("keydown", handleKeyDown);
      };
   }, [isOpen]);

   function closePanel({ restoreFocus = false } = {}) {
      setIsOpen(false);

      if (restoreFocus) {
         window.requestAnimationFrame(() => {
            triggerRef.current?.focus();
         });
      }
   }

   function handleOpenNotification(notification: FrontOfficeNotification) {
      onMarkRead(notification.id);
      onOpenNotification(notification);
      closePanel();
   }

   return (
      <div className="relative">
         <button
            ref={triggerRef}
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
            aria-expanded={isOpen}
            aria-controls="frontoffice-notification-panel"
            className="relative flex h-11 w-11 items-center justify-center border border-[#111827] bg-white text-[#111827] transition hover:bg-[#FFF8EE] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
         >
            <Bell aria-hidden="true" className="h-5 w-5" />

            {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center border border-[#111827] bg-[#C2410C] px-1 text-[11px] font-black text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
         </button>

         {isOpen && (
            <>
               <button type="button" aria-label="Close notifications" onClick={() => closePanel()} className="fixed inset-0 z-40 cursor-default bg-black/10 sm:bg-transparent" />

               <section
                  ref={panelRef}
                  id="frontoffice-notification-panel"
                  aria-label="Notifications"
                  className="fixed inset-x-3 top-[4.75rem] z-50 flex max-h-[calc(100dvh-6rem)] flex-col overflow-hidden border border-[#111827] bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-14 sm:w-[min(92vw,440px)] md:w-[min(72vw,520px)] lg:w-[480px]"
               >
                  <div className="flex items-start justify-between gap-4 border-b border-[#111827] bg-[#FFF8EE] px-4 py-4 sm:px-5">
                     <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C2410C]">Activity Desk</p>

                        <h2 className="mt-1 text-xl font-black uppercase tracking-[-0.02em] text-[#111827] sm:text-2xl">Notifications</h2>

                        <p className="mt-2 text-sm text-[#5B6475]" aria-live="polite">
                           {unreadCount === 0 ? "You’re all caught up." : `${unreadCount} unread ${unreadCount === 1 ? "update" : "updates"}`}
                        </p>
                     </div>

                     <button
                        type="button"
                        onClick={() => closePanel({ restoreFocus: true })}
                        aria-label="Close notification panel"
                        className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#111827] bg-white text-[#5B6475] transition hover:bg-[#F6F7F8] hover:text-[#111827] focus:outline-none focus:ring-4 focus:ring-[#1E40AF]/20"
                     >
                        <X aria-hidden="true" className="h-4 w-4" />
                     </button>
                  </div>

                  <div className="grid grid-cols-1 border-b border-[#111827] sm:grid-cols-[1fr_auto] sm:items-center">
                     <div className="grid grid-cols-2">
                        <FilterButton label="All" isActive={filter === "all"} onClick={() => setFilter("all")} />

                        <FilterButton label="Unread" isActive={filter === "unread"} onClick={() => setFilter("unread")} />
                     </div>

                     {unreadCount > 0 && (
                        <button
                           type="button"
                           onClick={onMarkAllRead}
                           className="inline-flex min-h-12 items-center justify-center gap-2 border-t border-[#111827] px-4 text-xs font-black uppercase tracking-[0.1em] text-[#1E40AF] transition hover:bg-[#EAF0FF] focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#1E40AF]/20 sm:border-l sm:border-t-0"
                        >
                           <CheckCheck aria-hidden="true" className="h-4 w-4" />
                           Mark All Read
                        </button>
                     )}
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                     {visibleNotifications.length > 0 ? (
                        <div className="divide-y divide-[#111827]">
                           {visibleNotifications.map((notification) => (
                              <NotificationRow key={notification.id} notification={notification} onClick={() => handleOpenNotification(notification)} />
                           ))}
                        </div>
                     ) : (
                        <div className="px-6 py-12 text-center">
                           <Bell aria-hidden="true" className="mx-auto h-7 w-7 text-[#5B6475]" />

                           <p className="mt-3 font-black uppercase tracking-[0.08em] text-[#111827]">No Unread Notifications</p>

                           <p className="mt-2 text-sm text-[#5B6475]">New activity will show up here.</p>
                        </div>
                     )}
                  </div>
               </section>
            </>
         )}
      </div>
   );
}

function FilterButton({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
   return (
      <button
         type="button"
         onClick={onClick}
         aria-pressed={isActive}
         className={`min-h-12 border-r border-[#111827] px-4 text-xs font-black uppercase tracking-[0.14em] transition last:border-r-0 focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#1E40AF]/20 ${
            isActive ? "bg-[#111827] text-white" : "bg-white text-[#5B6475] hover:bg-[#FFF8EE] hover:text-[#111827]"
         }`}
      >
         {label}
      </button>
   );
}

function NotificationRow({ notification, onClick }: { notification: FrontOfficeNotification; onClick: () => void }) {
   const Icon = getNotificationIcon(notification.type);

   return (
      <button
         type="button"
         onClick={onClick}
         className={`grid min-h-[4.5rem] w-full grid-cols-[42px_minmax(0,1fr)_auto] gap-3 px-4 py-4 text-left transition focus:outline-none focus:ring-4 focus:ring-inset focus:ring-[#1E40AF]/20 sm:px-5 ${
            notification.isRead ? "bg-white hover:bg-[#FFFCF6]" : "bg-[#FFF8EE] hover:bg-[#FFF4E4]"
         }`}
      >
         <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#111827] bg-white text-[#1E40AF]">
            <Icon aria-hidden="true" className="h-5 w-5" />
         </span>

         <span className="min-w-0 flex-1">
            <span className="block break-words text-sm font-black uppercase tracking-[0.04em] text-[#111827]">{notification.title}</span>

            {notification.body && <span className="mt-2 block break-words text-sm leading-6 text-[#5B6475]">{notification.body}</span>}

            <span className="mt-2 block text-xs font-bold uppercase tracking-[0.1em] text-[#5B6475]">{formatNotificationTime(notification.createdAt)}</span>
         </span>

         {!notification.isRead && <span aria-label="Unread" className="mt-2 h-2.5 w-2.5 shrink-0 bg-[#C2410C]" />}
      </button>
   );
}

function getNotificationIcon(type: FrontOfficeNotification["type"]) {
   if (type === "follow") {
      return UserPlus;
   }

   if (type === "milestone") {
      return Vote;
   }

   return MessageCircle;
}

function formatNotificationTime(createdAt: string) {
   const createdTime = new Date(createdAt).getTime();

   if (Number.isNaN(createdTime)) {
      return "now";
   }

   const differenceInMinutes = Math.max(0, Math.floor((Date.now() - createdTime) / 60_000));

   if (differenceInMinutes < 1) {
      return "now";
   }

   if (differenceInMinutes < 60) {
      return `${differenceInMinutes}m`;
   }

   const hours = Math.floor(differenceInMinutes / 60);

   if (hours < 24) {
      return `${hours}h`;
   }

   const days = Math.floor(hours / 24);

   return `${days}d`;
}

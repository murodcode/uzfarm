import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ExternalLink, X, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Notification {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  button_text: string | null;
  button_url: string | null;
  created_at: string;
  is_read: boolean;
  user_notification_id: string | null;
}

export default function NotificationsList() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!session) return;
    fetchNotifications();
  }, [session]);

  const fetchNotifications = async () => {
    try {
      const { data: allNotifs } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!allNotifs) { setNotifications([]); setLoading(false); return; }

      const { data: readStatus } = await supabase
        .from("user_notifications")
        .select("id, notification_id, is_read");

      const readMap = new Map(
        (readStatus || []).map(r => [r.notification_id, { is_read: r.is_read, id: r.id }])
      );

      const merged: Notification[] = allNotifs.map(n => {
        const status = readMap.get(n.id);
        return {
          ...n,
          is_read: status?.is_read ?? false,
          user_notification_id: status?.id ?? null,
        };
      });

      setNotifications(merged);
    } catch (e) {
      console.error("Failed to fetch notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notif: Notification) => {
    if (notif.is_read) return;
    try {
      if (notif.user_notification_id) {
        await supabase
          .from("user_notifications")
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq("id", notif.user_notification_id);
      } else {
        await supabase.from("user_notifications").insert({
          user_id: session!.user.id,
          notification_id: notif.id,
          is_read: true,
          read_at: new Date().toISOString(),
        });
      }
      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
      );
    } catch (e) {
      console.error("Failed to mark as read:", e);
    }
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) return;
    try {
      for (const n of unread) {
        if (n.user_notification_id) {
          await supabase
            .from("user_notifications")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq("id", n.user_notification_id);
        } else {
          await supabase.from("user_notifications").insert({
            user_id: session!.user.id,
            notification_id: n.id,
            is_read: true,
            read_at: new Date().toISOString(),
          });
        }
      }
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error("Failed to mark all read:", e);
    }
  };

  const openNotif = (notif: Notification) => {
    markAsRead(notif);
    setSelectedNotif(notif);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "hozirgina";
    if (mins < 60) return `${mins} daqiqa oldin`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} soat oldin`;
    const days = Math.floor(hours / 24);
    return `${days} kun oldin`;
  };

  if (!session) return null;

  return (
    <>
      <div className="mb-4">
        {/* Main button */}
        <button
          onClick={() => {
            // If there are notifications, open the first unread or just show list
            setSelectedNotif(null);
          }}
          className="farm-card w-full flex items-center gap-3 py-3 transition-transform active:scale-[0.98]"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
            <Bell className="h-4 w-4 text-primary" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="text-left flex-1">
            <p className="text-xs font-bold text-foreground">Bildirishnomalar</p>
            <p className="text-[10px] text-muted-foreground">
              {loading ? "Yuklanmoqda..." : unreadCount > 0 ? `${unreadCount} ta yangi` : "Barcha o'qilgan"}
            </p>
          </div>
        </button>

        {/* Notification cards */}
        <div className="mt-2 space-y-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-[10px] font-bold text-primary px-1"
            >
              <CheckCheck className="h-3 w-3" />
              Hammasini o'qish
            </button>
          )}

          {notifications.length === 0 && !loading && (
            <div className="farm-card py-6 text-center">
              <Bell className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">Hozircha bildirishnomalar yo'q</p>
            </div>
          )}

          {notifications.map((notif, i) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => openNotif(notif)}
              className={`farm-card overflow-hidden cursor-pointer transition-all active:scale-[0.98] ${
                !notif.is_read ? "border-primary/30 bg-primary/5" : ""
              }`}
            >
              <div className="flex items-start gap-2">
                {!notif.is_read && (
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground line-clamp-1">{notif.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                    {notif.message}
                  </p>
                  <p className="text-[9px] text-muted-foreground/60 mt-1">
                    {timeAgo(notif.created_at)}
                  </p>
                </div>
                {notif.image_url && (
                  <img
                    src={notif.image_url}
                    alt=""
                    className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                    loading="lazy"
                  />
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {selectedNotif && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedNotif(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl bg-background border-t border-border shadow-2xl"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Close button */}
              <div className="flex justify-end px-4">
                <button
                  onClick={() => setSelectedNotif(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-muted transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Image */}
              {selectedNotif.image_url && (
                <div className="px-4 mt-2">
                  <img
                    src={selectedNotif.image_url}
                    alt={selectedNotif.title}
                    className="w-full rounded-2xl object-cover max-h-52"
                  />
                </div>
              )}

              {/* Content */}
              <div className="px-5 pt-4 pb-8">
                <h2 className="text-base font-extrabold text-foreground">
                  {selectedNotif.title}
                </h2>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {timeAgo(selectedNotif.created_at)}
                </p>
                <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap leading-relaxed">
                  {selectedNotif.message}
                </p>

                {/* Button */}
                {selectedNotif.button_text && selectedNotif.button_url && (
                  <a
                    href={selectedNotif.button_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-95 shadow-lg"
                  >
                    {selectedNotif.button_text}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ExternalLink, X, Check, CheckCheck } from "lucide-react";
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
  const [expanded, setExpanded] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!session) return;
    fetchNotifications();
  }, [session]);

  const fetchNotifications = async () => {
    try {
      // Get all notifications
      const { data: allNotifs } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!allNotifs) { setNotifications([]); setLoading(false); return; }

      // Get user's read status
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
    <div className="mb-4">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
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
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </motion.div>
      </button>

      {/* Notifications list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2">
              {/* Mark all read */}
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-primary px-1"
                >
                  <CheckCheck className="h-3 w-3" />
                  Barchasini o'qilgan deb belgilash
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
                  onClick={() => markAsRead(notif)}
                  className={`farm-card overflow-hidden cursor-pointer transition-all ${
                    !notif.is_read ? "border-primary/30 bg-primary/5" : ""
                  }`}
                >
                  {/* Image */}
                  {notif.image_url && (
                    <div className="-mx-4 -mt-4 mb-3">
                      <img
                        src={notif.image_url}
                        alt={notif.title}
                        className="w-full h-36 object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div className="flex items-start gap-2">
                    {!notif.is_read && (
                      <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground">{notif.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 whitespace-pre-wrap">
                        {notif.message}
                      </p>
                      <p className="text-[9px] text-muted-foreground/60 mt-1">
                        {timeAgo(notif.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Button */}
                  {notif.button_text && notif.button_url && (
                    <a
                      href={notif.button_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2 text-[11px] font-bold text-primary-foreground transition-transform active:scale-95"
                    >
                      {notif.button_text}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

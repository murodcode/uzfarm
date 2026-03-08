import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ExternalLink, CheckCheck, X } from "lucide-react";
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
  const [open, setOpen] = useState(false);

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
      {/* Button in profile */}
      <button
        onClick={() => setOpen(true)}
        className="farm-card w-full flex items-center gap-3 py-3 transition-transform active:scale-[0.98] mb-4"
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
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Full-screen overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-background"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur-md">
              <h1 className="text-base font-extrabold text-foreground">🔔 Bildirishnomalar</h1>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary transition-transform active:scale-95"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Hammasini o'qish
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted transition-transform active:scale-90"
                >
                  <X className="h-4 w-4 text-foreground" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto px-4 pt-3 pb-20" style={{ height: 'calc(100vh - 52px)' }}>
              {loading && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="mt-3 text-xs text-muted-foreground">Yuklanmoqda...</p>
                </div>
              )}

              {!loading && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-bold text-muted-foreground">Bildirishnomalar yo'q</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Yangi bildirishnomalar shu yerda ko'rinadi</p>
                </div>
              )}

              <div className="space-y-2.5">
                {notifications.map((notif, i) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => markAsRead(notif)}
                    className={`farm-card overflow-hidden cursor-pointer transition-all ${
                      !notif.is_read ? "border-primary/30 bg-primary/5" : ""
                    }`}
                  >
                    {notif.image_url && (
                      <div className="-mx-4 -mt-4 mb-3">
                        <img
                          src={notif.image_url}
                          alt={notif.title}
                          className="w-full h-40 object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="flex items-start gap-2">
                      {!notif.is_read && (
                        <div className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{notif.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/50 mt-1.5">
                          {timeAgo(notif.created_at)}
                        </p>
                      </div>
                    </div>

                    {notif.button_text && notif.button_url && (
                      <a
                        href={notif.button_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition-transform active:scale-95"
                      >
                        {notif.button_text}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

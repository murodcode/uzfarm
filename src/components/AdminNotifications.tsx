import { useState, useEffect } from "react";
import { Bell, Send, Trash2, Image, Link, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  image_url: string | null;
  button_text: string | null;
  button_url: string | null;
  created_at: string;
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setNotifications(data || []);
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Sarlavha va xabar matnini kiriting");
      return;
    }

    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const insertData: any = {
        title: title.trim(),
        message: message.trim(),
        created_by: user.id,
      };

      if (imageUrl.trim()) insertData.image_url = imageUrl.trim();
      if (buttonText.trim() && buttonUrl.trim()) {
        insertData.button_text = buttonText.trim();
        insertData.button_url = buttonUrl.trim();
      }

      const { error } = await supabase.from("notifications").insert(insertData);
      if (error) throw error;

      toast.success("✅ Bildirishnoma yuborildi!");
      setTitle("");
      setMessage("");
      setImageUrl("");
      setButtonText("");
      setButtonUrl("");
      fetchNotifications();
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;
      toast.success("O'chirildi");
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Send form */}
      <div className="farm-card space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          Yangi bildirishnoma
        </h3>

        <Input
          placeholder="Sarlavha *"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="text-sm"
        />

        <Textarea
          placeholder="Xabar matni *"
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          className="text-sm"
        />

        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            placeholder="Rasm URL (ixtiyoriy)"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Preview image */}
        {imageUrl && (
          <div className="rounded-xl overflow-hidden border border-border">
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full h-32 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          <Link className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            placeholder="Tugma matni"
            value={buttonText}
            onChange={e => setButtonText(e.target.value)}
            className="text-sm flex-1"
          />
          <Input
            placeholder="Tugma URL"
            value={buttonUrl}
            onChange={e => setButtonUrl(e.target.value)}
            className="text-sm flex-1"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={sending || !title.trim() || !message.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground transition-transform active:scale-95 disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? "Yuborilmoqda..." : "Yuborish"}
        </button>
      </div>

      {/* Sent notifications */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-foreground">📋 Yuborilgan bildirishnomalar</h3>
        
        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="farm-card py-6 text-center">
            <p className="text-xs text-muted-foreground">Hali bildirishnomalar yo'q</p>
          </div>
        )}

        {notifications.map(notif => (
          <div key={notif.id} className="farm-card space-y-1.5">
            {notif.image_url && (
              <img
                src={notif.image_url}
                alt=""
                className="w-full h-24 object-cover rounded-lg -mt-1"
              />
            )}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground">{notif.title}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{notif.message}</p>
                {notif.button_text && (
                  <p className="text-[10px] text-primary mt-0.5">🔗 {notif.button_text}</p>
                )}
                <p className="text-[9px] text-muted-foreground/60 mt-1">
                  {new Date(notif.created_at).toLocaleString("uz-UZ")}
                </p>
              </div>
              <button
                onClick={() => handleDelete(notif.id)}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

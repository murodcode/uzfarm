import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Bot, Users, Shield, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ChatMsg {
  id: string;
  message: string;
  sender: string;
  created_at: string;
}

interface GeneralMsg {
  id: string;
  user_id: string;
  message: string;
  first_name: string | null;
  username: string | null;
  photo_url: string | null;
  created_at: string;
}

type ChatTab = "admin" | "general";

export default function Chat() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<ChatTab>("admin");

  // Admin chat state
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unreadAdmin, setUnreadAdmin] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // General chat state
  const [generalMessages, setGeneralMessages] = useState<GeneralMsg[]>([]);
  const [generalInput, setGeneralInput] = useState("");
  const [generalSending, setGeneralSending] = useState(false);
  const [generalLoading, setGeneralLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [chatLocked, setChatLocked] = useState(false);
  const [chatLockMessage, setChatLockMessage] = useState("");
  const generalScrollRef = useRef<HTMLDivElement>(null);

  // Load data on tab change
  useEffect(() => {
    if (!user) return;
    if (tab === "admin") {
      loadAdminMessages();
      setUnreadAdmin(0); // Clear unread when viewing
    } else {
      loadGeneralMessages();
      checkBanStatus();
      checkChatLock();
    }
  }, [user, tab]);

  // Check unread admin messages on mount
  useEffect(() => {
    if (!user) return;
    checkUnreadAdmin();
  }, [user]);

  const checkUnreadAdmin = async () => {
    if (!user) return;
    const { count } = await supabase
      .from("chat_messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("sender", ["admin"])
      .eq("is_read", false);
    setUnreadAdmin(count || 0);
  };

  // Realtime for admin chat (to catch admin replies)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("admin-chat-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.sender === "admin") {
            if (tab === "admin") {
              // Add message directly if viewing admin tab
              setMessages((prev) => [...prev, {
                id: newMsg.id,
                message: newMsg.message,
                sender: newMsg.sender,
                created_at: newMsg.created_at,
              }]);
            } else {
              // Increment unread count
              setUnreadAdmin((prev) => prev + 1);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, tab]);

  // Realtime for general chat
  useEffect(() => {
    if (tab !== "general" || !user) return;

    const channel = supabase
      .channel("general-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "general_chat_messages" },
        (payload) => {
          const newMsg = payload.new as GeneralMsg;
          setGeneralMessages((prev) => [...prev, newMsg]);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "general_chat_messages" },
        (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setGeneralMessages((prev) => prev.filter((m) => m.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tab, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    generalScrollRef.current?.scrollTo({ top: generalScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [generalMessages]);

  // === Admin Chat Functions ===
  const loadAdminMessages = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("id, message, sender, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages((data as ChatMsg[]) || []);
    setLoading(false);
  };

  const handleSendAdmin = async () => {
    if (!input.trim() || !user || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    const tempId = crypto.randomUUID();
    const userMsg: ChatMsg = { id: tempId, message: text, sender: "user", created_at: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);

    try {
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        message: text,
        sender: "user",
      });

      const { data, error } = await supabase.functions.invoke("ai-chat-reply", {
        body: { user_message: text, user_id: user.id },
      });

      if (data?.reply) {
        const aiMsg: ChatMsg = { id: crypto.randomUUID(), message: data.reply, sender: "ai", created_at: new Date().toISOString() };
        setMessages((prev) => [...prev, aiMsg]);
      } else if (data?.enabled === false) {
        const infoMsg: ChatMsg = { id: crypto.randomUUID(), message: "Xabaringiz adminga yuborildi. Tez orada javob olasiz! 📩", sender: "ai", created_at: new Date().toISOString() };
        setMessages((prev) => [...prev, infoMsg]);
      }
    } catch (e: any) {
      toast.error("Xabar yuborishda xatolik");
    } finally {
      setSending(false);
    }
  };

  // === General Chat Functions ===
  const loadGeneralMessages = async () => {
    setGeneralLoading(true);
    const { data } = await supabase
      .from("general_chat_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200);
    setGeneralMessages((data as GeneralMsg[]) || []);
    setGeneralLoading(false);
  };

  const checkBanStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("chat_bans")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    setIsBanned(!!data);
  };

  const checkChatLock = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "general_chat_control")
      .maybeSingle();
    const val = data?.value as any;
    setChatLocked(val?.enabled === false);
    setChatLockMessage(val?.lock_message || "Chat vaqtincha yopilgan");
  };

  const handleSendGeneral = async () => {
    if (!generalInput.trim() || !user || !profile || generalSending || isBanned || chatLocked) return;
    const text = generalInput.trim();
    setGeneralInput("");
    setGeneralSending(true);

    try {
      const { error } = await supabase.from("general_chat_messages").insert({
        user_id: user.id,
        message: text,
        first_name: profile.first_name,
        username: profile.username,
        photo_url: profile.photo_url,
      });
      if (error) throw error;
    } catch (e: any) {
      toast.error("Xabar yuborishda xatolik");
    } finally {
      setGeneralSending(false);
    }
  };

  return (
    <div className="min-h-screen safe-bottom flex flex-col">
      {/* Header */}
      <div className="px-4 pt-8 pb-3">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <MessageCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-foreground">💬 Chat</h1>
            <p className="text-[10px] text-muted-foreground">Muloqot va yordam</p>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setTab("admin")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all ${
              tab === "admin"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Admin bilan bog'lanish
          </button>
          <button
            onClick={() => setTab("general")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all ${
              tab === "general"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Umumiy chat
          </button>
        </div>
      </div>

      {/* === Admin Chat Tab === */}
      {tab === "admin" && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-2 pb-2" style={{ maxHeight: "calc(100vh - 250px)" }}>
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-10">
                <span className="text-4xl">🌾</span>
                <p className="text-sm text-muted-foreground mt-2">Savol bering, biz yordam beramiz!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      msg.sender === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : msg.sender === "admin"
                        ? "bg-emerald-500/15 border border-emerald-500/30 text-foreground rounded-bl-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.sender === "admin" && (
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">👨‍💼 Admin</span>
                    )}
                    {msg.sender === "ai" && (
                      <span className="text-[9px] font-bold opacity-60">🤖 AI</span>
                    )}
                    <p className="mt-0.5 whitespace-pre-wrap">{msg.message}</p>
                    <p className={`text-[9px] mt-1 ${msg.sender === "user" ? "opacity-60" : "text-muted-foreground"}`}>
                      {new Date(msg.created_at).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
            {sending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-t border-border bg-card/95 backdrop-blur-md">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendAdmin()}
                placeholder="Savolingizni yozing..."
                className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleSendAdmin}
                disabled={!input.trim() || sending}
                className="rounded-xl bg-primary px-4 py-2.5 text-primary-foreground disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* === General Chat Tab === */}
      {tab === "general" && (
        <>
          <div ref={generalScrollRef} className="flex-1 overflow-y-auto px-4 space-y-2 pb-2" style={{ maxHeight: "calc(100vh - 250px)" }}>
            {generalLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : generalMessages.length === 0 ? (
              <div className="text-center py-10">
                <span className="text-4xl">💬</span>
                <p className="text-sm text-muted-foreground mt-2">Hali xabar yo'q. Birinchi bo'ling!</p>
              </div>
            ) : (
              generalMessages.map((msg) => {
                const isMe = msg.user_id === user?.id;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      {!isMe && (
                        <p className="text-[9px] font-bold text-primary mb-0.5">
                          {msg.first_name || "Noma'lum"} {msg.username ? `@${msg.username}` : ""}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-[9px] mt-1 ${isMe ? "opacity-60" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Input or locked/banned message */}
          <div className="px-4 py-3 border-t border-border bg-card/95 backdrop-blur-md">
            {chatLocked ? (
              <div className="text-center py-2">
                <p className="text-xs font-bold text-destructive">🔒 {chatLockMessage}</p>
              </div>
            ) : isBanned ? (
              <div className="text-center py-2">
                <p className="text-xs font-bold text-destructive">🚫 Sizga chatda yozish taqiqlangan</p>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={generalInput}
                  onChange={(e) => setGeneralInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendGeneral()}
                  placeholder="Xabar yozing..."
                  className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={handleSendGeneral}
                  disabled={!generalInput.trim() || generalSending}
                  className="rounded-xl bg-primary px-4 py-2.5 text-primary-foreground disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

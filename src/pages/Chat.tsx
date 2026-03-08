import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ChatMsg {
  id: string;
  message: string;
  sender: string;
  created_at: string;
}

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    loadMessages();
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const loadMessages = async () => {
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

  const handleSend = async () => {
    if (!input.trim() || !user || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    // Optimistically add user message
    const tempId = crypto.randomUUID();
    const userMsg: ChatMsg = { id: tempId, message: text, sender: "user", created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      // Insert user message
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        message: text,
        sender: "user",
      });

      // Call AI for reply
      const { data, error } = await supabase.functions.invoke("ai-chat-reply", {
        body: { user_message: text, user_id: user.id },
      });

      if (data?.reply) {
        const aiMsg: ChatMsg = { id: crypto.randomUUID(), message: data.reply, sender: "ai", created_at: new Date().toISOString() };
        setMessages(prev => [...prev, aiMsg]);
      } else if (data?.enabled === false) {
        // AI disabled, message sent to admin
        const infoMsg: ChatMsg = { id: crypto.randomUUID(), message: "Xabaringiz adminga yuborildi. Tez orada javob olasiz! 📩", sender: "ai", created_at: new Date().toISOString() };
        setMessages(prev => [...prev, infoMsg]);
      }
    } catch (e: any) {
      toast.error("Xabar yuborishda xatolik");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen safe-bottom flex flex-col">
      <div className="px-4 pt-8 pb-3">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-foreground">🤖 Farm Yordamchi</h1>
            <p className="text-[10px] text-muted-foreground">Ferma haqida savol bering!</p>
          </div>
        </motion.div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-2 pb-2" style={{ maxHeight: "calc(100vh - 200px)" }}>
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
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                msg.sender === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : msg.sender === "admin"
                  ? "bg-emerald-500/15 border border-emerald-500/30 text-foreground rounded-bl-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}>
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

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card/95 backdrop-blur-md">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Savolingizni yozing..."
            className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="rounded-xl bg-primary px-4 py-2.5 text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

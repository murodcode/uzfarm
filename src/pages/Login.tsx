import { useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { session, loading, telegramUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm text-center"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-4xl mx-auto mb-6">
          🌾
        </div>
        <h1 className="text-2xl font-extrabold text-foreground mb-2">Farm Empire</h1>

        {loading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Telegram orqali kirilmoqda...
          </div>
        ) : !session ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Iltimos, bu ilovani Telegram bot orqali oching.
            </p>
            <p className="text-xs text-muted-foreground">
              @Farm_Market_bot → Menu → Open App
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Muvaffaqiyatli kirdingiz! Yo'naltirilmoqda...
          </p>
        )}
      </motion.div>
    </div>
  );
}

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wallet, Clock, CheckCircle2, XCircle, CreditCard } from "lucide-react";
import TelegramBackButton from "@/components/TelegramBackButton";

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  card_number: string | null;
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function maskCard(card: string | null): string {
  if (!card) return "—";
  const digits = card.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `**** **** **** ${digits.slice(-4)}`;
}

export default function Withdraw() {
  const { profile, refreshProfile } = useAuth();
  const [amount, setAmount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [minWithdrawal, setMinWithdrawal] = useState(20000);
  const [coinsPerSom, setCoinsPerSom] = useState(4);

  const [withdrawalEnabled, setWithdrawalEnabled] = useState(true);
  const [paymentDayText, setPaymentDayText] = useState("");

  const cash = profile?.cash ?? 0;
  const numAmount = parseInt(amount) || 0;
  const cardDigits = cardNumber.replace(/\D/g, "");
  const isValid = numAmount >= minWithdrawal && numAmount <= cash && cardDigits.length === 16 && withdrawalEnabled;

  const coinsToSom = (coins: number) => Math.floor(coins / coinsPerSom).toLocaleString();

  // Load settings from DB
  useEffect(() => {
    supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["withdrawal", "withdrawal_control", "payment_day"])
      .then(({ data }) => {
        if (data) {
          for (const row of data) {
            const v = row.value as any;
            if (row.key === "withdrawal" && typeof v === "object") {
              if (v.min_amount) setMinWithdrawal(v.min_amount);
              if (v.coins_per_som) setCoinsPerSom(v.coins_per_som);
            }
            if (row.key === "withdrawal_control" && typeof v === "object") {
              setWithdrawalEnabled(v.enabled !== false);
            }
            if (row.key === "payment_day" && typeof v === "object") {
              setPaymentDayText(v.text || "");
            }
          }
        }
      });
  }, []);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from("withdrawal_requests")
      .select("id, amount, status, requested_at, card_number")
      .eq("user_id", profile.id)
      .order("requested_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setRequests(data);
      });
  }, [profile]);

  const handleWithdraw = async () => {
    if (!isValid || loading || !profile) return;
    setLoading(true);

    const { data: insertData, error } = await supabase.from("withdrawal_requests").insert({
      user_id: profile.id,
      amount: numAmount,
      card_number: cardDigits,
    }).select("id").single();

    if (error) {
      setLoading(false);
      toast.error("Xatolik yuz berdi");
      return;
    }

    const newCash = cash - numAmount;
    await supabase.from("profiles").update({ cash: newCash }).eq("id", profile.id);

    if (insertData?.id) {
      supabase.functions.invoke("process-referral-bonus", {
        body: { withdrawal_id: insertData.id },
      }).catch(console.error);

      supabase.functions.invoke("admin-data", {
        body: {
          action: "notify_withdrawal_bot",
          user_id: profile.id,
          amount: numAmount,
          card_number: cardDigits,
        },
      }).catch(console.error);
    }

    await refreshProfile();

    toast.success(`💵 ${numAmount.toLocaleString()} balans chiqarish so'rovi yuborildi!`);
    setAmount("");
    setCardNumber("");
    setLoading(false);

    const { data } = await supabase
      .from("withdrawal_requests")
      .select("id, amount, status, requested_at, card_number")
      .eq("user_id", profile.id)
      .order("requested_at", { ascending: false })
      .limit(20);
    if (data) setRequests(data);
  };

  const statusConfig = {
    pending: { icon: Clock, label: "Kutilmoqda", color: "text-accent" },
    approved: { icon: CheckCircle2, label: "Tasdiqlandi", color: "text-primary" },
    rejected: { icon: XCircle, label: "Rad etildi", color: "text-destructive" },
  };

  return (
    <div className="min-h-screen safe-bottom">
      <TelegramBackButton />
      <div className="gradient-hero px-4 pb-6 pt-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-extrabold text-primary-foreground">💵 Pul chiqarish</h1>
          <p className="text-xs text-primary-foreground/70 mt-1">
            Naqd pulingizni karta orqali chiqarib oling
          </p>
          <div className="mt-4 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/10 p-4 text-center">
            <p className="text-xs font-semibold text-primary-foreground/70">Mavjud balans</p>
            <p className="text-3xl font-black text-primary-foreground">💵 {cash.toLocaleString()}</p>
            <p className="text-xs text-primary-foreground/60 mt-1">≈ {coinsToSom(cash)} so'm</p>
          </div>
        </motion.div>
      </div>

      <div className="px-4 -mt-3 space-y-4 pb-4">
        {/* Payment day banner */}
        {paymentDayText && (
          <div className="farm-card bg-accent/10 border-accent/20">
            <p className="text-sm font-bold text-foreground text-center">
              📅 {paymentDayText}
            </p>
          </div>
        )}

        {/* Withdrawal disabled banner */}
        {!withdrawalEnabled && (
          <div className="farm-card bg-destructive/10 border-destructive/20">
            <p className="text-sm font-bold text-destructive text-center">
              ⚠️ Hozircha to'lovlar vaqtincha yopilgan. Iltimos, kuting.
            </p>
          </div>
        )}

        {/* Info banner */}
        <div className="farm-card bg-primary/5 border-primary/20">
          <p className="text-xs font-semibold text-foreground text-center">
            💰 Minimal chiqarish: <span className="text-primary">{minWithdrawal.toLocaleString()} balans</span> = <span className="text-primary">{coinsToSom(minWithdrawal)} so'm</span>
          </p>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="farm-card">
          <h2 className="text-sm font-bold text-foreground mb-3">Chiqarish miqdori</h2>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Kamida ${minWithdrawal.toLocaleString()}`}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex justify-between mt-1 mb-3">
            <p className="text-xs text-muted-foreground">
              {numAmount > 0 ? `≈ ${coinsToSom(numAmount)} so'm` : `Minimum: ${minWithdrawal.toLocaleString()}`}
            </p>
            <button onClick={() => setAmount(String(cash))} className="text-xs font-bold text-primary">
              Hammasi
            </button>
          </div>

          <h2 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
            <CreditCard className="h-4 w-4" /> Karta raqami
          </h2>
          <input
            type="text"
            inputMode="numeric"
            value={formatCardNumber(cardNumber)}
            onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))}
            placeholder="XXXX XXXX XXXX XXXX"
            maxLength={19}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring tracking-widest"
          />
          {cardDigits.length > 0 && cardDigits.length < 16 && (
            <p className="text-xs text-destructive mt-1">16 xonali karta raqamini kiriting</p>
          )}

          <button
            onClick={handleWithdraw}
            disabled={!isValid || loading}
            className="w-full mt-4 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-transform active:scale-95 disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
          >
            <Wallet className="inline h-4 w-4 mr-1" />
            {loading ? "Kutilmoqda..." : "Chiqarish so'rovini yuborish"}
          </button>
        </motion.div>

        {requests.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <h2 className="text-sm font-bold text-foreground mb-3">So'rovlar tarixi</h2>
            <div className="space-y-2">
              {requests.map((req) => {
                const cfg = statusConfig[req.status as keyof typeof statusConfig] || statusConfig.pending;
                return (
                  <div key={req.id} className="farm-card flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <cfg.icon className={`h-4 w-4 ${cfg.color}`} />
                      <div>
                        <p className="text-sm font-bold text-foreground">💵 {req.amount.toLocaleString()} <span className="text-xs text-muted-foreground">({coinsToSom(req.amount)} so'm)</span></p>
                        <p className="text-[10px] text-muted-foreground">
                          {maskCard(req.card_number)} · {new Date(req.requested_at).toLocaleDateString("uz-UZ")}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        <div className="farm-card bg-farm-gold-light border-farm-gold/20">
          <p className="text-xs font-semibold text-accent-foreground">
            💡 Chiqarish so'rovi adminga yuboriladi. Tasdiqlangandan so'ng pulingiz kartangizga o'tkaziladi.
          </p>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import TelegramBackButton from "@/components/TelegramBackButton";
import { motion } from "framer-motion";
import {
  Shield, Users, Banknote, CheckCircle, XCircle, Loader2,
  BarChart3, Ban, Plus, Trash2, Eye, UserPlus, Coins, DollarSign, MinusCircle, PlusCircle, Settings, CreditCard, Trophy, Send, MessageCircle, ScrollText
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  requested_at: string;
  card_display?: string | null;
  profile?: { first_name: string | null; username: string | null; telegram_id: number | null };
}

interface Stats {
  totalUsers: number;
  todayUsers: number;
  blockedUsers: number;
  totalCoins: number;
  totalCash: number;
  totalAdViews: number;
  todayAdViews: number;
  totalReferrals: number;
  todayReferrals: number;
  pendingWithdrawals: number;
}

interface UserDetail {
  id: string;
  first_name: string | null;
  username: string | null;
  telegram_id: number | null;
  photo_url: string | null;
  coins: number;
  cash: number;
  eggs: number;
  meat: number;
  milk: number;
  ad_views: number;
  is_blocked: boolean;
  referral_count: number;
  referral_earnings: number;
  level: number;
  animal_count?: number;
}

type Tab = "stats" | "withdrawals" | "users" | "tasks" | "settings" | "referral_rank" | "messaging" | "admins" | "activity";

export default function Admin() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [profiles, setProfiles] = useState<UserDetail[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<UserDetail[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("stats");

  // Balance adjust modal state
  const [adjustUser, setAdjustUser] = useState<any>(null);
  const [adjustField, setAdjustField] = useState<"coins" | "cash">("coins");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [appSettings, setAppSettings] = useState<Record<string, any>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  // New task form
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({
    name: "", description: "", reward_coins: 0, reward_cash: 0,
    is_daily: false, requirement_type: "subscribe", requirement_value: 1,
    url: "", task_type: "general"
  });
  // Referral leaderboard
  const [refPeriod, setRefPeriod] = useState<"daily" | "weekly" | "all">("daily");
  const [refLeaderboard, setRefLeaderboard] = useState<any[]>([]);
  const [selectedRefUser, setSelectedRefUser] = useState<any>(null);
  // Messaging
  const [msgTargetTgId, setMsgTargetTgId] = useState("");
  const [msgText, setMsgText] = useState("");
  const [broadcastText, setBroadcastText] = useState("");
  // Admin management
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [newAdminTgId, setNewAdminTgId] = useState("");

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/profile", { replace: true });
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchData();
  }, [isAdmin, tab]);

  const callAdmin = async (body: any) => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-data", { body });
      
      // Check data.error first (edge function returned JSON with error field)
      if (data?.error) {
        throw new Error(data.error);
      }
      
      if (error) {
        console.error("Admin function error:", error);
        let msg = "Noma'lum xatolik";
        
        // Try to extract message from FunctionsHttpError context
        try {
          if (error.context && typeof error.context.json === 'function') {
            const cloned = error.context.clone();
            const resp = await cloned.json();
            msg = resp?.error || error.message || msg;
          } else {
            msg = error.message || msg;
          }
        } catch {
          msg = error.message || msg;
        }
        
        throw new Error(msg);
      }
      
      return data;
    } catch (e: any) {
      // Re-throw if already our error
      if (e.message && e.message !== "Noma'lum xatolik") {
        throw e;
      }
      console.error("callAdmin catch:", e);
      throw new Error(e?.message || "Server bilan aloqa xatoligi");
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === "stats") {
        const data = await callAdmin({ action: "get_stats" });
        setStats(data?.stats || null);
      } else if (tab === "withdrawals") {
        const data = await callAdmin({ action: "get_withdrawals" });
        setWithdrawals(data?.withdrawals || []);
      } else if (tab === "users") {
        const data = await callAdmin({ action: "get_users" });
        const users = data?.users || [];
        setProfiles(users);
        setFilteredProfiles(users);
        setSearchQuery("");
      } else if (tab === "tasks") {
        const data = await callAdmin({ action: "get_tasks" });
        setTasks(data?.tasks || []);
      } else if (tab === "settings") {
        const data = await callAdmin({ action: "get_settings" });
        setAppSettings(data?.settings || {});
      } else if (tab === "referral_rank") {
        await fetchRefLeaderboard();
      } else if (tab === "admins") {
        const data = await callAdmin({ action: "get_admins" });
        setAdminsList(data?.admins || []);
      }
    } catch (e: any) {
      console.error("Fetch error:", e);
      toast.error("Ma'lumot yuklashda xatolik: " + e.message);
    }
    setLoading(false);
  };

  const handleWithdrawal = async (id: string, action: "approved" | "rejected") => {
    if (processing) return;
    setProcessing("withdrawal");
    try {
      await callAdmin({ action: "update_withdrawal", withdrawal_id: id, status: action });
      toast.success(action === "approved" ? "Tasdiqlandi" : "Rad etildi");
      fetchData();
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleToggleBlock = async (userId: string, currentBlocked: boolean) => {
    if (processing) return;
    setProcessing("block");
    const toastId = toast.loading(currentBlocked ? "Blokdan olinmoqda..." : "Bloklanmoqda...");
    try {
      await callAdmin({ action: "toggle_block", target_user_id: userId, blocked: !currentBlocked });
      toast.success(currentBlocked ? "Blokdan olindi" : "Bloklandi", { id: toastId });
      fetchData();
    } catch (e: any) {
      toast.error("Xatolik: " + e.message, { id: toastId });
    } finally {
      setProcessing(null);
    }
  };

  const handleAdjustBalance = async (direction: "add" | "subtract") => {
    if (!adjustUser || !adjustAmount || processing) return;
    const rawAmount = Math.abs(parseInt(adjustAmount));
    if (isNaN(rawAmount) || rawAmount === 0) {
      toast.error("Miqdor noto'g'ri");
      return;
    }

    const amount = direction === "subtract" ? -rawAmount : rawAmount;
    setProcessing("adjust");
    const toastId = toast.loading(direction === "add" ? "Qo'shilmoqda..." : "Ayirilmoqda...");
    try {
      const result = await callAdmin({ action: "adjust_balance", target_user_id: adjustUser.id, field: adjustField, amount });
      toast.success(`Balans o'zgartirildi. Yangi qiymat: ${result.newValue}`, { id: toastId });
      setAdjustUser(null);
      setAdjustAmount("");
      fetchData();
    } catch (e: any) {
      toast.error("Xatolik: " + e.message, { id: toastId });
    } finally {
      setProcessing(null);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.name || !newTask.description) return;
    try {
      await callAdmin({ action: "create_task", task: newTask });
      toast.success("Vazifa yaratildi");
      setShowTaskForm(false);
      setNewTask({ name: "", description: "", reward_coins: 0, reward_cash: 0, is_daily: false, requirement_type: "subscribe", requirement_value: 1, url: "", task_type: "general" });
      fetchData();
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await callAdmin({ action: "delete_task", task_id: taskId });
      toast.success("Vazifa o'chirildi");
      fetchData();
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    }
  };

  const fetchRefLeaderboard = async () => {
    try {
      const data = await callAdmin({ action: "get_referral_leaderboard", period: refPeriod });
      setRefLeaderboard(data?.leaderboard || []);
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    }
  };

  // Re-fetch when period changes
  useEffect(() => {
    if (tab === "referral_rank" && isAdmin) {
      setLoading(true);
      fetchRefLeaderboard().finally(() => setLoading(false));
    }
  }, [refPeriod]);

  const handleSendMessage = async () => {
    if (!msgTargetTgId || !msgText || processing) return;
    setProcessing("msg");
    try {
      await callAdmin({ action: "send_user_message", telegram_id: parseInt(msgTargetTgId), text: msgText });
      toast.success("Xabar yuborildi!");
      setMsgText("");
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastText || processing) return;
    setProcessing("broadcast");
    try {
      const data = await callAdmin({ action: "broadcast_message", text: broadcastText });
      toast.success(`Xabar yuborildi! ${data?.sent || 0} ta foydalanuvchiga`);
      setBroadcastText("");
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setProcessing(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const handleAddAdmin = async () => {
    if (!newAdminTgId || processing) return;
    setProcessing("admin");
    try {
      await callAdmin({ action: "add_admin", telegram_id: parseInt(newAdminTgId) });
      toast.success("Admin qo'shildi!");
      setNewAdminTgId("");
      fetchData();
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleRemoveAdmin = async (targetUserId: string) => {
    if (processing) return;
    setProcessing("admin");
    try {
      await callAdmin({ action: "remove_admin", target_user_id: targetUserId });
      toast.success("Admin o'chirildi!");
      fetchData();
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setProcessing(null);
    }
  };

  const handleFetchActivityLogs = async () => {
    if (!activityUserId) return;
    setActivityLoading(true);
    try {
      // Try to find user by telegram_id, username, or uuid
      let targetId = activityUserId.trim();
      
      // If it looks like a telegram ID or username, resolve to UUID
      if (!targetId.includes("-")) {
        const data = await callAdmin({ action: "get_users" });
        const users = data?.users || [];
        const found = users.find((u: any) =>
          u.telegram_id?.toString() === targetId ||
          u.username?.toLowerCase() === targetId.toLowerCase().replace("@", "") ||
          u.id === targetId
        );
        if (found) {
          targetId = found.id;
        } else {
          toast.error("Foydalanuvchi topilmadi");
          setActivityLoading(false);
          return;
        }
      }

      const data = await callAdmin({ action: "get_user_logs", target_user_id: targetId, limit: 200 });
      setActivityLogs(data?.logs || []);
      setActivityProfile(data?.profile || null);
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setActivityLoading(false);
    }
  };

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "stats", label: "Statistika", icon: BarChart3 },
    { key: "withdrawals", label: "So'rovlar", icon: Banknote },
    { key: "users", label: "Foydalanuvchilar", icon: Users },
    { key: "activity", label: "Faoliyat", icon: ScrollText },
    { key: "referral_rank", label: "Ref.reyting", icon: Trophy },
    { key: "tasks", label: "Vazifalar", icon: CheckCircle },
    { key: "messaging", label: "Xabarlar", icon: MessageCircle },
    { key: "admins", label: "Adminlar", icon: Shield },
    { key: "settings", label: "Sozlamalar", icon: Settings },
  ];

  return (
    <div className="min-h-screen safe-bottom pb-4">
      <TelegramBackButton />
      <div className="gradient-hero px-4 pb-6 pt-10">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <Shield className="h-10 w-10 text-primary-foreground mx-auto mb-2" />
          <h1 className="text-xl font-extrabold text-primary-foreground">Admin Panel</h1>
        </motion.div>
      </div>

      <div className="px-4 -mt-3">
        {/* Tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`py-2 px-3 rounded-xl text-[10px] font-bold transition-all flex flex-col items-center gap-0.5 shrink-0 ${
                tab === t.key ? "bg-primary text-primary-foreground" : "farm-card text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* === STATS === */}
            {tab === "stats" && stats && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <StatBox icon={Users} label="Jami foydalanuvchilar" value={stats.totalUsers} />
                  <StatBox icon={UserPlus} label="Bugungi yangi" value={stats.todayUsers} color="text-primary" />
                  <StatBox icon={Ban} label="Bloklangan" value={stats.blockedUsers} color="text-destructive" />
                  <StatBox icon={Banknote} label="Kutilayotgan so'rovlar" value={stats.pendingWithdrawals} color="text-farm-gold" />
                  <StatBox icon={Coins} label="Jami tangalar" value={stats.totalCoins.toLocaleString()} />
                  <StatBox icon={DollarSign} label="Jami naqd pul" value={stats.totalCash.toLocaleString()} />
                  <StatBox icon={Eye} label="Jami reklama" value={stats.totalAdViews.toLocaleString()} color="text-primary" />
                  <StatBox icon={Eye} label="Bugungi reklama" value={stats.todayAdViews} color="text-primary" />
                  <StatBox icon={Users} label="Jami referallar" value={stats.totalReferrals} />
                  <StatBox icon={UserPlus} label="Bugungi referallar" value={stats.todayReferrals} color="text-primary" />
                </div>
              </div>
            )}

            {/* === WITHDRAWALS === */}
            {tab === "withdrawals" && (
              <div className="space-y-3">
                {withdrawals.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">So'rovlar yo'q</p>
                ) : (
                  withdrawals.map((w) => (
                    <motion.div key={w.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="farm-card">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-sm font-bold text-foreground">{w.profile?.first_name || "Noma'lum"}</p>
                          <p className="text-[10px] text-muted-foreground">@{w.profile?.username || "—"} · TG: {w.profile?.telegram_id || "—"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-foreground">💵 {w.amount.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">≈ {Math.floor(w.amount / 10).toLocaleString()} so'm</p>
                        </div>
                      </div>
                      {/* Card number - large and prominent */}
                      {w.card_display && (
                        <div className="mb-2 rounded-xl bg-muted/50 p-3 text-center">
                          <p className="text-[10px] text-muted-foreground mb-1">Karta raqami</p>
                          <p className="text-lg font-mono font-bold text-foreground tracking-wider">
                            {w.card_display.length === 16 ? w.card_display.replace(/(.{4})/g, "$1 ").trim() : w.card_display}
                          </p>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground mb-1">
                        {new Date(w.requested_at).toLocaleString("uz-UZ")}
                      </p>
                      {w.status === "pending" ? (
                        <div className="flex gap-2">
                          <button onClick={() => handleWithdrawal(w.id, "approved")} className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground">
                            <CheckCircle className="h-3.5 w-3.5" /> Tasdiqlash
                          </button>
                          <button onClick={() => handleWithdrawal(w.id, "rejected")} className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-destructive py-2 text-xs font-bold text-destructive-foreground">
                            <XCircle className="h-3.5 w-3.5" /> Rad etish
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-block rounded-full px-3 py-1 text-[10px] font-bold ${w.status === "approved" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                          {w.status === "approved" ? "✅ Tasdiqlangan" : "❌ Rad etilgan"}
                        </span>
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* === USERS === */}
            {tab === "users" && (
              <div className="space-y-3">
                {/* Search */}
                <Input
                  placeholder="🔍 ID, ism yoki username bo'yicha qidirish..."
                  value={searchQuery}
                  onChange={(e) => {
                    const q = e.target.value.toLowerCase();
                    setSearchQuery(e.target.value);
                    if (!q) {
                      setFilteredProfiles(profiles);
                    } else {
                      setFilteredProfiles(profiles.filter((p) =>
                        (p.first_name?.toLowerCase().includes(q)) ||
                        (p.username?.toLowerCase().includes(q)) ||
                        (p.telegram_id?.toString().includes(q)) ||
                        (p.id.toLowerCase().includes(q))
                      ));
                    }
                  }}
                  className="text-xs"
                />
                {filteredProfiles.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    {searchQuery ? "Topilmadi" : "Foydalanuvchilar yo'q"}
                  </p>
                ) : (
                  filteredProfiles.map((p) => (
                    <div key={p.id} className="farm-card">
                      <div className="flex items-center gap-3">
                        {p.photo_url ? (
                          <img src={p.photo_url} className="h-10 w-10 rounded-full" alt="" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg">🧑‍🌾</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-foreground truncate">{p.first_name || "Noma'lum"}</p>
                            {p.is_blocked && <span className="text-[9px] bg-destructive/10 text-destructive rounded-full px-1.5 py-0.5 font-bold">BLOCK</span>}
                            <span className="text-[9px] bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 font-bold">Lv.{p.level || 1}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">@{p.username || "—"} · TG: {p.telegram_id || "—"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-foreground">🪙 {(p.coins || 0).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">💵 {(p.cash || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      {/* User details */}
                      <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
                        <div className="rounded-lg bg-muted/50 py-1">
                          <p className="text-[10px] text-muted-foreground">👥 Ref</p>
                          <p className="text-xs font-bold text-foreground">{p.referral_count || 0}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 py-1">
                          <p className="text-[10px] text-muted-foreground">🐾 Hayvon</p>
                          <p className="text-xs font-bold text-foreground">{p.animal_count ?? 0}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 py-1">
                          <p className="text-[10px] text-muted-foreground">👁 Reklama</p>
                          <p className="text-xs font-bold text-foreground">{p.ad_views || 0}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 py-1">
                          <p className="text-[10px] text-muted-foreground">🪙 Ref.dar</p>
                          <p className="text-xs font-bold text-foreground">{(p.referral_earnings || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 mt-2">
                        <button
                          onClick={() => handleToggleBlock(p.id, p.is_blocked)}
                          className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-bold ${
                            p.is_blocked ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          <Ban className="h-3 w-3" />
                          {p.is_blocked ? "Blokdan olish" : "Bloklash"}
                        </button>
                        <button
                          onClick={() => { setAdjustUser(p); setAdjustField("coins"); }}
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-bold bg-primary/10 text-primary"
                        >
                          <Coins className="h-3 w-3" /> Tanga
                        </button>
                        <button
                          onClick={() => { setAdjustUser(p); setAdjustField("cash"); }}
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-bold bg-accent/10 text-accent-foreground"
                        >
                          <DollarSign className="h-3 w-3" /> Pul
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* === TASKS === */}
            {tab === "tasks" && (
              <div className="space-y-3">
                <button
                  onClick={() => setShowTaskForm(!showTaskForm)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground"
                >
                  <Plus className="h-3.5 w-3.5" /> Yangi vazifa qo'shish
                </button>

                {showTaskForm && (
                  <div className="farm-card space-y-2.5">
                    <div>
                      <label className="text-[10px] text-muted-foreground font-bold">Vazifa turi</label>
                      <select
                        value={newTask.task_type}
                        onChange={(e) => setNewTask({...newTask, task_type: e.target.value})}
                        className="w-full text-xs rounded-lg border border-input bg-background px-2 py-2 mt-0.5"
                      >
                        <option value="general">Umumiy</option>
                        <option value="subscribe">Kanalga obuna bo'lish</option>
                        <option value="buy_animal">Hayvon sotib olish</option>
                        <option value="slaughter">So'yish</option>
                        <option value="collect_eggs">Tuxum yig'ish</option>
                      </select>
                    </div>
                    <Input placeholder="Vazifa nomi" value={newTask.name} onChange={(e) => setNewTask({...newTask, name: e.target.value})} className="text-xs" />
                    <Input placeholder="Tavsif" value={newTask.description} onChange={(e) => setNewTask({...newTask, description: e.target.value})} className="text-xs" />

                    {newTask.task_type === "subscribe" && (
                      <>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-bold">Kanal ID (masalan: -1001234567890 yoki @channel_name)</label>
                          <Input
                            placeholder="-1001234567890"
                            value={newTask.requirement_type}
                            onChange={(e) => setNewTask({...newTask, requirement_type: e.target.value})}
                            className="text-xs mt-0.5"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground font-bold">Kanal havolasi (t.me/...)</label>
                          <Input
                            placeholder="https://t.me/channel_name"
                            value={newTask.url}
                            onChange={(e) => setNewTask({...newTask, url: e.target.value})}
                            className="text-xs mt-0.5"
                          />
                        </div>
                      </>
                    )}

                    {newTask.task_type !== "subscribe" && (
                      <Input placeholder="Havola (URL)" value={newTask.url} onChange={(e) => setNewTask({...newTask, url: e.target.value})} className="text-xs" />
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-muted-foreground">Mukofot (tanga)</label>
                        <Input type="number" value={newTask.reward_coins} onChange={(e) => setNewTask({...newTask, reward_coins: parseInt(e.target.value) || 0})} className="text-xs" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground">Mukofot (pul)</label>
                        <Input type="number" value={newTask.reward_cash} onChange={(e) => setNewTask({...newTask, reward_cash: parseInt(e.target.value) || 0})} className="text-xs" />
                      </div>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs">
                      <input type="checkbox" checked={newTask.is_daily} onChange={(e) => setNewTask({...newTask, is_daily: e.target.checked})} className="rounded" />
                      Kunlik vazifa
                    </label>
                    <button onClick={handleCreateTask} className="w-full rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground">
                      Saqlash
                    </button>
                  </div>
                )}

                {tasks.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Vazifalar yo'q</p>
                ) : (
                  tasks.map((t: any) => (
                    <div key={t.id} className="farm-card">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-foreground">{t.name}</p>
                            {t.is_daily && <span className="text-[9px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-bold">KUNLIK</span>}
                            {t.task_type === "subscribe" && <span className="text-[9px] bg-accent/10 text-accent-foreground rounded-full px-1.5 py-0.5 font-bold">OBUNA</span>}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{t.description}</p>
                          {t.url && <p className="text-[10px] text-primary mt-0.5 truncate">{t.url}</p>}
                          <div className="flex gap-2 mt-1">
                            {t.reward_coins > 0 && <span className="text-[10px] font-bold text-foreground">🪙 +{t.reward_coins}</span>}
                            {t.reward_cash > 0 && <span className="text-[10px] font-bold text-foreground">💵 +{t.reward_cash}</span>}
                          </div>
                        </div>
                        <button onClick={() => handleDeleteTask(t.id)} className="text-destructive p-1">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* === REFERRAL LEADERBOARD === */}
            {tab === "referral_rank" && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {(["daily", "weekly", "all"] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setRefPeriod(p)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        refPeriod === p ? "bg-primary text-primary-foreground" : "farm-card text-foreground"
                      }`}
                    >
                      {p === "daily" ? "📅 Kunlik" : p === "weekly" ? "📆 Haftalik" : "🏆 Hammasi"}
                    </button>
                  ))}
                </div>

                {refLeaderboard.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Ma'lumot topilmadi</p>
                ) : (
                  refLeaderboard.map((u: any, i: number) => (
                    <div key={u.id} className="farm-card cursor-pointer" onClick={() => setSelectedRefUser(selectedRefUser?.id === u.id ? null : u)}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-black">
                          {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                        </div>
                        {u.photo_url ? (
                          <img src={u.photo_url} className="h-9 w-9 rounded-full shrink-0 object-cover" alt="" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg">🧑‍🌾</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{u.first_name || "Noma'lum"}</p>
                          <p className="text-[10px] text-muted-foreground">@{u.username || "—"} · TG: {u.telegram_id || "—"}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-primary">👥 {u.referral_count}</p>
                          <p className="text-[10px] text-muted-foreground">🪙 {(u.referral_earnings || 0).toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Expanded: show referrals */}
                      {selectedRefUser?.id === u.id && u.referrals && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2">
                          <p className="text-xs font-bold text-foreground">📋 Taklif qilganlari:</p>
                          {u.referrals.length === 0 ? (
                            <p className="text-xs text-muted-foreground">Hali referal yo'q</p>
                          ) : (
                            u.referrals.map((ref: any) => (
                              <div key={ref.id} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-foreground truncate">{ref.first_name || "Noma'lum"}</p>
                                  <p className="text-[10px] text-muted-foreground">@{ref.username || "—"}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-bold text-foreground">🪙 {(ref.coins || 0).toLocaleString()}</p>
                                  <p className="text-[10px] text-muted-foreground">💵 {(ref.cash || 0).toLocaleString()}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* === MESSAGING === */}
            {tab === "messaging" && (
              <div className="space-y-4">
                {/* Send to individual user */}
                <div className="farm-card space-y-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Send className="h-4 w-4" /> Foydalanuvchiga xabar
                  </h3>
                  <Input
                    placeholder="Telegram ID kiriting"
                    value={msgTargetTgId}
                    onChange={(e) => setMsgTargetTgId(e.target.value)}
                    className="text-xs"
                    type="number"
                  />
                  <textarea
                    placeholder="Xabar matni..."
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!msgTargetTgId || !msgText || processing === "msg"}
                    className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {processing === "msg" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Yuborish
                  </button>
                </div>

                {/* Broadcast to all */}
                <div className="farm-card space-y-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <MessageCircle className="h-4 w-4" /> 📢 Umumiy xabar (Barcha foydalanuvchilarga)
                  </h3>
                  <textarea
                    placeholder="Umumiy xabar matni..."
                    value={broadcastText}
                    onChange={(e) => setBroadcastText(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring min-h-[100px] resize-none"
                  />
                  <button
                    onClick={handleBroadcast}
                    disabled={!broadcastText || processing === "broadcast"}
                    className="w-full rounded-xl bg-destructive py-2.5 text-xs font-bold text-destructive-foreground disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {processing === "broadcast" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    📢 Barchaga yuborish
                  </button>
                  <p className="text-[10px] text-muted-foreground">⚠️ Bu xabar barcha foydalanuvchilarga yuboriladi!</p>
                </div>
              </div>
            )}

            {/* === ADMINS === */}
            {tab === "admins" && (
              <div className="space-y-3">
                <div className="farm-card space-y-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                    <Shield className="h-4 w-4" /> Yangi admin qo'shish
                  </h3>
                  <Input
                    placeholder="Telegram ID kiriting"
                    value={newAdminTgId}
                    onChange={(e) => setNewAdminTgId(e.target.value)}
                    className="text-xs"
                    type="number"
                  />
                  <button
                    onClick={handleAddAdmin}
                    disabled={!newAdminTgId || processing === "admin"}
                    className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {processing === "admin" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Admin qo'shish
                  </button>
                </div>

                {adminsList.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Adminlar topilmadi</p>
                ) : (
                  adminsList.map((admin: any) => (
                    <div key={admin.id} className="farm-card flex items-center gap-3">
                      {admin.photo_url ? (
                        <img src={admin.photo_url} className="h-10 w-10 rounded-full" alt="" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg">👤</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{admin.first_name || "Noma'lum"}</p>
                        <p className="text-[10px] text-muted-foreground">@{admin.username || "—"} · TG: {admin.telegram_id || "—"}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveAdmin(admin.user_id)}
                        disabled={processing === "admin"}
                        className="rounded-lg bg-destructive/10 text-destructive px-3 py-1.5 text-[10px] font-bold flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        O'chirish
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* === SETTINGS === */}
            {tab === "settings" && (
              <div className="space-y-3">
                <div className="farm-card">
                  <h3 className="text-sm font-bold text-foreground mb-3">👥 Referal sozlamalari</h3>
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={appSettings.referral?.enabled !== false}
                        onChange={(e) => {
                          const updated = { ...appSettings.referral, enabled: e.target.checked };
                          setAppSettings(prev => ({ ...prev, referral: updated }));
                          callAdmin({ action: "update_settings", key: "referral", value: updated }).then(() => toast.success("Saqlandi"));
                        }}
                        className="rounded"
                      />
                      Referal tizimni yoqish
                    </label>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-bold">Referer bonusi (tanga)</label>
                      <Input
                        type="number"
                        value={appSettings.referral?.referrer_bonus ?? 500}
                        onChange={(e) => {
                          const updated = { ...appSettings.referral, referrer_bonus: parseInt(e.target.value) || 0 };
                          setAppSettings(prev => ({ ...prev, referral: updated }));
                        }}
                        onBlur={() => callAdmin({ action: "update_settings", key: "referral", value: appSettings.referral }).then(() => toast.success("Saqlandi"))}
                        className="text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-bold">Yangi user bonusi (tanga)</label>
                      <Input
                        type="number"
                        value={appSettings.referral?.referee_bonus ?? 200}
                        onChange={(e) => {
                          const updated = { ...appSettings.referral, referee_bonus: parseInt(e.target.value) || 0 };
                          setAppSettings(prev => ({ ...prev, referral: updated }));
                        }}
                        onBlur={() => callAdmin({ action: "update_settings", key: "referral", value: appSettings.referral }).then(() => toast.success("Saqlandi"))}
                        className="text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-bold">Minimal vazifa soni (referal uchun)</label>
                      <Input
                        type="number"
                        value={appSettings.referral?.min_tasks_required ?? 0}
                        onChange={(e) => {
                          const updated = { ...appSettings.referral, min_tasks_required: parseInt(e.target.value) || 0 };
                          setAppSettings(prev => ({ ...prev, referral: updated }));
                        }}
                        onBlur={() => callAdmin({ action: "update_settings", key: "referral", value: appSettings.referral }).then(() => toast.success("Saqlandi"))}
                        className="text-xs mt-0.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="farm-card">
                  <h3 className="text-sm font-bold text-foreground mb-3">💰 Bozor narxlari</h3>
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] text-muted-foreground font-bold">Tuxum narxi (tanga)</label>
                      <Input
                        type="number"
                        value={appSettings.market_prices?.egg_price ?? 50}
                        onChange={(e) => {
                          const updated = { ...appSettings.market_prices, egg_price: parseInt(e.target.value) || 0 };
                          setAppSettings(prev => ({ ...prev, market_prices: updated }));
                        }}
                        onBlur={() => callAdmin({ action: "update_settings", key: "market_prices", value: appSettings.market_prices }).then(() => toast.success("Saqlandi"))}
                        className="text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-bold">Sut narxi (tanga/litr)</label>
                      <Input
                        type="number"
                        value={appSettings.market_prices?.milk_price ?? 150}
                        onChange={(e) => {
                          const updated = { ...appSettings.market_prices, milk_price: parseInt(e.target.value) || 0 };
                          setAppSettings(prev => ({ ...prev, market_prices: updated }));
                        }}
                        onBlur={() => callAdmin({ action: "update_settings", key: "market_prices", value: appSettings.market_prices }).then(() => toast.success("Saqlandi"))}
                        className="text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-bold">Go'sht narxi (tanga/kg)</label>
                      <Input
                        type="number"
                        value={appSettings.market_prices?.meat_price ?? 300}
                        onChange={(e) => {
                          const updated = { ...appSettings.market_prices, meat_price: parseInt(e.target.value) || 0 };
                          setAppSettings(prev => ({ ...prev, market_prices: updated }));
                        }}
                        onBlur={() => callAdmin({ action: "update_settings", key: "market_prices", value: appSettings.market_prices }).then(() => toast.success("Saqlandi"))}
                        className="text-xs mt-0.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="farm-card">
                  <h3 className="text-sm font-bold text-foreground mb-3">💵 Pul chiqarish sozlamalari</h3>
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] text-muted-foreground font-bold">Minimal chiqarish (tanga)</label>
                      <Input
                        type="number"
                        value={appSettings.withdrawal?.min_amount ?? 20000}
                        onChange={(e) => {
                          const updated = { ...appSettings.withdrawal, min_amount: parseInt(e.target.value) || 0 };
                          setAppSettings(prev => ({ ...prev, withdrawal: updated }));
                        }}
                        onBlur={() => callAdmin({ action: "update_settings", key: "withdrawal", value: appSettings.withdrawal }).then(() => toast.success("Saqlandi"))}
                        className="text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-bold">Konvertatsiya (N tanga = 1 so'm)</label>
                      <Input
                        type="number"
                        value={appSettings.withdrawal?.coins_per_som ?? 4}
                        onChange={(e) => {
                          const updated = { ...appSettings.withdrawal, coins_per_som: parseInt(e.target.value) || 4 };
                          setAppSettings(prev => ({ ...prev, withdrawal: updated }));
                        }}
                        onBlur={() => callAdmin({ action: "update_settings", key: "withdrawal", value: appSettings.withdrawal }).then(() => toast.success("Saqlandi"))}
                        className="text-xs mt-0.5"
                      />
                    </div>
                  </div>
                </div>

                {/* Mandatory channel */}
                <div className="farm-card">
                  <h3 className="text-sm font-bold text-foreground mb-3">📢 Majburiy kanal</h3>
                  <div className="space-y-2.5">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={appSettings.mandatory_channel?.enabled === true}
                        onChange={(e) => {
                          const updated = { ...appSettings.mandatory_channel, enabled: e.target.checked };
                          setAppSettings(prev => ({ ...prev, mandatory_channel: updated }));
                          callAdmin({ action: "update_settings", key: "mandatory_channel", value: updated }).then(() => toast.success("Saqlandi"));
                        }}
                        className="rounded"
                      />
                      Majburiy kanalni yoqish
                    </label>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-bold">Kanal ID (masalan: @channel_name yoki -100...)</label>
                      <Input
                        value={appSettings.mandatory_channel?.channel_id ?? ""}
                        onChange={(e) => {
                          const updated = { ...appSettings.mandatory_channel, channel_id: e.target.value };
                          setAppSettings(prev => ({ ...prev, mandatory_channel: updated }));
                        }}
                        onBlur={() => callAdmin({ action: "update_settings", key: "mandatory_channel", value: appSettings.mandatory_channel }).then(() => toast.success("Saqlandi"))}
                        placeholder="@farm_market_pay"
                        className="text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-bold">Kanal havolasi</label>
                      <Input
                        value={appSettings.mandatory_channel?.channel_url ?? ""}
                        onChange={(e) => {
                          const updated = { ...appSettings.mandatory_channel, channel_url: e.target.value };
                          setAppSettings(prev => ({ ...prev, mandatory_channel: updated }));
                        }}
                        onBlur={() => callAdmin({ action: "update_settings", key: "mandatory_channel", value: appSettings.mandatory_channel }).then(() => toast.success("Saqlandi"))}
                        placeholder="https://t.me/farm_market_pay"
                        className="text-xs mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-bold">Kanal nomi</label>
                      <Input
                        value={appSettings.mandatory_channel?.channel_name ?? ""}
                        onChange={(e) => {
                          const updated = { ...appSettings.mandatory_channel, channel_name: e.target.value };
                          setAppSettings(prev => ({ ...prev, mandatory_channel: updated }));
                        }}
                        onBlur={() => callAdmin({ action: "update_settings", key: "mandatory_channel", value: appSettings.mandatory_channel }).then(() => toast.success("Saqlandi"))}
                        placeholder="Farm Market"
                        className="text-xs mt-0.5"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Balance adjust modal */}
      {adjustUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAdjustUser(null)}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-background rounded-2xl p-4 space-y-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-foreground text-center">
              {adjustUser.first_name || "Noma'lum"} — {adjustField === "coins" ? "🪙 Tanga" : "💵 Pul"}
            </h3>
            <p className="text-xs text-muted-foreground text-center">
              Hozirgi: {adjustField === "coins" ? adjustUser.coins : adjustUser.cash}
            </p>
            <Input
              type="number"
              placeholder="Miqdor kiriting"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              className="text-sm"
            />
            <div className="flex gap-2">
              <button
                disabled={processing === "adjust"}
                onClick={() => handleAdjustBalance("subtract")}
                className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-destructive py-2.5 text-xs font-bold text-destructive-foreground disabled:opacity-50"
              >
                {processing === "adjust" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MinusCircle className="h-3.5 w-3.5" />}
                Ayirish
              </button>
              <button
                disabled={processing === "adjust"}
                onClick={() => handleAdjustBalance("add")}
                className="flex-1 flex items-center justify-center gap-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
              >
                {processing === "adjust" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
                Qo'shish
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color = "text-foreground" }: { icon: any; label: string; value: string | number; color?: string }) {
  return (
    <div className="farm-card flex items-center gap-3 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className={`text-base font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

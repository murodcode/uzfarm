import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Plus, Trash2, Send, Edit, Loader2, Gift, Clock, Users, Award } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Contest {
  id: string;
  name: string;
  description: string;
  start_time: string;
  end_time: string;
  channel_id: string;
  status: string;
  created_at: string;
}

interface Prize {
  id: string;
  contest_id: string;
  place: number;
  reward_coins: number;
  reward_description: string;
}

interface ContestLeaderboardEntry {
  referrer_id: string;
  count: number;
  first_name: string | null;
  username: string | null;
  photo_url: string | null;
}

export default function AdminContestManager() {
  const { session } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    start_time: "",
    end_time: "",
    channel_id: "",
  });
  const [prizeForm, setPrizeForm] = useState<{ place: number; reward_coins: number; reward_description: string }[]>(
    Array.from({ length: 10 }, (_, i) => ({ place: i + 1, reward_coins: 0, reward_description: "" }))
  );

  // Leaderboard
  const [selectedContest, setSelectedContest] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<ContestLeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(false);

  useEffect(() => {
    fetchContests();
  }, []);

  const fetchContests = async () => {
    setLoading(true);
    const { data: c } = await supabase.from("contests").select("*").order("created_at", { ascending: false });
    setContests((c as any[]) || []);

    const contestIds = (c || []).map((x: any) => x.id);
    if (contestIds.length > 0) {
      const { data: p } = await supabase.from("contest_prizes").select("*").in("contest_id", contestIds).order("place");
      setPrizes((p as any[]) || []);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.start_time || !form.end_time) {
      toast.error("Iltimos barcha majburiy maydonlarni to'ldiring");
      return;
    }
    setProcessing(true);
    try {
      if (editingId) {
        const { error } = await supabase.from("contests").update({
          name: form.name,
          description: form.description,
          start_time: new Date(form.start_time).toISOString(),
          end_time: new Date(form.end_time).toISOString(),
          channel_id: form.channel_id,
          updated_at: new Date().toISOString(),
        }).eq("id", editingId);
        if (error) throw error;

        // Update prizes
        await supabase.from("contest_prizes").delete().eq("contest_id", editingId);
        const validPrizes = prizeForm.filter(p => p.reward_coins > 0 || p.reward_description);
        if (validPrizes.length > 0) {
          const { error: pErr } = await supabase.from("contest_prizes").insert(
            validPrizes.map(p => ({ contest_id: editingId, place: p.place, reward_coins: p.reward_coins, reward_description: p.reward_description }))
          );
          if (pErr) throw pErr;
        }
        toast.success("Konkurs yangilandi!");
      } else {
        const { data: newContest, error } = await supabase.from("contests").insert({
          name: form.name,
          description: form.description,
          start_time: new Date(form.start_time).toISOString(),
          end_time: new Date(form.end_time).toISOString(),
          channel_id: form.channel_id,
          created_by: session!.user.id,
          status: "active",
        }).select().single();
        if (error) throw error;

        const validPrizes = prizeForm.filter(p => p.reward_coins > 0 || p.reward_description);
        if (validPrizes.length > 0) {
          await supabase.from("contest_prizes").insert(
            validPrizes.map(p => ({ contest_id: (newContest as any).id, place: p.place, reward_coins: p.reward_coins, reward_description: p.reward_description }))
          );
        }
        toast.success("Konkurs yaratildi!");
      }

      resetForm();
      fetchContests();
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Konkursni o'chirmoqchimisiz?")) return;
    setProcessing(true);
    try {
      await supabase.from("contests").delete().eq("id", id);
      toast.success("Konkurs o'chirildi");
      fetchContests();
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = (c: Contest) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      description: c.description,
      start_time: c.start_time.slice(0, 16),
      end_time: c.end_time.slice(0, 16),
      channel_id: c.channel_id,
    });
    const contestPrizes = prizes.filter(p => p.contest_id === c.id);
    const newPrizeForm = Array.from({ length: 10 }, (_, i) => {
      const existing = contestPrizes.find(p => p.place === i + 1);
      return { place: i + 1, reward_coins: existing?.reward_coins || 0, reward_description: existing?.reward_description || "" };
    });
    setPrizeForm(newPrizeForm);
    setShowForm(true);
  };

  const handleFinish = async (contestId: string) => {
    if (!confirm("Konkursni yakunlamoqchimisiz?")) return;
    setProcessing(true);
    try {
      await supabase.from("contests").update({ status: "finished", updated_at: new Date().toISOString() }).eq("id", contestId);
      toast.success("Konkurs yakunlandi!");
      fetchContests();
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const fetchLeaderboard = async (contestId: string) => {
    setSelectedContest(contestId);
    setLbLoading(true);
    try {
      const { data: refs } = await supabase.from("contest_referrals").select("referrer_id").eq("contest_id", contestId);
      if (!refs || refs.length === 0) {
        setLeaderboard([]);
        setLbLoading(false);
        return;
      }

      // Count referrals per user
      const countMap = new Map<string, number>();
      refs.forEach(r => {
        countMap.set((r as any).referrer_id, (countMap.get((r as any).referrer_id) || 0) + 1);
      });

      const userIds = [...countMap.keys()];
      const { data: profiles } = await supabase.from("profiles").select("id, first_name, username, photo_url").in("id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const lb: ContestLeaderboardEntry[] = userIds.map(uid => ({
        referrer_id: uid,
        count: countMap.get(uid) || 0,
        first_name: profileMap.get(uid)?.first_name || null,
        username: profileMap.get(uid)?.username || null,
        photo_url: profileMap.get(uid)?.photo_url || null,
      })).sort((a, b) => b.count - a.count);

      setLeaderboard(lb);
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setLbLoading(false);
    }
  };

  const handlePostToChannel = async (contestId: string) => {
    const contest = contests.find(c => c.id === contestId);
    if (!contest || !contest.channel_id) {
      toast.error("Kanal ID kiritilmagan");
      return;
    }
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("post-contest-leaderboard", {
        body: { contest_id: contestId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Reyting kanalga yuborildi!");
    } catch (e: any) {
      toast.error("Xatolik: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ name: "", description: "", start_time: "", end_time: "", channel_id: "" });
    setPrizeForm(Array.from({ length: 10 }, (_, i) => ({ place: i + 1, reward_coins: 0, reward_description: "" })));
  };

  const getStatusBadge = (c: Contest) => {
    const now = Date.now();
    const start = new Date(c.start_time).getTime();
    const end = new Date(c.end_time).getTime();
    if (c.status === "finished") return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Yakunlangan</span>;
    if (now < start) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground">Kutilmoqda</span>;
    if (now > end) return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">Muddati tugagan</span>;
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">Faol</span>;
  };

  const getTimeLeft = (endTime: string) => {
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) return "Tugagan";
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${days}k ${hours}s ${mins}d`;
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {/* Header + Create button */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">🏆 Konkurslar</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground transition-transform active:scale-95">
          <Plus className="h-3.5 w-3.5" /> Yangi
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="farm-card space-y-3">
          <h3 className="text-xs font-bold text-foreground">{editingId ? "✏️ Tahrirlash" : "➕ Yangi konkurs"}</h3>

          <div>
            <label className="text-[10px] font-bold text-muted-foreground">Nomi *</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Referal Konkurs" className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground">Tavsif</label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Eng ko'p referal olib kelgan g'olib!" className="h-8 text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground">Boshlanishi *</label>
              <Input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground">Tugashi *</label>
              <Input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="h-8 text-xs" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted-foreground">Telegram kanal ID (masalan @kanal_nomi)</label>
            <Input value={form.channel_id} onChange={e => setForm(f => ({ ...f, channel_id: e.target.value }))} placeholder="@farm_market_news" className="h-8 text-xs" />
          </div>

          {/* Prizes */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground mb-1 block">🎁 Sovg'alar (Top 1-10)</label>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {prizeForm.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground w-6 shrink-0">{p.place}.</span>
                  <Input
                    type="number"
                    value={p.reward_coins || ""}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      setPrizeForm(pf => pf.map((x, j) => j === i ? { ...x, reward_coins: val } : x));
                    }}
                    placeholder="🪙 Tanga"
                    className="h-7 text-[11px] w-24"
                  />
                  <Input
                    value={p.reward_description}
                    onChange={e => setPrizeForm(pf => pf.map((x, j) => j === i ? { ...x, reward_description: e.target.value } : x))}
                    placeholder="Tavsif (ixtiyoriy)"
                    className="h-7 text-[11px] flex-1"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={processing} className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-primary-foreground transition-transform active:scale-95 disabled:opacity-50">
              {processing ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : editingId ? "Saqlash" : "Yaratish"}
            </button>
            <button onClick={resetForm} className="rounded-xl bg-muted px-4 py-2 text-xs font-bold text-foreground transition-transform active:scale-95">Bekor</button>
          </div>
        </motion.div>
      )}

      {/* Contest list */}
      {contests.length === 0 && !showForm && (
        <div className="farm-card py-8 text-center">
          <Trophy className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">Hali konkurs yaratilmagan</p>
        </div>
      )}

      {contests.map(c => (
        <motion.div key={c.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="farm-card space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground">{c.name}</p>
                {getStatusBadge(c)}
              </div>
              {c.description && <p className="text-[11px] text-muted-foreground mt-0.5">{c.description}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" /> Boshlanishi: {new Date(c.start_time).toLocaleString("uz-UZ")}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" /> Tugashi: {new Date(c.end_time).toLocaleString("uz-UZ")}
            </div>
          </div>

          <div className="text-[10px] font-bold text-primary">⏳ Qolgan vaqt: {getTimeLeft(c.end_time)}</div>

          {/* Prizes display */}
          {prizes.filter(p => p.contest_id === c.id).length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground mb-1">🎁 Sovg'alar:</p>
              <div className="space-y-0.5">
                {prizes.filter(p => p.contest_id === c.id).map(p => (
                  <div key={p.id} className="flex items-center gap-1.5 text-[10px]">
                    <span className="font-bold text-foreground">{p.place === 1 ? "🥇" : p.place === 2 ? "🥈" : p.place === 3 ? "🥉" : `${p.place}.`}</span>
                    <span className="text-foreground">🪙 {p.reward_coins.toLocaleString()}</span>
                    {p.reward_description && <span className="text-muted-foreground">— {p.reward_description}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => fetchLeaderboard(c.id)} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-bold text-primary transition-transform active:scale-95">
              <Trophy className="h-3 w-3" /> Reyting
            </button>
            {c.channel_id && (
              <button onClick={() => handlePostToChannel(c.id)} disabled={processing} className="flex items-center gap-1 rounded-lg bg-accent/10 px-2.5 py-1.5 text-[10px] font-bold text-accent-foreground transition-transform active:scale-95 disabled:opacity-50">
                <Send className="h-3 w-3" /> Kanalga yuborish
              </button>
            )}
            <button onClick={() => handleEdit(c)} className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1.5 text-[10px] font-bold text-foreground transition-transform active:scale-95">
              <Edit className="h-3 w-3" /> Tahrirlash
            </button>
            {c.status !== "finished" && (
              <button onClick={() => handleFinish(c.id)} className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-bold text-primary transition-transform active:scale-95">
                <Award className="h-3 w-3" /> Yakunlash
              </button>
            )}
            <button onClick={() => handleDelete(c.id)} className="flex items-center gap-1 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-[10px] font-bold text-destructive transition-transform active:scale-95">
              <Trash2 className="h-3 w-3" /> O'chirish
            </button>
          </div>

          {/* Leaderboard */}
          {selectedContest === c.id && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-t border-border pt-3 space-y-2">
              <p className="text-[11px] font-bold text-foreground">📊 Konkurs reytingi</p>
              {lbLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
              ) : leaderboard.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center py-3">Hali ishtirokchilar yo'q</p>
              ) : (
                <div className="space-y-1.5">
                  {leaderboard.slice(0, 20).map((u, i) => {
                    const contestPrizes = prizes.filter(p => p.contest_id === c.id);
                    const prize = contestPrizes.find(p => p.place === i + 1);
                    return (
                      <div key={u.referrer_id} className="flex items-center gap-2 text-[11px]">
                        <span className="w-5 text-center font-black">{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}</span>
                        {u.photo_url ? (
                          <img src={u.photo_url} className="h-6 w-6 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">🧑‍🌾</div>
                        )}
                        <span className="font-bold text-foreground flex-1 truncate">{u.first_name || u.username || "Noma'lum"}</span>
                        <span className="text-primary font-bold">👥 {u.count}</span>
                        {prize && <span className="text-[9px] text-muted-foreground">🪙 {prize.reward_coins.toLocaleString()}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

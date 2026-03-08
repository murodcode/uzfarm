import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Medal, Users, Loader2, Wallet, Gift, Clock } from "lucide-react";
import TelegramBackButton from "@/components/TelegramBackButton";

interface LeaderUser {
  id: string;
  first_name: string | null;
  username: string | null;
  photo_url: string | null;
  coins: number;
  cash: number;
  referral_count: number;
}

interface Contest {
  id: string;
  name: string;
  description: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface ContestPrize {
  place: number;
  reward_coins: number;
  reward_description: string;
}

interface ContestLeaderEntry {
  referrer_id: string;
  count: number;
  first_name: string | null;
  username: string | null;
  photo_url: string | null;
}

type Tab = "coins" | "referrals" | "cash" | "contest";

export default function Leaderboard() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<LeaderUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("coins");
  const [myRank, setMyRank] = useState(0);

  // Contest state
  const [activeContest, setActiveContest] = useState<Contest | null>(null);
  const [contestPrizes, setContestPrizes] = useState<ContestPrize[]>([]);
  const [contestLeaderboard, setContestLeaderboard] = useState<ContestLeaderEntry[]>([]);
  const [myContestRank, setMyContestRank] = useState(0);
  const [myContestRefs, setMyContestRefs] = useState(0);
  const [contestLoading, setContestLoading] = useState(false);

  useEffect(() => {
    if (tab === "contest") {
      fetchContestData();
    } else {
      fetchLeaderboard();
    }
  }, [tab, profile?.id]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    const orderCol = tab === "referrals" ? "referral_count" : tab === "cash" ? "cash" : "coins";

    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, username, photo_url, coins, cash, referral_count")
      .order(orderCol, { ascending: false })
      .limit(50);

    setUsers((data as LeaderUser[]) || []);

    if (profile?.id) {
      const { data: rankData } = await supabase.rpc("get_user_rank", {
        p_user_id: profile.id,
        p_column: orderCol,
      });
      setMyRank(typeof rankData === "number" ? rankData : 0);
    }

    setLoading(false);
  };

  const fetchContestData = async () => {
    setContestLoading(true);
    try {
      // Get active contest
      const now = new Date().toISOString();
      const { data: contests } = await supabase
        .from("contests")
        .select("*")
        .eq("status", "active")
        .lte("start_time", now)
        .gte("end_time", now)
        .order("created_at", { ascending: false })
        .limit(1);

      // If no active, get latest finished
      let contest = (contests as any[])?.[0] || null;
      if (!contest) {
        const { data: finished } = await supabase
          .from("contests")
          .select("*")
          .order("end_time", { ascending: false })
          .limit(1);
        contest = (finished as any[])?.[0] || null;
      }

      if (!contest) {
        setActiveContest(null);
        setContestLoading(false);
        return;
      }

      setActiveContest(contest);

      // Get prizes
      const { data: prizes } = await supabase
        .from("contest_prizes")
        .select("place, reward_coins, reward_description")
        .eq("contest_id", contest.id)
        .order("place");
      setContestPrizes((prizes as ContestPrize[]) || []);

      // Get referral counts
      const { data: refs } = await supabase
        .from("contest_referrals")
        .select("referrer_id")
        .eq("contest_id", contest.id);

      const countMap = new Map<string, number>();
      (refs || []).forEach((r: any) => {
        countMap.set(r.referrer_id, (countMap.get(r.referrer_id) || 0) + 1);
      });

      const sorted = [...countMap.entries()].sort((a, b) => b[1] - a[1]);

      // Get profiles
      const userIds = sorted.map(([id]) => id);
      let profileMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, username, photo_url")
          .in("id", userIds);
        profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      }

      const lb = sorted.map(([uid, count]) => ({
        referrer_id: uid,
        count,
        first_name: profileMap.get(uid)?.first_name || null,
        username: profileMap.get(uid)?.username || null,
        photo_url: profileMap.get(uid)?.photo_url || null,
      }));

      setContestLeaderboard(lb);

      // My rank
      if (profile?.id) {
        const myIdx = sorted.findIndex(([id]) => id === profile.id);
        setMyContestRank(myIdx >= 0 ? myIdx + 1 : 0);
        setMyContestRefs(countMap.get(profile.id) || 0);
      }
    } catch (e) {
      console.error("Contest fetch error:", e);
    } finally {
      setContestLoading(false);
    }
  };

  const isInTop50 = profile ? users.some((u) => u.id === profile.id) : false;

  const getRankIcon = (i: number) => {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return `${i + 1}`;
  };

  const getValueLabel = (u: LeaderUser) => {
    if (tab === "coins") return `🪙 ${u.coins.toLocaleString()}`;
    if (tab === "cash") return `💵 ${u.cash.toLocaleString()}`;
    return `👥 ${u.referral_count}`;
  };

  const getTimeLeft = (endTime: string) => {
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) return "Tugagan";
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (days > 0) return `${days} kun ${hours} soat`;
    if (hours > 0) return `${hours} soat ${mins} daqiqa`;
    return `${mins} daqiqa`;
  };

  const renderUserRow = (u: LeaderUser, displayRank: number, isMe: boolean) => (
    <motion.div
      key={u.id}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(displayRank, 20) * 0.02 }}
      className={`farm-card flex items-center gap-3 py-3 ${isMe ? "ring-2 ring-primary" : ""}`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-black">
        {getRankIcon(displayRank)}
      </div>
      {u.photo_url ? (
        <img src={u.photo_url} className="h-9 w-9 rounded-full shrink-0 object-cover" alt="" />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg">🧑‍🌾</div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold truncate ${isMe ? "text-primary" : "text-foreground"}`}>
          {u.first_name || "Noma'lum"} {isMe && "(Siz)"}
        </p>
        {u.username && <p className="text-[10px] text-muted-foreground">@{u.username}</p>}
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-black text-foreground">
          {getValueLabel(u)}
        </p>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen safe-bottom pb-4">
      <TelegramBackButton />
      <div className="gradient-hero px-4 pb-6 pt-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <Trophy className="h-10 w-10 text-primary-foreground mx-auto mb-2" />
          <h1 className="text-xl font-extrabold text-primary-foreground">🏆 Reyting</h1>
          <p className="text-xs text-primary-foreground/70 mt-1">Eng zo'r fermerlar</p>
          {tab !== "contest" && myRank > 0 && (
            <div className="mt-3 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/10 px-4 py-2 inline-block">
              <p className="text-xs text-primary-foreground/70">Sizning o'rningiz</p>
              <p className="text-2xl font-black text-primary-foreground">#{myRank}</p>
            </div>
          )}
          {tab === "contest" && myContestRank > 0 && (
            <div className="mt-3 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/10 px-4 py-2 inline-block">
              <p className="text-xs text-primary-foreground/70">Konkursdagi o'rningiz</p>
              <p className="text-2xl font-black text-primary-foreground">#{myContestRank}</p>
              <p className="text-[10px] text-primary-foreground/60">👥 {myContestRefs} ta referal</p>
            </div>
          )}
        </motion.div>
      </div>

      <div className="px-4 -mt-3 space-y-3">
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => setTab("coins")}
            className={`py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
              tab === "coins" ? "bg-primary text-primary-foreground" : "farm-card text-foreground"
            }`}
          >
            <Medal className="h-3 w-3" /> Tanga
          </button>
          <button
            onClick={() => setTab("cash")}
            className={`py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
              tab === "cash" ? "bg-primary text-primary-foreground" : "farm-card text-foreground"
            }`}
          >
            <Wallet className="h-3 w-3" /> Balans
          </button>
          <button
            onClick={() => setTab("referrals")}
            className={`py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
              tab === "referrals" ? "bg-primary text-primary-foreground" : "farm-card text-foreground"
            }`}
          >
            <Users className="h-3 w-3" /> Referal
          </button>
          <button
            onClick={() => setTab("contest")}
            className={`py-2 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${
              tab === "contest" ? "bg-primary text-primary-foreground" : "farm-card text-foreground"
            }`}
          >
            <Trophy className="h-3 w-3" /> Konkurs
          </button>
        </div>

        {/* Regular leaderboard */}
        {tab !== "contest" && (
          loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((u, i) => renderUserRow(u, i, profile?.id === u.id))}

              {!isInTop50 && myRank > 0 && profile && (
                <>
                  <div className="text-center text-muted-foreground text-xs py-2">• • •</div>
                  {renderUserRow(
                    {
                      id: profile.id,
                      first_name: profile.first_name || null,
                      username: profile.username || null,
                      photo_url: profile.photo_url || null,
                      coins: profile.coins || 0,
                      cash: profile.cash || 0,
                      referral_count: profile.referral_count || 0,
                    },
                    myRank - 1,
                    true
                  )}
                </>
              )}
            </div>
          )
        )}

        {/* Contest leaderboard */}
        {tab === "contest" && (
          contestLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !activeContest ? (
            <div className="farm-card py-10 text-center">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm font-bold text-muted-foreground">Hozircha faol konkurs yo'q</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Tez orada yangi konkurs e'lon qilinadi!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Contest info card */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="farm-card space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-foreground">🏆 {activeContest.name}</h2>
                  {activeContest.status === "finished" ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Yakunlangan</span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">Faol</span>
                  )}
                </div>
                {activeContest.description && (
                  <p className="text-[11px] text-muted-foreground">{activeContest.description}</p>
                )}
                {activeContest.status !== "finished" && (
                  <div className="flex items-center gap-1.5 text-[11px] text-primary font-bold">
                    <Clock className="h-3.5 w-3.5" />
                    ⏳ Tugashiga: {getTimeLeft(activeContest.end_time)}
                  </div>
                )}
              </motion.div>

              {/* Prizes */}
              {contestPrizes.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="farm-card">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Gift className="h-4 w-4 text-primary" />
                    <p className="text-xs font-bold text-foreground">Sovg'alar</p>
                  </div>
                  <div className="space-y-1">
                    {contestPrizes.map(p => (
                      <div key={p.place} className="flex items-center gap-2 text-[11px]">
                        <span className="font-black w-5 text-center">
                          {p.place === 1 ? "🥇" : p.place === 2 ? "🥈" : p.place === 3 ? "🥉" : `${p.place}.`}
                        </span>
                        <span className="font-bold text-foreground">🪙 {p.reward_coins.toLocaleString()}</span>
                        {p.reward_description && <span className="text-muted-foreground">— {p.reward_description}</span>}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Leaderboard */}
              <div className="space-y-2">
                {contestLeaderboard.length === 0 ? (
                  <div className="farm-card py-6 text-center">
                    <Users className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">Hali ishtirokchilar yo'q</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">Referal link ulashing va birinchi bo'ling!</p>
                  </div>
                ) : (
                  contestLeaderboard.map((u, i) => {
                    const isMe = profile?.id === u.referrer_id;
                    const prize = contestPrizes.find(p => p.place === i + 1);
                    return (
                      <motion.div
                        key={u.referrer_id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i, 20) * 0.02 }}
                        className={`farm-card flex items-center gap-3 py-3 ${isMe ? "ring-2 ring-primary" : ""}`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-black">
                          {getRankIcon(i)}
                        </div>
                        {u.photo_url ? (
                          <img src={u.photo_url} className="h-9 w-9 rounded-full shrink-0 object-cover" alt="" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg">🧑‍🌾</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-bold truncate ${isMe ? "text-primary" : "text-foreground"}`}>
                            {u.first_name || u.username || "Noma'lum"} {isMe && "(Siz)"}
                          </p>
                          {u.username && <p className="text-[10px] text-muted-foreground">@{u.username}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-foreground">👥 {u.count}</p>
                          {prize && <p className="text-[9px] text-primary font-bold">🪙 {prize.reward_coins.toLocaleString()}</p>}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

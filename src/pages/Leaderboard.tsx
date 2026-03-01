import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Medal, Users, Loader2, Wallet } from "lucide-react";
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

type Tab = "coins" | "referrals" | "cash";

export default function Leaderboard() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<LeaderUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("coins");
  const [myRank, setMyRank] = useState(0);

  useEffect(() => {
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
    fetchLeaderboard();
  }, [tab, profile?.id]);

  const isInTop50 = profile ? users.some((u) => u.id === profile.id) : false;
  const myProfileData = profile ? users.find((u) => u.id === profile.id) || null : null;

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
          {myRank > 0 && (
            <div className="mt-3 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/10 px-4 py-2 inline-block">
              <p className="text-xs text-primary-foreground/70">Sizning o'rningiz</p>
              <p className="text-2xl font-black text-primary-foreground">#{myRank}</p>
            </div>
          )}
        </motion.div>
      </div>

      <div className="px-4 -mt-3 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setTab("coins")}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === "coins" ? "bg-primary text-primary-foreground" : "farm-card text-foreground"
            }`}
          >
            <Medal className="h-3.5 w-3.5" /> Tangalar
          </button>
          <button
            onClick={() => setTab("cash")}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === "cash" ? "bg-primary text-primary-foreground" : "farm-card text-foreground"
            }`}
          >
            <Wallet className="h-3.5 w-3.5" /> Balans
          </button>
          <button
            onClick={() => setTab("referrals")}
            className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === "referrals" ? "bg-primary text-primary-foreground" : "farm-card text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" /> Referallar
          </button>
        </div>

        {loading ? (
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
                    referral_count: profile.referral_count || 0,
                  },
                  myRank - 1,
                  true
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Dog, Egg, Beef, Wallet, ArrowLeftRight, LogIn, LogOut, Shield, Trophy, Users, BarChart3 } from "lucide-react";
import StatCard from "@/components/StatCard";
import { useGameContext } from "@/contexts/GameStateContext";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface GlobalStats {
  total_users: number;
  total_coins: number;
  total_referrals: number;
  total_eggs: number;
}

export default function Profile() {
  const { state } = useGameContext();
  const { session, profile, isAdmin, signOut, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);

  // Refresh profile data when page loads and every 10 seconds
  useEffect(() => {
    if (session) {
      refreshProfile();
      const interval = setInterval(refreshProfile, 10000);
      return () => clearInterval(interval);
    }
  }, [session, refreshProfile]);

  // Fetch global stats
  useEffect(() => {
    supabase.functions.invoke("global-stats").then(({ data }) => {
      if (data) setGlobalStats(data);
    });
  }, []);

  const daysSinceRegistration = Math.floor(
    (Date.now() - state.registeredAt) / (1000 * 60 * 60 * 24)
  );

  const isLoggedIn = !!session && !!profile;

  return (
    <div className="min-h-screen safe-bottom pb-4">
      {/* Hero header */}
      <div className="gradient-hero px-4 pb-8 pt-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center"
        >
          {isLoggedIn ? (
            <>
              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={profile.first_name || "User"}
                  className="h-16 w-16 rounded-full border-2 border-primary-foreground/30 mb-3"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/20 text-3xl mb-3">
                  🧑‍🌾
                </div>
              )}
              <h1 className="text-xl font-extrabold text-primary-foreground">
                {profile.first_name || "Fermer"}
              </h1>
              {profile.username && (
                <p className="text-xs font-medium text-primary-foreground/70 mt-1">
                  @{profile.username}
                </p>
              )}
              {isAdmin && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-bold text-accent">
                  <Shield className="h-3 w-3" /> Admin
                </span>
              )}
              <button
                onClick={signOut}
                className="mt-2 flex items-center gap-1.5 rounded-xl bg-destructive/20 px-4 py-2 text-xs font-bold text-primary-foreground backdrop-blur-sm transition-transform active:scale-95"
              >
                <LogOut className="h-3.5 w-3.5" />
                Chiqish
              </button>
            </>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-foreground/20 text-3xl mb-3">
                🧑‍🌾
              </div>
              <h1 className="text-xl font-extrabold text-primary-foreground">Fermer</h1>
              <button
                onClick={() => navigate("/login")}
                className="mt-2 flex items-center gap-1.5 rounded-xl bg-primary-foreground/15 px-4 py-2 text-xs font-bold text-primary-foreground backdrop-blur-sm transition-transform active:scale-95"
              >
                <LogIn className="h-3.5 w-3.5" />
                Telegram bilan kirish
              </button>
            </>
          )}
          <p className="text-xs font-medium text-primary-foreground/70 mt-2">
            {daysSinceRegistration} kundan beri o'ynayapsiz
          </p>
        </motion.div>

        {/* Balance cards */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-5 grid grid-cols-2 gap-3"
        >
          <div className="rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 p-4 text-center shadow-lg">
            <p className="text-xs font-bold text-white/90 drop-shadow-sm">🪙 Tangalar</p>
            <p className="text-2xl font-black text-white drop-shadow-md">
              {state.coins.toLocaleString()}
            </p>
          </div>
          <div className="rounded-2xl bg-white/20 backdrop-blur-md border border-white/20 p-4 text-center shadow-lg">
            <p className="text-xs font-bold text-white/90 drop-shadow-sm">💵 Naqd pul</p>
            <p className="text-2xl font-black text-white drop-shadow-md">
              {state.cash.toLocaleString()}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Action buttons */}
      <div className="px-4 -mt-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3 mb-4"
        >
          <button
            onClick={() => navigate("/exchange")}
            className="farm-card flex items-center gap-2 py-3 transition-transform active:scale-95"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15">
              <ArrowLeftRight className="h-4 w-4 text-accent-foreground" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-foreground">Ayirboshlash</p>
              <p className="text-[10px] text-muted-foreground">💵 ↔ 🪙</p>
            </div>
          </button>
          <button
            onClick={() => navigate("/withdraw")}
            className="farm-card flex items-center gap-2 py-3 transition-transform active:scale-95"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-foreground">Pul chiqarish</p>
              <p className="text-[10px] text-muted-foreground">Telegram bot</p>
            </div>
          </button>
        </motion.div>

        {/* Referral & Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3 mb-4"
        >
          <button
            onClick={() => navigate("/referral")}
            className="farm-card flex items-center gap-2 py-3 transition-transform active:scale-95"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-foreground">Referal</p>
              <p className="text-[10px] text-muted-foreground">👥 {profile?.referral_count ?? 0}</p>
            </div>
          </button>
          <button
            onClick={() => navigate("/leaderboard")}
            className="farm-card flex items-center gap-2 py-3 transition-transform active:scale-95"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15">
              <Trophy className="h-4 w-4 text-accent-foreground" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-foreground">Reyting</p>
              <p className="text-[10px] text-muted-foreground">🏆 Top 50</p>
            </div>
          </button>
        </motion.div>

        {/* Admin panel link */}
        {isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <button
              onClick={() => navigate("/admin")}
              className="farm-card w-full flex items-center gap-3 py-3 transition-transform active:scale-95 border-accent/30"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15">
                <Shield className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-foreground">Admin Panel</p>
                <p className="text-[10px] text-muted-foreground">Boshqaruv paneli</p>
              </div>
            </button>
          </motion.div>
        )}

        {/* Personal Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard icon={Dog} label="Hayvonlar" value={state.animals.length} bgClass="bg-farm-green-light" iconColorClass="text-primary" />
          <StatCard icon={Egg} label="Tuxumlar" value={state.eggs} bgClass="bg-farm-gold-light" iconColorClass="text-farm-gold" />
          <StatCard icon={Beef} label="Go'sht" value={state.meat} bgClass="bg-farm-red-light" iconColorClass="text-farm-red" />
        </div>

        {/* Referral stats */}
        {isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-4"
          >
            <h2 className="mb-3 text-sm font-bold text-foreground">👥 Referal statistikasi</h2>
            <div className="farm-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Taklif qilganlar</span>
                <span className="text-sm font-bold text-foreground">{profile.referral_count} ta</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Foiz darajasi</span>
                <span className="text-sm font-bold text-foreground">{Math.min(Math.floor(profile.referral_count / 10), 10)}%</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Referal daromad</span>
                <span className="text-sm font-bold text-foreground">🪙 {profile.referral_earnings.toLocaleString()}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Keyingi daraja uchun</span>
                <span className="text-sm font-bold text-foreground">
                  {Math.min(Math.floor(profile.referral_count / 10), 10) >= 10
                    ? "Maksimal!"
                    : `${(Math.floor(profile.referral_count / 10) + 1) * 10 - profile.referral_count} ta referal`}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Global Stats */}
        {globalStats && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-4"
          >
            <h2 className="mb-3 text-sm font-bold text-foreground flex items-center gap-1.5">
              <BarChart3 className="h-4 w-4" /> Umumiy statistika
            </h2>
            <div className="farm-card space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Jami foydalanuvchilar</span>
                <span className="text-sm font-bold text-foreground">{globalStats.total_users.toLocaleString()}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Jami tangalar</span>
                <span className="text-sm font-bold text-foreground">🪙 {globalStats.total_coins.toLocaleString()}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Jami referallar</span>
                <span className="text-sm font-bold text-foreground">👥 {globalStats.total_referrals.toLocaleString()}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Jami tuxumlar</span>
                <span className="text-sm font-bold text-foreground">🥚 {globalStats.total_eggs.toLocaleString()}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Game info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-5"
        >
          <h2 className="mb-3 text-sm font-bold text-foreground">O'yin ma'lumotlari</h2>
          <div className="farm-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Ro'yxatdan o'tgan</span>
              <span className="text-sm font-bold text-foreground">
                {new Date(state.registeredAt).toLocaleDateString("uz-UZ")}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Jami hayvonlar</span>
              <span className="text-sm font-bold text-foreground">{state.animals.length} ta</span>
            </div>
            {isLoggedIn && profile.telegram_id && (
              <>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Telegram ID</span>
                  <span className="text-sm font-bold text-foreground">{profile.telegram_id}</span>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

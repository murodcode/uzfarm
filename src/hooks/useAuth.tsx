import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  telegram_id: number | null;
  first_name: string | null;
  username: string | null;
  photo_url: string | null;
  coins: number;
  cash: number;
  eggs: number;
  meat: number;
  referral_count: number;
  referral_earnings: number;
  referral_level: number;
  referred_by: string | null;
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  telegramUser: TelegramUser | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  exchangeCurrency: (from: "coins" | "cash", amount: number) => Promise<boolean>;
  withdrawCash: (amount: number) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getTelegramWebApp(): any {
  return (window as any).Telegram?.WebApp;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authAttempted, setAuthAttempted] = useState(false);

  const fetchProfileAndRoles = useCallback(async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(profileData);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    setIsAdmin(roles?.some((r) => r.role === "admin") ?? false);
  }, []);

  // Auto-login via Telegram WebApp
  const loginViaTelegram = useCallback(async () => {
    const tgApp = getTelegramWebApp();
    if (!tgApp?.initData) {
      setLoading(false);
      return;
    }

    // Parse telegram user from initData
    try {
      const params = new URLSearchParams(tgApp.initData);
      const userStr = params.get("user");
      if (userStr) {
        const tgUser = JSON.parse(userStr);
        setTelegramUser(tgUser);
      }
    } catch {}

    try {
      // Extract start_param from Telegram WebApp (comes from ?startapp= URL param)
      const startParam = tgApp.initDataUnsafe?.start_param || null;
      console.log("[Referral] start_param from WebApp:", startParam);
      console.log("[Referral] initDataUnsafe:", JSON.stringify(tgApp.initDataUnsafe));
      
      const response = await supabase.functions.invoke("telegram-auth", {
        body: { initData: tgApp.initData, start_param: startParam },
      });

      if (response.error) {
        console.error("Telegram auth failed:", response.error);
        setLoading(false);
        return;
      }

      const { session: newSession } = response.data;
      if (newSession) {
        await supabase.auth.setSession({
          access_token: newSession.access_token,
          refresh_token: newSession.refresh_token,
        });
      }
    } catch (err) {
      console.error("Telegram auth error:", err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => fetchProfileAndRoles(session.user.id), 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
        setLoading(false);
      }
    );

    // Check existing session first, then try Telegram auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Already have a session
        setLoading(false);
      } else if (!authAttempted) {
        setAuthAttempted(true);
        loginViaTelegram();
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [authAttempted, loginViaTelegram, fetchProfileAndRoles]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfileAndRoles(user.id);
    }
  }, [user, fetchProfileAndRoles]);

  const exchangeCurrency = useCallback(async (from: "coins" | "cash", amount: number): Promise<boolean> => {
    if (!profile) return false;
    const RATE = 10;
    let newCoins = profile.coins;
    let newCash = profile.cash;

    if (from === "cash") {
      if (amount <= 0 || amount > profile.cash) return false;
      newCash -= amount;
      newCoins += amount * RATE;
    } else {
      const cashAmount = Math.floor(amount / RATE);
      const coinsNeeded = cashAmount * RATE;
      if (cashAmount <= 0 || coinsNeeded > profile.coins) return false;
      newCoins -= coinsNeeded;
      newCash += cashAmount;
    }

    const { error } = await supabase.from("profiles").update({ coins: newCoins, cash: newCash }).eq("id", profile.id);
    if (error) return false;
    setProfile(prev => prev ? { ...prev, coins: newCoins, cash: newCash } : prev);
    return true;
  }, [profile]);

  const withdrawCash = useCallback(async (amount: number): Promise<boolean> => {
    if (!profile || amount <= 0 || amount > profile.cash) return false;
    const newCash = profile.cash - amount;

    // Insert withdrawal request
    const { error: wError } = await supabase.from("withdrawal_requests").insert({
      user_id: profile.id,
      amount,
    });
    if (wError) return false;

    // Update balance
    const { error } = await supabase.from("profiles").update({ cash: newCash }).eq("id", profile.id);
    if (error) return false;
    setProfile(prev => prev ? { ...prev, cash: newCash } : prev);
    return true;
  }, [profile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, telegramUser, isAdmin, loading, signOut, refreshProfile, exchangeCurrency, withdrawCash }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

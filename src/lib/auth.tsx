import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type ProfileType = "player" | "team" | "field";

export type UserProfile = {
  id: string;
  user_id: string;
  type: ProfileType;
  name: string;
  nickname: string | null;
  bio: string | null;
  city: string | null;
  avatar: string | null;
  color: string;
  frame: string;
  position: string | null;
  level: string | null;
  founded: number | null;
  capacity: number | null;
  field_type: string | null;
  price_per_hour: number | null;
  address: string | null;
  age: number | null;
  gender: string | null;
  preferred_foot: string | null;
  field_types: string[] | null;
  photo_url?: string | null;
};

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  profiles: UserProfile[];
  activeProfile: UserProfile | null;
  refreshProfiles: () => Promise<void>;
  setActive: (profileId: string) => Promise<void>;
  signOut: () => Promise<void>;
  upsertProfile: (p: Partial<UserProfile> & { type: ProfileType; name: string }) => Promise<UserProfile | null>;
  deleteProfile: (id: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Bootstrap session
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshProfiles = useCallback(async () => {
    if (!session?.user) {
      setProfiles([]);
      setActiveId(null);
      return;
    }
    const [{ data: profs }, { data: act }] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("user_id", session.user.id).order("created_at"),
      supabase.from("active_profile").select("profile_id").eq("user_id", session.user.id).maybeSingle(),
    ]);
    const list = (profs ?? []) as UserProfile[];
    setProfiles(list);
    if (act?.profile_id && list.some((p) => p.id === act.profile_id)) {
      setActiveId(act.profile_id);
    } else if (list.length > 0) {
      setActiveId(list[0].id);
      await supabase.from("active_profile").upsert({ user_id: session.user.id, profile_id: list[0].id });
    } else {
      setActiveId(null);
    }
  }, [session]);

  useEffect(() => {
    refreshProfiles();
  }, [refreshProfiles]);

  const setActive = useCallback(
    async (profileId: string) => {
      if (!session?.user) return;
      setActiveId(profileId);
      await supabase.from("active_profile").upsert({ user_id: session.user.id, profile_id: profileId });
    },
    [session],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfiles([]);
    setActiveId(null);
  }, []);

  const upsertProfile = useCallback<AuthContextValue["upsertProfile"]>(
    async (p) => {
      if (!session?.user) return null;
      const payload = { ...p, user_id: session.user.id };
      const { data, error } = await supabase
        .from("user_profiles")
        .upsert(payload as never, { onConflict: "user_id,type" })
        .select()
        .single();
      if (error) throw error;
      await refreshProfiles();
      return data as UserProfile;
    },
    [session, refreshProfiles],
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      await supabase.from("user_profiles").delete().eq("id", id);
      await refreshProfiles();
    },
    [refreshProfiles],
  );

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeId) ?? null,
    [profiles, activeId],
  );

  const value: AuthContextValue = {
    session,
    loading,
    profiles,
    activeProfile,
    refreshProfiles,
    setActive,
    signOut,
    upsertProfile,
    deleteProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const PROFILE_TYPE_LABEL: Record<ProfileType, string> = {
  player: "Jogador",
  team: "Time",
  field: "Campo",
};

export const PROFILE_TYPE_EMOJI: Record<ProfileType, string> = {
  player: "⚽",
  team: "🛡️",
  field: "🏟️",
};

export const FRAMES = [
  { id: "classic", label: "Clássico", ring: "ring-2 ring-border" },
  { id: "gold", label: "Ouro", ring: "ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)]" },
  { id: "neon", label: "Neon", ring: "ring-2 ring-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)]" },
  { id: "fire", label: "Fogo", ring: "ring-2 ring-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.6)]" },
  { id: "ice", label: "Gelo", ring: "ring-2 ring-blue-300 shadow-[0_0_20px_rgba(147,197,253,0.5)]" },
] as const;

export function frameClass(frame: string) {
  return FRAMES.find((f) => f.id === frame)?.ring ?? FRAMES[0].ring;
}

export const PRESET_COLORS = [
  "#F59E0B", "#EF4444", "#10B981", "#3B82F6", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#84CC16", "#6366F1",
];

export const PRESET_AVATARS_BY_TYPE: Record<ProfileType, string[]> = {
  player: ["⚽", "🏃", "👟", "🥅", "🧤", "💪", "🔥", "⭐", "🎯", "🏆"],
  team: ["🦁", "🦅", "🦈", "🐺", "🐂", "🐆", "🐍", "🦇", "🐉", "👑"],
  field: ["🏟️", "🌿", "🥅", "📍", "🏞️", "⛳", "🌳", "💚", "🔆", "🏗️"],
};

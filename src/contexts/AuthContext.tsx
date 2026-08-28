"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  displayName: string | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (u: User | null) => {
    if (!u) {
      setDisplayName(null);
      return;
    }
    const metaName = u.user_metadata?.display_name || u.user_metadata?.name;
    const fallbackName = metaName || u.email?.split("@")[0] || "Participante";

    try {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", u.id)
        .single();

      if (data?.display_name?.trim()) {
        setDisplayName(data.display_name.trim());
        return;
      } else {
        // Auto-create or ensure profile exists in Supabase so user is visible in ranking
        await supabase.from("profiles").upsert(
          {
            user_id: u.id,
            display_name: fallbackName,
          },
          { onConflict: "user_id" }
        );
        setDisplayName(fallbackName);
        return;
      }
    } catch {
      // Fallback
    }

    setDisplayName(fallbackName);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      fetchProfile(currentUser).finally(() => {
        setLoading(false);
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        fetchProfile(currentUser);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, rawDisplayName?: string) => {
    const sanitizedName = rawDisplayName?.trim().replace(/[\x00-\x1F\x7F]/g, "").slice(0, 40) || email.split("@")[0];
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: sanitizedName,
        },
      },
    });
    if (error) return { error: error.message };

    if (data.user) {
      try {
        await supabase.from("profiles").upsert(
          {
            user_id: data.user.id,
            display_name: sanitizedName,
          },
          { onConflict: "user_id" }
        );
        setDisplayName(sanitizedName);
      } catch (err) {
        console.warn("Could not insert profile on signup:", err);
      }
    }

    return {};
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      await fetchProfile(data.user);
    }
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setDisplayName(null);
  };

  const deleteAccount = async () => {
    try {
      const { error } = await supabase.rpc("delete_user_account");
      if (error) return { error: error.message };

      // Clear local storage and session completely
      try {
        if (typeof window !== "undefined") {
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith("interliga_") || key.startsWith("sb-")) {
              localStorage.removeItem(key);
            }
          });
        }
      } catch (e) {
        console.warn("Storage cleanup:", e);
      }

      await signOut();
      return {};
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : "Error al eliminar cuenta" };
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/4to-Concurso-Interliga/actualizar-contrasena/`,
    });
    if (error) return { error: error.message };
    return {};
  };

  return (
    <AuthContext.Provider value={{ user, displayName, loading, signUp, signIn, signOut, deleteAccount, resetPassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

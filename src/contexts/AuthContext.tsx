
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

interface Profile {
  id: string;
  username: string | null;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, username: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const isAuthenticated = !!user;

  // --- Set up session and auth listener ---
  useEffect(() => {
    // Set up Supabase subscription FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => refreshProfile(), 0);
      } else {
        setProfile(null);
      }
    });

    // Get current session once on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        refreshProfile();
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line
  }, []);

  // --- Fetch user profile from DB ---
  const refreshProfile = async () => {
    if (!user) { setProfile(null); return; }
    
    try {
      // Fix the query to match the database structure
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
        
      if (error) {
        console.error("Error fetching profile:", error);
        setProfile(null);
        return;
      }
      
      if (data) {
        setProfile({
          id: data.id,
          username: data.username,
          created_at: data.created_at
        });
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error("Exception in refreshProfile:", err);
      setProfile(null);
    }
  };

  // --- Login handler ---
  const login = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    setSession(data.session);
    setUser(data.user);
    await refreshProfile();
    return {};
  };

  // --- Register handler ---
  const register = async (email: string, password: string, username: string) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });
    if (error) return { error: error.message };
    setSession(data.session);
    setUser(data.user);
    // Let Supabase trigger insert the profile, then fetch it after a delay
    setTimeout(refreshProfile, 1200);
    return {};
  };

  // --- Logout ---
  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isAuthenticated,
        login,
        register,
        logout,
        refreshProfile,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};

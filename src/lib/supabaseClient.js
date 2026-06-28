const cdnModule = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

let clientPromise;
let hostedConfigLoaded = false;

function normalizeConfig(config = {}) {
  return {
    url: String(config.url || "").trim(),
    key: String(config.key || config.anonKey || config.publishableKey || "").trim(),
  };
}

export async function loadHostedSupabaseConfig() {
  if (hostedConfigLoaded) return getSupabaseConfig();
  hostedConfigLoaded = true;
  try {
    const response = await fetch(new URL("../../supabase/config.json", import.meta.url), { cache: "no-store" });
    if (!response.ok) return getSupabaseConfig();
    const config = normalizeConfig(await response.json());
    if (config.url || config.key) {
      window.CODEQUEST_SUPABASE = { ...window.CODEQUEST_SUPABASE, ...config };
      clientPromise = null;
    }
  } catch {
    return getSupabaseConfig();
  }
  return getSupabaseConfig();
}

export function getSupabaseConfig() {
  const runtime = normalizeConfig(window.CODEQUEST_SUPABASE || {});
  return {
    url: runtime.url || localStorage.getItem("codequest-supabase-url") || "",
    key: runtime.key || localStorage.getItem("codequest-supabase-key") || "",
  };
}

export function setSupabaseConfig(config) {
  const next = normalizeConfig(config);
  if (next.url) localStorage.setItem("codequest-supabase-url", next.url);
  if (next.key) localStorage.setItem("codequest-supabase-key", next.key);
  window.CODEQUEST_SUPABASE = { ...window.CODEQUEST_SUPABASE, ...next };
  clientPromise = null;
  return getSupabaseConfig();
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseConfig();
  return url.startsWith("https://") && key.length > 20;
}

export async function getSupabaseClient() {
  if (!isSupabaseConfigured()) return null;
  if (!clientPromise) {
    clientPromise = import(cdnModule).then(({ createClient }) => {
      const { url, key } = getSupabaseConfig();
      return createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    });
  }
  return clientPromise;
}

export async function getCurrentSession() {
  const supabase = await getSupabaseClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function testSupabaseConnection() {
  const supabase = await getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.auth.getSession();
  if (error) throw error;
  return true;
}

export async function signUpWithPassword({ email, password, username }) {
  const supabase = await getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username },
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithPassword({ email, password }) {
  const supabase = await getSupabaseClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutSupabase() {
  const supabase = await getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function loadRemoteProfile(userId) {
  const supabase = await getSupabaseClient();
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("username, plan, progress")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveRemoteProfile(user, sessionUser) {
  const supabase = await getSupabaseClient();
  if (!supabase || !sessionUser?.id) return null;
  const { error } = await supabase.from("profiles").upsert({
    id: sessionUser.id,
    email: sessionUser.email,
    username: user.username,
    plan: user.plan,
    progress: {
      xp: user.xp,
      level: user.level,
      coins: user.coins,
      streak: user.streak,
      createdAt: user.createdAt,
      dailyLessonsCompleted: user.dailyLessonsCompleted,
      lastDailyReset: user.lastDailyReset,
      completedLessons: user.completedLessons,
      completedProjects: user.completedProjects,
      purchasedItems: user.purchasedItems,
      tutorQuestionsUsed: user.tutorQuestionsUsed,
      referralCount: user.referralCount,
      proReferralCount: user.proReferralCount,
      earnedBadges: user.earnedBadges,
      certificates: user.certificates,
      activeCourseId: user.activeCourseId,
      dailyRewardClaimed: user.dailyRewardClaimed,
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (error) throw error;
  return true;
}

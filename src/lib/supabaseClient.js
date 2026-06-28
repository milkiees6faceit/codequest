const cdnModule = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

let clientPromise;

export function getSupabaseConfig() {
  const runtime = window.CODEQUEST_SUPABASE || {};
  return {
    url: runtime.url || localStorage.getItem("codequest-supabase-url") || "",
    key: runtime.key || localStorage.getItem("codequest-supabase-key") || "",
  };
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

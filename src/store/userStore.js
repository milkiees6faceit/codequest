const storageKey = "codequest-academy-state";

const starterState = {
  username: "NovaCoder",
  isRegistered: false,
  authProvider: "demo",
  authUserId: "",
  email: "",
  createdAt: new Date().toISOString(),
  lang: "ru",
  plan: "free",
  trialDaysLeft: 7,
  xp: 2840,
  level: 12,
  coins: 740,
  streak: 9,
  dailyLessonsCompleted: 3,
  lastDailyReset: new Date().toDateString(),
  completedLessons: ["html-1", "html-2"],
  completedProjects: [],
  purchasedItems: [],
  tutorQuestionsUsed: 1,
  referralCount: 3,
  proReferralCount: 1,
  certificates: [],
  activeCourseId: "html-island",
  earnedBadges: ["First Quest", "HTML Scout", "Daily Spark"],
  dailyRewardClaimed: false,
  visitedLabToday: false,
};

function resetDailyIfNeeded(state) {
  const today = new Date().toDateString();
  if (state.lastDailyReset !== today) {
    return {
      ...state,
      lastDailyReset: today,
      dailyLessonsCompleted: 0,
      dailyRewardClaimed: false,
      tutorQuestionsUsed: 0,
      visitedLabToday: false,
    };
  }
  return state;
}

export function loadState() {
  const saved = localStorage.getItem(storageKey);
  let parsed = starterState;
  try {
    parsed = saved ? JSON.parse(saved) : starterState;
  } catch {
    parsed = starterState;
  }
  const merged = { ...starterState, ...parsed };
  const next = resetDailyIfNeeded(merged);
  if (next !== merged) saveState(next);
  return next;
}

export function saveState(state) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

export function updateState(mutator) {
  const next = mutator(loadState());
  saveState(next);
  return next;
}

export function mergeState(patch) {
  const next = { ...loadState(), ...patch };
  saveState(next);
  return next;
}

export function resetState() {
  const freshState = {
    ...starterState,
    createdAt: new Date().toISOString(),
    lastDailyReset: new Date().toDateString(),
  };
  saveState(freshState);
  return freshState;
}

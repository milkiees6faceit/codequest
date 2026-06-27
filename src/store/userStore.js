const storageKey = "codequest-academy-state";

const starterState = {
  username: "NovaCoder",
  isRegistered: false,
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
  const parsed = saved ? JSON.parse(saved) : starterState;
  return resetDailyIfNeeded({ ...starterState, ...parsed });
}

export function saveState(state) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

export function updateState(mutator) {
  const next = mutator(loadState());
  saveState(next);
  return next;
}

export function resetState() {
  saveState(starterState);
  return starterState;
}

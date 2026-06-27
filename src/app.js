import {
  badges,
  courses,
  dailyQuests,
  htmlLessons,
  lessonsByCourse,
  projects,
  shopItems,
  tutorPrompts,
} from "./data/demoCourses.js";
import { checkAnswer } from "./lib/codeChecker.js";
import {
  getCurrentSession,
  isSupabaseConfigured,
  loadRemoteProfile,
  saveRemoteProfile,
  signInWithPassword,
  signOutSupabase,
  signUpWithPassword,
} from "./lib/supabaseClient.js";
import { loadState, mergeState, resetState, updateState } from "./store/userStore.js";

const app = document.querySelector("#app");

let route = "home";
let filter = "All";
let selectedCourseId = loadState().activeCourseId || "html-island";
let selectedLesson = getLessons(selectedCourseId)[0] || htmlLessons[0];
let code = selectedLesson.starterCode;
let toast = "";
let modal = "";
let authBusy = false;

const navItems = [
  ["home", "Overview", "OV"],
  ["courses", "Courses", "CR"],
  ["course", "Learning Map", "MP"],
  ["lesson", "Code Lab", "LB"],
  ["profile", "Profile", "PR"],
  ["leaderboard", "Leaderboard", "LD"],
  ["projects", "Projects", "PJ"],
  ["pricing", "Pricing", "UP"],
  ["more", "Systems", "SY"],
];

const publicRoutes = new Set(["home", "auth"]);

function state() {
  return loadState();
}

function isRegistered() {
  return Boolean(state().isRegistered);
}

function currentAuthStatus() {
  const user = state();
  if (user.authProvider === "supabase" && user.email) return `Supabase: ${user.email}`;
  if (!isSupabaseConfigured()) return "Supabase не настроен";
  return "Supabase готов";
}

function isPro() {
  return state().plan !== "free";
}

function selectedCourse() {
  return courses.find((course) => course.id === selectedCourseId) || courses[0];
}

function getLessons(courseId) {
  return lessonsByCourse[courseId] || [];
}

function getCourseByLesson(lessonId) {
  return courses.find((course) => getLessons(course.id).some((lesson) => lesson.id === lessonId)) || courses[0];
}

function completedForCourse(courseId) {
  const completed = new Set(state().completedLessons);
  return getLessons(courseId).filter((lesson) => completed.has(lesson.id)).length;
}

function courseProgress(course = selectedCourse()) {
  const lessons = getLessons(course.id);
  if (!lessons.length) return course.progress || 0;
  return Math.round((completedForCourse(course.id) / lessons.length) * 100);
}

function setRoute(next) {
  route = !isRegistered() && !publicRoutes.has(next) ? "auth" : next;
  toast = "";
  modal = "";
  if (route === "lesson") {
    updateState((s) => ({ ...s, visitedLabToday: true }));
  }
  render();
}

function publicShell(content, meta = {}) {
  return `
    <div class="public-shell">
      <main class="workspace">
        <header class="workspace-top">
          <div>
            <span class="mini-label">${meta.kicker || "Learn to code by building"}</span>
            <h1>${meta.title || "Главная"}</h1>
          </div>
          <div class="account-strip">
            <button class="secondary-btn compact" data-route="auth">Войти</button>
            <button class="primary-btn compact" data-route="auth">Начать</button>
          </div>
        </header>
        ${toast ? `<div class="toast">${toast}</div>` : ""}
        ${content}
      </main>
      ${modal ? modalTemplate() : ""}
    </div>
  `;
}

function shell(content, meta = {}) {
  const user = state();
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <button class="brand" data-route="home" aria-label="CodeQuest Academy overview">
          <span class="brand-mark">CQ</span>
          <span><strong>CodeQuest</strong><small>Academy</small></span>
        </button>
        <nav class="side-nav" aria-label="Primary navigation">
          ${navItems.map(([id, label, icon]) => `
            <button class="${route === id ? "active" : ""}" data-route="${id}">
              <span>${icon}</span><strong>${label}</strong>
            </button>
          `).join("")}
        </nav>
        <section class="sidebar-card">
          <span class="mini-label">Today</span>
          <strong>${isPro() ? "Unlimited Pro access" : `${user.dailyLessonsCompleted}/5 free lessons`}</strong>
          <div class="progress" style="--value:${isPro() ? 100 : Math.min(100, user.dailyLessonsCompleted * 20)}%"><span></span></div>
          <button class="secondary-btn compact" data-route="pricing">${isPro() ? "Manage plan" : "Upgrade access"}</button>
        </section>
      </aside>

      <main class="workspace">
        <header class="workspace-top">
          <div>
            <span class="mini-label">${meta.kicker || "Professional learning system"}</span>
            <h1>${meta.title || "Overview"}</h1>
          </div>
          <div class="account-strip">
            <button class="plan-badge" data-route="pricing">${isPro() ? "Pro" : "Free"}</button>
            <div class="metric-pill"><strong>${user.xp}</strong><span>XP</span></div>
            <div class="metric-pill"><strong>${user.coins}</strong><span>coins</span></div>
            <button class="avatar" data-route="profile">${user.username.slice(0, 2).toUpperCase()}</button>
          </div>
        </header>
        ${content}
      </main>
      ${modal ? modalTemplate() : ""}
    </div>
  `;
}

function home() {
  const user = state();
  const active = selectedCourse();
  const activeLessons = getLessons(active.id);
  return shell(`
    <section class="command-center">
      <div class="command-copy">
        <span class="mini-label">CodeQuest OS</span>
        <h2>Платформа для прокачки кода через практические миссии</h2>
        <p>Курсы работают как система обучения: карта навыков, встроенный редактор, проверка решений, XP, проекты, сертификаты и понятный прогресс без лишней сложности.</p>
        <div class="actions">
          <button class="primary-btn" data-route="lesson">Открыть Code Lab</button>
          <button class="secondary-btn" data-route="courses">Смотреть треки</button>
        </div>
      </div>
      <div class="lab-preview">
        <div class="window-bar"><span></span><span></span><span></span><strong>${selectedLesson.id}</strong></div>
        <pre><code>${escapeHtml(selectedLesson.starterCode)}</code></pre>
        <div class="preview-status">
          <span class="status-dot"></span>
          <strong>${completedForCourse(active.id)}/${activeLessons.length} ${active.language} missions completed</strong>
          <span class="tag">+${selectedLesson.xp} XP</span>
        </div>
      </div>
    </section>

    <section class="insight-grid">
      ${statCard("Level", user.level, "Active learning tier")}
      ${statCard("Streak", user.streak, "Days in a row")}
      ${statCard("Coins", user.coins, "Earned by learning")}
      ${statCard(active.language, `${courseProgress(active)}%`, "Current path")}
    </section>

    <section class="split-layout">
      <article class="panel focus-panel">
        <div class="section-head">
          <div><span class="mini-label">Current track</span><h2>${active.title}</h2></div>
          <button class="secondary-btn compact" data-route="course">Open map</button>
        </div>
        <p class="muted">${active.description}</p>
        <div class="track-strip">
          ${activeLessons.map((lesson, index) => `<button class="${state().completedLessons.includes(lesson.id) ? "done" : ""}" data-lesson="${lesson.id}">${index + 1}</button>`).join("")}
        </div>
      </article>
      <article class="panel">
        <span class="mini-label">Daily quests</span>
        <div class="process-list">
          ${dailyQuests.map((quest) => questRow(quest)).join("")}
        </div>
      </article>
    </section>
  `, { title: "Command Center", kicker: "Learning dashboard" });
}

function questRow(quest) {
  const user = state();
  const complete = quest.type === "lesson"
    ? user.dailyLessonsCompleted > 0
    : quest.type === "visit-lab"
      ? user.visitedLabToday
      : user.completedProjects.length > 0;
  return `<div class="${complete ? "complete" : ""}"><strong>${complete ? "OK" : "--"}</strong><span>${quest.title}<small>${quest.reward}</small></span></div>`;
}

function statCard(label, value, detail) {
  return `<article class="stat-card"><span>${label}</span><strong>${value}</strong><p>${detail}</p></article>`;
}

function publicHome() {
  return publicShell(`
    <section class="landing-hero">
      <div class="landing-copy">
        <span class="mini-label">CodeQuest Academy</span>
        <h2>Учись программировать через миссии, проекты и понятный прогресс</h2>
        <p>Современная платформа для изучения HTML, CSS, JavaScript, Python и C++: короткая теория, встроенный редактор, проверка решений, XP, проекты для портфолио и сертификаты.</p>
        <div class="actions">
          <button class="primary-btn" data-route="auth">Начать бесплатно</button>
          <button class="secondary-btn" data-route="courses">Посмотреть курсы</button>
        </div>
        <div class="landing-trust">
          <span>5 направлений</span>
          <span>Code Lab</span>
          <span>Free + Pro</span>
          <span>Сертификаты</span>
        </div>
      </div>
      <div class="landing-product">
        <div class="window-bar"><span></span><span></span><span></span><strong>${selectedLesson.id}</strong></div>
        <pre><code>${escapeHtml(selectedLesson.starterCode)}</code></pre>
        <div class="preview-status">
          <span class="status-dot"></span>
          <strong>Code check ready</strong>
          <span class="tag">+${selectedLesson.xp} XP</span>
        </div>
      </div>
    </section>

    <section class="landing-section">
      <div class="landing-section-head">
        <span class="mini-label">Преимущества</span>
        <h2>Не просто уроки, а система роста</h2>
      </div>
      <div class="benefit-grid">
        ${benefitCard("Практика с первого экрана", "Каждая тема сразу закрепляется задачей в редакторе кода.")}
        ${benefitCard("Игровой прогресс без детскости", "XP, streak, coins и badges помогают видеть движение, но интерфейс остается профессиональным.")}
        ${benefitCard("Проекты для портфолио", "После глав открываются мини-проекты: лендинг, анимации, todo app, калькулятор и dashboard.")}
        ${benefitCard("AI Tutor и подсказки", "Наставник помогает понять ошибку и дает подсказку, не раскрывая ответ сразу.")}
      </div>
    </section>

    <section class="landing-section split-layout">
      <article class="panel about-panel">
        <span class="mini-label">О нас</span>
        <h2>Мы делаем обучение программированию похожим на рабочий продукт</h2>
        <p>CodeQuest Academy создан для тех, кто хочет учиться без скучных лекций и хаотичных туториалов. Мы соединяем структуру курса, игровой прогресс и реальные задания, чтобы новичок понимал, что делать сегодня и куда двигаться дальше.</p>
        <button class="primary-btn" data-route="auth">Создать аккаунт</button>
      </article>
      <article class="panel">
        <span class="mini-label">Как это работает</span>
        <div class="process-list">
          ${["Выбираешь трек", "Проходишь короткую миссию", "Пишешь код в Code Lab", "Получаешь XP и открываешь проект"].map((item, index) => `
            <div><strong>0${index + 1}</strong><span>${item}<small>${index === 3 ? "Проекты идут в портфолио" : "Без лишней теории"}</small></span></div>
          `).join("")}
        </div>
      </article>
    </section>

    <section class="landing-section">
      <div class="landing-section-head">
        <span class="mini-label">Планы</span>
        <h2>Начни бесплатно, расширяйся когда готов</h2>
      </div>
      <div class="landing-plan-grid">
        ${landingPlan("Free", "$0", "5 уроков в день, все языки в каталоге, XP, рейтинг и базовые проекты.", "Начать", "auth")}
        ${landingPlan("Pro Monthly", "$10", "Без лимитов, полные курсы, все проекты, сертификаты и приоритетные обновления.", "Открыть Pro", "pricing")}
        ${landingPlan("Pro Yearly", "$90", "Все из Monthly, экономия $30, Pro badge и ранний доступ к новым функциям.", "Выбрать Yearly", "pricing")}
      </div>
    </section>
  `, { title: "Главная", kicker: "Learn to code by building" });
}

function benefitCard(title, text) {
  return `<article class="panel benefit-card"><h3>${title}</h3><p class="muted">${text}</p></article>`;
}

function landingPlan(title, price, text, button, target) {
  return `<article class="price-card landing-plan">
    <span class="mini-label">${title}</span>
    <div class="price">${price}</div>
    <p class="muted">${text}</p>
    <button class="${title === "Free" ? "secondary-btn" : "primary-btn"}" data-route="${target}">${button}</button>
  </article>`;
}

function coursesView() {
  const visible = filter === "All" ? courses : courses.filter((course) => [course.track, course.difficulty].includes(filter));
  return shell(`
    <section class="toolbar">
      <div class="filters">
        ${["All", "Frontend", "Backend", "GameDev", "Beginner", "Advanced"].map((item) => `<button class="${filter === item ? "active" : ""}" data-filter="${item}">${item}</button>`).join("")}
      </div>
      <button class="primary-btn compact" data-route="pricing">Unlock Pro</button>
    </section>
    <section class="course-grid">
      ${visible.map(courseCard).join("")}
    </section>
  `, { title: "Course Catalog", kicker: "Structured paths" });
}

function courseCard(course) {
  const locked = course.pro && !isPro();
  return `
    <article class="course-card ${locked ? "locked-card" : ""}" style="--accent:${course.accent}">
      <div class="course-cover">
        <span>${course.language}</span>
        <div class="course-orbit"></div>
      </div>
      <div class="course-body">
        <div class="row-between">
          <h2>${course.title}</h2>
          <span class="tag">${locked ? "Pro locked" : course.pro ? "Pro" : "Free"}</span>
        </div>
        <p>${course.description}</p>
        <div class="tag-list">
          <span class="tag">${course.track}</span>
          <span class="tag">${course.difficulty}</span>
          <span class="tag">${getLessons(course.id).length} missions</span>
          <span class="tag">${course.xp} XP</span>
        </div>
        <div class="row-between"><span class="muted">Progress</span><strong>${courseProgress(course)}%</strong></div>
        <div class="progress" style="--value:${courseProgress(course)}%"><span></span></div>
        <button class="${locked ? "primary-btn" : "secondary-btn"} compact" data-open-course="${course.id}">${locked ? "Upgrade to open" : "Open learning map"}</button>
      </div>
    </article>
  `;
}

function courseDetail() {
  const user = state();
  const course = selectedCourse();
  const lessons = getLessons(course.id);
  const completed = new Set(user.completedLessons);
  const lockedCourse = course.pro && !isPro();
  const nextLesson = lessons.find((lesson) => !completed.has(lesson.id)) || lessons[0];
  return shell(`
    <section class="split-layout wide-left">
      <article class="panel course-hero">
        <span class="mini-label">${course.title}</span>
        <h2>${course.language} mission path</h2>
        <p>${course.description} ${lockedCourse ? "Этот трек доступен на Pro." : "Открой миссию, реши задачу в Code Lab и забери XP."}</p>
        <div class="insight-grid compact-grid">
          ${statCard("Progress", `${courseProgress(course)}%`, "Track completion")}
          ${statCard("XP Pool", course.xp, "Available reward")}
          ${statCard("Status", lockedCourse ? "Locked" : "Open", "Access")}
        </div>
        <div class="actions">
          ${lockedCourse ? `<button class="primary-btn" data-route="pricing">Unlock full path</button>` : `<button class="primary-btn" data-lesson="${nextLesson?.id || ""}">Продолжить</button>`}
          <button class="secondary-btn" data-certificate="${course.id}">Certificate preview</button>
        </div>
      </article>
      <section class="mission-path" aria-label="${course.title} lesson path">
        ${lessons.map((lesson, index) => {
          const locked = lockedCourse || (!isPro() && user.dailyLessonsCompleted >= 5 && !completed.has(lesson.id));
          const done = completed.has(lesson.id);
          const boss = lesson.title.toLowerCase().includes("boss");
          return `<button class="mission-node ${done ? "done" : ""} ${locked ? "locked" : ""} ${boss ? "boss" : ""}" data-lesson="${lesson.id}">
            <span class="path-step">${done ? "OK" : `0${index + 1}`}</span>
            <span class="mission-copy"><strong>${lesson.title}</strong><small>${lesson.content}</small></span>
            <span class="mission-meta"><span class="tag">${lesson.xp} XP</span><span class="tag">${done ? "Done" : locked ? "Locked" : boss ? "Boss" : "Open"}</span></span>
          </button>`;
        }).join("")}
      </section>
    </section>
  `, { title: "Learning Map", kicker: `${course.language} track` });
}

function lessonView() {
  const user = state();
  const course = getCourseByLesson(selectedLesson.id);
  const locked = (course.pro && !isPro()) || (!isPro() && user.dailyLessonsCompleted >= 5 && !user.completedLessons.includes(selectedLesson.id));
  return shell(`
    <section class="lab-layout">
      <article class="panel lesson-brief">
        <span class="mini-label">${course.language} mission</span>
        <h2>${selectedLesson.title}</h2>
        <p>${selectedLesson.content}</p>
        <div class="hint-box"><strong>Hint</strong><span>${selectedLesson.hint}</span></div>
        <div class="hint-box"><strong>Expected behavior</strong><span>Answer is checked with normalized code, so spacing differences are okay.</span></div>
        <div class="actions">
          <button class="secondary-btn compact" data-cycle-lesson="prev">Prev</button>
          <button class="secondary-btn compact" data-cycle-lesson="next">Next</button>
        </div>
      </article>
      <article class="panel editor-panel">
        <div class="row-between">
          <div><span class="mini-label">Editor</span><h2>Mission workspace</h2></div>
          <span class="tag">${isPro() ? "Unlimited Pro" : `${user.dailyLessonsCompleted}/5 Free`}</span>
        </div>
        <textarea aria-label="Mission code editor" ${locked ? "disabled" : ""} spellcheck="false">${code}</textarea>
        ${locked ? `<div class="empty-note">This mission is locked by your current access or daily limit.</div>` : ""}
        <div class="actions">
          <button class="primary-btn" data-check-code ${locked ? "disabled" : ""}>Проверить</button>
          <button class="secondary-btn" data-fill-answer>Use demo answer</button>
          <button class="ghost-btn" data-reset-code>Reset</button>
          <button class="secondary-btn" data-tutor-ask>Ask AI Tutor</button>
        </div>
        ${toast ? `<div class="toast">${toast}</div>` : ""}
      </article>
    </section>
  `, { title: "Code Lab", kicker: "Interactive validation" });
}

function pricingView() {
  const user = state();
  return shell(`
    <section class="panel billing-panel">
      <span class="mini-label">Current access</span>
      <h2>${isPro() ? "Pro active" : `${user.trialDaysLeft} trial days available`}</h2>
      <p class="muted">Free users get 5 lessons and 5 AI Tutor questions per day. Pro removes daily limits and unlocks advanced projects.</p>
    </section>
    <section class="pricing-grid">
      ${priceCard("Free", "$0", ["5 lessons per day", "All languages preview", "XP and leaderboard", "Beginner projects", "Code editor"], "Current plan", false)}
      ${priceCard("Pro Monthly", "$10", ["Unlimited lessons", "Full courses", "All projects", "Certificates", "Priority updates"], "Start Pro", false)}
      ${priceCard("Pro Yearly", "$90", ["Everything in Monthly", "Save $30", "Pro Member badge", "Early access", "Exclusive projects"], "Start Yearly", true)}
    </section>
  `, { title: "Pricing", kicker: "Free and Pro access" });
}

function priceCard(title, price, items, button, best) {
  return `<article class="price-card ${best ? "best" : ""}">
    <div class="row-between"><h2>${title}</h2>${best ? `<span class="tag">Best Value</span>` : ""}</div>
    <div class="price">${price}</div>
    <ul class="check-list">${items.map((item) => `<li>${item}</li>`).join("")}</ul>
    <button class="${title === "Free" ? "secondary-btn" : "primary-btn"}" data-upgrade="${title}">${button}</button>
  </article>`;
}

function profileView() {
  const user = state();
  return shell(`
    <section class="split-layout">
      <article class="panel profile-panel">
        <div class="avatar large">${user.username.slice(0, 2).toUpperCase()}</div>
        <h2>${user.username}</h2>
        <p>${isPro() ? "Pro member" : "Free learner with Pro Trial ready"}</p>
        <button class="primary-btn" data-claim-reward>${user.dailyRewardClaimed ? "Reward claimed" : "Claim daily reward"}</button>
        <button class="secondary-btn profile-action" data-export-progress>Export progress</button>
        <button class="secondary-btn profile-action" data-logout>Log out</button>
        <button class="ghost-btn profile-action" data-reset-progress>Reset demo progress</button>
      </article>
      <article class="panel">
        <div class="insight-grid compact-grid">
          ${statCard("Level", user.level, "Current tier")}
          ${statCard("XP", user.xp, "Total earned")}
          ${statCard("Streak", user.streak, "Days")}
          ${statCard("Coins", user.coins, "Balance")}
        </div>
        <h2>Badges</h2>
        <div class="badge-grid">${badges.map((badge) => `<span class="badge">${user.earnedBadges.includes(badge) ? "OK " : ""}${badge}</span>`).join("")}</div>
      </article>
    </section>
  `, { title: "Profile", kicker: "Learner identity" });
}

function leaderboardView() {
  const user = state();
  const rows = [
    [user.username, `${user.xp} XP`],
    ["Mira.js", "2710 XP"],
    ["StackSage", "2515 XP"],
    ["PixelRin", "2300 XP"],
  ].sort((a, b) => Number(b[1].split(" ")[0]) - Number(a[1].split(" ")[0]));
  return shell(`
    <section class="panel table-panel">
      ${rows.map((row, index) => `<div class="leader-row"><strong>${String(index + 1).padStart(2, "0")}</strong><span>${row[0]}</span><span class="tag">${row[1]}</span></div>`).join("")}
    </section>
    <section class="panel">
      <span class="mini-label">Top projects</span>
      <h2>Portfolio Spark, Todo Reactor, Python Calc Arena</h2>
      <p class="muted">Лучшие работы недели попадают в витрину проектов и дают дополнительные coins.</p>
    </section>
  `, { title: "Leaderboard", kicker: "Weekly ranking" });
}

function projectsView() {
  const user = state();
  return shell(`
    <section class="panel table-panel">
      ${projects.map((project) => projectRow(project, user)).join("")}
    </section>
  `, { title: "Projects", kicker: "Portfolio practice" });
}

function projectRow(project, user) {
  const completed = user.completedProjects.includes(project.id);
  const lockedByPro = project.pro && !isPro();
  const lockedByProgress = completedForCourse("html-island") < project.requirement;
  const locked = lockedByPro || lockedByProgress;
  return `<div class="project-row ${completed ? "complete" : ""}">
    <span><strong>${project.title}</strong><small>${project.course} - requires ${project.requirement}/5 HTML missions${completed ? " - submitted" : ""}</small></span>
    <span class="tag">${project.difficulty}</span>
    <button class="${locked ? "secondary-btn" : "primary-btn"} compact" data-project="${project.id}" ${completed ? "disabled" : ""}>${completed ? "Done" : lockedByPro ? "Pro" : lockedByProgress ? "Locked" : `Submit +${project.xp} XP`}</button>
  </div>`;
}

function authView() {
  const configured = isSupabaseConfigured();
  const busy = authBusy ? "disabled" : "";
  return publicShell(`
    <section class="panel auth-status-panel">
      <div>
        <span class="mini-label">Supabase Auth</span>
        <h2>${currentAuthStatus()}</h2>
        <p class="muted">${configured ? "Email/password registration is connected. After login the dashboard navigation appears." : "Add Supabase URL and anon/publishable key in index.html or localStorage; the forms will start working without code changes."}</p>
      </div>
      <span class="tag">${configured ? "Connected" : "Setup needed"}</span>
    </section>
    <section class="split-layout">
      <article class="panel">
        <span class="mini-label">Login</span>
        <h2>Sign in</h2>
        <p class="muted">Supabase keeps the session in this browser and unlocks the learning workspace.</p>
        <div class="auth-form">
          <label>Email<input class="input" data-login-email type="email" autocomplete="email" placeholder="you@example.com" /></label>
          <label>Password<input class="input" data-login-password type="password" autocomplete="current-password" placeholder="password" /></label>
          <button class="primary-btn" data-login-supabase ${busy}>Sign in</button>
          <button class="secondary-btn" data-login-demo ${busy}>Demo login: ${state().username}</button>
        </div>
      </article>
      <article class="panel">
        <span class="mini-label">Register</span>
        <h2>Create account</h2>
        <p class="muted">The account is created in Supabase Auth, then profile and progress are saved in the profiles table.</p>
        <div class="auth-form">
          <label>Username<input class="input" data-register-username autocomplete="username" placeholder="NovaCoder" /></label>
          <label>Email<input class="input" data-register-email type="email" autocomplete="email" placeholder="you@example.com" /></label>
          <label>Password<input class="input" data-register-password type="password" autocomplete="new-password" placeholder="minimum 6 characters" /></label>
          <button class="primary-btn auth-save" data-register-supabase ${busy}>Create account</button>
        </div>
      </article>
    </section>
  `, { title: "Регистрация", kicker: "Access and guest mode" });
}

function moreView() {
  const user = state();
  return shell(`
    <section class="system-grid">
      <article class="panel">
        <span class="mini-label">AI Tutor</span>
        <h2>${isPro() ? "Unlimited" : `${user.tutorQuestionsUsed}/5 today`}</h2>
        <p class="muted">Ask for hints, explanations, similar tasks, or solution feedback.</p>
        <div class="tag-list">${tutorPrompts.map((prompt) => `<button class="tag tutor-chip" data-tutor-prompt="${prompt}">${prompt}</button>`).join("")}</div>
      </article>
      <article class="panel">
        <span class="mini-label">Referral</span>
        <h2>${user.referralCount} invited - ${user.proReferralCount} Pro</h2>
        <p class="muted">codequest.app/ref/${user.username}</p>
        <button class="secondary-btn compact" data-copy-referral>Copy referral</button>
      </article>
      <article class="panel">
        <span class="mini-label">Certificates</span>
        <h2>${user.certificates.length}</h2>
        <p class="muted">${user.certificates.length ? user.certificates.join(", ") : "Complete a course to generate the first certificate."}</p>
      </article>
      <article class="panel">
        <span class="mini-label">Shop</span>
        <div class="shop-list">${shopItems.map((item) => shopItem(item, user)).join("")}</div>
      </article>
      <article class="panel">
        <span class="mini-label">Roadmap</span>
        <p>Frontend: HTML -> CSS -> JavaScript -> Git -> React -> Next.js. Backend: Python -> SQL -> API -> Databases -> Docker.</p>
      </article>
      <article class="panel">
        <span class="mini-label">Admin</span>
        <p>Demo admin scope: courses, lessons, subscriptions, analytics, Stripe payments, certificates, achievements, and daily limits.</p>
      </article>
    </section>
  `, { title: "Systems", kicker: "Platform modules" });
}

function shopItem(item, user) {
  const owned = user.purchasedItems.includes(item.id);
  return `<div class="shop-item">
    <span><strong>${item.title}</strong><small>${item.category} - ${item.price} coins</small></span>
    <button class="${owned ? "secondary-btn" : "primary-btn"} compact" data-buy-item="${item.id}" ${owned ? "disabled" : ""}>${owned ? "Owned" : "Buy"}</button>
  </div>`;
}

function modalTemplate() {
  const copy = {
    limit: ["Лимит на сегодня достигнут", "Сегодня вы уже прошли 5 бесплатных уроков. Перейдите на Pro и получите неограниченный доступ ко всем курсам."],
    pro: ["Pro checkout demo", "Stripe checkout would start here for cards, Apple Pay, and Google Pay. In this MVP the plan is upgraded locally."],
    certificate: ["Certificate preview", certificateCopy()],
    tutor: ["AI Tutor", "Free plan includes 5 tutor questions per day. Pro removes this limit."],
  }[modal];
  return `<div class="modal-backdrop"><div class="modal"><h2>${copy[0]}</h2><p class="muted">${copy[1]}</p><div class="actions"><button class="primary-btn" data-close-modal>Upgrade to Pro</button><button class="secondary-btn" data-close-only>Maybe Later</button></div></div></div>`;
}

function certificateCopy() {
  const user = state();
  const course = selectedCourse();
  if (!user.certificates.includes(course.title)) {
    return `Complete all ${getLessons(course.id).length} ${course.language} missions to generate a PDF certificate with ID and QR verification.`;
  }
  return `CodeQuest Academy certifies ${user.username} completed ${course.title}. Certificate ID: CQ-${course.language}-${new Date().getFullYear()}-001. QR verification page ready for /verify.`;
}

function render() {
  const views = { home: isRegistered() ? home : publicHome, courses: coursesView, course: courseDetail, lesson: lessonView, profile: profileView, leaderboard: leaderboardView, projects: projectsView, pricing: pricingView, auth: authView, more: moreView };
  if (!isRegistered() && !publicRoutes.has(route)) route = "auth";
  app.innerHTML = views[route]();
  bindEvents();
}

function bindEvents() {
  app.querySelectorAll("[data-route]").forEach((el) => el.addEventListener("click", () => setRoute(el.dataset.route)));
  app.querySelectorAll("[data-filter]").forEach((el) => el.addEventListener("click", () => { filter = el.dataset.filter; render(); }));
  app.querySelectorAll("[data-open-course]").forEach((el) => el.addEventListener("click", () => openCourse(el.dataset.openCourse)));
  app.querySelectorAll("[data-lesson]").forEach((el) => el.addEventListener("click", () => openLesson(el.dataset.lesson)));

  const textarea = app.querySelector("textarea");
  if (textarea) textarea.addEventListener("input", (event) => { code = event.target.value; });

  const check = app.querySelector("[data-check-code]");
  if (check) check.addEventListener("click", () => completeLesson());

  const fill = app.querySelector("[data-fill-answer]");
  if (fill) fill.addEventListener("click", () => { code = selectedLesson.expected; render(); });

  const reset = app.querySelector("[data-reset-code]");
  if (reset) reset.addEventListener("click", () => { code = selectedLesson.starterCode; toast = ""; render(); });

  app.querySelectorAll("[data-cycle-lesson]").forEach((el) => el.addEventListener("click", () => cycleLesson(el.dataset.cycleLesson)));
  app.querySelectorAll("[data-upgrade]").forEach((el) => el.addEventListener("click", () => { modal = el.dataset.upgrade === "Free" ? "" : "pro"; render(); }));
  app.querySelectorAll("[data-close-modal]").forEach((el) => el.addEventListener("click", () => { updateState((s) => ({ ...s, plan: "pro" })); modal = ""; render(); }));
  app.querySelectorAll("[data-close-only]").forEach((el) => el.addEventListener("click", () => { modal = ""; render(); }));
  app.querySelectorAll("[data-certificate]").forEach((el) => el.addEventListener("click", () => { modal = "certificate"; render(); }));
  app.querySelectorAll("[data-project]").forEach((el) => el.addEventListener("click", () => submitProject(el.dataset.project)));
  app.querySelectorAll("[data-buy-item]").forEach((el) => el.addEventListener("click", () => buyItem(el.dataset.buyItem)));
  app.querySelectorAll("[data-tutor-prompt]").forEach((el) => el.addEventListener("click", () => askTutor(el.dataset.tutorPrompt)));

  const tutorAsk = app.querySelector("[data-tutor-ask]");
  if (tutorAsk) tutorAsk.addEventListener("click", () => askTutor("Give me a hint without the answer."));

  const reward = app.querySelector("[data-claim-reward]");
  if (reward) reward.addEventListener("click", claimDailyReward);

  const exportProgress = app.querySelector("[data-export-progress]");
  if (exportProgress) exportProgress.addEventListener("click", exportProgressSnapshot);

  const resetProgress = app.querySelector("[data-reset-progress]");
  if (resetProgress) resetProgress.addEventListener("click", () => {
    resetState();
    selectedCourseId = "html-island";
    selectedLesson = getLessons(selectedCourseId)[0];
    code = selectedLesson.starterCode;
    toast = "Demo progress reset.";
    render();
  });

  const saveUsername = app.querySelector("[data-save-username]");
  if (saveUsername) saveUsername.addEventListener("click", saveUsernameFromInput);

  const demoLogin = app.querySelector("[data-login-demo]");
  if (demoLogin) demoLogin.addEventListener("click", continueDemoAccount);

  const supabaseLogin = app.querySelector("[data-login-supabase]");
  if (supabaseLogin) supabaseLogin.addEventListener("click", loginWithSupabase);

  const supabaseRegister = app.querySelector("[data-register-supabase]");
  if (supabaseRegister) supabaseRegister.addEventListener("click", registerWithSupabase);

  const logout = app.querySelector("[data-logout]");
  if (logout) logout.addEventListener("click", logoutAccount);

  const copyReferral = app.querySelector("[data-copy-referral]");
  if (copyReferral) copyReferral.addEventListener("click", () => { toast = `Referral copied: codequest.app/ref/${state().username}`; setRoute("more"); });
}

function openCourse(courseId) {
  const course = courses.find((item) => item.id === courseId);
  if (!course) return;
  selectedCourseId = courseId;
  updateState((s) => ({ ...s, activeCourseId: courseId }));
  if (course.pro && !isPro()) {
    modal = "pro";
    render();
    return;
  }
  selectedLesson = getLessons(courseId)[0] || selectedLesson;
  code = selectedLesson.starterCode;
  setRoute("course");
}

function openLesson(lessonId) {
  const lessonCourse = getCourseByLesson(lessonId);
  const lesson = getLessons(lessonCourse.id).find((item) => item.id === lessonId);
  if (!lesson) return;
  const user = state();
  if (lessonCourse.pro && !isPro()) {
    selectedCourseId = lessonCourse.id;
    modal = "pro";
    render();
    return;
  }
  if (!isPro() && user.dailyLessonsCompleted >= 5 && !user.completedLessons.includes(lesson.id)) {
    modal = "limit";
    render();
    return;
  }
  selectedCourseId = lessonCourse.id;
  selectedLesson = lesson;
  code = selectedLesson.starterCode;
  updateState((s) => ({ ...s, activeCourseId: lessonCourse.id, visitedLabToday: true }));
  setRoute("lesson");
}

function completeLesson() {
  const course = getCourseByLesson(selectedLesson.id);
  if (!checkAnswer(code, selectedLesson.expected)) {
    toast = "Almost. Compare code, text, and order, then try again.";
    render();
    return;
  }
  const user = state();
  if (!isPro() && user.dailyLessonsCompleted >= 5 && !user.completedLessons.includes(selectedLesson.id)) {
    modal = "limit";
    render();
    return;
  }
  updateState((s) => {
    const alreadyDone = s.completedLessons.includes(selectedLesson.id);
    const completedLessons = alreadyDone ? s.completedLessons : [...s.completedLessons, selectedLesson.id];
    const courseFinished = getLessons(course.id).every((lesson) => completedLessons.includes(lesson.id));
    const earnedBadges = [...s.earnedBadges];
    if (courseFinished && !earnedBadges.includes(`${course.language} Finisher`)) earnedBadges.push(`${course.language} Finisher`);
    return {
      ...s,
      xp: alreadyDone ? s.xp : s.xp + selectedLesson.xp,
      coins: alreadyDone ? s.coins : s.coins + Math.round(selectedLesson.xp / 10),
      level: alreadyDone ? s.level : Math.max(s.level, Math.floor((s.xp + selectedLesson.xp) / 250) + 1),
      dailyLessonsCompleted: alreadyDone ? s.dailyLessonsCompleted : s.dailyLessonsCompleted + 1,
      completedLessons,
      earnedBadges,
      certificates: courseFinished && !s.certificates.includes(course.title) ? [...s.certificates, course.title] : s.certificates,
    };
  });
  syncCurrentProfile();
  toast = `Mission complete: +${selectedLesson.xp} XP, coins added, progress saved locally.`;
  render();
}

function cycleLesson(direction) {
  const lessons = getLessons(selectedCourseId);
  const index = lessons.findIndex((lesson) => lesson.id === selectedLesson.id);
  const currentIndex = index >= 0 ? index : 0;
  const nextIndex = direction === "next" ? (currentIndex + 1) % lessons.length : (currentIndex - 1 + lessons.length) % lessons.length;
  selectedLesson = lessons[nextIndex];
  code = selectedLesson.starterCode;
  render();
}

function submitProject(projectId) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return;
  if (project.pro && !isPro()) {
    modal = "pro";
    render();
    return;
  }
  if (completedForCourse("html-island") < project.requirement) {
    toast = `Complete ${project.requirement} HTML missions to unlock this project.`;
    render();
    return;
  }
  updateState((s) => {
    if (s.completedProjects.includes(project.id)) return s;
    return {
      ...s,
      xp: s.xp + project.xp,
      coins: s.coins + Math.round(project.xp / 8),
      completedProjects: [...s.completedProjects, project.id],
      earnedBadges: s.earnedBadges.includes("Project Shipper") ? s.earnedBadges : [...s.earnedBadges, "Project Shipper"],
    };
  });
  syncCurrentProfile();
  toast = `Project submitted: +${project.xp} XP and coins awarded.`;
  render();
}

function buyItem(itemId) {
  const item = shopItems.find((entry) => entry.id === itemId);
  if (!item) return;
  const user = state();
  if (user.purchasedItems.includes(item.id)) return;
  if (user.coins < item.price) {
    toast = `Need ${item.price - user.coins} more coins for ${item.title}.`;
    render();
    return;
  }
  updateState((s) => ({ ...s, coins: s.coins - item.price, purchasedItems: [...s.purchasedItems, item.id] }));
  syncCurrentProfile();
  toast = `${item.title} purchased.`;
  render();
}

function askTutor(prompt) {
  const user = state();
  if (!isPro() && user.tutorQuestionsUsed >= 5) {
    modal = "tutor";
    render();
    return;
  }
  updateState((s) => ({ ...s, tutorQuestionsUsed: isPro() ? s.tutorQuestionsUsed : s.tutorQuestionsUsed + 1 }));
  toast = `AI Tutor: ${prompt} Try reading the task, then change only one structure at a time.`;
  render();
}

function claimDailyReward() {
  const user = state();
  if (user.dailyRewardClaimed) {
    toast = "Daily reward already claimed.";
    render();
    return;
  }
  updateState((s) => ({ ...s, xp: s.xp + 50, coins: s.coins + 25, dailyRewardClaimed: true }));
  syncCurrentProfile();
  toast = "Daily reward claimed: +50 XP and +25 coins.";
  render();
}

function saveUsernameFromInput() {
  const input = app.querySelector(".input");
  const username = input?.value.trim();
  if (!username) {
    toast = "Enter a username first.";
    render();
    return;
  }
  updateState((s) => ({ ...s, username, isRegistered: true }));
  toast = `Username saved: ${username}`;
  setRoute("profile");
}

function continueDemoAccount() {
  updateState((s) => ({ ...s, isRegistered: true, authProvider: "demo" }));
  toast = "Welcome back.";
  setRoute("courses");
}

async function loginWithSupabase() {
  const email = app.querySelector("[data-login-email]")?.value.trim();
  const password = app.querySelector("[data-login-password]")?.value;
  if (!email || !password) {
    toast = "Enter email and password.";
    render();
    return;
  }
  await runAuthAction(async () => {
    const { session, user } = await signInWithPassword({ email, password });
    await activateSupabaseUser(session?.user || user);
    toast = "Signed in with Supabase.";
    setRoute("courses");
  });
}

async function registerWithSupabase() {
  const username = app.querySelector("[data-register-username]")?.value.trim();
  const email = app.querySelector("[data-register-email]")?.value.trim();
  const password = app.querySelector("[data-register-password]")?.value;
  if (!username || !email || !password) {
    toast = "Enter username, email, and password.";
    render();
    return;
  }
  if (password.length < 6) {
    toast = "Password must be at least 6 characters.";
    render();
    return;
  }
  await runAuthAction(async () => {
    const { session, user } = await signUpWithPassword({ email, password, username });
    if (!session && user) {
      toast = "Account created. Check email confirmation, then sign in.";
      render();
      return;
    }
    await activateSupabaseUser(session?.user || user, username);
    toast = "Account created with Supabase.";
    setRoute("courses");
  });
}

async function logoutAccount() {
  authBusy = true;
  render();
  try {
    await signOutSupabase();
    mergeState({ isRegistered: false, authProvider: "demo", authUserId: "", email: "" });
    route = "home";
    toast = "";
    render();
  } catch (error) {
    toast = error.message || "Could not log out.";
    render();
  } finally {
    authBusy = false;
  }
}

async function runAuthAction(action) {
  if (!isSupabaseConfigured()) {
    toast = "Supabase URL/key are not configured yet.";
    render();
    return;
  }
  authBusy = true;
  render();
  try {
    await action();
  } catch (error) {
    toast = error.message || "Supabase auth error.";
    render();
  } finally {
    authBusy = false;
    render();
  }
}

async function activateSupabaseUser(sessionUser, fallbackUsername = "") {
  if (!sessionUser) throw new Error("Supabase did not return a user session.");
  let remoteProfile = null;
  try {
    remoteProfile = await loadRemoteProfile(sessionUser.id);
  } catch (error) {
    toast = error.message;
  }
  const remoteProgress = remoteProfile?.progress || {};
  const username = remoteProfile?.username || fallbackUsername || sessionUser.user_metadata?.username || sessionUser.email?.split("@")[0] || "CodeQuestUser";
  mergeState({
    ...remoteProgress,
    username,
    plan: remoteProfile?.plan || state().plan,
    isRegistered: true,
    authProvider: "supabase",
    authUserId: sessionUser.id,
    email: sessionUser.email || "",
  });
  await syncCurrentProfile(sessionUser);
}

async function syncCurrentProfile(sessionUser = null) {
  const user = state();
  if (user.authProvider !== "supabase") return;
  try {
    await saveRemoteProfile(user, sessionUser || { id: user.authUserId, email: user.email });
  } catch (error) {
    toast = error.message || "Could not sync profile.";
  }
}

function exportProgressSnapshot() {
  const user = state();
  const snapshot = {
    username: user.username,
    plan: user.plan,
    xp: user.xp,
    level: user.level,
    coins: user.coins,
    completedLessons: user.completedLessons,
    completedProjects: user.completedProjects,
    certificates: user.certificates,
  };
  toast = `Progress snapshot: ${JSON.stringify(snapshot)}`;
  render();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function initApp() {
  if (isSupabaseConfigured()) {
    try {
      const session = await getCurrentSession();
      if (session?.user) {
        await activateSupabaseUser(session.user);
        route = "courses";
      }
    } catch (error) {
      toast = error.message || "Could not restore Supabase session.";
    }
  }
  render();
}

initApp();

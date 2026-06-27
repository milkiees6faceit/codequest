import { badges, courses, dailyQuests, htmlLessons, projects, shopItems, tutorPrompts } from "./data/demoCourses.js";
import { checkAnswer } from "./lib/codeChecker.js";
import { loadState, resetState, updateState } from "./store/userStore.js";

const app = document.querySelector("#app");

let route = "home";
let filter = "All";
let selectedLesson = htmlLessons[0];
let code = selectedLesson.starterCode;
let toast = "";
let modal = "";
let selectedCourseId = loadState().activeCourseId || "html-island";

const navItems = [
  ["home", "Overview", "OV"],
  ["courses", "Courses", "CR"],
  ["course", "Learning Map", "MP"],
  ["lesson", "Code Lab", "LB"],
  ["profile", "Profile", "PR"],
  ["leaderboard", "Leaderboard", "LD"],
  ["projects", "Projects", "PJ"],
  ["pricing", "Pricing", "UP"],
  ["auth", "Access", "AC"],
  ["more", "Systems", "SY"],
];

function state() {
  return loadState();
}

function selectedCourse() {
  return courses.find((course) => course.id === selectedCourseId) || courses[0];
}

function setRoute(next) {
  route = next;
  toast = "";
  modal = "";
  if (next === "lesson") {
    updateState((s) => ({ ...s, visitedLabToday: true }));
  }
  render();
}

function courseProgress(course = selectedCourse()) {
  if (course.id !== "html-island") return course.progress;
  const done = new Set(state().completedLessons);
  return Math.round((htmlLessons.filter((lesson) => done.has(lesson.id)).length / htmlLessons.length) * 100);
}

function completedHtmlCount() {
  const done = new Set(state().completedLessons);
  return htmlLessons.filter((lesson) => done.has(lesson.id)).length;
}

function isPro() {
  return state().plan !== "free";
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
  const htmlCourse = courses[0];
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
        <div class="window-bar"><span></span><span></span><span></span><strong>mission.html</strong></div>
        <pre><code>&lt;section class="quest-card"&gt;
  &lt;h2&gt;Quest Ready&lt;/h2&gt;
  &lt;p&gt;Build every day.&lt;/p&gt;
  &lt;button&gt;Start&lt;/button&gt;
&lt;/section&gt;</code></pre>
        <div class="preview-status">
          <span class="status-dot"></span>
          <strong>${completedHtmlCount()}/5 HTML missions completed</strong>
          <span class="tag">+300 XP boss</span>
        </div>
      </div>
    </section>

    <section class="insight-grid">
      ${statCard("Level", user.level, "Active learning tier")}
      ${statCard("Streak", user.streak, "Days in a row")}
      ${statCard("Coins", user.coins, "Earned by learning")}
      ${statCard("HTML", `${courseProgress(htmlCourse)}%`, "Current path")}
    </section>

    <section class="split-layout">
      <article class="panel focus-panel">
        <div class="section-head">
          <div><span class="mini-label">Current track</span><h2>${htmlCourse.title}</h2></div>
          <button class="secondary-btn compact" data-route="course">Open map</button>
        </div>
        <p class="muted">${htmlCourse.description}</p>
        <div class="track-strip">
          ${htmlLessons.map((lesson, index) => `<button class="${state().completedLessons.includes(lesson.id) ? "done" : ""}" data-lesson="${lesson.id}">${index + 1}</button>`).join("")}
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
          <span class="tag">${course.lessons} lessons</span>
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
  const isHtml = course.id === "html-island";
  const done = new Set(user.completedLessons);
  return shell(`
    <section class="split-layout wide-left">
      <article class="panel course-hero">
        <span class="mini-label">${course.title}</span>
        <h2>${isHtml ? "Semantic survival path" : `${course.language} path preview`}</h2>
        <p>${isHtml ? "Пять быстрых миссий по структуре HTML: заголовки, текст, списки, ссылки и финальная карточка. После прохождения открывается сертификат." : "Этот трек уже есть в каталоге MVP. Полные миссии будут подключены после расширения базы уроков; Pro-доступ показывает, как будет работать блокировка контента."}</p>
        <div class="insight-grid compact-grid">
          ${statCard("Progress", `${courseProgress(course)}%`, "Track completion")}
          ${statCard("XP Pool", course.xp, "Available reward")}
          ${statCard("Status", course.pro && !isPro() ? "Locked" : "Open", "Access")}
        </div>
        <div class="actions">
          ${isHtml ? `<button class="primary-btn" data-route="lesson">Продолжить</button>` : `<button class="primary-btn" data-route="pricing">Unlock full path</button>`}
          <button class="secondary-btn" data-certificate="html">Certificate preview</button>
        </div>
      </article>
      <section class="mission-list">
        ${isHtml ? htmlLessons.map((lesson, index) => {
          const locked = !isPro() && user.dailyLessonsCompleted >= 5 && !done.has(lesson.id);
          return `<button class="mission-row ${done.has(lesson.id) ? "done" : ""} ${locked ? "locked" : ""}" data-lesson="${lesson.id}">
            <span class="node">${done.has(lesson.id) ? "OK" : `0${index + 1}`}</span>
            <span><strong>${lesson.title}</strong><small>${lesson.content}</small></span>
            <span class="tag">${lesson.xp} XP</span>
          </button>`;
        }).join("") : previewMissions(course)}
      </section>
    </section>
  `, { title: "Learning Map", kicker: `${course.language} track` });
}

function previewMissions(course) {
  return ["Core syntax", "Practice lab", "Mini project"].map((title, index) => `
    <div class="mission-row locked">
      <span class="node">0${index + 1}</span>
      <span><strong>${title}</strong><small>${course.pro && !isPro() ? "Upgrade to Pro to unlock this path." : "Coming next in the MVP roadmap."}</small></span>
      <span class="tag">${course.pro ? "Pro" : "Soon"}</span>
    </div>
  `).join("");
}

function lessonView() {
  const user = state();
  const locked = !isPro() && user.dailyLessonsCompleted >= 5 && !user.completedLessons.includes(selectedLesson.id);
  return shell(`
    <section class="lab-layout">
      <article class="panel lesson-brief">
        <span class="mini-label">Code mission</span>
        <h2>${selectedLesson.title}</h2>
        <p>${selectedLesson.content}</p>
        <div class="hint-box"><strong>Hint</strong><span>${selectedLesson.hint}</span></div>
        <div class="hint-box"><strong>Expected behavior</strong><span>Answer is checked by normalized HTML structure, so spacing does not matter.</span></div>
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
        ${locked ? `<div class="empty-note">Daily lesson limit reached. Upgrade to Pro for unlimited missions.</div>` : ""}
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
    ["01", user.username, `${user.xp} XP`],
    ["02", "Mira.js", "2710 XP"],
    ["03", "StackSage", "2515 XP"],
    ["04", "PixelRin", "2300 XP"],
  ].sort((a, b) => Number(b[2].split(" ")[0]) - Number(a[2].split(" ")[0]));
  return shell(`
    <section class="panel table-panel">
      ${rows.map((row, index) => `<div class="leader-row"><strong>${String(index + 1).padStart(2, "0")}</strong><span>${row[1]}</span><span class="tag">${row[2]}</span></div>`).join("")}
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
  const lockedByProgress = completedHtmlCount() < project.requirement;
  const locked = lockedByPro || lockedByProgress;
  return `<div class="project-row ${completed ? "complete" : ""}">
    <span><strong>${project.title}</strong><small>${project.course} · requires ${project.requirement}/5 HTML missions${completed ? " · submitted" : ""}</small></span>
    <span class="tag">${project.difficulty}</span>
    <button class="${locked ? "secondary-btn" : "primary-btn"} compact" data-project="${project.id}" ${completed ? "disabled" : ""}>${completed ? "Done" : lockedByPro ? "Pro" : lockedByProgress ? "Locked" : `Submit +${project.xp} XP`}</button>
  </div>`;
}

function authView() {
  return shell(`
    <section class="split-layout">
      <article class="panel">
        <span class="mini-label">Login</span>
        <h2>Continue learning</h2>
        <p class="muted">Guest mode works instantly. In guest mode progress is saved only on this device.</p>
        <div class="actions">
          <button class="primary-btn" data-login-demo>Continue as ${state().username}</button>
          <button class="secondary-btn" data-route="home">Guest mode</button>
        </div>
      </article>
      <article class="panel">
        <span class="mini-label">Register</span>
        <h2>Start with Pro Trial</h2>
        <p class="muted">New accounts get 7 days of Pro access for unlimited lessons, projects, and certificates.</p>
        <input class="input" aria-label="Username" placeholder="username" />
        <button class="primary-btn auth-save" data-save-username>Save username</button>
      </article>
    </section>
  `, { title: "Access", kicker: "Auth and guest mode" });
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
        <h2>${user.referralCount} invited · ${user.proReferralCount} Pro</h2>
        <p class="muted">codequest.app/ref/${user.username}</p>
        <button class="secondary-btn compact" data-copy-referral>Copy referral</button>
      </article>
      <article class="panel">
        <span class="mini-label">Certificates</span>
        <h2>${user.certificates.length}</h2>
        <p class="muted">${user.certificates.length ? user.certificates.join(", ") : "Complete HTML Island to generate the first certificate."}</p>
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
    <span><strong>${item.title}</strong><small>${item.category} · ${item.price} coins</small></span>
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
  if (!user.certificates.includes("HTML Island")) {
    return "Complete all 5 HTML missions to generate a PDF certificate with ID and QR verification.";
  }
  return `CodeQuest Academy certifies ${user.username} completed HTML Island. Certificate ID: CQ-HTML-${new Date().getFullYear()}-001. QR verification page ready for /verify.`;
}

function render() {
  const views = { home, courses: coursesView, course: courseDetail, lesson: lessonView, profile: profileView, leaderboard: leaderboardView, projects: projectsView, pricing: pricingView, auth: authView, more: moreView };
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
    selectedLesson = htmlLessons[0];
    code = selectedLesson.starterCode;
    toast = "Demo progress reset.";
    render();
  });

  const saveUsername = app.querySelector("[data-save-username]");
  if (saveUsername) saveUsername.addEventListener("click", saveUsernameFromInput);

  const copyReferral = app.querySelector("[data-copy-referral]");
  if (copyReferral) copyReferral.addEventListener("click", () => { toast = `Referral copied: codequest.app/ref/${state().username}`; setRoute("more"); });
}

function openCourse(courseId) {
  const course = courses.find((item) => item.id === courseId);
  if (!course) return;
  if (course.pro && !isPro()) {
    modal = "pro";
    selectedCourseId = courseId;
    render();
    return;
  }
  selectedCourseId = courseId;
  updateState((s) => ({ ...s, activeCourseId: courseId }));
  setRoute("course");
}

function openLesson(lessonId) {
  const user = state();
  const lesson = htmlLessons.find((item) => item.id === lessonId);
  if (!lesson) return;
  if (!isPro() && user.dailyLessonsCompleted >= 5 && !user.completedLessons.includes(lesson.id)) {
    modal = "limit";
    render();
    return;
  }
  selectedCourseId = "html-island";
  selectedLesson = lesson;
  code = selectedLesson.starterCode;
  updateState((s) => ({ ...s, activeCourseId: "html-island", visitedLabToday: true }));
  setRoute("lesson");
}

function completeLesson() {
  if (!checkAnswer(code, selectedLesson.expected)) {
    toast = "Almost. Compare tags, text, and order, then try again.";
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
    const finishedHtml = htmlLessons.every((lesson) => completedLessons.includes(lesson.id));
    const earnedBadges = [...s.earnedBadges];
    if (selectedLesson.id === "html-5" && !earnedBadges.includes("Pixel Perfect")) earnedBadges.push("Pixel Perfect");
    if (finishedHtml && !earnedBadges.includes("HTML Finisher")) earnedBadges.push("HTML Finisher");
    return {
      ...s,
      xp: alreadyDone ? s.xp : s.xp + selectedLesson.xp,
      coins: alreadyDone ? s.coins : s.coins + Math.round(selectedLesson.xp / 10),
      level: alreadyDone ? s.level : Math.max(s.level, Math.floor((s.xp + selectedLesson.xp) / 250) + 1),
      dailyLessonsCompleted: alreadyDone ? s.dailyLessonsCompleted : s.dailyLessonsCompleted + 1,
      completedLessons,
      earnedBadges,
      certificates: finishedHtml && !s.certificates.includes("HTML Island") ? [...s.certificates, "HTML Island"] : s.certificates,
    };
  });
  toast = `Mission complete: +${selectedLesson.xp} XP, coins added, progress saved locally.`;
  render();
}

function cycleLesson(direction) {
  const index = htmlLessons.findIndex((lesson) => lesson.id === selectedLesson.id);
  const nextIndex = direction === "next" ? (index + 1) % htmlLessons.length : (index - 1 + htmlLessons.length) % htmlLessons.length;
  selectedLesson = htmlLessons[nextIndex];
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
  if (completedHtmlCount() < project.requirement) {
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
  toast = `AI Tutor: ${prompt} Try reading the task, then change only one HTML structure at a time.`;
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
  updateState((s) => ({ ...s, username }));
  toast = `Username saved: ${username}`;
  setRoute("profile");
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

render();

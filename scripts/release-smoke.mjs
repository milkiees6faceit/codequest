import { spawn, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const port = 4173;
const baseUrl = `http://127.0.0.1:${port}`;
const checks = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runNodeCheck(file) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${file} failed syntax check:\n${result.stderr || result.stdout}`);
  }
  checks.push(`syntax ${file}`);
}

async function fetchText(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`);
  assert(response.ok, `${pathname} returned ${response.status}`);
  const text = await response.text();
  checks.push(`http ${pathname}`);
  return text;
}

async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 6000) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error("dev server did not become ready");
}

for (const file of [
  "dev-server.mjs",
  "sw.js",
  "src/app.js",
  "src/data/demoCourses.js",
  "src/lib/codeChecker.js",
  "src/lib/supabaseClient.js",
  "src/store/userStore.js",
]) {
  runNodeCheck(file);
}

const manifest = JSON.parse(await readFile("manifest.webmanifest", "utf8"));
assert(manifest.name === "CodeQuest Academy", "manifest name is incorrect");
assert(manifest.start_url === "./", "manifest start_url should be relative");
checks.push("manifest");

const indexHtml = await readFile("index.html", "utf8");
assert(indexHtml.includes('script type="module" src="src/app.js"'), "index.html must load src/app.js");
assert(indexHtml.includes('rel="manifest"'), "index.html must link manifest");
checks.push("index");

const swSource = await readFile("sw.js", "utf8");
for (const asset of ["./index.html", "./src/app.js", "./src/styles/globals.css", "./manifest.webmanifest"]) {
  assert(swSource.includes(asset), `service worker cache is missing ${asset}`);
}
assert(swSource.includes("./supabase/config.json"), "service worker cache is missing Supabase config");
checks.push("service worker asset list");

const server = spawn(process.execPath, ["dev-server.mjs"], {
  stdio: ["ignore", "pipe", "pipe"],
});

try {
  await waitForServer();
  const home = await fetchText("/");
  assert(home.includes("CodeQuest Academy"), "home HTML missing title");
  const verify = await fetchText("/?verify=CQ-HTML-123456");
  assert(verify.includes("src/app.js"), "verify route should serve app shell");
  const appJs = await fetchText("/src/app.js");
  assert(appJs.includes("releaseErrorView"), "app bundle missing release error boundary");
  const sw = await fetchText("/sw.js");
  assert(sw.includes("codequest-academy-v6"), "service worker cache version is stale");
  const supabaseConfig = await fetchText("/supabase/config.json");
  assert(JSON.parse(supabaseConfig), "Supabase config JSON is invalid");
} finally {
  server.kill();
}

console.log(`Release smoke passed: ${checks.join(", ")}`);

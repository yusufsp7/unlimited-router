import { execSync } from "child_process";
import pkg from "../../../../package.json" with { type: "json" };
import { GITHUB_CONFIG, UPDATER_CONFIG } from "@/shared/constants/config";
import { execFileSync } from "child_process";

const CACHE_TTL_MS = 5 * 60 * 1000; // avoid GitHub API rate limits on repeated clicks
const FETCH_TIMEOUT_MS = 8000;

// Survive hot reload; one cache per process
const updateCache = (global.__githubUpdateCache ??= { value: null, fetchedAt: 0 });

async function githubApi(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "9router-mibp-dashboard",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${path}`);
  return res.json();
}

async function getOfficialStatus() {
  const repo = GITHUB_CONFIG.officialRepo;
  const base = {
    repo,
    repoUrl: GITHUB_CONFIG.officialRepoUrl,
    currentVersion: pkg.version,
    npmUpdateCmd: UPDATER_CONFIG.installCmdLatest,
  };
  try {
    try {
      const release = await githubApi(`/repos/${repo}/releases/latest`);
      const latest = (release.tag_name || "").replace(/^v/, "");
      const current = base.currentVersion.replace(/^v/, "");
      return {
        ...base,
        channel: "release",
        latestVersion: latest || null,
        latestDate: release.published_at || null,
        latestUrl: release.html_url || base.repoUrl,
        notes: release.name || release.body?.split("\n")[0] || null,
        updateAvailable: latest ? compareVersions(latest, current) > 0 : null,
      };
    } catch {
      // No published releases — fall back to the latest commit on master
      const commits = await githubApi(`/repos/${repo}/commits?per_page=1&sha=master`);
      const c = commits[0];
      return {
        ...base,
        channel: "commit",
        latestVersion: null,
        latestSha: c?.sha || null,
        latestDate: c?.commit?.author?.date || null,
        latestUrl: c?.html_url || base.repoUrl,
        notes: c?.commit?.message?.split("\n")[0] || null,
        updateAvailable: null, // cannot compare versions against a commit
      };
    }
  } catch (err) {
    return { ...base, error: err.message || "Failed to reach GitHub" };
  }
}

async function getMibpStatus() {
  const repo = GITHUB_CONFIG.mibpRepo;
  const base = {
    repo,
    repoUrl: GITHUB_CONFIG.mibpRepoUrl,
  };
  let localSha = null;
  let localBranch = null;
  try {
    localSha = execSync("git rev-parse HEAD", { cwd: process.cwd(), encoding: "utf8", timeout: 5000 }).trim();
    localBranch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: process.cwd(), encoding: "utf8", timeout: 5000 }).trim();
  } catch {
    // Running from a build without .git (e.g. standalone output)
  }
  try {
    const commits = await githubApi(`/repos/${repo}/commits?per_page=1`);
    const c = commits[0];
    const remoteSha = c?.sha || null;
    const behind = Boolean(localSha && remoteSha && localSha !== remoteSha);
    return {
      ...base,
      localSha,
      localBranch,
      remoteSha,
      remoteDate: c?.commit?.author?.date || null,
      notes: c?.commit?.message?.split("\n")[0] || null,
      latestUrl: c?.html_url || base.repoUrl,
      compareUrl:
        behind && localSha && remoteSha
          ? `${base.repoUrl}/compare/${localSha.slice(0, 10)}...${remoteSha.slice(0, 10)}`
          : null,
      updateAvailable: behind,
    };
  } catch (err) {
    return { ...base, localSha, localBranch, error: err.message || "Failed to reach GitHub" };
  }
}

async function getOwnStatus() {
  const repo = GITHUB_CONFIG.ownRepo;
  const base = {
    repo,
    repoUrl: `https://github.com/${repo}`,
    currentVersion: pkg.version,
    npmUpdateCmd: "npm i -g urouter@latest --prefer-online",
  };
  let localSha = null;
  let localBranch = null;
  try {
    localSha = execSync("git rev-parse HEAD", { cwd: process.cwd(), encoding: "utf8", timeout: 5000 }).trim();
    localBranch = execSync("git rev-parse --abbrev-ref HEAD", { cwd: process.cwd(), encoding: "utf8", timeout: 5000 }).trim();
  } catch {
    // Running from a build without .git (standalone output)
  }
  try {
    const commits = await githubApi(`/repos/${repo}/commits?per_page=1`);
    const c = commits[0];
    const remoteSha = c?.sha || null;
    const behind = Boolean(localSha && remoteSha && localSha !== remoteSha);
    return {
      ...base,
      localSha,
      localBranch,
      remoteSha,
      remoteDate: c?.commit?.author?.date || null,
      notes: c?.commit?.message?.split("
")[0] || null,
      latestUrl: c?.html_url || base.repoUrl,
      compareUrl:
        behind && localSha && remoteSha
          ? `${base.repoUrl}/compare/${localSha.slice(0, 10)}...${remoteSha.slice(0, 10)}`
          : null,
      updateAvailable: behind,
    };
  } catch (err) {
    return { ...base, localSha, localBranch, error: err.message || "Failed to reach GitHub" };
  }
}

function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

export async function GET() {
  if (updateCache.value && Date.now() - updateCache.fetchedAt < CACHE_TTL_MS) {
    return Response.json({ ...updateCache.value, cached: true });
  }
  const [official, mibp, own] = await Promise.all([getOfficialStatus(), getMibpStatus(), getOwnStatus()]);
  const payload = {
    official,
    mibp,
    own,
    fetchedAt: new Date().toISOString(),
    cached: false,
  };
  if (!official.error && !mibp.error) {
    updateCache.value = payload;
    updateCache.fetchedAt = Date.now();
  }
  return Response.json(payload);
}

// src/controllers/analyzeController.js
// --------------------------------------------------------
// Provides the /api/analyze handler logic
// Modular, promise‑based, fully async/await
// --------------------------------------------------------

const {
    getRepoData,
    getLanguages,
    getContributors,
    getCommitsByAuthor,
    getCommitActivity,
    getCodeFrequency,
    getPunchCard,
    getContributorStats,
    getClosedPRs,
    getClosedIssues
  } = require('../services/githubService');
  
  const { avg, median }  = require('../utils/math');
  const parseRepoUrl     = require('../utils/parseRepoUrl');
  
  const MS_IN_WEEK = 604_800_000; // 7 × 24 × 3600 × 1000
  
  /**
   * End‑to‑end repository analysis.
   * @param {string} repoUrl – full HTTPS URL of the repo
   * @returns {Promise<object>} analytics summary
   */
  async function analyzeRepository(repoUrl) {
    // ─── Parse owner/repo from arbitrary GitHub URL ─────────
    const { owner, repo } = parseRepoUrl(repoUrl);
  
    // ─── Core repo + contributors + languages ───────────────
    const [repoData, languages, contributors] = await Promise.all([
      getRepoData(owner, repo),
      getLanguages(owner, repo),
      getContributors(owner, repo)
    ]);
  
    // ─── Commit history per top‑10 contributors ─────────────
    const commitHistory = await Promise.all(
      contributors.slice(0, 10).map(async (c) => {
        try {
          const commits = await getCommitsByAuthor(owner, repo, c.login);
          const weekly  = commits.reduce((acc, commit) => {
            const week = Math.floor(new Date(commit.commit.author.date).getTime() / MS_IN_WEEK);
            acc[week]  = (acc[week] || 0) + 1;
            return acc;
          }, {});
  
          const timeline = Object.entries(weekly)
            .sort(([a], [b]) => a - b)
            .map(([w, n]) => ({ week: +w, commits: n, date: new Date(w * MS_IN_WEEK) }));
  
          return {
            ...c,
            timeline,
            total_commits: timeline.reduce((s, w) => s + w.commits, 0)
          };
        } catch {
          return { ...c, timeline: [], total_commits: 0 };
        }
      })
    );
  
    // ─── Heavy stats from /stats/* endpoints + last‑100 PR/issue ─
    const [
      commitActivity,
      codeFreqRaw,
      punchCard,
      contribStats,
      closedPRs,
      closedIssues
    ] = await Promise.all([
      getCommitActivity(owner, repo),
      getCodeFrequency(owner, repo),
      getPunchCard(owner, repo),
      getContributorStats(owner, repo),
      getClosedPRs(owner, repo),
      getClosedIssues(owner, repo)
    ]);
  
    // ─── Language histogram (% of bytes) ────────────────────
    const langSum = Object.values(languages).reduce((a, b) => a + b, 0) || 1;
    const langPct = Object.fromEntries(
      Object.entries(languages).map(([k, v]) => [k, +(v * 100 / langSum).toFixed(2)])
    );
  
    // ─── Punch‑card matrix (7 days × 24 hours) ───────────────
    const punchMatrix = Array.from({ length: 7 }, () => Array(24).fill(0));
    punchCard.forEach(([d, h, n]) => {
      punchMatrix[d][h] = n;
    });
  
    // ─── Lines‑of‑code by contributor ───────────────────────
    const linesByUser = Object.fromEntries(
      contribStats.map((c) => {
        const adds = c.weeks.reduce((s, w) => s + w.a, 0);
        const dels = c.weeks.reduce((s, w) => s + w.d, 0);
        return [c.author.login, { additions: adds, deletions: dels }];
      })
    );
    const repoAdds = contribStats.reduce((s, c) => s + c.weeks.reduce((a, w) => a + w.a, 0), 0);
    const repoDels = contribStats.reduce((s, c) => s + c.weeks.reduce((a, w) => a + w.d, 0), 0);
  
    const contributorsWithLines = commitHistory.map((c) => ({
      ...c,
      ...(linesByUser[c.login] || { additions: 0, deletions: 0 })
    }));
  
    // ─── PR + Issue durations (last 100) ────────────────────
    const mergedPRs = closedPRs.filter((pr) => pr.merged_at).length;
    const prDur     = closedPRs
      .filter((pr) => pr.merged_at)
      .map((pr) => (new Date(pr.merged_at) - new Date(pr.created_at)) / 3_600_000);
  
    const closedNoPR = closedIssues.filter((i) => !i.pull_request);
    const issueDur   = closedNoPR
      .map((i) => (new Date(i.closed_at) - new Date(i.created_at)) / 3_600_000);
  
    // ─── Commit‑level stats ─────────────────────────────────
    const totalCommits     = commitActivity.reduce((s, w) => s + (w.total || 0), 0);
    const avgWeeklyCommits = Math.round(totalCommits / (commitActivity.length || 1));
    const mostActiveDay    = punchMatrix.reduce(
      (max, day, i) => {
        const t = day.reduce((a, b) => a + b, 0);
        return t > max.total ? { day: i, total: t } : max;
      },
      { day: 0, total: 0 }
    );
  
    // ─── Assemble response ─────────────────────────────────
    return {
      metadata: {
        name: repoData.name,
        description: repoData.description,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        watchers: repoData.watchers_count,
        open_issues: repoData.open_issues_count,
        created_at: repoData.created_at,
        updated_at: repoData.updated_at,
        language: repoData.language,
        default_branch: repoData.default_branch,
        size: repoData.size
      },
  
      languages: langPct,
  
      contributors: contributorsWithLines.sort(
        (a, b) => b.total_commits - a.total_commits
      ),
  
      commit_activity: commitActivity,
  
      code_frequency: {
        recent: codeFreqRaw.slice(-12),
        total: { additions: repoAdds, deletions: repoDels }
      },
  
      punch_card: punchMatrix,
  
      commit_stats: {
        total_commits: totalCommits,
        avg_weekly_commits: avgWeeklyCommits,
        most_active_day: mostActiveDay
      },
  
      pull_requests: {
        open: repoData.open_issues_count - mergedPRs - closedNoPR.length, // rough
        merged_100: mergedPRs,
        avg_merge_hours:   +avg(prDur).toFixed(1),
        median_merge_hours:+median(prDur).toFixed(1)
      },
  
      issues: {
        open: repoData.open_issues_count,
        closed_100: closedNoPR.length,
        avg_close_hours:   +avg(issueDur).toFixed(1),
        median_close_hours:+median(issueDur).toFixed(1)
      }
    };
  }
  
  module.exports = { analyzeRepository };
  
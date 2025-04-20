// ─────────────────────────────────────────────────────────
//  GitHub Repository Analyzer — advanced, no‑cache edition
// ─────────────────────────────────────────────────────────
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const axios   = require('axios');

const app  = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ─── GitHub client ──────────────────────────────────────
const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_TOKEN= process.env.GITHUB_TOKEN;

const github = axios.create({
  baseURL: GITHUB_API_URL,
  headers: {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'repo-analyzer'
  },
});

/* Poll /stats/* endpoints until ready */
async function fetchWithRetry(endpoint, retries = 6, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    const res = await github.get(endpoint);
    if (res.status !== 202) return res.data || [];
    await new Promise(r => setTimeout(r, delay));
  }
  return [];
}

/* Thin wrapper (no cache) so interface stays the same */
const gh = (endpoint) => github.get(endpoint).then(r => r.data);

/* Helpers */
const avg    = (arr)=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:0;
const median = (arr)=>{
  if(!arr.length) return 0;
  const s=arr.slice().sort((a,b)=>a-b); const m=Math.floor(s.length/2);
  return s.length%2 ? s[m] : (s[m-1]+s[m])/2;
};

/* ─── /api/analyze ────────────────────────────────────── */
app.post('/api/analyze', async (req, res) => {
  try {
    const { repo_url } = req.body;
    if (!repo_url) return res.status(400).json({ success:false, error:'Repository URL is required' });

    const parts = repo_url.trim().replace(/\/+$/,'').split('/');
    const owner = parts[parts.length-2];
    const repo  = parts[parts.length-1];

    /* Core repo data */
    const [repoData, languages, contributors] = await Promise.all([
      gh(`/repos/${owner}/${repo}`),
      gh(`/repos/${owner}/${repo}/languages`),
      gh(`/repos/${owner}/${repo}/contributors`)
    ]);

    /* Commit history per contributor (top 10) */
    const commitHistory = await Promise.all(
      contributors.slice(0,10).map(async c=>{
        try{
          const commits=await gh(`/repos/${owner}/${repo}/commits?author=${c.login}&per_page=100`);
          const weekly=commits.reduce((acc,commit)=>{
            const week=Math.floor(new Date(commit.commit.author.date).getTime()/604800000);
            acc[week]=(acc[week]||0)+1; return acc;
          },{});
          const timeline=Object.entries(weekly).sort(([a],[b])=>a-b)
            .map(([w,n])=>({week:+w,commits:n,date:new Date(w*604800000)}));
          return {...c,timeline,total_commits:timeline.reduce((s,w)=>s+w.commits,0)};
        }catch{return {...c,timeline:[],total_commits:0};}
      })
    );

    /* Heavy stats */
    const [
      commitActivity, codeFreqRaw, punchCard,
      contribStats, closedPRs, closedIssues
    ] = await Promise.all([
      fetchWithRetry(`/repos/${owner}/${repo}/stats/commit_activity`),
      fetchWithRetry(`/repos/${owner}/${repo}/stats/code_frequency`),
      fetchWithRetry(`/repos/${owner}/${repo}/stats/punch_card`),
      fetchWithRetry(`/repos/${owner}/${repo}/stats/contributors`),
      gh(`/repos/${owner}/${repo}/pulls?state=closed&per_page=100`),
      gh(`/repos/${owner}/${repo}/issues?state=closed&per_page=100`)
    ]);

    /* Language % */
    const langSum = Object.values(languages).reduce((a,b)=>a+b,0)||1;
    const langPct = Object.fromEntries(
      Object.entries(languages).map(([k,v])=>[k,+(v*100/langSum).toFixed(2)])
    );

    /* Punch card matrix */
    const punchMatrix = Array.from({length:7},()=>Array(24).fill(0));
    punchCard.forEach(([d,h,n])=>{punchMatrix[d][h]=n;});

    /* Lines per user + repo totals */
    const linesByUser = Object.fromEntries(
      contribStats.map(c=>{
        const adds=c.weeks.reduce((s,w)=>s+w.a,0);
        const dels=c.weeks.reduce((s,w)=>s+w.d,0);
        return [c.author.login,{additions:adds,deletions:dels}];
      })
    );
    const repoAdds = contribStats.reduce((s,c)=>s+c.weeks.reduce((a,w)=>a+w.a,0),0);
    const repoDels = contribStats.reduce((s,c)=>s+c.weeks.reduce((a,w)=>a+w.d,0),0);
    const contributorsWithLines = commitHistory.map(c=>({
      ...c, ...(linesByUser[c.login]||{additions:0,deletions:0})
    }));

    /* PR stats */
    const openPRs   = repoData.open_issues_count - repoData.open_issues; // rough
    const mergedPRs = closedPRs.filter(pr=>pr.merged_at).length;
    const prDur = closedPRs.filter(pr=>pr.merged_at)
                 .map(pr=>(new Date(pr.merged_at)-new Date(pr.created_at))/3600000);

    /* Issue stats */
    const closedNoPR = closedIssues.filter(i=>!i.pull_request);
    const issueDur = closedNoPR
                 .map(i=>(new Date(i.closed_at)-new Date(i.created_at))/3600000);

    /* Commit stats */
    const totalCommits     = commitActivity.reduce((s,w)=>s+(w.total||0),0);
    const avgWeeklyCommits = Math.round(totalCommits/(commitActivity.length||1));
    const mostActiveDay    = punchMatrix.reduce(
      (max,day,i)=>{const t=day.reduce((a,b)=>a+b,0);return t>max.total?{day:i,total:t}:max;},
      {day:0,total:0});

    res.json({
      success:true,
      data:{
        metadata:{
          name:repoData.name,
          description:repoData.description,
          stars:repoData.stargazers_count,
          forks:repoData.forks_count,
          watchers:repoData.watchers_count,
          open_issues:repoData.open_issues_count,
          created_at:repoData.created_at,
          updated_at:repoData.updated_at,
          language:repoData.language,
          default_branch:repoData.default_branch,
          size:repoData.size
        },
        languages: langPct,
        contributors: contributorsWithLines.sort((a,b)=>b.total_commits-a.total_commits),
        commit_activity: commitActivity,
        code_frequency:{
          recent: codeFreqRaw.slice(-12),
          total : { additions:repoAdds, deletions:repoDels }
        },
        punch_card: punchMatrix,
        commit_stats:{
          total_commits: totalCommits,
          avg_weekly_commits: avgWeeklyCommits,
          most_active_day:   mostActiveDay
        },
        pull_requests:{
          open: openPRs,
          merged_100: mergedPRs,
          avg_merge_hours:   +avg(prDur).toFixed(1),
          median_merge_hours:+median(prDur).toFixed(1)
        },
        issues:{
          open: repoData.open_issues_count,
          closed_100: closedNoPR.length,
          avg_close_hours:   +avg(issueDur).toFixed(1),
          median_close_hours:+median(issueDur).toFixed(1)
        }
      }
    });

  } catch (err) {
    console.error('Analyze error:', err.message);
    res.status(500).json({ success:false, error:'Analysis failed' });
  }
});

app.get('/api/health',(_,r)=>r.json({status:'healthy'}));
app.listen(port,()=>console.log(`API listening on ${port}`));

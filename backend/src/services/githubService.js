const { github, fetchWithRetry } = require('../config/githubClient');

const gh = endpoint => github.get(endpoint).then(r => r.data);

const getRepoData        = (owner, repo) => gh(`/repos/${owner}/${repo}`);
const getLanguages       = (owner, repo) => gh(`/repos/${owner}/${repo}/languages`);
const getContributors    = (owner, repo) => gh(`/repos/${owner}/${repo}/contributors`);
const getCommitsByAuthor = (owner, repo, author) => gh(`/repos/${owner}/${repo}/commits?author=${author}&per_page=100`);
const getCommitActivity  = (owner, repo) => fetchWithRetry(`/repos/${owner}/${repo}/stats/commit_activity`);
const getCodeFrequency   = (owner, repo) => fetchWithRetry(`/repos/${owner}/${repo}/stats/code_frequency`);
const getPunchCard       = (owner, repo) => fetchWithRetry(`/repos/${owner}/${repo}/stats/punch_card`);
const getContributorStats= (owner, repo) => fetchWithRetry(`/repos/${owner}/${repo}/stats/contributors`);

module.exports = {
  getRepoData,
  getLanguages,
  getContributors,
  getCommitsByAuthor,
  getCommitActivity,
  getCodeFrequency,
  getPunchCard,
  getContributorStats
};
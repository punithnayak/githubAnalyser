const axios = require('axios');
const { GITHUB_API_URL, GITHUB_TOKEN } = require('./env');

const github = axios.create({
  baseURL: GITHUB_API_URL,
  headers: {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'repo-analyzer'
  }
});

const fetchWithRetry = async (endpoint, retries = 6, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    const res = await github.get(endpoint);
    if (res.status !== 202) return res.data || [];
    await new Promise(r => setTimeout(r, delay));
  }
  return [];
};

module.exports = { github, fetchWithRetry };
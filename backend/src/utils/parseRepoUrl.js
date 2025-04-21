module.exports = (repoUrl = '') => {
    const parts = repoUrl.trim().replace(/\/+$/, '').split('/');
    return {
      owner: parts[parts.length - 2],
      repo:  parts[parts.length - 1]
    };
  };
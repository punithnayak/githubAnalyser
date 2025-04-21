const avg = (arr = []) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const median = (arr = []) => {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

module.exports = { avg, median };
// ─────────────────────────────────────────────────────────
//  GitHub Repository Analyzer – React Frontend (MUI + Chart.js)
// ─────────────────────────────────────────────────────────
import React, { useState } from "react";
import axios from "axios";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Paper,
} from "@mui/material";
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function App() {
  // ─── State ────────────────────────────────────────────
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [repoData, setRepoData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedContributor, setSelected] = useState(null);
  const [showRecent, setShowRecent] = useState(false); // 30‑day toggle

  // ─── Helpers ──────────────────────────────────────────
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const formatDate = (d) => new Date(d).toLocaleDateString();
  const h2d = (h) => `${(h / 24).toFixed(1)} d`;

  // ─── Actions ──────────────────────────────────────────
  async function analyzeRepo() {
    try {
      setLoading(true);
      setError(null);
      setSelected(null);
      const { data } = await axios.post(`${apiUrl}/api/analyze`, {
        repo_url: repoUrl,
      });
      setRepoData(data.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to analyze repository");
    } finally {
      setLoading(false);
    }
  }

  const toggleContributor = (c) =>
    setSelected((sel) => (sel?.login === c.login ? null : c));
  const PieWrapper = ({ children }) => (
    <Box sx={{ width: 320, height: 320, mx: "auto" }}>{children}</Box>
  );


  // ─── Render ───────────────────────────────────────────
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" gutterBottom>
          GitHub Repository Analyzer
        </Typography>

        {/* URL input */}
        <Box sx={{ display: "flex", gap: 2, mb: 4 }}>
          <TextField
            fullWidth
            label="GitHub Repository URL"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
          />
          <Button
            variant="contained"
            onClick={analyzeRepo}
            disabled={loading || !repoUrl}
          >
            {loading ? <CircularProgress size={24} /> : "Analyze"}
          </Button>
        </Box>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {repoData && (
          <>
            {/* ── Repo summary */}
            <Typography variant="h5" gutterBottom>
              Repository Information
            </Typography>

            <Box sx={{ mb: 4 }}>
              <Typography variant="h6">{repoData.metadata.name}</Typography>
              <Typography>{repoData.metadata.description}</Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: 2,
                  mt: 2,
                }}
              >
                <Typography>⭐ Stars: {repoData.metadata.stars}</Typography>
                <Typography>🔄 Forks: {repoData.metadata.forks}</Typography>
                <Typography>👀 Watchers: {repoData.metadata.watchers}</Typography>
                <Typography>⚠️ Issues: {repoData.metadata.open_issues}</Typography>
                <Typography>
                  📅 Created: {formatDate(repoData.metadata.created_at)}
                </Typography>
                <Typography>
                  🔄 Updated: {formatDate(repoData.metadata.updated_at)}
                </Typography>
                <Typography>
                  💻 Language: {repoData.metadata.language || "N/A"}
                </Typography>
                <Typography>
                  📦 Size: {(repoData.metadata.size / 1024).toFixed(2)} MB
                </Typography>
                <Typography>🌿 Branch: {repoData.metadata.default_branch}</Typography>
              </Box>
            </Box>

            {/* ── Languages Pie */}
            {repoData.languages && Object.keys(repoData.languages).length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Languages
                </Typography>
                <PieWrapper>
                  <Pie
                    data={{
                      labels: Object.keys(repoData.languages),
                      datasets: [
                        {
                          label: "% of code",
                          data: Object.values(repoData.languages),
                          backgroundColor: [
                            "#2196f3",
                            "#f44336",
                            "#4caf50",
                            "#ff9800",
                            "#9c27b0",
                            "#795548",
                            "#607d8b",
                          ],
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false, // prevent explosion
                      plugins: { legend: { position: "right" } },
                    }}
                  />
                </PieWrapper>
              </Box>
            )}


            {/* ── Top contributors */}
            <Typography variant="h6" gutterBottom>
              Top Contributors
            </Typography>
            <Box sx={{ mb: 4 }}>
              {repoData.contributors.map((c) => (
                <Paper
                  key={c.id}
                  sx={{
                    p: 2,
                    mb: 1,
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    bgcolor:
                      selectedContributor?.login === c.login
                        ? "action.selected"
                        : "background.paper",
                  }}
                  onClick={() => toggleContributor(c)}
                >
                  <img
                    src={c.avatar_url}
                    alt={c.login}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      marginRight: 16,
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1">{c.login}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {c.total_commits} commits
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Typography variant="body2" color="success.main">
                      +{c.additions}
                    </Typography>
                    <Typography variant="body2" color="error.main">
                      -{c.deletions}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Box>

            {/* ── Contributor timeline chart */}
            {selectedContributor?.timeline?.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  {selectedContributor.login}'s Commits / Week
                </Typography>
                <Line
                  data={{
                    labels: selectedContributor.timeline.map((w) =>
                      formatDate(w.date)
                    ),
                    datasets: [
                      {
                        label: "Commits",
                        data: selectedContributor.timeline.map((w) => w.commits),
                        borderColor: "rgb(75,192,192)",
                        tension: 0.1,
                      },
                    ],
                  }}
                  options={{ responsive: true }}
                />
              </Box>
            )}

            {/* ── Commit statistics */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Commit Statistics
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: 2,
                }}
              >
                <Paper sx={{ p: 2 }} elevation={2}>
                  <Typography variant="h6">
                    {repoData.commit_stats.total_commits}
                  </Typography>
                  <Typography variant="body2">Total Commits</Typography>
                </Paper>
                <Paper sx={{ p: 2 }} elevation={2}>
                  <Typography variant="h6">
                    {repoData.commit_stats.avg_weekly_commits}
                  </Typography>
                  <Typography variant="body2">Avg per Week</Typography>
                </Paper>
                <Paper sx={{ p: 2 }} elevation={2}>
                  <Typography variant="h6">
                    {
                      [
                        "Sun",
                        "Mon",
                        "Tue",
                        "Wed",
                        "Thu",
                        "Fri",
                        "Sat",
                      ][repoData.commit_stats.most_active_day.day]
                    }
                  </Typography>
                  <Typography variant="body2">Most Active Day</Typography>
                </Paper>
              </Box>
            </Box>

            {/* ── PR & Issue Analytics */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Pull Requests & Issues
              </Typography>

              {/* Toggle */}
              <Box sx={{ mb: 2 }}>
                <Button
                  variant={showRecent ? "outlined" : "contained"}
                  onClick={() => setShowRecent(false)}
                  sx={{ mr: 1 }}
                >
                  All‑time
                </Button>
                <Button
                  variant={!showRecent ? "outlined" : "contained"}
                  onClick={() => setShowRecent(true)}
                >
                  Last 30 days
                </Button>
              </Box>

              <Box
                sx={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 2 }}
              >
                {/* PR cards */}
                <Paper sx={{ p: 2 }} elevation={2}>
                  <Typography variant="h6">
                    {repoData.pull_requests.open}
                  </Typography>
                  <Typography variant="body2">Open PRs</Typography>
                </Paper>
                <Paper sx={{ p: 2 }} elevation={2}>
                  <Typography variant="h6">
                    {repoData.pull_requests.merged_100}
                  </Typography>
                  <Typography variant="body2">Merged PRs (100)</Typography>
                </Paper>
                <Paper sx={{ p: 2 }} elevation={2}>
                  <Typography variant="h6">
                    {h2d(repoData.pull_requests.avg_merge_hours)}
                  </Typography>
                  <Typography variant="body2">Avg merge time</Typography>
                </Paper>
                <Paper sx={{ p: 2 }} elevation={2}>
                  <Typography variant="h6">
                    {h2d(repoData.pull_requests.median_merge_hours)}
                  </Typography>
                  <Typography variant="body2">Median merge time</Typography>
                </Paper>

                {/* Issue cards */}
                <Paper sx={{ p: 2 }} elevation={2}>
                  <Typography variant="h6">{repoData.issues.open}</Typography>
                  <Typography variant="body2">Open Issues</Typography>
                </Paper>
                <Paper sx={{ p: 2 }} elevation={2}>
                  <Typography variant="h6">
                    {repoData.issues.closed_100}
                  </Typography>
                  <Typography variant="body2">Closed Issues (100)</Typography>
                </Paper>
                <Paper sx={{ p: 2 }} elevation={2}>
                  <Typography variant="h6">
                    {h2d(repoData.issues.avg_close_hours)}
                  </Typography>
                  <Typography variant="body2">Avg close time</Typography>
                </Paper>
                <Paper sx={{ p: 2 }} elevation={2}>
                  <Typography variant="h6">
                    {h2d(repoData.issues.median_close_hours)}
                  </Typography>
                  <Typography variant="body2">Median close time</Typography>
                </Paper>
              </Box>
            </Box>

            {/* ── Code‑change summary */}
            {repoData.code_frequency?.total && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Code Changes
                </Typography>
                <Box
                  sx={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 2 }}
                >
                  <Paper sx={{ p: 2, bgcolor: "#e8f5e9" }} elevation={2}>
                    <Typography variant="h6" color="success.main">
                      +{repoData.code_frequency.total.additions.toLocaleString()}
                    </Typography>
                    <Typography variant="body2">Lines Added</Typography>
                  </Paper>
                  <Paper sx={{ p: 2, bgcolor: "#ffebee" }} elevation={2}>
                    <Typography variant="h6" color="error.main">
                      -{repoData.code_frequency.total.deletions.toLocaleString()}
                    </Typography>
                    <Typography variant="body2">Lines Removed</Typography>
                  </Paper>
                </Box>
              </Box>
            )}

            {/* ── Commit activity (52 weeks) */}
            {Array.isArray(repoData.commit_activity) &&
              repoData.commit_activity.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom>
                    Commits (last 52 weeks)
                  </Typography>
                  <Line
                    data={{
                      labels: repoData.commit_activity.map((_, i) => `W${i + 1}`),
                      datasets: [
                        {
                          label: "Commits",
                          data: repoData.commit_activity.map((w) => w.total || 0),
                          borderColor: "rgb(75,192,192)",
                          tension: 0.1,
                        },
                      ],
                    }}
                    options={{ responsive: true }}
                  />
                </Box>
              )}

            {/* ── Code frequency (12 weeks) */}
            {repoData.code_frequency?.recent?.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Code Changes (last 12 weeks)
                </Typography>
                <Line
                  data={{
                    labels: repoData.code_frequency.recent.map((_, i) => `W${i + 1}`),
                    datasets: [
                      {
                        label: "Additions",
                        data: repoData.code_frequency.recent.map(([, a]) => a || 0),
                        borderColor: "rgb(76,175,80)",
                        backgroundColor: "rgba(76,175,80,0.1)",
                        fill: true,
                      },
                      {
                        label: "Deletions",
                        data: repoData.code_frequency.recent.map(([, , d]) => Math.abs(d || 0)),
                        borderColor: "rgb(244,67,54)",
                        backgroundColor: "rgba(244,67,54,0.1)",
                        fill: true,
                      },
                    ],
                  }}
                  options={{ responsive: true }}
                />
              </Box>
            )}

            {/* ── Punch‑card heatmap */}
            {repoData.punch_card && (
              <Box sx={{ mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Commit Heatmap
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: 1,
                    overflow: "auto",
                  }}
                >
                  {/* Day labels */}
                  <Box
                    sx={{ display: "grid", gridTemplateRows: "repeat(7,auto)", gap: 1 }}
                  >
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                      <Typography key={d} sx={{ pr: 1 }} variant="body2">
                        {d}
                      </Typography>
                    ))}
                  </Box>
                  {/* 7×24 */}
                  <Box
                    sx={{ display: "grid", gridTemplateRows: "repeat(7,auto)", gap: 1 }}
                  >
                    {repoData.punch_card.map((hours, di) => (
                      <Box key={di} sx={{ display: "flex", gap: 1 }}>
                        {hours.map((cnt, h) => (
                          <Box
                            key={h}
                            sx={{
                              width: 20,
                              height: 20,
                              bgcolor: `rgba(75,192,192,${Math.min(cnt / 10, 1)})`,
                              border: "1px solid rgba(0,0,0,.1)",
                              borderRadius: 1,
                            }}
                            title={`${cnt} commits at ${h}:00 on ${[
                              "Sunday",
                              "Monday",
                              "Tuesday",
                              "Wednesday",
                              "Thursday",
                              "Friday",
                              "Saturday",
                            ][di]}`}
                          />
                        ))}
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Typography
                  variant="caption"
                  sx={{ mt: 1, display: "block", textAlign: "center" }}
                >
                  Commit frequency by day & hour (darker = more commits)
                </Typography>
              </Box>
            )}
          </>
        )}
      </Box>
    </Container>
  );
}

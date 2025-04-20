# GitHub Repository Analyzer

A web application that provides insights and analytics for public GitHub repositories.

## Features

- Repository metadata analysis (stars, forks, watchers)
- Contributor statistics
- Commit activity visualization
- Rate limit handling
- User-friendly interface

## Project Structure

```
githubanalyser/
├── backend/              # Express.js backend
│   ├── server.js        # Main application file
│   ├── package.json     # Node dependencies
│   └── Dockerfile       # Docker configuration
├── frontend/            # React frontend
│   ├── src/            # Source code
│   └── Dockerfile      # Docker configuration
├── .env                 # Environment variables (gitignored)
├── .env.example         # Example environment file
├── docker-compose.yml   # Docker Compose configuration
└── README.md           # Project documentation
```

## Setup

This application uses Docker for deployment. Follow these steps:

1. Copy the environment example file:
```bash
cp .env.example .env
```

2. Edit the `.env` file and replace the placeholder values. The minimum required configuration is:
```
GITHUB_TOKEN=your_github_token_here
```
Generate a GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token (classic)"
   - Give it a descriptive name (e.g., "GitHub Analyzer")
   - Select the "repo" scope
   - Copy the generated token and paste it into your `.env` file

Note: The `.env` file is gitignored for security reasons. Never commit your actual environment file with sensitive tokens to version control.

3. Build and run the application:
```bash
docker compose up --build
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Features

- GitHub repository analysis
- Commit activity visualization
- Rate limit handling
- User-friendly interface
- Docker-based deployment


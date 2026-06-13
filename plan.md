# FIFA World Cup 2026 Live Center

## Project Requirements (Database-Free Architecture)

### Project Goal

A dedicated website exclusively for FIFA World Cup 2026 that provides:

* Live scores
* Match schedules
* Match details
* Standings
* Tournament bracket
* Team information
* Player information
* Venue information
* Real-time match events

All data comes directly from the football API.

No data is stored permanently.

---

# Architecture

```text
Football API
      ↓
Render Backend (Node.js + Express)
      ↓
Vercel Frontend (Next.js)
```

---

# Why No Database Works

The World Cup lasts approximately one month.

The website does not need:

* User accounts
* Comments
* Favorites
* Predictions
* Admin panel
* Content management

Everything already exists in the football API.

Your backend becomes a proxy layer:

```text
Client
  ↓
Backend
  ↓
Football API
```

The backend:

* Hides API keys
* Formats data
* Adds caching
* Handles rate limits

---

# Important Limitation

Without a database:

### You Cannot Store

* Custom content
* News articles
* User preferences
* Match history beyond API availability
* Custom statistics

Everything depends on the API.

If the API goes down:

```text
Website data goes down too.
```

---

# Recommended Stack

## Frontend

### Framework

* Next.js 15
* TypeScript

### UI

* Tailwind CSS
* Shadcn/UI

### Deployment

* Vercel

---

## Backend

### Framework

* Node.js
* Express.js
* TypeScript

### Deployment

* Render

---

## Caching

Use in-memory cache only.

Example:

```typescript
node-cache
```

or

```typescript
lru-cache
```

Purpose:

* Reduce API requests
* Reduce API costs
* Improve response speed

No database required.

---

# API Layer

Create a service abstraction:

```typescript
interface FootballProvider {
  getLiveMatches()
  getFixtures()
  getStandings()
  getMatchDetails()
  getTeams()
  getPlayers()
  getVenues()
}
```

Current implementation:

```text
Football-Data.org
```

Future replacement:

```text
API-Football
```

Frontend never knows which provider is used.

---

# Public Pages

## Home Page

### Hero Section

Display:

* FIFA World Cup 2026 logo
* Current stage
* Countdown to next match

---

### Live Matches

Display:

* Teams
* Flags
* Live score
* Match minute
* Match status

Refresh:

```text
15 seconds
```

---

### Today's Matches

Display:

* Teams
* Kickoff time
* Stadium
* Venue

---

### Upcoming Matches

Next:

```text
7 days
```

---

### Recent Results

Last:

```text
10 completed matches
```

---

# Fixtures Page

Route:

```text
/fixtures
```

Filter by:

* Group Stage
* Round of 32
* Round of 16
* Quarter Final
* Semi Final
* Third Place Match
* Final

Display:

* Team names
* Flags
* Kickoff time
* Stadium
* Match status

---

# Live Match Details Page

Route:

```text
/match/[id]
```

---

## Match Header

Display:

* Home team
* Away team
* Score
* Current minute

Example:

```text
Argentina 2-1 France
78'
```

---

## Match Events Timeline

Show:

* Goal
* Penalty Goal
* Own Goal
* Yellow Card
* Red Card
* Substitution
* VAR Review

Auto-update:

```text
15 seconds
```

---

## Statistics

If API supports:

* Possession
* Shots
* Shots on Target
* Corners
* Fouls
* Offsides
* Saves

---

## Lineups

Display:

* Formation
* Starting XI
* Bench

---

# Standings Page

Route:

```text
/standings
```

Display:

| Team | MP | W | D | L | GF | GA | GD | PTS |

For all groups.

Refresh:

```text
60 seconds
```

---

# Knockout Bracket

Route:

```text
/bracket
```

Display:

* Round of 32
* Round of 16
* Quarter Finals
* Semi Finals
* Final

Automatically generated from API data.

---

# Teams Page

Route:

```text
/teams
```

Display:

* Flag
* Team Name
* Group
* Coach
* FIFA Ranking

---

# Team Details

Route:

```text
/team/[id]
```

Display:

### Overview

* Team Name
* Flag
* Coach
* Ranking

### Squad

* Goalkeepers
* Defenders
* Midfielders
* Forwards

### Statistics

* Wins
* Draws
* Losses
* Goals Scored
* Goals Conceded

### Fixtures

* Upcoming
* Completed

---

# Players Page

Route:

```text
/players
```

Searchable list.

Display:

* Name
* Team
* Position

---

# Player Details

Route:

```text
/player/[id]
```

Display:

* Name
* Team
* Position
* Goals
* Assists
* Cards
* Minutes Played

(API permitting)

---

# Venues Page

Route:

```text
/venues
```

Display:

* Stadium
* City
* Capacity
* Matches Hosted

---

# Search

Global search.

Search by:

* Team
* Player
* Match
* Venue

---

# Backend Endpoints

```text
GET /api/live
GET /api/matches
GET /api/matches/:id
GET /api/standings
GET /api/teams
GET /api/teams/:id
GET /api/players
GET /api/players/:id
GET /api/venues
GET /api/bracket
```

---

# Caching Strategy

Since there is no database:

### Live Matches

Cache:

```text
15 seconds
```

---

### Standings

Cache:

```text
60 seconds
```

---

### Teams

Cache:

```text
24 hours
```

---

### Venues

Cache:

```text
24 hours
```

---

### Fixtures

Cache:

```text
30 minutes
```

---

# Performance Targets

### Lighthouse

```text
Performance: 95+
Accessibility: 95+
SEO: 100
```

### Core Web Vitals

```text
LCP < 2.5s
CLS < 0.1
INP < 200ms
```

---

# Additional Features Worth Adding

Since there is no database cost:

* Dark Mode
* Match Countdown Timers
* Local Timezone Conversion
* Team Comparison Page
* Top Scorers Leaderboard
* Top Assists Leaderboard
* Tournament Statistics Dashboard
* Live Match Notifications (Browser Notifications)

These can all be built without storing any data and will make the site feel significantly more complete during the tournament.

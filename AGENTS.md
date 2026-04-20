# Antigravity GeoHash Adventure Game

## Hackathon Project: "GravityDrop"

> A real-world exploration game powered by Python's hidden `antigravity.geohash()` function.

---

## The Hook

Python's `antigravity` module is famous for opening an XKCD comic, but buried inside it is a **secret function** — `antigravity.geohash(latitude, longitude, datedow)` — that implements the geohashing algorithm from [XKCD #426](https://xkcd.com/426/). This game brings that hidden Easter egg to life.

---

## Concept

Every day, the app generates a unique set of GPS coordinates using Python's `antigravity.geohash()`. Players compete to:

1. **Get closest** to the daily geohash point
2. **Photograph** proof of their visit
3. **Earn points** on a global leaderboard
4. **Unlock achievements** for streaks, rare locations, and more

Think of it as geocaching meets Wordle — a daily challenge with a community around it.

---

## How `antigravity.geohash()` Works

```python
import antigravity
from datetime import datetime

# The function signature:
# antigravity.geohash(latitude, longitude, datedow)
#
# - latitude:  your current latitude (float)
# - longitude: your current longitude (float)
# - datedow:   a bytes object of "YYYY-MM-DD-DOW_OPENING"
#              (date + Dow Jones Industrial Average opening price)

# Example usage
date_dow = b"2026-04-20-17543.21"
lat, lon = 37.7749, -122.4194  # San Francisco

geohash_point = antigravity.geohash(lat, lon, date_dow)
print(f"Today's target: {geohash_point}")
# Output: a fractional offset within the graticule (1x1 degree grid)
```

The algorithm uses an **MD5 hash** of the date + Dow Jones opening price to generate a pseudorandom point within your local 1-degree latitude/longitude grid. This means:

- Everyone in the same region gets the **same daily target**
- The point is **unpredictable** until the stock market opens
- It creates a **fair, daily challenge** that resets every 24 hours

---

## Features

### Core Gameplay

| Feature | Description |
|---|---|
| Daily Challenge | New geohash target generated every day at market open |
| Proximity Scoring | Points based on how close you get (inverse distance) |
| Photo Verification | Upload a geotagged photo as proof of visit |
| Live Map | See today's target and other players on an interactive map |
| Leaderboard | Daily, weekly, monthly, and all-time rankings |

### Social & Engagement

| Feature | Description |
|---|---|
| Graticule Groups | Auto-join players in your 1° grid square |
| Achievement Badges | "First Explorer", "7-Day Streak", "Water Landing" (target in water) |
| Ghost Mode | See yesterday's paths from other players |
| Share Cards | Auto-generated social media cards with your daily stats |

### Advanced

| Feature | Description |
|---|---|
| Multi-region Play | Earn bonus points for hashing in different graticules |
| Expedition Mode | Weekend team challenges for distant targets |
| History Heatmap | Visualize all locations you've visited over time |
| Impossible Points | Special badges when the target lands in unreachable places |

---

## Tech Stack

```
Backend:    Python (FastAPI) + PostgreSQL + Redis
Frontend:   React + Leaflet.js (maps) + TailwindCSS
APIs:       Dow Jones data (Alpha Vantage / Yahoo Finance)
Auth:       Firebase Auth or OAuth2
Storage:    Cloudflare R2 / S3 (photo uploads)
Hosting:    Railway / Fly.io / Vercel
```

---

## Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│   React App  │────▶│  FastAPI Backend  │────▶│  PostgreSQL  │
│  (Leaflet)   │◀────│                  │     │  (players,   │
└──────────────┘     │  antigravity.    │     │   scores,    │
                     │  geohash()       │     │   photos)    │
┌──────────────┐     │                  │     └──────────────┘
│ Alpha Vantage│────▶│  Dow Jones data  │
│   (stocks)   │     │  ingestion       │     ┌──────────────┐
└──────────────┘     └──────────────────┘────▶│    Redis     │
                                              │  (caching,   │
                                              │   sessions)  │
                                              └──────────────┘
```

---

## API Endpoints

```
GET  /api/today          → today's geohash target for user's graticule
GET  /api/leaderboard    → current rankings (daily/weekly/all-time)
POST /api/checkin        → submit location + photo for scoring
GET  /api/history        → user's past checkins and heatmap data
GET  /api/achievements   → user's unlocked badges
GET  /api/graticule/:id  → info about a specific graticule region
```

---

## Database Schema

```sql
CREATE TABLE players (
    id          UUID PRIMARY KEY,
    username    VARCHAR(50) UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    total_score INTEGER DEFAULT 0
);

CREATE TABLE daily_targets (
    id          SERIAL PRIMARY KEY,
    date        DATE NOT NULL,
    graticule   VARCHAR(20) NOT NULL,  -- e.g. "37,-122"
    target_lat  DOUBLE PRECISION NOT NULL,
    target_lon  DOUBLE PRECISION NOT NULL,
    dow_opening VARCHAR(20) NOT NULL,
    UNIQUE(date, graticule)
);

CREATE TABLE checkins (
    id          UUID PRIMARY KEY,
    player_id   UUID REFERENCES players(id),
    target_id   INTEGER REFERENCES daily_targets(id),
    checkin_lat DOUBLE PRECISION NOT NULL,
    checkin_lon DOUBLE PRECISION NOT NULL,
    distance_m  DOUBLE PRECISION NOT NULL,
    score       INTEGER NOT NULL,
    photo_url   TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE achievements (
    id          SERIAL PRIMARY KEY,
    player_id   UUID REFERENCES players(id),
    badge_name  VARCHAR(100) NOT NULL,
    earned_at   TIMESTAMP DEFAULT NOW(),
    UNIQUE(player_id, badge_name)
);
```

---

## Scoring Algorithm

```python
import math

def calculate_score(distance_meters: float) -> int:
    """
    Inverse logarithmic scoring.
    Closer = exponentially more points.
    
    Distance (m)  →  Points
    0-10          →  1000
    10-100        →  800-999
    100-1000      →  500-799
    1-10 km       →  200-499
    10-50 km      →  50-199
    50+ km        →  10-49
    """
    if distance_meters < 1:
        return 1000
    
    score = max(10, int(1000 - 150 * math.log10(distance_meters)))
    return min(1000, score)
```

---

## Key File: Geohash Engine

```python
"""
core/geohash_engine.py
The heart of the game — wraps antigravity.geohash() with game logic.
"""

import antigravity
import hashlib
from datetime import date
from typing import Tuple


def get_daily_target(
    player_lat: float,
    player_lon: float,
    game_date: date,
    dow_opening: str
) -> Tuple[float, float]:
    """
    Generate today's geohash target for a player's graticule.
    
    Uses Python's hidden antigravity.geohash() to compute
    the pseudorandom target coordinates.
    """
    graticule_lat = int(player_lat)
    graticule_lon = int(player_lon)
    
    datedow = f"{game_date.isoformat()}-{dow_opening}".encode("ascii")
    
    target = antigravity.geohash(
        float(graticule_lat),
        float(graticule_lon),
        datedow
    )
    
    return target.latitude, target.longitude


def get_graticule(lat: float, lon: float) -> str:
    """Return the graticule ID for a coordinate pair."""
    return f"{int(lat)},{int(lon)}"


def haversine_distance(
    lat1: float, lon1: float,
    lat2: float, lon2: float
) -> float:
    """Calculate distance in meters between two GPS points."""
    R = 6_371_000  # Earth radius in meters
    
    phi1, phi2 = map(lambda x: x * 3.14159265 / 180, [lat1, lat2])
    dphi = (lat2 - lat1) * 3.14159265 / 180
    dlambda = (lon2 - lon1) * 3.14159265 / 180
    
    a = (
        pow((__import__('math').sin(dphi / 2)), 2)
        + __import__('math').cos(phi1)
        * __import__('math').cos(phi2)
        * pow((__import__('math').sin(dlambda / 2)), 2)
    )
    
    return R * 2 * __import__('math').atan2(a**0.5, (1 - a)**0.5)
```

---

## Prompt for Building This Project

Use the following prompt to guide development (with an AI assistant or your team):

> **Build "GravityDrop" — a daily geohash exploration game.**
>
> **Backend (Python + FastAPI):**
> - Use `antigravity.geohash(latitude, longitude, datedow)` to generate daily target coordinates
> - Fetch Dow Jones opening price daily from Alpha Vantage API (free tier)
> - Expose REST endpoints: `/api/today` (get target), `/api/checkin` (submit location + photo), `/api/leaderboard` (rankings)
> - Score players using inverse-log distance (closer = exponentially more points, max 1000)
> - Store data in PostgreSQL: players, daily_targets, checkins, achievements
> - Cache today's target in Redis for fast lookups
>
> **Frontend (React + Leaflet.js + TailwindCSS):**
> - Interactive map showing today's target pin and the player's location
> - "Check In" button that captures GPS + optional photo upload
> - Daily leaderboard with proximity rankings
> - Achievement badges gallery (streaks, rare locations, milestones)
> - Share card generator for social media
> - Mobile-responsive design with a space/gravity theme (dark UI, star background, floating animations)
>
> **Key Details:**
> - The `antigravity` module is a Python Easter egg; `geohash()` is its hidden function
> - `datedow` format is `b"YYYY-MM-DD-DOW_OPENING"` (e.g., `b"2026-04-20-17543.21"`)
> - A graticule is a 1°×1° grid square; all players in the same graticule share the same daily target
> - Photo verification uses EXIF GPS data to cross-check against claimed position
> - The game resets daily when the US stock market opens (9:30 AM ET)
>
> **MVP for Hackathon Demo (build in this order):**
> 1. Geohash engine that computes daily target from `antigravity.geohash()`
> 2. FastAPI backend with `/today` and `/checkin` endpoints
> 3. Map UI showing target + player position + distance
> 4. Scoring + leaderboard
> 5. Polish: animations, achievements, share cards

---

## Hackathon Demo Script (3 Minutes)

1. **[30s] The Hook**
   - "Everyone knows `import antigravity` opens an XKCD comic. But did you know there's a *hidden function* inside?"
   - Show `antigravity.geohash()` in a Python REPL

2. **[60s] The Game**
   - Open the app, show today's target on the map
   - Demo a check-in (simulated GPS for demo)
   - Show the score calculation in real-time

3. **[45s] The Tech**
   - Walk through the architecture diagram
   - Highlight the `antigravity.geohash()` integration
   - Show the scoring algorithm

4. **[30s] The Community**
   - Show the leaderboard with sample players
   - Flash achievement badges
   - Show the social share card

5. **[15s] The Close**
   - "We turned a Python Easter egg into a daily adventure for thousands of players."
   - "GravityDrop — defy gravity, explore the world."

---

## Quick Start (Development)

```bash
# Clone and setup
git clone https://github.com/your-team/gravitydrop.git
cd gravitydrop

# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Add your API keys
uvicorn main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

---

## Dependencies

### Backend (`requirements.txt`)

```
fastapi
uvicorn[standard]
sqlalchemy
asyncpg
redis
python-dotenv
httpx
pillow
python-multipart
```

### Frontend (`package.json` key deps)

```
react
leaflet
react-leaflet
tailwindcss
axios
framer-motion
```

---

## Why This Wins

| Criteria | How We Score |
|---|---|
| **Creativity** | Uses a *hidden, undocumented* Python Easter egg as the core mechanic |
| **Technical Depth** | Full-stack app with geospatial math, real-time data, photo verification |
| **Completeness** | Working MVP with map, scoring, leaderboard, and achievements |
| **Presentation** | Strong narrative arc — from Easter egg discovery to global game |
| **Impact** | Encourages real-world exploration and community building |
| **Fun Factor** | It's literally a game — judges can play it during demos |

---

*Built with Python's best-kept secret: `antigravity.geohash()`*

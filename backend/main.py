from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import date
import os
import logging
from typing import List
from pydantic import BaseModel

# Initialize Google Cloud Logging if available
try:
    import google.cloud.logging
    client = google.cloud.logging.Client()
    client.setup_logging()
except ImportError:
    logging.basicConfig(level=logging.INFO)
    logging.info("Google Cloud Logging not installed, using default logging.")
except Exception as e:
    logging.warning(f"Could not setup Google Cloud Logging: {e}")

from models import database, schema
from core.geohash_engine import get_target, get_graticule, haversine_distance
from core.scoring import calculate_score

# Create database tables
schema.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="GravityDrop API")

# CORS setup: Restrict to frontend URL in production, fallback to wildcard
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL] if FRONTEND_URL != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use ENV variable for DOW, fallback to dummy
DOW_OPENING = os.getenv("DOW_OPENING", "38450.12")

class CheckinRequest(BaseModel):
    username: str
    lat: float
    lon: float

class CheckinResponse(BaseModel):
    distance_m: float
    score: int
    target_lat: float
    target_lon: float

@app.get("/api/today", status_code=status.HTTP_200_OK)
def get_today_target(lat: float, lon: float, db: Session = Depends(database.get_db)):
    """
    Retrieve today's geohash target for a specific graticule (1x1 degree grid).
    If the target does not exist in the database, it generates a new one.
    
    Args:
        lat: Player's current latitude
        lon: Player's current longitude
        db: Database session injection
        
    Returns:
        JSON object containing target coordinates and metadata
    """
    today = date.today()
    graticule_id = get_graticule(lat, lon)
    
    logging.info(f"Fetching target for graticule {graticule_id}")
    
    # Check if target already exists in DB
    target = db.query(schema.DailyTarget).filter(
        schema.DailyTarget.date == today,
        schema.DailyTarget.graticule == graticule_id
    ).first()
    
    if not target:
        # Calculate new target
        target_lat, target_lon = get_target(lat, lon, today, DOW_OPENING)
        target = schema.DailyTarget(
            date=today,
            graticule=graticule_id,
            target_lat=target_lat,
            target_lon=target_lon,
            dow_opening=DOW_OPENING
        )
        db.add(target)
        db.commit()
        db.refresh(target)
        
    return {
        "date": today.isoformat(),
        "graticule": graticule_id,
        "target_lat": target.target_lat,
        "target_lon": target.target_lon
    }

@app.post("/api/checkin", response_model=CheckinResponse, status_code=status.HTTP_201_CREATED)
def checkin(
    request: CheckinRequest,
    db: Session = Depends(database.get_db)
):
    """
    Submit a user's current location to calculate distance from the target
    and award points based on the inverse logarithmic scoring algorithm.
    
    Args:
        request: CheckinRequest object containing username and coordinates
        db: Database session injection
        
    Returns:
        CheckinResponse containing score and distance
    """
    today = date.today()
    graticule_id = get_graticule(request.lat, request.lon)
    
    logging.info(f"Checkin attempt by {request.username} at {request.lat}, {request.lon}")
    
    # Get player or create if not exists
    player = db.query(schema.Player).filter(schema.Player.username == request.username).first()
    if not player:
        player = schema.Player(username=request.username)
        db.add(player)
        db.commit()
        db.refresh(player)

    # Get today's target
    target = db.query(schema.DailyTarget).filter(
        schema.DailyTarget.date == today,
        schema.DailyTarget.graticule == graticule_id
    ).first()
    
    if not target:
        # Ensure target exists
        target_lat, target_lon = get_target(request.lat, request.lon, today, DOW_OPENING)
        target = schema.DailyTarget(
            date=today,
            graticule=graticule_id,
            target_lat=target_lat,
            target_lon=target_lon,
            dow_opening=DOW_OPENING
        )
        db.add(target)
        db.commit()
        db.refresh(target)

    # Calculate distance and score
    distance = haversine_distance(request.lat, request.lon, target.target_lat, target.target_lon)
    score = calculate_score(distance)

    # Save checkin
    checkin_record = schema.Checkin(
        player_id=player.id,
        target_id=target.id,
        checkin_lat=request.lat,
        checkin_lon=request.lon,
        distance_m=distance,
        score=score,
        photo_url=None # MVP skipping real photo upload
    )
    db.add(checkin_record)
    
    # Update total score
    player.total_score += score
    
    db.commit()

    return {
        "distance_m": distance,
        "score": score,
        "target_lat": target.target_lat,
        "target_lon": target.target_lon
    }

@app.get("/api/leaderboard", status_code=status.HTTP_200_OK)
def get_leaderboard(db: Session = Depends(database.get_db)):
    """
    Retrieve the top 10 explorers based on total score.
    
    Args:
        db: Database session injection
        
    Returns:
        List of player objects with usernames and scores
    """
    try:
        players = db.query(schema.Player).order_by(schema.Player.total_score.desc()).limit(10).all()
        return [{"username": p.username, "total_score": p.total_score} for p in players]
    except Exception as e:
        logging.error(f"Error fetching leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch leaderboard")

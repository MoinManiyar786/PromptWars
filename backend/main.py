from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import date, datetime
import math
from typing import List, Optional
from pydantic import BaseModel

from models import database, schema
from core.geohash_engine import get_target, get_graticule, haversine_distance
from core.scoring import calculate_score

# Create database tables
schema.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="GravityDrop API")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dummy DOW value for hackathon MVP
DUMMY_DOW_OPENING = "38450.12"

class CheckinRequest(BaseModel):
    username: str
    lat: float
    lon: float

class CheckinResponse(BaseModel):
    distance_m: float
    score: int
    target_lat: float
    target_lon: float

@app.get("/api/today")
def get_today_target(lat: float, lon: float, db: Session = Depends(database.get_db)):
    """Get today's target for a specific graticule"""
    today = date.today()
    graticule_id = get_graticule(lat, lon)
    
    # Check if target already exists in DB
    target = db.query(schema.DailyTarget).filter(
        schema.DailyTarget.date == today,
        schema.DailyTarget.graticule == graticule_id
    ).first()
    
    if not target:
        # Calculate new target
        target_lat, target_lon = get_target(lat, lon, today, DUMMY_DOW_OPENING)
        target = schema.DailyTarget(
            date=today,
            graticule=graticule_id,
            target_lat=target_lat,
            target_lon=target_lon,
            dow_opening=DUMMY_DOW_OPENING
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

@app.post("/api/checkin", response_model=CheckinResponse)
def checkin(
    request: CheckinRequest,
    db: Session = Depends(database.get_db)
):
    """Submit a checkin and get scored"""
    today = date.today()
    graticule_id = get_graticule(request.lat, request.lon)
    
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
        target_lat, target_lon = get_target(request.lat, request.lon, today, DUMMY_DOW_OPENING)
        target = schema.DailyTarget(
            date=today,
            graticule=graticule_id,
            target_lat=target_lat,
            target_lon=target_lon,
            dow_opening=DUMMY_DOW_OPENING
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

@app.get("/api/leaderboard")
def get_leaderboard(db: Session = Depends(database.get_db)):
    """Get all-time leaderboard"""
    players = db.query(schema.Player).order_by(schema.Player.total_score.desc()).limit(10).all()
    return [
        {"username": p.username, "total_score": p.total_score}
        for p in players
    ]

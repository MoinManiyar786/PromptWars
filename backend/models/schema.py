from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Player(Base):
    __tablename__ = "players"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    total_score = Column(Integer, default=0)

    checkins = relationship("Checkin", back_populates="player")
    achievements = relationship("Achievement", back_populates="player")

class DailyTarget(Base):
    __tablename__ = "daily_targets"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    graticule = Column(String, nullable=False) # e.g. "37,-122"
    target_lat = Column(Float, nullable=False)
    target_lon = Column(Float, nullable=False)
    dow_opening = Column(String, nullable=False)

class Checkin(Base):
    __tablename__ = "checkins"

    id = Column(String, primary_key=True, default=generate_uuid)
    player_id = Column(String, ForeignKey("players.id"))
    target_id = Column(Integer, ForeignKey("daily_targets.id"))
    checkin_lat = Column(Float, nullable=False)
    checkin_lon = Column(Float, nullable=False)
    distance_m = Column(Float, nullable=False)
    score = Column(Integer, nullable=False)
    photo_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    player = relationship("Player", back_populates="checkins")
    target = relationship("DailyTarget")

class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(String, ForeignKey("players.id"))
    badge_name = Column(String, nullable=False)
    earned_at = Column(DateTime(timezone=True), server_default=func.now())

    player = relationship("Player", back_populates="achievements")

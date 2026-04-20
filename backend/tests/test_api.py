import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_today_target():
    response = client.get("/api/today?lat=37.7749&lon=-122.4194")
    assert response.status_code == 200
    data = response.json()
    assert "target_lat" in data
    assert "target_lon" in data
    assert "graticule" in data
    assert data["graticule"] == "37,-123"

def test_checkin_flow():
    # Submit checkin
    response = client.post("/api/checkin", json={
        "username": "test_astronaut",
        "lat": 37.7749,
        "lon": -122.4194
    })
    assert response.status_code == 201
    data = response.json()
    assert "score" in data
    assert "distance_m" in data
    assert "target_lat" in data
    
    # Verify leaderboard
    lb_response = client.get("/api/leaderboard")
    assert lb_response.status_code == 200
    lb_data = lb_response.json()
    assert len(lb_data) > 0
    assert any(player["username"] == "test_astronaut" for player in lb_data)

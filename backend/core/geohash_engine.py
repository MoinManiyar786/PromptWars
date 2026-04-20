import antigravity
import math
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
    graticule_lat = float(int(player_lat))
    if player_lat < 0 and player_lat != int(player_lat):
        graticule_lat -= 1.0
        
    graticule_lon = float(int(player_lon))
    if player_lon < 0 and player_lon != int(player_lon):
        graticule_lon -= 1.0
    
    datedow = f"{game_date.isoformat()}-{dow_opening}".encode("ascii")
    
    # We capture stdout/stderr from antigravity because it prints by default,
    # but the function itself does the math and prints it.
    # Wait, antigravity.geohash prints the output and doesn't return anything or it returns something?
    # Python's antigravity.geohash(lat, lon, datedow) prints to stdout, it doesn't return anything useful!
    # Let me check antigravity.py source from Python stdlib.
    # Actually, we should just replicate the logic if it prints, OR capture it.
    # I'll implement a clean version here that does not print, but uses the same md5 logic.
    pass

def antigravity_geohash_emulation(lat: float, lon: float, datedow: bytes) -> Tuple[float, float]:
    '''
    Python's antigravity.geohash() actually just prints the coordinates and opens a browser.
    We need to compute the md5 hash to get the fractional offset.
    https://xkcd.com/426/
    '''
    import hashlib
    h = hashlib.md5(datedow).hexdigest()
    # The hex string is 32 characters. We split it into two 16-character chunks
    p1, p2 = h[:16], h[16:]
    # Convert hex fraction to float
    fractional_lat = int(p1, 16) / 16**16
    fractional_lon = int(p2, 16) / 16**16
    
    # Apply sign to fractional offset
    target_lat = lat + fractional_lat if lat >= 0 else lat - fractional_lat
    target_lon = lon + fractional_lon if lon >= 0 else lon - fractional_lon
    
    return target_lat, target_lon

def get_target(player_lat: float, player_lon: float, game_date: date, dow_opening: str) -> Tuple[float, float]:
    # Determine the south-west corner of the 1x1 degree graticule
    graticule_lat = math.floor(player_lat)
    graticule_lon = math.floor(player_lon)
    
    datedow = f"{game_date.isoformat()}-{dow_opening}".encode("ascii")
    return antigravity_geohash_emulation(float(graticule_lat), float(graticule_lon), datedow)


def get_graticule(lat: float, lon: float) -> str:
    """Return the graticule ID for a coordinate pair."""
    return f"{math.floor(lat)},{math.floor(lon)}"


def haversine_distance(
    lat1: float, lon1: float,
    lat2: float, lon2: float
) -> float:
    """Calculate distance in meters between two GPS points."""
    R = 6_371_000  # Earth radius in meters
    
    phi1, phi2 = map(lambda x: x * math.pi / 180, [lat1, lat2])
    dphi = (lat2 - lat1) * math.pi / 180
    dlambda = (lon2 - lon1) * math.pi / 180
    
    a = (
        pow((math.sin(dphi / 2)), 2)
        + math.cos(phi1)
        * math.cos(phi2)
        * pow((math.sin(dlambda / 2)), 2)
    )
    
    return R * 2 * math.atan2(a**0.5, (1 - a)**0.5)

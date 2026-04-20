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

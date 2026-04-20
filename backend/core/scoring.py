import math

def calculate_score(distance_meters: float) -> int:
    """
    Inverse logarithmic scoring algorithm.
    The closer the player is to the target, the exponentially more points they earn.
    
    Args:
        distance_meters: Float representing the haversine distance in meters.
        
    Returns:
        Integer score between 10 and 1000.
    """
    if distance_meters < 1.0:
        return 1000
    
    score = max(10, int(1000 - 150 * math.log10(distance_meters)))
    return min(1000, score)

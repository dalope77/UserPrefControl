import math
from models import Business, Offer

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    Returns distance in meters
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in meters
    r = 6371000
    
    return c * r

def get_nearby_offers(user_lat, user_lng, radius_meters=1000):
    """
    Get all active offers within the specified radius of the user's location
    Returns list of tuples: (offer, business, distance)
    """
    nearby_offers = []
    
    # Get all active offers
    active_offers = Offer.get_all_active()
    
    for offer in active_offers:
        business = offer.get_business()
        if business and business.latitude != 0 and business.longitude != 0:
            distance = haversine_distance(user_lat, user_lng, business.latitude, business.longitude)
            
            if distance <= radius_meters:
                nearby_offers.append((offer, business, distance))
    
    # Sort by distance (closest first)
    nearby_offers.sort(key=lambda x: x[2])
    
    return nearby_offers

def is_user_near_business(user_lat, user_lng, business_lat, business_lng, radius_meters=100):
    """
    Check if user is within the specified radius of a business
    """
    distance = haversine_distance(user_lat, user_lng, business_lat, business_lng)
    return distance <= radius_meters

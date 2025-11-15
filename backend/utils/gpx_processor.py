import gpxpy
import gpxpy.gpx
from rdp import rdp
import math
from typing import List, Tuple, Dict, Optional

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
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

def distance_3d(lat1: float, lon1: float, ele1: float, 
                lat2: float, lon2: float, ele2: float) -> float:
    """
    Calculate 3D distance including elevation
    Returns distance in meters
    """
    horizontal_dist = haversine_distance(lat1, lon1, lat2, lon2)
    vertical_dist = abs(ele2 - ele1) if ele1 is not None and ele2 is not None else 0
    return math.sqrt(horizontal_dist**2 + vertical_dist**2)

def simplify_coordinates(coordinates: List[List[float]], epsilon: float = 0.0001) -> List[List[float]]:
    """
    Simplify coordinates using Ramer-Douglas-Peucker algorithm
    """
    if len(coordinates) < 3:
        return coordinates
    
    # Convert to format expected by rdp
    points = [[coord[0], coord[1]] for coord in coordinates]
    simplified_points = rdp(points, epsilon=epsilon)
    
    # Map back to original coordinates with elevation
    result = []
    for sp in simplified_points:
        for coord in coordinates:
            if coord[0] == sp[0] and coord[1] == sp[1]:
                result.append(coord)
                break
    
    return result

def parse_gpx_file(gpx_content: str) -> Dict:
    """
    Parse GPX file content and return optimized structure
    Includes timestamp detection for timing data
    """
    gpx = gpxpy.parse(gpx_content)
    
    coordinates = []
    total_distance = 0
    elevation_gain = 0
    elevation_loss = 0
    min_elevation = float('inf')
    max_elevation = float('-inf')
    
    # Timestamp tracking
    has_timestamps = False
    first_timestamp = None
    last_timestamp = None
    points_with_timestamps = 0
    total_points = 0
    
    previous_point = None
    
    for track in gpx.tracks:
        for segment in track.segments:
            for point in segment.points:
                total_points += 1
                lat, lon = point.latitude, point.longitude
                ele = point.elevation if point.elevation else 0
                
                coordinates.append([lat, lon, ele])
                
                # Track timestamps if present
                if point.time is not None:
                    points_with_timestamps += 1
                    if first_timestamp is None:
                        first_timestamp = point.time
                    last_timestamp = point.time
                
                # Update elevation stats
                if ele < min_elevation:
                    min_elevation = ele
                if ele > max_elevation:
                    max_elevation = ele
                
                # Calculate distance and elevation changes
                if previous_point:
                    dist = distance_3d(
                        previous_point.latitude, previous_point.longitude, 
                        previous_point.elevation or 0,
                        lat, lon, ele
                    )
                    total_distance += dist
                    
                    if previous_point.elevation is not None and point.elevation is not None:
                        ele_diff = point.elevation - previous_point.elevation
                        if ele_diff > 0:
                            elevation_gain += ele_diff
                        else:
                            elevation_loss += abs(ele_diff)
                
                previous_point = point
    
    # Determine if we have sufficient timestamps (at least 80% of points)
    has_timestamps = (points_with_timestamps / total_points) >= 0.8 if total_points > 0 else False
    
    # Calculate duration if timestamps available
    timestamp_duration_minutes = None
    if has_timestamps and first_timestamp and last_timestamp:
        duration_seconds = (last_timestamp - first_timestamp).total_seconds()
        timestamp_duration_minutes = duration_seconds / 60
    
    # Simplify coordinates
    simplified_coords = simplify_coordinates(coordinates, epsilon=0.0001)
    
    # Calculate bounding box
    lats = [c[0] for c in simplified_coords]
    lons = [c[1] for c in simplified_coords]
    
    return {
        "coordinates": simplified_coords,
        "total_distance_meters": total_distance,
        "elevation_gain_meters": elevation_gain,
        "elevation_loss_meters": elevation_loss,
        "min_elevation": min_elevation if min_elevation != float('inf') else 0,
        "max_elevation": max_elevation if max_elevation != float('-inf') else 0,
        "bounding_box": [
            [min(lats), min(lons)],
            [max(lats), max(lons)]
        ],
        "original_points": len(coordinates),
        "simplified_points": len(simplified_coords),
        "has_timestamps": has_timestamps,
        "timestamp_duration_minutes": timestamp_duration_minutes,
        "first_timestamp": first_timestamp.isoformat() if first_timestamp else None,
        "last_timestamp": last_timestamp.isoformat() if last_timestamp else None
    }

def find_closest_point_on_route(route_coords: List[List[float]], 
                                 target_lat: float, 
                                 target_lon: float) -> Tuple[int, float]:
    """
    Find the closest point on the route to a given coordinate
    Returns: (index of closest point, distance from start in meters)
    """
    min_distance = float('inf')
    closest_index = 0
    distance_from_start = 0
    cumulative_distance = 0
    
    for i, coord in enumerate(route_coords):
        dist = haversine_distance(target_lat, target_lon, coord[0], coord[1])
        
        if dist < min_distance:
            min_distance = dist
            closest_index = i
            distance_from_start = cumulative_distance
        
        if i > 0:
            cumulative_distance += haversine_distance(
                route_coords[i-1][0], route_coords[i-1][1],
                coord[0], coord[1]
            )
    
    return closest_index, distance_from_start

def calculate_leg_metrics(route_coords: List[List[float]], 
                          start_index: int, 
                          end_index: int) -> Dict:
    """
    Calculate distance and elevation metrics for a leg between two points
    """
    if start_index >= end_index or end_index >= len(route_coords):
        return {
            "distance": 0,
            "elevation_gain": 0,
            "elevation_loss": 0
        }
    
    total_distance = 0
    elevation_gain = 0
    elevation_loss = 0
    
    for i in range(start_index + 1, end_index + 1):
        prev = route_coords[i - 1]
        curr = route_coords[i]
        
        # Add distance
        total_distance += distance_3d(prev[0], prev[1], prev[2], 
                                      curr[0], curr[1], curr[2])
        
        # Calculate elevation change
        ele_diff = curr[2] - prev[2]
        if ele_diff > 0:
            elevation_gain += ele_diff
        else:
            elevation_loss += abs(ele_diff)
    
    return {
        "distance": total_distance,
        "elevation_gain": elevation_gain,
        "elevation_loss": elevation_loss
    }

def meters_to_miles(meters: float) -> float:
    """Convert meters to miles"""
    return meters / 1609.34

def meters_to_kilometers(meters: float) -> float:
    """Convert meters to kilometers"""
    return meters / 1000.0

def miles_to_meters(miles: float) -> float:
    """Convert miles to meters"""
    return miles * 1609.34

def kilometers_to_meters(km: float) -> float:
    """Convert kilometers to meters"""
    return km * 1000.0


package com.project.foodredistribution.service;

import com.project.foodredistribution.entity.FoodListing;
import com.project.foodredistribution.entity.Volunteer;
import com.project.foodredistribution.entity.VolunteerRoute;
import com.project.foodredistribution.entity.Zone;
import com.project.foodredistribution.dto.TaskMatchRecommendation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MatchingService {

    private static final Logger log = LoggerFactory.getLogger(MatchingService.class);
    private final RestTemplate restTemplate = new RestTemplate();

    // Cache to hold computed OSRM distances
    private final Map<String, Double> osrmDistanceCache = new ConcurrentHashMap<>();

    @Value("${app.matching.max-route-deviation-km:2.0}")
    private double maxRouteDeviationKm;

    @Value("${app.matching.max-volunteer-to-shelter-distance-km:5.0}")
    private double maxVolunteerToShelterDistanceKm;

    @Value("${app.matching.min-match-distance-meters:100.0}")
    private double minMatchDistanceMeters;

    @Value("${app.matching.gps-accuracy-threshold-meters:50.0}")
    private double gpsAccuracyThresholdMeters;

    public double getMaxRouteDeviationKm() {
        return maxRouteDeviationKm;
    }

    public double getMaxVolunteerToShelterDistanceKm() {
        return maxVolunteerToShelterDistanceKm;
    }

    public double getMinMatchDistanceMeters() {
        return minMatchDistanceMeters;
    }

    public double getGpsAccuracyThresholdMeters() {
        return gpsAccuracyThresholdMeters;
    }

    // Haversine formula to calculate distance in km
    public double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Radius of the earth in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Geometry Point representation
    public static class Point {
        public double lat;
        public double lng;
        public Point(double lat, double lng) {
            this.lat = lat;
            this.lng = lng;
        }
    }

    // Projection result holding point on polyline and details
    public static class ProjectionResult {
        public Point point;
        public double distanceToSegment; // in km
        public double distanceAlongRoute; // in km
    }

    public List<Point> parseRouteGeometry(String routeGeometry) {
        List<Point> points = new ArrayList<>();
        if (routeGeometry == null || routeGeometry.trim().isEmpty()) {
            return points;
        }
        String[] parts = routeGeometry.split(";");
        for (String part : parts) {
            String[] coords = part.split(",");
            if (coords.length == 2) {
                try {
                    double lat = Double.parseDouble(coords[0]);
                    double lng = Double.parseDouble(coords[1]);
                    points.add(new Point(lat, lng));
                } catch (NumberFormatException e) {
                    // Ignore invalid points
                }
            }
        }
        return points;
    }

    public double calculateTotalRouteLength(List<Point> route) {
        double total = 0.0;
        for (int i = 0; i < route.size() - 1; i++) {
            total += calculateDistance(route.get(i).lat, route.get(i).lng, route.get(i + 1).lat, route.get(i + 1).lng);
        }
        return total;
    }

    public ProjectionResult projectPointOntoRoute(Point p, List<Point> route) {
        if (route == null || route.isEmpty()) {
            return null;
        }
        if (route.size() == 1) {
            ProjectionResult res = new ProjectionResult();
            res.point = route.get(0);
            res.distanceToSegment = calculateDistance(p.lat, p.lng, route.get(0).lat, route.get(0).lng);
            res.distanceAlongRoute = 0.0;
            return res;
        }

        double minDistance = Double.MAX_VALUE;
        Point bestProjection = null;
        double bestDistanceAlongRoute = 0.0;

        double cumulativeDistance = 0.0;
        for (int i = 0; i < route.size() - 1; i++) {
            Point a = route.get(i);
            Point b = route.get(i + 1);
            double segLength = calculateDistance(a.lat, a.lng, b.lat, b.lng);

            // Vector projection in flat coordinates for approximation
            double dx = b.lng - a.lng;
            double dy = b.lat - a.lat;
            double lenSq = dx * dx + dy * dy;

            double t = 0.0;
            if (lenSq > 0) {
                double px = p.lng - a.lng;
                double py = p.lat - a.lat;
                t = (px * dx + py * dy) / lenSq;
                t = Math.max(0.0, Math.min(1.0, t));
            }

            double projLat = a.lat + t * dy;
            double projLng = a.lng + t * dx;
            double distToProj = calculateDistance(p.lat, p.lng, projLat, projLng);

            if (distToProj < minDistance) {
                minDistance = distToProj;
                bestProjection = new Point(projLat, projLng);
                bestDistanceAlongRoute = cumulativeDistance + (t * segLength);
            }

            cumulativeDistance += segLength;
        }

        ProjectionResult res = new ProjectionResult();
        res.point = bestProjection;
        res.distanceToSegment = minDistance;
        res.distanceAlongRoute = bestDistanceAlongRoute;
        return res;
    }

    // Call external OSRM API for road distance
    public double getOsrmRoadDistance(double[][] coordinates) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < coordinates.length; i++) {
            if (i > 0) sb.append(";");
            sb.append(String.format(java.util.Locale.US, "%f,%f", coordinates[i][1], coordinates[i][0])); // lon,lat
        }
        String url = "https://router.project-osrm.org/route/v1/driving/" + sb.toString() + "?overview=false";
        try {
            Map response = restTemplate.getForObject(url, Map.class);
            if (response != null && response.containsKey("routes")) {
                List routes = (List) response.get("routes");
                if (routes != null && !routes.isEmpty()) {
                    Map route = (Map) routes.get(0);
                    if (route != null && route.containsKey("distance")) {
                        return ((Number) route.get("distance")).doubleValue() / 1000.0; // convert to km
                    }
                }
            }
        } catch (Exception e) {
            log.warn("OSRM routing API call failed: {}. Falling back to straight-line distance.", e.getMessage());
        }
        
        // Straight-line cumulative distance fallback
        double fallbackDist = 0.0;
        for (int i = 0; i < coordinates.length - 1; i++) {
            fallbackDist += calculateDistance(coordinates[i][0], coordinates[i][1], coordinates[i + 1][0], coordinates[i + 1][1]);
        }
        return fallbackDist;
    }

    // Call external OSRM API for road duration (in minutes)
    public double getOsrmRoadDuration(double[][] coordinates) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < coordinates.length; i++) {
            if (i > 0) sb.append(";");
            sb.append(String.format(java.util.Locale.US, "%f,%f", coordinates[i][1], coordinates[i][0])); // lon,lat
        }
        String url = "https://router.project-osrm.org/route/v1/driving/" + sb.toString() + "?overview=false";
        try {
            Map response = restTemplate.getForObject(url, Map.class);
            if (response != null && response.containsKey("routes")) {
                List routes = (List) response.get("routes");
                if (routes != null && !routes.isEmpty()) {
                    Map route = (Map) routes.get(0);
                    if (route != null && route.containsKey("duration")) {
                        double durationSecs = ((Number) route.get("duration")).doubleValue();
                        return durationSecs / 60.0; // convert to minutes
                    }
                }
            }
        } catch (Exception e) {
            log.warn("OSRM routing duration API call failed: {}. Falling back to straight-line duration calculation.", e.getMessage());
        }

        // Fallback: estimate time using straight-line distance / 20 km/h (20 km/h is 1/3 km per minute)
        double fallbackDist = 0.0;
        for (int i = 0; i < coordinates.length - 1; i++) {
            fallbackDist += calculateDistance(coordinates[i][0], coordinates[i][1], coordinates[i + 1][0], coordinates[i + 1][1]);
        }
        double fallbackDurationMins = fallbackDist * 3.0; // distance / (20/60)
        log.info("OSRM Fallback - Calculated straight-line distance: {} km -> estimated duration: {} minutes", fallbackDist, fallbackDurationMins);
        return fallbackDurationMins;
    }


    public double calculateRouteDeviationRoad(VolunteerRoute route, FoodListing food, Zone zone) {
        double startLat = (route.getCurrentLatitude() != null) ? route.getCurrentLatitude() : route.getStartLatitude();
        double startLng = (route.getCurrentLongitude() != null) ? route.getCurrentLongitude() : route.getStartLongitude();

        double destLat = (food.getDestinationLatitude() != null) ? food.getDestinationLatitude() : (zone != null ? zone.getLatitude() : route.getEndLatitude());
        double destLng = (food.getDestinationLongitude() != null) ? food.getDestinationLongitude() : (zone != null ? zone.getLongitude() : route.getEndLongitude());

        // Round coordinates to 4 decimal places (~11 meters) to stabilize cache hits
        String cacheKeyDirect = String.format(java.util.Locale.US, "direct:%.4f,%.4f->%.4f,%.4f", startLat, startLng, route.getEndLatitude(), route.getEndLongitude());
        String cacheKeyDeviated = String.format(java.util.Locale.US, "deviated:%.4f,%.4f->%.4f,%.4f->%.4f,%.4f->%.4f,%.4f", 
                startLat, startLng, food.getPickupLatitude(), food.getPickupLongitude(), destLat, destLng, route.getEndLatitude(), route.getEndLongitude());

        double dDirect = osrmDistanceCache.computeIfAbsent(cacheKeyDirect, k -> getOsrmRoadDistance(new double[][]{
            {startLat, startLng},
            {route.getEndLatitude(), route.getEndLongitude()}
        }));

        double dDeviated = osrmDistanceCache.computeIfAbsent(cacheKeyDeviated, k -> getOsrmRoadDistance(new double[][]{
            {startLat, startLng},
            {food.getPickupLatitude(), food.getPickupLongitude()},
            {destLat, destLng},
            {route.getEndLatitude(), route.getEndLongitude()}
        }));

        return Math.max(0.0, dDeviated - dDirect);
    }

    public double calculateRouteDeviation(VolunteerRoute route, FoodListing food, Zone zone) {
        double startLat = (route.getCurrentLatitude() != null) ? route.getCurrentLatitude() : route.getStartLatitude();
        double startLng = (route.getCurrentLongitude() != null) ? route.getCurrentLongitude() : route.getStartLongitude();

        double destLat = (food.getDestinationLatitude() != null) ? food.getDestinationLatitude() : (zone != null ? zone.getLatitude() : route.getEndLatitude());
        double destLng = (food.getDestinationLongitude() != null) ? food.getDestinationLongitude() : (zone != null ? zone.getLongitude() : route.getEndLongitude());

        // Direct travel distance for volunteer
        double dDirect = calculateDistance(startLat, startLng,
                route.getEndLatitude(), route.getEndLongitude());

        // Deviated travel distance (Start/Current -> Pickup -> Delivery/Zone -> End)
        double d1 = calculateDistance(startLat, startLng,
                food.getPickupLatitude(), food.getPickupLongitude());
        double d2 = calculateDistance(food.getPickupLatitude(), food.getPickupLongitude(),
                destLat, destLng);
        double d3 = calculateDistance(destLat, destLng,
                route.getEndLatitude(), route.getEndLongitude());

        double dDeviated = d1 + d2 + d3;
        
        return Math.max(0.0, dDeviated - dDirect);
    }

    public double calculateMatchingScore(Volunteer volunteer, VolunteerRoute route, FoodListing food, Zone zone) {
        double deviation = calculateRouteDeviation(route, food, zone);
        return calculateMatchingScoreCustom(volunteer, route, food, zone, deviation, 0.0, 0.0, true);
    }

    public double calculateMatchingScoreCustom(Volunteer volunteer, VolunteerRoute route, FoodListing food, Zone zone,
                                               double deviation, double distanceToRoute, double distanceToVolunteer, boolean isAhead) {
        // 1. Route Compatibility (25%): based on deviation & distance to route corridor
        double deviationScore = Math.max(0.0, 100.0 - (deviation * 15.0)); // 15% penalty per km of deviation
        double routeCorridorScore = Math.max(0.0, 100.0 - (distanceToRoute * 50.0)); // 50% penalty per km off route
        double routeScore = (0.6 * deviationScore) + (0.4 * routeCorridorScore);

        // 2. Distance to volunteer (20%): shorter is preferred
        double volunteerDistanceScore = Math.max(0.0, 100.0 - (distanceToVolunteer * 20.0)); // 20% penalty per km

        // 3. Ahead/Behind position (15%):
        double positionScore = isAhead ? 100.0 : 10.0; // major penalty if behind

        // 4. Reliability (15%): volunteer score (0.0 to 1.0)
        double reliabilityScore = volunteer.getReliabilityScore() * 100.0;

        // 5. Food Urgency (15%): time remaining until expiry
        long minutesRemaining = Duration.between(java.time.Instant.now(), food.getExpiryTime()).toMinutes();
        double urgencyScore;
        if (minutesRemaining <= 0) {
            urgencyScore = 0.0;
        } else if (minutesRemaining <= 30) {
            urgencyScore = 100.0; // Urgent!
        } else if (minutesRemaining <= 120) {
            urgencyScore = 80.0;
        } else {
            urgencyScore = Math.max(20.0, 100.0 - (minutesRemaining / 10.0));
        }

        // 6. Destination Compatibility (10%): based on dropoff distance to route end
        double destLat = (food.getDestinationLatitude() != null) ? food.getDestinationLatitude() : (zone != null ? zone.getLatitude() : route.getEndLatitude());
        double destLng = (food.getDestinationLongitude() != null) ? food.getDestinationLongitude() : (zone != null ? zone.getLongitude() : route.getEndLongitude());
        double destDist = calculateDistance(destLat, destLng, route.getEndLatitude(), route.getEndLongitude());
        double destinationCompatibilityScore = Math.max(0.0, 100.0 - (destDist * 10.0)); // 10% penalty per km from route destination
        
        double finalScore = (0.25 * routeScore)
                + (0.20 * volunteerDistanceScore)
                + (0.15 * positionScore)
                + (0.15 * reliabilityScore)
                + (0.15 * urgencyScore)
                + (0.10 * destinationCompatibilityScore);

        return Math.round(finalScore * 100.0) / 100.0;
    }

    public TaskMatchRecommendation getRealTimeMatchDetail(Volunteer volunteer, VolunteerRoute route, FoodListing food, Zone zone, boolean useRoadRouting) {
        double currentLat = (route.getCurrentLatitude() != null) ? route.getCurrentLatitude() : route.getStartLatitude();
        double currentLng = (route.getCurrentLongitude() != null) ? route.getCurrentLongitude() : route.getStartLongitude();

        double destLat = (food.getDestinationLatitude() != null) ? food.getDestinationLatitude() : (zone != null ? zone.getLatitude() : route.getEndLatitude());
        double destLng = (food.getDestinationLongitude() != null) ? food.getDestinationLongitude() : (zone != null ? zone.getLongitude() : route.getEndLongitude());

        double distanceToVolunteer = calculateDistance(currentLat, currentLng, food.getPickupLatitude(), food.getPickupLongitude());
        double distanceToDestination = calculateDistance(currentLat, currentLng, destLat, destLng);
        double shelterToDestinationDistance = calculateDistance(food.getPickupLatitude(), food.getPickupLongitude(), destLat, destLng);

        List<Point> points = parseRouteGeometry(route.getRouteGeometry());
        double distanceToRoute = 0.0;
        double volunteerRouteProgress = 0.0;
        double shelterRouteProgress = 0.0;
        boolean isAhead = true;
        String positionStatus = "Ahead on your route";

        if (points.size() >= 2) {
            ProjectionResult projV = projectPointOntoRoute(new Point(currentLat, currentLng), points);
            ProjectionResult projS = projectPointOntoRoute(new Point(food.getPickupLatitude(), food.getPickupLongitude()), points);
            double totalLen = calculateTotalRouteLength(points);

            distanceToRoute = projS.distanceToSegment;
            volunteerRouteProgress = totalLen > 0 ? (projV.distanceAlongRoute / totalLen) * 100.0 : 0.0;
            shelterRouteProgress = totalLen > 0 ? (projS.distanceAlongRoute / totalLen) * 100.0 : 0.0;
            isAhead = shelterRouteProgress >= volunteerRouteProgress;

            if (distanceToVolunteer * 1000.0 <= minMatchDistanceMeters) {
                positionStatus = "Pickup nearby";
            } else if (isAhead) {
                positionStatus = "Ahead on your route";
            } else {
                positionStatus = "Behind you";
            }
        } else {
            // Straight-line projection fallback if no geometry
            double totalDist = calculateDistance(route.getStartLatitude(), route.getStartLongitude(), route.getEndLatitude(), route.getEndLongitude());
            double progressDist = calculateDistance(route.getStartLatitude(), route.getStartLongitude(), currentLat, currentLng);
            double pickupDist = calculateDistance(route.getStartLatitude(), route.getStartLongitude(), food.getPickupLatitude(), food.getPickupLongitude());

            volunteerRouteProgress = totalDist > 0 ? (progressDist / totalDist) * 100.0 : 0.0;
            shelterRouteProgress = totalDist > 0 ? (pickupDist / totalDist) * 100.0 : 0.0;
            isAhead = shelterRouteProgress >= volunteerRouteProgress;

            if (distanceToVolunteer * 1000.0 <= minMatchDistanceMeters) {
                positionStatus = "Pickup nearby";
            } else if (isAhead) {
                positionStatus = "Ahead on your route";
            } else {
                positionStatus = "Behind you";
            }
        }

        double deviation = useRoadRouting ? calculateRouteDeviationRoad(route, food, zone) : calculateRouteDeviation(route, food, zone);
        double matchingScore = calculateMatchingScoreCustom(volunteer, route, food, zone, deviation, distanceToRoute, distanceToVolunteer, isAhead);

        return new TaskMatchRecommendation(
                food, zone, route.getId(), deviation, matchingScore,
                distanceToVolunteer, distanceToDestination, shelterToDestinationDistance,
                distanceToRoute, isAhead, positionStatus,
                volunteerRouteProgress, shelterRouteProgress
        );
    }
}

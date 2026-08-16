package com.project.foodredistribution.service;

import com.project.foodredistribution.entity.FoodListing;
import com.project.foodredistribution.entity.Volunteer;
import com.project.foodredistribution.entity.VolunteerRoute;
import com.project.foodredistribution.entity.Zone;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
public class MatchingService {

    // Haversine formula to calculate distance in km
    public double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Radious of the earth in km
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
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
        
        // Deviation can't be negative (due to float precision or straight path shortcutting)
        return Math.max(0.0, dDeviated - dDirect);
    }

    public double calculateMatchingScore(Volunteer volunteer, VolunteerRoute route, FoodListing food, Zone zone) {
        // 1. Route Compatibility (35%): based on deviation
        double deviation = calculateRouteDeviation(route, food, zone);
        double routeCompatibility = Math.max(0.0, 100.0 - (deviation * 15.0)); // 15% penalty per km of deviation

        // 2. Distance (20%): pickup to delivery distance. Shorter is preferred to prevent cold-chain breaches
        double deliveryDistance = calculateDistance(food.getPickupLatitude(), food.getPickupLongitude(),
                zone.getLatitude(), zone.getLongitude());
        double distanceScore = Math.max(0.0, 100.0 - (deliveryDistance * 8.0)); // 8% penalty per km of delivery length

        // 3. Reliability (20%): volunteer score (0.0 to 1.0)
        double reliabilityScore = volunteer.getReliabilityScore() * 100.0;

        // 4. Food Urgency (15%): time remaining until expiry
        long minutesRemaining = Duration.between(LocalDateTime.now(), food.getExpiryTime()).toMinutes();
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

        // 5. Zone Priority (10%): based on current zone demand priority score (1.0 to 10.0)
        double zoneScore = zone.getPriorityScore() * 10.0; // scale to 100

        // Calculate weighted score
        double finalScore = (0.35 * routeCompatibility)
                + (0.20 * distanceScore)
                + (0.20 * reliabilityScore)
                + (0.15 * urgencyScore)
                + (0.10 * zoneScore);

        return Math.round(finalScore * 100.0) / 100.0; // Round to 2 decimal places
    }
}

package com.project.foodredistribution.service;

import com.project.foodredistribution.entity.FoodListing;
import com.project.foodredistribution.entity.FoodProvider;
import com.project.foodredistribution.entity.User;
import com.project.foodredistribution.entity.Zone;
import com.project.foodredistribution.entity.DeliveryTask;
import com.project.foodredistribution.exception.ResourceNotFoundException;
import com.project.foodredistribution.repository.FoodListingRepository;
import com.project.foodredistribution.repository.FoodProviderRepository;
import com.project.foodredistribution.repository.ZoneRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.context.annotation.Lazy;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class FoodListingService {

    private final FoodListingRepository foodListingRepository;
    private final FoodProviderRepository foodProviderRepository;
    private final ZoneRepository zoneRepository;
    private final DeliveryTaskService deliveryTaskService;
    private final AuditLogService auditLogService;
    private final com.project.foodredistribution.websocket.LiveTrackingWebSocketHandler webSocketHandler;

    public FoodListingService(FoodListingRepository foodListingRepository,
                              FoodProviderRepository foodProviderRepository,
                              ZoneRepository zoneRepository,
                              @Lazy DeliveryTaskService deliveryTaskService,
                              AuditLogService auditLogService,
                              com.project.foodredistribution.websocket.LiveTrackingWebSocketHandler webSocketHandler) {
        this.foodListingRepository = foodListingRepository;
        this.foodProviderRepository = foodProviderRepository;
        this.zoneRepository = zoneRepository;
        this.deliveryTaskService = deliveryTaskService;
        this.auditLogService = auditLogService;
        this.webSocketHandler = webSocketHandler;
    }

    @Transactional
    public FoodListing createFoodListing(FoodListing foodListing, String providerEmail) {
        FoodProvider provider = foodProviderRepository.findByUserEmail(providerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Food Provider not found for email: " + providerEmail));

        // Validations
        if (foodListing.getFoodName() == null || foodListing.getFoodName().trim().isEmpty()) {
            throw new IllegalArgumentException("Food name cannot be empty");
        }
        if (foodListing.getQuantity() == null || foodListing.getQuantity() <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than 0");
        }
        if (foodListing.getPreparationTime() == null) {
            throw new IllegalArgumentException("Preparation time is required");
        }
        if (foodListing.getExpiryTime() == null) {
            // Default 3 hours if not specified
            foodListing.setExpiryTime(foodListing.getPreparationTime().plusHours(3));
        }
        if (foodListing.getExpiryTime().isBefore(foodListing.getPreparationTime())) {
            throw new IllegalArgumentException("Expiry time cannot be before preparation time");
        }

        // Fetch and map Destination Zone
        if (foodListing.getDestinationZone() == null || foodListing.getDestinationZone().getId() == null) {
            throw new IllegalArgumentException("Destination zone is required");
        }
        UUID zoneId = foodListing.getDestinationZone().getId();
        Zone zone = zoneRepository.findById(zoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Destination zone not found: " + zoneId));

        foodListing.setProvider(provider);
        foodListing.setDestinationZone(zone);
        foodListing.setDestinationAddress(zone.getAddress());
        foodListing.setDestinationLatitude(zone.getLatitude());
        foodListing.setDestinationLongitude(zone.getLongitude());

        if (foodListing.getPickupAddress() == null || foodListing.getPickupAddress().trim().isEmpty()) {
            foodListing.setPickupAddress(provider.getAddress());
        }
        if (foodListing.getPickupLatitude() == null || foodListing.getPickupLatitude() == 0.0) {
            foodListing.setPickupLatitude(provider.getLatitude());
        }
        if (foodListing.getPickupLongitude() == null || foodListing.getPickupLongitude() == 0.0) {
            foodListing.setPickupLongitude(provider.getLongitude());
        }

        // Validate Coordinates range
        if (foodListing.getPickupLatitude() < -90.0 || foodListing.getPickupLatitude() > 90.0 ||
            foodListing.getPickupLongitude() < -180.0 || foodListing.getPickupLongitude() > 180.0) {
            throw new IllegalArgumentException("Invalid GPS coordinates");
        }

        foodListing.setStatus("AVAILABLE");
        foodListing.setCreatedAt(LocalDateTime.now());

        FoodListing saved = foodListingRepository.save(foodListing);

        // Immediately create a Proposed DeliveryTask
        DeliveryTask task = deliveryTaskService.createProposedTask(
                saved.getId(),
                zone.getId(),
                null, // No route initially
                0.0,  // Base deviation
                100.0 // Match score
        );

        // Audit Log
        auditLogService.log(
                provider.getUser().getEmail(),
                "PROVIDER",
                "FOOD_CREATED",
                "FoodListing",
                saved.getId().toString(),
                String.format("Created food listing: %s, quantity: %s %s, prepared at: %s, expiry: %s",
                        saved.getFoodName(), saved.getQuantity(), saved.getUnit(), saved.getPreparationTime(), saved.getExpiryTime())
        );

        // Broadcast WebSocket Event
        try {
            String jsonPayload = String.format(
                "{\"taskId\":\"%s\",\"foodListingId\":\"%s\",\"restaurantName\":\"%s\",\"foodType\":\"%s\",\"quantity\":%f,\"pickupLocation\":\"%s\",\"destination\":\"%s\",\"expiryTime\":\"%s\"}",
                task.getId(), saved.getId(), provider.getBusinessName(), saved.getFoodName(), saved.getQuantity(),
                saved.getPickupAddress(), zone.getName(), saved.getExpiryTime().toString()
            );
            webSocketHandler.broadcastUpdate("FOOD_MATCH_FOUND", jsonPayload);
        } catch (Exception wsEx) {
            // Log warning but do not fail creation
            org.slf4j.LoggerFactory.getLogger(FoodListingService.class).warn("Failed to broadcast WebSocket match event", wsEx);
        }

        return saved;
    }

    public FoodListing getById(UUID id) {
        return foodListingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Food listing not found: " + id));
    }

    public List<FoodListing> getAllListings() {
        return foodListingRepository.findAll();
    }

    @Transactional
    public List<FoodListing> getAvailableListings() {
        LocalDateTime now = LocalDateTime.now();
        List<FoodListing> listings = foodListingRepository.findByStatus("AVAILABLE");
        boolean changed = false;
        for (FoodListing listing : listings) {
            if (listing.getExpiryTime() != null && listing.getExpiryTime().isBefore(now)) {
                listing.setStatus("EXPIRED");
                foodListingRepository.save(listing);
                changed = true;
            }
        }
        if (changed) {
            return foodListingRepository.findByStatus("AVAILABLE");
        }
        return listings;
    }

    public List<FoodListing> getListingsByProvider(String providerEmail) {
        return foodListingRepository.findByProviderUserEmail(providerEmail);
    }

    @Transactional
    public FoodListing cancelListing(UUID id, String providerEmail) {
        FoodListing listing = getById(id);
        if (!listing.getProvider().getUser().getEmail().equals(providerEmail)) {
            throw new org.springframework.security.access.AccessDeniedException("Unauthorized access to listing");
        }
        listing.setStatus("CANCELLED");
        FoodListing saved = foodListingRepository.save(listing);

        // Audit Log
        auditLogService.log(
                providerEmail,
                "PROVIDER",
                "FOOD_CANCELLED",
                "FoodListing",
                saved.getId().toString(),
                String.format("Cancelled food listing: %s", saved.getFoodName())
        );

        return saved;
    }

    // Cron job to run every 1 minute to check for expired listings
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void sweepExpiredListings() {
        LocalDateTime now = LocalDateTime.now();
        List<FoodListing> activeListings = foodListingRepository.findAll();
        for (FoodListing listing : activeListings) {
            if (("AVAILABLE".equals(listing.getStatus()) || "MATCHED".equals(listing.getStatus())) 
                && listing.getExpiryTime().isBefore(now)) {
                listing.setStatus("EXPIRED");
                foodListingRepository.save(listing);

                // Audit Log
                auditLogService.log(
                        "system",
                        "SYSTEM",
                        "FOOD_EXPIRED",
                        "FoodListing",
                        listing.getId().toString(),
                        String.format("Listing expired: %s, expiry was: %s", listing.getFoodName(), listing.getExpiryTime())
                );
            }
        }
    }
}

package com.project.foodredistribution.service;

import com.project.foodredistribution.config.SessionConfig;
import com.project.foodredistribution.entity.FoodListing;
import com.project.foodredistribution.entity.FoodProvider;
import com.project.foodredistribution.entity.DistributionSession;
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

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
public class FoodListingService {

    private final FoodListingRepository foodListingRepository;
    private final FoodProviderRepository foodProviderRepository;
    private final ZoneRepository zoneRepository;
    private final DeliveryTaskService deliveryTaskService;
    private final AuditLogService auditLogService;
    private final SessionConfig sessionConfig;
    private final com.project.foodredistribution.websocket.LiveTrackingWebSocketHandler webSocketHandler;

    public FoodListingService(FoodListingRepository foodListingRepository,
                              FoodProviderRepository foodProviderRepository,
                              ZoneRepository zoneRepository,
                              @Lazy DeliveryTaskService deliveryTaskService,
                              AuditLogService auditLogService,
                              SessionConfig sessionConfig,
                              com.project.foodredistribution.websocket.LiveTrackingWebSocketHandler webSocketHandler) {
        this.foodListingRepository = foodListingRepository;
        this.foodProviderRepository = foodProviderRepository;
        this.zoneRepository = zoneRepository;
        this.deliveryTaskService = deliveryTaskService;
        this.auditLogService = auditLogService;
        this.sessionConfig = sessionConfig;
        this.webSocketHandler = webSocketHandler;
    }

    private LocalDate getTargetSessionDate(DistributionSession session, Instant now, ZoneId zoneId) {
        ZonedDateTime localNow = ZonedDateTime.ofInstant(now, zoneId);
        LocalTime sessionEnd = (session == DistributionSession.AFTERNOON) 
            ? sessionConfig.getAfternoonEndTime() 
            : sessionConfig.getNightEndTime();
        
        if (localNow.toLocalTime().isAfter(sessionEnd)) {
            return localNow.toLocalDate().plusDays(1);
        } else {
            return localNow.toLocalDate();
        }
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
        if (foodListing.getDistributionSession() == null) {
            java.time.ZonedDateTime prepZoned = foodListing.getPreparationTime().atZone(sessionConfig.getZoneId());
            int hour = prepZoned.getHour();
            if (hour < 15) {
                foodListing.setDistributionSession(DistributionSession.AFTERNOON);
            } else {
                foodListing.setDistributionSession(DistributionSession.NIGHT);
            }
        }

        // Expiry calculation
        if (foodListing.getSafeConsumptionHours() == null || foodListing.getSafeConsumptionHours() <= 0) {
            foodListing.setSafeConsumptionHours(3); // Default to 3 hours
        }
        Instant expiryTime = foodListing.getPreparationTime().plus(Duration.ofHours(foodListing.getSafeConsumptionHours()));
        foodListing.setExpiryTime(expiryTime);

        if (foodListing.getExpiryTime().isBefore(foodListing.getPreparationTime())) {
            throw new IllegalArgumentException("Expiry time cannot be before preparation time");
        }

        // Calculate session availability bounds
        Instant now = Instant.now();
        LocalDate targetDate = getTargetSessionDate(foodListing.getDistributionSession(), now, sessionConfig.getZoneId());
        Instant availableFrom = sessionConfig.getSessionStart(foodListing.getDistributionSession(), targetDate);
        Instant availableUntil = sessionConfig.getSessionEnd(foodListing.getDistributionSession(), targetDate);

        foodListing.setAvailableFrom(availableFrom);
        foodListing.setAvailableUntil(availableUntil);

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

        // Default status
        if (foodListing.getStatus() == null) {
            if (now.isBefore(availableFrom)) {
                foodListing.setStatus("SCHEDULED");
            } else {
                foodListing.setStatus("AVAILABLE");
            }
        }
        foodListing.setCreatedAt(now);

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
                String.format("Created food listing: %s, quantity: %s %s, prepared at: %s, expiry: %s, status: %s",
                        saved.getFoodName(), saved.getQuantity(), saved.getUnit(), saved.getPreparationTime(), saved.getExpiryTime(), saved.getStatus())
        );

        // Broadcast WebSocket Event if active
        if ("AVAILABLE".equals(saved.getStatus())) {
            try {
                String jsonPayload = String.format(
                    "{\"taskId\":\"%s\",\"foodListingId\":\"%s\",\"restaurantName\":\"%s\",\"foodType\":\"%s\",\"quantity\":%f,\"pickupLocation\":\"%s\",\"destination\":\"%s\",\"expiryTime\":\"%s\"}",
                    task.getId(), saved.getId(), provider.getBusinessName(), saved.getFoodName(), saved.getQuantity(),
                    saved.getPickupAddress(), zone.getName(), saved.getExpiryTime().toString()
                );
                webSocketHandler.broadcastUpdate("FOOD_MATCH_FOUND", jsonPayload);
            } catch (Exception wsEx) {
                org.slf4j.LoggerFactory.getLogger(FoodListingService.class).warn("Failed to broadcast WebSocket match event", wsEx);
            }
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
        Instant now = Instant.now();
        List<FoodListing> listings = foodListingRepository.findByStatus("AVAILABLE");
        boolean changed = false;
        for (FoodListing listing : listings) {
            if (listing.getEffectiveAvailableUntil() != null && listing.getEffectiveAvailableUntil().isBefore(now)) {
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

    // Cron job to run every 1 minute to check for expired or start-scheduled listings
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void sweepExpiredListings() {
        Instant now = Instant.now();
        List<FoodListing> activeListings = foodListingRepository.findAll();
        for (FoodListing listing : activeListings) {
            // Activate scheduled listings
            if ("SCHEDULED".equals(listing.getStatus()) && listing.getAvailableFrom() != null && !now.isBefore(listing.getAvailableFrom())) {
                listing.setStatus("AVAILABLE");
                foodListingRepository.save(listing);
                
                // Audit Log
                auditLogService.log(
                        "system",
                        "SYSTEM",
                        "FOOD_ACTIVATED",
                        "FoodListing",
                        listing.getId().toString(),
                        String.format("Listing activated: %s, was scheduled for: %s", listing.getFoodName(), listing.getAvailableFrom())
                );

                // Broadcast
                try {
                    java.util.Optional<DeliveryTask> existing = deliveryTaskService.getAllTasks().stream()
                            .filter(t -> t.getFoodListing().getId().equals(listing.getId()))
                            .findFirst();
                    String taskId = existing.isPresent() ? existing.get().getId().toString() : "";
                    String jsonPayload = String.format(
                        "{\"taskId\":\"%s\",\"foodListingId\":\"%s\",\"restaurantName\":\"%s\",\"foodType\":\"%s\",\"quantity\":%f,\"pickupLocation\":\"%s\",\"destination\":\"%s\",\"expiryTime\":\"%s\"}",
                        taskId, listing.getId(), listing.getProvider().getBusinessName(), listing.getFoodName(), listing.getQuantity(),
                        listing.getPickupAddress(), listing.getDestinationZone().getName(), listing.getExpiryTime().toString()
                    );
                    webSocketHandler.broadcastUpdate("FOOD_MATCH_FOUND", jsonPayload);
                } catch (Exception e) {
                    // ignore ws err
                }
            }
            // Expire SCHEDULED or AVAILABLE listings
            else if (("AVAILABLE".equals(listing.getStatus()) || "SCHEDULED".equals(listing.getStatus())) 
                && listing.getEffectiveAvailableUntil() != null && listing.getEffectiveAvailableUntil().isBefore(now)) {
                listing.setStatus("EXPIRED");
                foodListingRepository.save(listing);

                // Audit Log
                auditLogService.log(
                        "system",
                        "SYSTEM",
                        "FOOD_EXPIRED",
                        "FoodListing",
                        listing.getId().toString(),
                        String.format("Listing expired: %s, effective expiry was: %s", listing.getFoodName(), listing.getEffectiveAvailableUntil())
                );
            }
        }
    }
}

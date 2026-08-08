package com.project.foodredistribution.service;

import com.project.foodredistribution.entity.FoodListing;
import com.project.foodredistribution.entity.FoodProvider;
import com.project.foodredistribution.entity.User;
import com.project.foodredistribution.exception.ResourceNotFoundException;
import com.project.foodredistribution.repository.FoodListingRepository;
import com.project.foodredistribution.repository.FoodProviderRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class FoodListingService {

    private final FoodListingRepository foodListingRepository;
    private final FoodProviderRepository foodProviderRepository;

    public FoodListingService(FoodListingRepository foodListingRepository,
                              FoodProviderRepository foodProviderRepository) {
        this.foodListingRepository = foodListingRepository;
        this.foodProviderRepository = foodProviderRepository;
    }

    public FoodListing createFoodListing(FoodListing foodListing, String providerEmail) {
        FoodProvider provider = foodProviderRepository.findByUserEmail(providerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Food Provider not found for email: " + providerEmail));

        foodListing.setProvider(provider);
        foodListing.setPickupAddress(provider.getAddress());
        foodListing.setPickupLatitude(provider.getLatitude());
        foodListing.setPickupLongitude(provider.getLongitude());
        foodListing.setStatus("AVAILABLE");
        foodListing.setCreatedAt(LocalDateTime.now());
        
        // Expiry validation: calculate expiry time based on preparation time + consumption window
        if (foodListing.getExpiryTime() == null) {
            // Default 3 hours if not specified
            foodListing.setExpiryTime(foodListing.getPreparationTime().plusHours(3));
        }

        return foodListingRepository.save(foodListing);
    }

    public FoodListing getById(UUID id) {
        return foodListingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Food listing not found: " + id));
    }

    public List<FoodListing> getAllListings() {
        return foodListingRepository.findAll();
    }

    public List<FoodListing> getAvailableListings() {
        return foodListingRepository.findByStatus("AVAILABLE");
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
        return foodListingRepository.save(listing);
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
            }
        }
    }
}

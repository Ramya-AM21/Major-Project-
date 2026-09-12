package com.project.foodredistribution.controller;

import com.project.foodredistribution.entity.FoodProvider;
import com.project.foodredistribution.exception.ResourceNotFoundException;
import com.project.foodredistribution.repository.FoodProviderRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/provider", "/api/provider"})
@CrossOrigin(origins = "*")
public class ProviderController {

    private final FoodProviderRepository foodProviderRepository;

    public ProviderController(FoodProviderRepository foodProviderRepository) {
        this.foodProviderRepository = foodProviderRepository;
    }

    @GetMapping("/profile")
    @PreAuthorize("hasAnyRole('PROVIDER', 'INDIVIDUAL_DONOR')")
    public ResponseEntity<Map<String, Object>> getProviderProfile(Principal principal) {
        FoodProvider provider = foodProviderRepository.findByUserEmail(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Food Provider profile not found for user: " + principal.getName()));

        Map<String, Object> response = buildProviderProfileResponse(provider);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/pickup-location")
    @PreAuthorize("hasAnyRole('PROVIDER', 'INDIVIDUAL_DONOR')")
    public ResponseEntity<Map<String, Object>> updatePickupLocation(
            @RequestBody Map<String, Object> locationData,
            Principal principal) {

        FoodProvider provider = foodProviderRepository.findByUserEmail(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Food Provider profile not found for user: " + principal.getName()));

        String address = locationData.get("address") != null ? locationData.get("address").toString().trim() : null;
        Object latObj = locationData.get("latitude");
        Object lngObj = locationData.get("longitude");

        if (address == null || address.isEmpty()) {
            throw new IllegalArgumentException("Pickup address cannot be empty");
        }
        if (latObj == null || lngObj == null) {
            throw new IllegalArgumentException("Latitude and longitude are required");
        }

        Double latitude;
        Double longitude;
        try {
            latitude = Double.parseDouble(latObj.toString());
            longitude = Double.parseDouble(lngObj.toString());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Latitude and longitude must be valid numerical values");
        }

        if (latitude < -90.0 || latitude > 90.0) {
            throw new IllegalArgumentException("Latitude must be between -90 and +90 degrees");
        }
        if (longitude < -180.0 || longitude > 180.0) {
            throw new IllegalArgumentException("Longitude must be between -180 and +180 degrees");
        }

        provider.setAddress(address);
        provider.setLatitude(latitude);
        provider.setLongitude(longitude);

        FoodProvider updated = foodProviderRepository.save(provider);
        return ResponseEntity.ok(buildProviderProfileResponse(updated));
    }

    private Map<String, Object> buildProviderProfileResponse(FoodProvider provider) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", provider.getId());
        map.put("businessName", provider.getBusinessName());
        map.put("address", provider.getAddress());
        map.put("latitude", provider.getLatitude());
        map.put("longitude", provider.getLongitude());
        map.put("pickupAddress", provider.getAddress());
        map.put("pickupLatitude", provider.getLatitude());
        map.put("pickupLongitude", provider.getLongitude());
        map.put("licenseNumber", provider.getLicenseNumber());
        map.put("verificationStatus", provider.getVerificationStatus());
        if (provider.getUser() != null) {
            map.put("userId", provider.getUser().getId());
            map.put("name", provider.getUser().getName());
            map.put("email", provider.getUser().getEmail());
            map.put("phone", provider.getUser().getPhone());
        }
        return map;
    }
}

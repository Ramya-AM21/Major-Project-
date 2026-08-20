package com.project.foodredistribution.controller;

import com.project.foodredistribution.entity.FoodListing;
import com.project.foodredistribution.service.FoodListingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/v1/food", "/api/food-listings"})
@CrossOrigin(origins = "*")
public class FoodListingController {

    private final FoodListingService foodListingService;

    public FoodListingController(FoodListingService foodListingService) {
        this.foodListingService = foodListingService;
    }

    @PostMapping
    @PreAuthorize("hasRole('PROVIDER')")
    public ResponseEntity<FoodListing> createFoodListing(@RequestBody FoodListing foodListing, Principal principal) {
        FoodListing created = foodListingService.createFoodListing(foodListing, principal.getName());
        return ResponseEntity.ok(created);
    }

    @GetMapping
    public ResponseEntity<List<FoodListing>> getAllListings() {
        return ResponseEntity.ok(foodListingService.getAllListings());
    }

    @GetMapping("/available")
    public ResponseEntity<List<FoodListing>> getAvailableListings() {
        return ResponseEntity.ok(foodListingService.getAvailableListings());
    }

    @GetMapping("/provider")
    @PreAuthorize("hasRole('PROVIDER')")
    public ResponseEntity<List<FoodListing>> getProviderListings(Principal principal) {
        return ResponseEntity.ok(foodListingService.getListingsByProvider(principal.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FoodListing> getListingById(@PathVariable UUID id) {
        return ResponseEntity.ok(foodListingService.getById(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('PROVIDER')")
    public ResponseEntity<FoodListing> cancelListing(@PathVariable UUID id, Principal principal) {
        FoodListing cancelled = foodListingService.cancelListing(id, principal.getName());
        return ResponseEntity.ok(cancelled);
    }

    @PostMapping("/analyze-image")
    @PreAuthorize("hasRole('PROVIDER')")
    public ResponseEntity<java.util.Map<String, Object>> analyzeFoodImage(
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file cannot be empty");
        }
        
        try {
            byte[] bytes = file.getBytes();
            String filename = file.getOriginalFilename();
            if (filename == null) {
                filename = "food_image.png";
            }
            
            java.util.Map<String, Object> analysisResult = foodListingService.analyzeFoodImage(bytes, filename);
            return ResponseEntity.ok(analysisResult);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Failed to read food photo bytes", e);
        }
    }
}

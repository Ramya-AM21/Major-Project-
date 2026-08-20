package com.project.foodredistribution.controller;

import com.project.foodredistribution.service.FoodListingService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.Map;

@RestController
@RequestMapping("/api/provider/food")
@CrossOrigin(origins = "*")
public class ProviderFoodController {

    private final FoodListingService foodListingService;

    public ProviderFoodController(FoodListingService foodListingService) {
        this.foodListingService = foodListingService;
    }

    @PostMapping("/analyze-image")
    @PreAuthorize("hasRole('PROVIDER')")
    public ResponseEntity<Map<String, Object>> analyzeFoodImage(
            @RequestParam("image") MultipartFile file,
            @RequestParam(value = "providerFoodDetails", required = false) String providerFoodDetailsJson) {
        
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file cannot be empty");
        }
        
        // Validate MIME type (jpg, jpeg, png, webp)
        String contentType = file.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png") 
                && !contentType.equals("image/webp") && !contentType.equals("image/jpg"))) {
            throw new IllegalArgumentException("Unsupported file type: " + contentType);
        }
        
        // Validate size (10MB limit)
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new IllegalArgumentException("File size exceeds limit of 10MB");
        }

        try {
            byte[] bytes = file.getBytes();
            String filename = file.getOriginalFilename();
            if (filename == null) {
                filename = "food_image.png";
            }
            
            // Reuses foodListingService's analyzeFoodImage to get raw AI service analysis results
            Map<String, Object> rawAnalysis = foodListingService.analyzeFoodImage(bytes, filename);
            
            // Merges AI output with provider manual details
            Map<String, Object> mergedResult = foodListingService.mergeAiAndProviderData(rawAnalysis, providerFoodDetailsJson);
            
            return ResponseEntity.ok(mergedResult);
        } catch (java.io.IOException e) {
            throw new RuntimeException("Failed to read food photo bytes", e);
        }
    }
}

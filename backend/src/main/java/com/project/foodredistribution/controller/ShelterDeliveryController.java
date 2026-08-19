package com.project.foodredistribution.controller;

import com.project.foodredistribution.entity.DeliveryAssignment;
import com.project.foodredistribution.entity.FoodRequirement;
import com.project.foodredistribution.entity.Shelter;
import com.project.foodredistribution.service.ShelterDeliveryService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@CrossOrigin(origins = "*")
public class ShelterDeliveryController {

    private final ShelterDeliveryService shelterDeliveryService;

    public ShelterDeliveryController(ShelterDeliveryService shelterDeliveryService) {
        this.shelterDeliveryService = shelterDeliveryService;
    }

    // --- Coordinator Endpoints ---

    @PostMapping("/coordinator/shelters")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<Shelter> createShelter(
            @RequestParam("name") String name,
            @RequestParam("shelterType") String shelterType,
            @RequestParam("city") String city,
            @RequestParam("area") String area,
            @RequestParam("address") String address,
            @RequestParam("contactName") String contactName,
            @RequestParam("contactPhone") String contactPhone,
            @RequestParam("latitude") Double latitude,
            @RequestParam("longitude") Double longitude,
            @RequestParam(value = "file", required = false) MultipartFile file,
            Principal principal) throws IOException {

        byte[] proofBytes = null;
        String proofFilename = null;
        if (file != null && !file.isEmpty()) {
            proofBytes = file.getBytes();
            proofFilename = file.getOriginalFilename();
        }

        Shelter shelter = shelterDeliveryService.createShelter(
                name, shelterType, city, area, address, contactName, contactPhone,
                latitude, longitude, proofBytes, proofFilename, principal.getName()
        );
        return ResponseEntity.ok(shelter);
    }

    @GetMapping("/coordinator/shelters")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<List<Shelter>> getCoordinatorShelters(Principal principal) {
        List<Shelter> shelters = shelterDeliveryService.getCoordinatorShelters(principal.getName());
        return ResponseEntity.ok(shelters);
    }

    @PostMapping("/coordinator/requirements")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<FoodRequirement> createRequirement(
            @RequestBody Map<String, Object> payload,
            Principal principal) {

        UUID shelterId = UUID.fromString((String) payload.get("shelterId"));
        String foodType = (String) payload.get("foodType");
        Double quantity = Double.valueOf(payload.get("quantityRequired").toString());
        String unit = (String) payload.get("unit");
        Integer peopleToServe = Integer.valueOf(payload.get("peopleToServe").toString());
        String additionalRequirements = (String) payload.get("additionalRequirements");
        String dietaryNotes = (String) payload.get("dietaryNotes");
        
        // Parse date
        LocalDateTime requiredDate = LocalDateTime.parse(payload.get("requiredDate").toString(), DateTimeFormatter.ISO_DATE_TIME);
        String startTime = (String) payload.get("deliveryStartTime");
        String endTime = (String) payload.get("deliveryEndTime");
        String priority = (String) payload.get("priority");
        String instructions = (String) payload.get("instructions");
        String accessibilityInfo = (String) payload.get("accessibilityInfo");
        String emergencyNotes = (String) payload.get("emergencyNotes");

        FoodRequirement req = shelterDeliveryService.createRequirement(
                shelterId, foodType, quantity, unit, peopleToServe, additionalRequirements,
                dietaryNotes, requiredDate, startTime, endTime, priority, instructions,
                accessibilityInfo, emergencyNotes, principal.getName()
        );
        return ResponseEntity.ok(req);
    }

    @GetMapping("/coordinator/requirements")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<List<FoodRequirement>> getCoordinatorRequirements(Principal principal) {
        List<FoodRequirement> list = shelterDeliveryService.getCoordinatorRequirements(principal.getName());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/coordinator/requirements/{id}")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<FoodRequirement> getRequirementById(@PathVariable UUID id) {
        FoodRequirement req = shelterDeliveryService.getRequirementById(id);
        return ResponseEntity.ok(req);
    }

    @GetMapping("/coordinator/deliveries")
    @PreAuthorize("hasRole('COORDINATOR')")
    public ResponseEntity<List<DeliveryAssignment>> getCoordinatorDeliveries(Principal principal) {
        List<DeliveryAssignment> list = shelterDeliveryService.getCoordinatorDeliveries(principal.getName());
        return ResponseEntity.ok(list);
    }

    // --- Admin Endpoints ---

    @GetMapping("/admin/shelters/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Shelter>> getPendingShelters() {
        List<Shelter> shelters = shelterDeliveryService.getPendingShelters();
        return ResponseEntity.ok(shelters);
    }

    @PostMapping("/admin/shelters/{id}/verify")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Shelter> verifyShelter(@PathVariable UUID id, Principal principal) {
        Shelter verified = shelterDeliveryService.verifyShelter(id, principal.getName());
        return ResponseEntity.ok(verified);
    }

    @PostMapping("/admin/shelters/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Shelter> rejectShelter(
            @PathVariable UUID id,
            @RequestBody Map<String, String> payload,
            Principal principal) {
        String reason = payload.getOrDefault("reason", "Verification documents incomplete or invalid");
        Shelter rejected = shelterDeliveryService.rejectShelter(id, reason, principal.getName());
        return ResponseEntity.ok(rejected);
    }

    // --- Volunteer Endpoints ---

    @GetMapping("/volunteer/available-deliveries")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<List<Map<String, Object>>> getAvailableDeliveries(
            @RequestParam(value = "city", required = false) String city,
            @RequestParam(value = "volunteerLat", required = false) Double volunteerLat,
            @RequestParam(value = "volunteerLng", required = false) Double volunteerLng) {
        List<Map<String, Object>> deliveries = shelterDeliveryService.getAvailableDeliveries(city, volunteerLat, volunteerLng);
        return ResponseEntity.ok(deliveries);
    }

    @PostMapping("/volunteer/deliveries/{id}/accept")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<DeliveryAssignment> acceptDelivery(@PathVariable UUID id, Principal principal) {
        DeliveryAssignment assignment = shelterDeliveryService.acceptDelivery(id, principal.getName());
        return ResponseEntity.ok(assignment);
    }

    @PostMapping("/volunteer/deliveries/{id}/start")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<DeliveryAssignment> startDelivery(
            @PathVariable UUID id,
            @RequestBody Map<String, Double> payload,
            Principal principal) {
        Double currentLat = payload.get("currentLat");
        Double currentLng = payload.get("currentLng");
        DeliveryAssignment started = shelterDeliveryService.startDelivery(id, principal.getName(), currentLat, currentLng);
        return ResponseEntity.ok(started);
    }

    @PostMapping("/volunteer/deliveries/{id}/arrive")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<DeliveryAssignment> arriveDelivery(
            @PathVariable UUID id,
            @RequestBody Map<String, Double> payload,
            Principal principal) {
        Double currentLat = payload.get("currentLat");
        Double currentLng = payload.get("currentLng");
        DeliveryAssignment arrived = shelterDeliveryService.arriveDelivery(id, principal.getName(), currentLat, currentLng);
        return ResponseEntity.ok(arrived);
    }

    @PostMapping("/volunteer/deliveries/{id}/verify-otp")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<DeliveryAssignment> verifyOtp(
            @PathVariable UUID id,
            @RequestBody Map<String, String> payload,
            Principal principal) {
        String otp = payload.get("otp");
        DeliveryAssignment verified = shelterDeliveryService.verifyOtp(id, principal.getName(), otp);
        return ResponseEntity.ok(verified);
    }

    @PostMapping("/volunteer/deliveries/{id}/proof")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<DeliveryAssignment> uploadProof(
            @PathVariable UUID id,
            @RequestParam("file") MultipartFile file,
            @RequestParam("latitude") Double latitude,
            @RequestParam("longitude") Double longitude,
            Principal principal) throws IOException {
        DeliveryAssignment proof = shelterDeliveryService.uploadProof(
                id, principal.getName(), file.getBytes(), file.getOriginalFilename(), latitude, longitude
        );
        return ResponseEntity.ok(proof);
    }

    @PostMapping("/volunteer/deliveries/{id}/complete")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<DeliveryAssignment> completeDelivery(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> payload,
            Principal principal) {
        Double actualQuantity = Double.valueOf(payload.get("actualQuantity").toString());
        String reason = (String) payload.get("reason");
        String representativeName = (String) payload.get("representativeName");
        String representativePhone = (String) payload.get("representativePhone");
        String digitalSignature = (String) payload.get("digitalSignature");

        DeliveryAssignment completed = shelterDeliveryService.completeDelivery(
                id, principal.getName(), actualQuantity, reason,
                representativeName, representativePhone, digitalSignature
        );
        return ResponseEntity.ok(completed);
    }

    @GetMapping("/volunteer/deliveries")
    @PreAuthorize("hasRole('VOLUNTEER')")
    public ResponseEntity<List<DeliveryAssignment>> getVolunteerDeliveries(Principal principal) {
        List<DeliveryAssignment> list = shelterDeliveryService.getVolunteerDeliveries(principal.getName());
        return ResponseEntity.ok(list);
    }
}

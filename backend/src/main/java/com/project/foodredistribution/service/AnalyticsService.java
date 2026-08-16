package com.project.foodredistribution.service;

import com.project.foodredistribution.dto.AdminAnalyticsDto;
import com.project.foodredistribution.dto.CoordinatorAnalyticsDto;
import com.project.foodredistribution.dto.ProviderAnalyticsDto;
import com.project.foodredistribution.dto.VolunteerAnalyticsDto;
import com.project.foodredistribution.entity.*;
import com.project.foodredistribution.exception.ResourceNotFoundException;
import com.project.foodredistribution.repository.*;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class AnalyticsService {

    private final FoodListingRepository foodListingRepository;
    private final DeliveryTaskRepository deliveryTaskRepository;
    private final VolunteerRepository volunteerRepository;
    private final ZoneRepository zoneRepository;
    private final VerificationRepository verificationRepository;

    public AnalyticsService(FoodListingRepository foodListingRepository,
                            DeliveryTaskRepository deliveryTaskRepository,
                            VolunteerRepository volunteerRepository,
                            ZoneRepository zoneRepository,
                            VerificationRepository verificationRepository) {
        this.foodListingRepository = foodListingRepository;
        this.deliveryTaskRepository = deliveryTaskRepository;
        this.volunteerRepository = volunteerRepository;
        this.zoneRepository = zoneRepository;
        this.verificationRepository = verificationRepository;
    }

    public ProviderAnalyticsDto getProviderAnalytics(String email) {
        List<FoodListing> listings = foodListingRepository.findByProviderUserEmail(email);
        
        long active = 0, awaiting = 0, transit = 0, completed = 0;
        double meals = 0, kg = 0;
        
        for (FoodListing fl : listings) {
            String status = fl.getStatus();
            if ("AVAILABLE".equals(status)) {
                active++;
            } else if ("MATCHED".equals(status)) {
                awaiting++;
            } else if ("IN_TRANSIT".equals(status)) {
                transit++;
            } else if ("DELIVERED".equals(status) || "COMPLETED".equals(status)) {
                completed++;
                
                double q = fl.getQuantity() != null ? fl.getQuantity() : 0.0;
                if ("KG".equalsIgnoreCase(fl.getUnit())) {
                    kg += q;
                    meals += q * 2.5; // conversion estimate: 1kg = 2.5 meals
                } else {
                    meals += q;
                    kg += q / 2.5;
                }
            }
        }
        
        ProviderAnalyticsDto dto = new ProviderAnalyticsDto();
        dto.setActiveListingsCount(active);
        dto.setAwaitingPickupCount(awaiting);
        dto.setInTransitCount(transit);
        dto.setCompletedCount(completed);
        dto.setMealsRedirected(Math.round(meals * 10.0) / 10.0);
        dto.setKgFoodSaved(Math.round(kg * 10.0) / 10.0);
        dto.setDisposalAvoidedCost(Math.round(kg * 18.0 * 100.0) / 100.0); // Estimate $18 saved per kg of waste avoided
        return dto;
    }

    public VolunteerAnalyticsDto getVolunteerAnalytics(String email) {
        Volunteer volunteer = volunteerRepository.findByUserEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Volunteer not found"));

        List<DeliveryTask> tasks = deliveryTaskRepository.findByVolunteerId(volunteer.getId());
        double meals = 0.0;
        for (DeliveryTask t : tasks) {
            if ("COMPLETED".equals(t.getStatus())) {
                FoodListing fl = t.getFoodListing();
                if (fl != null) {
                    double q = fl.getQuantity() != null ? fl.getQuantity() : 0.0;
                    if ("KG".equalsIgnoreCase(fl.getUnit())) {
                        meals += q * 2.5;
                    } else {
                        meals += q;
                    }
                }
            }
        }

        VolunteerAnalyticsDto dto = new VolunteerAnalyticsDto();
        dto.setRating(volunteer.getRating());
        dto.setCompletedDeliveries(volunteer.getTotalDeliveries());
        dto.setSuccessfulDeliveries(volunteer.getSuccessfulDeliveries());
        dto.setReliabilityScore(volunteer.getReliabilityScore());
        dto.setMealsDelivered(meals);
        dto.setTokens(volunteer.getBalanceTokens() != null ? volunteer.getBalanceTokens() : 0);
        return dto;
    }

    public CoordinatorAnalyticsDto getCoordinatorAnalytics(UUID zoneId) {
        Zone zone = zoneRepository.findById(zoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Zone not found"));

        List<DeliveryTask> tasks = deliveryTaskRepository.findByZoneId(zoneId);
        
        long expected = 0;
        long received = 0;
        long pending = 0;
        double mealsReceivedToday = 0;

        for (DeliveryTask t : tasks) {
            String status = t.getStatus();
            if ("ACCEPTED".equals(status)) {
                expected++;
            } else if ("IN_TRANSIT".equals(status)) {
                expected++;
                pending++;
            } else if ("COMPLETED".equals(status) || "DELIVERED".equals(status)) {
                received++;
                
                FoodListing fl = t.getFoodListing();
                if (fl != null) {
                    double q = fl.getQuantity() != null ? fl.getQuantity() : 0.0;
                    if ("KG".equalsIgnoreCase(fl.getUnit())) {
                        mealsReceivedToday += q * 2.5;
                    } else {
                        mealsReceivedToday += q;
                    }
                }
            }
        }

        CoordinatorAnalyticsDto dto = new CoordinatorAnalyticsDto();
        dto.setExpectedToday(expected);
        dto.setReceivedToday(received);
        dto.setPendingConfirmations(pending);
        
        int capacity = zone.getCapacity();
        dto.setAvailableCapacity(Math.max(0, capacity - (int) mealsReceivedToday));
        
        return dto;
    }

    public AdminAnalyticsDto getAdminAnalytics() {
        long activeDonations = foodListingRepository.findByStatus("AVAILABLE").size();
        
        long activeDeliveries = 0;
        long completedToday = 0;
        double totalMeals = 0;
        double totalKg = 0;
        
        List<DeliveryTask> allTasks = deliveryTaskRepository.findAll();
        for (DeliveryTask t : allTasks) {
            String status = t.getStatus();
            if ("ACCEPTED".equals(status) || "IN_TRANSIT".equals(status)) {
                activeDeliveries++;
            } else if ("COMPLETED".equals(status)) {
                completedToday++;
                
                FoodListing fl = t.getFoodListing();
                if (fl != null) {
                    double q = fl.getQuantity() != null ? fl.getQuantity() : 0.0;
                    if ("KG".equalsIgnoreCase(fl.getUnit())) {
                        totalKg += q;
                        totalMeals += q * 2.5;
                    } else {
                        totalMeals += q;
                        totalKg += q / 2.5;
                    }
                }
            }
        }
        
        long volunteers = volunteerRepository.count();
        long highPriorityZones = 0;
        for (Zone z : zoneRepository.findAll()) {
            if (z.getPriorityScore() != null && z.getPriorityScore() >= 7.0) {
                highPriorityZones++;
            }
        }
        
        // Flag suspicious items (Confidence score below 75%)
        long suspiciousEvents = 0;
        List<Verification> verifications = verificationRepository.findAll();
        for (Verification v : verifications) {
            if (v.getVerificationConfidence() != null && v.getVerificationConfidence() < 0.75) {
                suspiciousEvents++;
            }
        }

        AdminAnalyticsDto dto = new AdminAnalyticsDto();
        dto.setActiveDonations(activeDonations);
        dto.setActiveDeliveries(activeDeliveries);
        dto.setVolunteersOnline(volunteers);
        dto.setHighPriorityZones(highPriorityZones);
        dto.setCompletedToday(completedToday);
        dto.setSuspiciousEvents(suspiciousEvents);
        dto.setTotalKgSaved(Math.round(totalKg * 10.0) / 10.0);
        dto.setTotalMealsDelivered(Math.round(totalMeals * 10.0) / 10.0);
        return dto;
    }
}

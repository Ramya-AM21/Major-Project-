package com.project.foodredistribution.entity;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "demand_records")
public class DemandRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "zone_id", nullable = false)
    private Zone zone;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private String timeSlot; // 08:00-12:00, 12:00-16:00, 16:00-20:00, 20:00-00:00

    @Column(nullable = false)
    private Double foodQuantity; // meals requested or expected

    @Column(nullable = false)
    private Double mealsServed;

    private Double demandScore;

    public DemandRecord() {
    }

    public DemandRecord(Zone zone, LocalDate date, String timeSlot, Double foodQuantity, Double mealsServed, Double demandScore) {
        this.zone = zone;
        this.date = date;
        this.timeSlot = timeSlot;
        this.foodQuantity = foodQuantity;
        this.mealsServed = mealsServed;
        this.demandScore = demandScore;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Zone getZone() { return zone; }
    public void setZone(Zone zone) { this.zone = zone; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getTimeSlot() { return timeSlot; }
    public void setTimeSlot(String timeSlot) { this.timeSlot = timeSlot; }

    public Double getFoodQuantity() { return foodQuantity; }
    public void setFoodQuantity(Double foodQuantity) { this.foodQuantity = foodQuantity; }

    public Double getMealsServed() { return mealsServed; }
    public void setMealsServed(Double mealsServed) { this.mealsServed = mealsServed; }

    public Double getDemandScore() { return demandScore; }
    public void setDemandScore(Double demandScore) { this.demandScore = demandScore; }
}

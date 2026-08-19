package com.project.foodredistribution.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "city_data_coverages")
public class CityDataCoverage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String city;

    private String state;
    private String country;
    private boolean hasVerifiedDestinations = false;
    
    @Column(length = 500)
    private String availableSources; // Comma separated sources, e.g. "GOVERNMENT,OFFICIAL_DATABASE,VERIFIED_NGO"
    
    private LocalDateTime lastUpdated;

    public CityDataCoverage() {
    }

    public CityDataCoverage(String city, String state, String country, boolean hasVerifiedDestinations, String availableSources) {
        this.city = city;
        this.state = state;
        this.country = country;
        this.hasVerifiedDestinations = hasVerifiedDestinations;
        this.availableSources = availableSources;
        this.lastUpdated = LocalDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public boolean isHasVerifiedDestinations() {
        return hasVerifiedDestinations;
    }

    public void setHasVerifiedDestinations(boolean hasVerifiedDestinations) {
        this.hasVerifiedDestinations = hasVerifiedDestinations;
    }

    public String getAvailableSources() {
        return availableSources;
    }

    public void setAvailableSources(String availableSources) {
        this.availableSources = availableSources;
    }

    public LocalDateTime getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(LocalDateTime lastUpdated) {
        this.lastUpdated = lastUpdated;
    }
}

package com.project.foodredistribution.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "zones")
public class Zone {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    private String address;

    private Integer capacity = 200; // Expected meal capacity

    private String operatingHours = "08:00 AM - 10:00 PM";

    private Double priorityScore = 1.0; // Dynamic priority assigned by demand analyzer

    private String status = "ACTIVE"; // ACTIVE, OVERFLOWING, INACTIVE

    public Zone() {
    }

    public Zone(String name, Double latitude, Double longitude, String address, Integer capacity, String operatingHours) {
        this.name = name;
        this.latitude = latitude;
        this.longitude = longitude;
        this.address = address;
        this.capacity = capacity;
        this.operatingHours = operatingHours;
        this.priorityScore = 1.0;
        this.status = "ACTIVE";
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public String getOperatingHours() { return operatingHours; }
    public void setOperatingHours(String operatingHours) { this.operatingHours = operatingHours; }

    public Double getPriorityScore() { return priorityScore; }
    public void setPriorityScore(Double priorityScore) { this.priorityScore = priorityScore; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}

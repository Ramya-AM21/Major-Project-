package com.project.foodredistribution.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "location_trackings")
public class LocationTracking {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "delivery_task_id", nullable = false)
    private DeliveryTask deliveryTask;

    private Double latitude;
    private Double longitude;
    private LocalDateTime timestamp;

    public LocationTracking() {
        this.timestamp = LocalDateTime.now();
    }

    public LocationTracking(DeliveryTask deliveryTask, Double latitude, Double longitude) {
        this.deliveryTask = deliveryTask;
        this.latitude = latitude;
        this.longitude = longitude;
        this.timestamp = LocalDateTime.now();
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public DeliveryTask getDeliveryTask() { return deliveryTask; }
    public void setDeliveryTask(DeliveryTask deliveryTask) { this.deliveryTask = deliveryTask; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}

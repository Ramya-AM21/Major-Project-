package com.project.foodredistribution.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "volunteer_routes")
public class VolunteerRoute {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "volunteer_id", nullable = false)
    private Volunteer volunteer;

    @Column(nullable = false)
    private Double startLatitude;

    @Column(nullable = false)
    private Double startLongitude;

    @Column(nullable = false)
    private Double endLatitude;

    @Column(nullable = false)
    private Double endLongitude;

    private String startName;

    private String endName;

    @Column(length = 2000)
    private String routeGeometry; // Encoded coordinates/polyline or comma-separated pairs

    private String routeType = "DAILY"; // DAILY, AD_HOC

    private String activeFrom = "08:00 AM";

    private String activeUntil = "09:00 AM";

    public VolunteerRoute() {
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public Volunteer getVolunteer() { return volunteer; }
    public void setVolunteer(Volunteer volunteer) { this.volunteer = volunteer; }

    public Double getStartLatitude() { return startLatitude; }
    public void setStartLatitude(Double startLatitude) { this.startLatitude = startLatitude; }

    public Double getStartLongitude() { return startLongitude; }
    public void setStartLongitude(Double startLongitude) { this.startLongitude = startLongitude; }

    public Double getEndLatitude() { return endLatitude; }
    public void setEndLatitude(Double endLatitude) { this.endLatitude = endLatitude; }

    public Double getEndLongitude() { return endLongitude; }
    public void setEndLongitude(Double endLongitude) { this.endLongitude = endLongitude; }

    public String getStartName() { return startName; }
    public void setStartName(String startName) { this.startName = startName; }

    public String getEndName() { return endName; }
    public void setEndName(String endName) { this.endName = endName; }

    public String getRouteGeometry() { return routeGeometry; }
    public void setRouteGeometry(String routeGeometry) { this.routeGeometry = routeGeometry; }

    public String getRouteType() { return routeType; }
    public void setRouteType(String routeType) { this.routeType = routeType; }

    public String getActiveFrom() { return activeFrom; }
    public void setActiveFrom(String activeFrom) { this.activeFrom = activeFrom; }

    public String getActiveUntil() { return activeUntil; }
    public void setActiveUntil(String activeUntil) { this.activeUntil = activeUntil; }
}

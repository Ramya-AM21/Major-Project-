package com.project.foodredistribution.dto;

import java.util.UUID;

public class RouteDto {
    private UUID id;
    private Double startLatitude;
    private Double startLongitude;
    private Double endLatitude;
    private Double endLongitude;
    private String startName;
    private String endName;
    private String routeGeometry;
    private String routeType; // DAILY, AD_HOC
    private String activeFrom;
    private String activeUntil;

    public RouteDto() {
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

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

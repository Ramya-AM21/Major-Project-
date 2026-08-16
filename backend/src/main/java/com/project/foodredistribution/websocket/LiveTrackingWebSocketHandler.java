package com.project.foodredistribution.websocket;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import com.project.foodredistribution.repository.VolunteerRouteRepository;

@Component
public class LiveTrackingWebSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(LiveTrackingWebSocketHandler.class);
    private final List<WebSocketSession> sessions = new CopyOnWriteArrayList<>();
    private final VolunteerRouteRepository volunteerRouteRepository;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    public LiveTrackingWebSocketHandler(@org.springframework.context.annotation.Lazy VolunteerRouteRepository volunteerRouteRepository) {
        this.volunteerRouteRepository = volunteerRouteRepository;
        this.objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        log.info("WebSocket tracking connection established: " + session.getId());
        sessions.add(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        log.info("WebSocket tracking connection closed: " + session.getId());
        sessions.remove(session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            String payloadStr = message.getPayload();
            com.fasterxml.jackson.databind.JsonNode jsonNode = objectMapper.readTree(payloadStr);
            
            if (jsonNode.has("type") && "ROUTE_LOCATION".equalsIgnoreCase(jsonNode.get("type").asText())) {
                String routeIdStr = jsonNode.get("routeId").asText();
                double latitude = jsonNode.get("latitude").asDouble();
                double longitude = jsonNode.get("longitude").asDouble();
                
                java.util.UUID routeId = java.util.UUID.fromString(routeIdStr);
                java.util.Optional<com.project.foodredistribution.entity.VolunteerRoute> optRoute = volunteerRouteRepository.findById(routeId);
                
                if (optRoute.isPresent()) {
                    com.project.foodredistribution.entity.VolunteerRoute route = optRoute.get();
                    route.setCurrentLatitude(latitude);
                    route.setCurrentLongitude(longitude);
                    route.setLastLocationUpdate(java.time.LocalDateTime.now());
                    volunteerRouteRepository.save(route);
                    log.info("Updated route {} location via WS to {}, {}", routeId, latitude, longitude);
                    
                    // Broadcast updated location back to all clients
                    String telemetryData = String.format(
                        "{\"routeId\":\"%s\",\"volunteerId\":\"%s\",\"latitude\":%f,\"longitude\":%f}",
                        routeIdStr, route.getVolunteer().getId(), latitude, longitude
                    );
                    broadcastUpdate("LOCATION_UPDATE", telemetryData);
                }
            }
        } catch (Exception e) {
            log.error("Error processing text websocket message", e);
        }
    }

    public void broadcastUpdate(String topic, Object data) {
        // Quick simple JSON parser to structure the message frame
        String json = String.format("{\"topic\":\"%s\",\"payload\":%s}", topic, data);
        broadcast(json);
    }

    public void broadcastRaw(String message) {
        broadcast(message);
    }

    private void broadcast(String message) {
        for (WebSocketSession session : sessions) {
            if (session.isOpen()) {
                try {
                    session.sendMessage(new TextMessage(message));
                } catch (IOException e) {
                    log.error("Failed to transmit WS frame to session: " + session.getId(), e);
                }
            }
        }
    }
}

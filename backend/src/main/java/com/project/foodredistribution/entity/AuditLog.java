package com.project.foodredistribution.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "audit_logs")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String actor;

    private String role;

    @Column(nullable = false)
    private String action;

    private String entity;

    private String entityId;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(length = 2000)
    private String metadata;

    public AuditLog() {
    }

    public AuditLog(String actor, String role, String action, String entity, String entityId, String metadata) {
        this.actor = actor;
        this.role = role;
        this.action = action;
        this.entity = entity;
        this.entityId = entityId;
        this.timestamp = LocalDateTime.now();
        this.metadata = metadata;
    }

    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public String getActor() { return actor; }
    public void setActor(String actor) { this.actor = actor; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getEntity() { return entity; }
    public void setEntity(String entity) { this.entity = entity; }

    public String getEntityId() { return entityId; }
    public void setEntityId(String entityId) { this.entityId = entityId; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }
}

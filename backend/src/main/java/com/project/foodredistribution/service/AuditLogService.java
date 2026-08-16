package com.project.foodredistribution.service;

import com.project.foodredistribution.entity.AuditLog;
import com.project.foodredistribution.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public void log(String actor, String role, String action, String entity, String entityId, String metadata) {
        AuditLog auditLog = new AuditLog(actor, role, action, entity, entityId, metadata);
        auditLogRepository.save(auditLog);
    }

    public List<AuditLog> getAllAuditLogs() {
        return auditLogRepository.findAllByOrderByTimestampDesc();
    }
}

package com.project.foodredistribution.service;

import com.project.foodredistribution.entity.Notification;
import com.project.foodredistribution.repository.NotificationRepository;
import com.project.foodredistribution.websocket.LiveTrackingWebSocketHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final LiveTrackingWebSocketHandler webSocketHandler;

    public NotificationService(NotificationRepository notificationRepository,
                               LiveTrackingWebSocketHandler webSocketHandler) {
        this.notificationRepository = notificationRepository;
        this.webSocketHandler = webSocketHandler;
    }

    @Transactional
    public void sendNotification(String email, String title, String desc) {
        Notification notification = new Notification(email, title, desc);
        notificationRepository.save(notification);
        
        // Escape quotes for Simple JSON transmission
        String escapedDesc = desc.replace("\"", "\\\"");
        String escapedTitle = title.replace("\"", "\\\"");
        String payload = String.format("{\"id\":\"%s\",\"title\":\"%s\",\"desc\":\"%s\",\"userEmail\":\"%s\",\"createdAt\":\"%s\"}",
                notification.getId(), escapedTitle, escapedDesc, email, notification.getCreatedAt().toString());
        webSocketHandler.broadcastUpdate("NOTIFICATION", payload);
    }

    public List<Notification> getNotificationsForUser(String email) {
        return notificationRepository.findByUserEmailOrderByCreatedAtDesc(email);
    }

    @Transactional
    public void markAsRead(UUID id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    @Transactional
    public void markAllAsRead(String email) {
        List<Notification> list = notificationRepository.findByUserEmailOrderByCreatedAtDesc(email);
        for(Notification n : list) {
            n.setRead(true);
        }
        notificationRepository.saveAll(list);
    }
}

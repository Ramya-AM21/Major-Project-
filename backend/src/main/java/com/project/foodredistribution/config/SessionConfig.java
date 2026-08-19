package com.project.foodredistribution.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.time.*;

@Configuration
public class SessionConfig {

    @Value("${app.timezone:Asia/Kolkata}")
    private String timezone;

    @Value("${app.sessions.afternoon.start:13:00}")
    private String afternoonStart;

    @Value("${app.sessions.afternoon.end:15:00}")
    private String afternoonEnd;

    @Value("${app.sessions.night.start:20:00}")
    private String nightStart;

    @Value("${app.sessions.night.end:22:00}")
    private String nightEnd;

    public ZoneId getZoneId() {
        return ZoneId.of(timezone);
    }

    public String getTimezone() {
        return timezone;
    }

    public String getAfternoonStart() {
        return afternoonStart;
    }

    public String getAfternoonEnd() {
        return afternoonEnd;
    }

    public String getNightStart() {
        return nightStart;
    }

    public String getNightEnd() {
        return nightEnd;
    }

    public LocalTime getAfternoonStartTime() {
        return LocalTime.parse(afternoonStart);
    }

    public LocalTime getAfternoonEndTime() {
        return LocalTime.parse(afternoonEnd);
    }

    public LocalTime getNightStartTime() {
        return LocalTime.parse(nightStart);
    }

    public LocalTime getNightEndTime() {
        return LocalTime.parse(nightEnd);
    }

    public Instant getSessionStart(com.project.foodredistribution.entity.DistributionSession session, LocalDate date) {
        LocalTime time = (session == com.project.foodredistribution.entity.DistributionSession.AFTERNOON) ? getAfternoonStartTime() : getNightStartTime();
        return ZonedDateTime.of(LocalDateTime.of(date, time), getZoneId()).toInstant();
    }

    public Instant getSessionEnd(com.project.foodredistribution.entity.DistributionSession session, LocalDate date) {
        LocalTime time = (session == com.project.foodredistribution.entity.DistributionSession.AFTERNOON) ? getAfternoonEndTime() : getNightEndTime();
        return ZonedDateTime.of(LocalDateTime.of(date, time), getZoneId()).toInstant();
    }
}

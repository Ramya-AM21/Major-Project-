package com.project.foodredistribution.controller;

import com.project.foodredistribution.config.SessionConfig;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/sessions")
@CrossOrigin(origins = "*")
public class SessionConfigController {

    private final SessionConfig sessionConfig;

    public SessionConfigController(SessionConfig sessionConfig) {
        this.sessionConfig = sessionConfig;
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getSessionConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("timezone", sessionConfig.getTimezone());

        Map<String, String> afternoon = new HashMap<>();
        afternoon.put("start", sessionConfig.getAfternoonStart());
        afternoon.put("end", sessionConfig.getAfternoonEnd());
        config.put("AFTERNOON", afternoon);

        Map<String, String> night = new HashMap<>();
        night.put("start", sessionConfig.getNightStart());
        night.put("end", sessionConfig.getNightEnd());
        config.put("NIGHT", night);

        return ResponseEntity.ok(config);
    }
}

package com.project.foodredistribution;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FoodRedistributionApplication {
    public static void main(String[] args) {
        SpringApplication.run(FoodRedistributionApplication.class, args);
    }
}

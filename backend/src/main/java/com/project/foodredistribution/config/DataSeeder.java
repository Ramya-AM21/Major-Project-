package com.project.foodredistribution.config;

import com.project.foodredistribution.entity.*;
import com.project.foodredistribution.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.Instant;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Component
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final FoodProviderRepository foodProviderRepository;
    private final VolunteerRepository volunteerRepository;
    private final ZoneRepository zoneRepository;
    private final FoodListingRepository foodListingRepository;
    private final VolunteerRouteRepository volunteerRouteRepository;
    private final DeliveryTaskRepository deliveryTaskRepository;
    private final VerificationRepository verificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final RestaurantRewardRepository restaurantRewardRepository;
    private final CityDataCoverageRepository cityDataCoverageRepository;

    public DataSeeder(UserRepository userRepository,
                      FoodProviderRepository foodProviderRepository,
                      VolunteerRepository volunteerRepository,
                      ZoneRepository zoneRepository,
                      FoodListingRepository foodListingRepository,
                      VolunteerRouteRepository volunteerRouteRepository,
                      DeliveryTaskRepository deliveryTaskRepository,
                      VerificationRepository verificationRepository,
                      PasswordEncoder passwordEncoder,
                      RestaurantRewardRepository restaurantRewardRepository,
                      CityDataCoverageRepository cityDataCoverageRepository) {
        this.userRepository = userRepository;
        this.foodProviderRepository = foodProviderRepository;
        this.volunteerRepository = volunteerRepository;
        this.zoneRepository = zoneRepository;
        this.foodListingRepository = foodListingRepository;
        this.volunteerRouteRepository = volunteerRouteRepository;
        this.deliveryTaskRepository = deliveryTaskRepository;
        this.verificationRepository = verificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.restaurantRewardRepository = restaurantRewardRepository;
        this.cityDataCoverageRepository = cityDataCoverageRepository;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (userRepository.count() > 0) {
            return; // Already seeded
        }

        String commonPassword = passwordEncoder.encode("password");

        // 1. Seed Admin
        User admin = new User("System Administrator", "admin@food.com", "9999999999", commonPassword, Role.ADMIN);
        userRepository.save(admin);

        // 1b. Seed Coordinator
        User coordinator = new User("Sita Ram", "coord@food.com", "7777777777", commonPassword, Role.COORDINATOR);
        userRepository.save(coordinator);

        // 2. Seed Food Providers
        List<FoodProvider> providers = new ArrayList<>();
        
        User u1 = new User("Green Bowl Kitchen Manager", "provider1@food.com", "8888888801", commonPassword, Role.PROVIDER);
        userRepository.save(u1);
        FoodProvider p1 = new FoodProvider(u1, "Green Bowl Kitchen", "12, 100 Feet Rd, Indiranagar, Bengaluru", 12.9718, 77.6412, "LC-A92B10");
        providers.add(foodProviderRepository.save(p1));

        User u2 = new User("Urban Harvest Cafe Manager", "provider2@food.com", "8888888802", commonPassword, Role.PROVIDER);
        userRepository.save(u2);
        FoodProvider p2 = new FoodProvider(u2, "Urban Harvest Cafe", "80 Feet Rd, Koramangala 4th Block, Bengaluru", 12.9343, 77.6253, "LC-B90C22");
        providers.add(foodProviderRepository.save(p2));

        User u3 = new User("Campus Canteen Steward", "provider3@food.com", "8888888803", commonPassword, Role.PROVIDER);
        userRepository.save(u3);
        FoodProvider p3 = new FoodProvider(u3, "Campus Canteen", "IISc Campus, Sadashiva Nagar, Bengaluru", 13.0135, 77.5679, "LC-C31D89");
        providers.add(foodProviderRepository.save(p3));

        User u4 = new User("City Bites Kitchen", "provider4@food.com", "8888888804", commonPassword, Role.PROVIDER);
        userRepository.save(u4);
        FoodProvider p4 = new FoodProvider(u4, "City Bites", "Residency Rd, Ashok Nagar, Bengaluru", 12.9698, 77.6001, "LC-D77E45");
        providers.add(foodProviderRepository.save(p4));

        // 3. Seed Volunteers
        List<Volunteer> volunteers = new ArrayList<>();
        
        User vUser1 = new User("Rahul Sharma", "rahul@food.com", "9876543210", commonPassword, Role.VOLUNTEER);
        userRepository.save(vUser1);
        Volunteer v1 = new Volunteer(vUser1);
        v1.setRating(4.8);
        v1.setTotalDeliveries(12);
        v1.setSuccessfulDeliveries(12);
        v1.setReliabilityScore(1.0);
        volunteers.add(volunteerRepository.save(v1));

        User vUser2 = new User("Ananya Hegde", "ananya@food.com", "9876543211", commonPassword, Role.VOLUNTEER);
        userRepository.save(vUser2);
        Volunteer v2 = new Volunteer(vUser2);
        v2.setRating(4.5);
        v2.setTotalDeliveries(8);
        v2.setSuccessfulDeliveries(7);
        v2.setReliabilityScore(0.87);
        volunteers.add(volunteerRepository.save(v2));

        User vUser3 = new User("Arjun Das", "arjun@food.com", "9876543212", commonPassword, Role.VOLUNTEER);
        userRepository.save(vUser3);
        Volunteer v3 = new Volunteer(vUser3);
        v3.setRating(4.2);
        v3.setTotalDeliveries(15);
        v3.setSuccessfulDeliveries(13);
        v3.setReliabilityScore(0.86);
        volunteers.add(volunteerRepository.save(v3));

        User vUser4 = new User("Meera Nair", "meera@food.com", "9876543213", commonPassword, Role.VOLUNTEER);
        userRepository.save(vUser4);
        Volunteer v4 = new Volunteer(vUser4);
        v4.setRating(4.9);
        v4.setTotalDeliveries(21);
        v4.setSuccessfulDeliveries(21);
        v4.setReliabilityScore(1.0);
        volunteers.add(volunteerRepository.save(v4));

        // 4. Seed Volunteer Routes
        // Rahul daily commute from SADASHIVA NAGAR to INDIRANAGAR
        VolunteerRoute r1 = new VolunteerRoute();
        r1.setVolunteer(v1);
        r1.setStartLatitude(13.0068);
        r1.setStartLongitude(77.5801);
        r1.setEndLatitude(12.9718);
        r1.setEndLongitude(77.6412);
        r1.setStartName("Home (Sadashiva Nagar)");
        r1.setEndName("Office (Indiranagar)");
        r1.setRouteGeometry("13.0068,77.5801;12.9718,77.6412");
        r1.setRouteType("DAILY");
        r1.setActiveFrom("09:00 AM");
        r1.setActiveUntil("10:00 AM");
        volunteerRouteRepository.save(r1);

        // Ananya commute from KORAMANGALA to ASHOK NAGAR
        VolunteerRoute r2 = new VolunteerRoute();
        r2.setVolunteer(v2);
        r2.setStartLatitude(12.9343);
        r2.setStartLongitude(77.6253);
        r2.setEndLatitude(12.9698);
        r2.setEndLongitude(77.6001);
        r2.setStartName("Home (Koramangala)");
        r2.setEndName("College (Residency Road)");
        r2.setRouteGeometry("12.9343,77.6253;12.9698,77.6001");
        r2.setRouteType("DAILY");
        r2.setActiveFrom("08:00 AM");
        r2.setActiveUntil("09:00 AM");
        volunteerRouteRepository.save(r2);

        // 4b. Seed City Data Coverage
        cityDataCoverageRepository.save(new CityDataCoverage("Bengaluru", "Karnataka", "India", true, "GOVERNMENT,OFFICIAL_DATABASE,VERIFIED_NGO"));
        cityDataCoverageRepository.save(new CityDataCoverage("Mysore", "Karnataka", "India", false, "COMMUNITY_REPORTED"));
        cityDataCoverageRepository.save(new CityDataCoverage("Tier-3 City X", "Karnataka", "India", false, "COMMUNITY_REPORTED"));

        // 5. Seed Zones
        List<Zone> zones = new ArrayList<>();
        Zone z1 = new Zone("Central Community Zone", 12.9740, 77.6050, "Cubbon Road Shelter, Ashok Nagar, Bengaluru", 150, "08:00 AM - 09:00 PM");
        z1.setPriorityScore(8.5); // High priority
        z1.setCity("Bengaluru");
        z1.setState("Karnataka");
        z1.setCountry("India");
        z1.setSource("OFFICIAL_DATABASE");
        z1.setType("VERIFIED_SHELTER");
        z1.setVerificationStatus("VERIFIED");
        zones.add(zoneRepository.save(z1));

        Zone z2 = new Zone("North Shelter Zone", 13.0180, 77.5820, "Malleswaram Community Kitchen, Malleswaram, Bengaluru", 120, "09:00 AM - 08:00 PM");
        z2.setPriorityScore(5.2);
        z2.setCity("Bengaluru");
        z2.setState("Karnataka");
        z2.setCountry("India");
        z2.setSource("GOVERNMENT");
        z2.setType("GOVERNMENT_SHELTER");
        z2.setVerificationStatus("VERIFIED");
        zones.add(zoneRepository.save(z2));

        Zone z3 = new Zone("Transit Support Zone", 12.9510, 77.5840, "Kalayan Shelter Care, Mavalli, Bengaluru", 200, "24 Hours");
        z3.setPriorityScore(9.2); // Extremely High
        z3.setCity("Bengaluru");
        z3.setState("Karnataka");
        z3.setCountry("India");
        z3.setSource("VERIFIED_NGO");
        z3.setType("NGO");
        z3.setVerificationStatus("VERIFIED");
        zones.add(zoneRepository.save(z3));

        Zone z4 = new Zone("South Community Zone", 12.9120, 77.6110, "BTM Layout Food Center, Koramangala 1st Block, Bengaluru", 100, "08:00 AM - 10:00 PM");
        z4.setPriorityScore(3.8);
        z4.setCity("Bengaluru");
        z4.setState("Karnataka");
        z4.setCountry("India");
        z4.setSource("OFFICIAL_DATABASE");
        z4.setType("VERIFIED_SHELTER");
        z4.setVerificationStatus("VERIFIED");
        zones.add(zoneRepository.save(z4));

        // 6. Seed Food Listings across various states - Disabled to maintain clean real-time ledger
        
        // 7. Seed Restaurant Rewards Catalog
        if (restaurantRewardRepository.count() == 0) {
            restaurantRewardRepository.save(new RestaurantReward("Green Bowl Kitchen", "15% discount on Veg Mains", 100, 15, LocalDateTime.now().plusMonths(3)));
            restaurantRewardRepository.save(new RestaurantReward("Urban Harvest Cafe", "Free Cappuccino with any sandwich", 75, 100, LocalDateTime.now().plusMonths(3)));
            restaurantRewardRepository.save(new RestaurantReward("City Bites", "10% off on all prepared combos", 50, 10, LocalDateTime.now().plusMonths(3)));
            restaurantRewardRepository.save(new RestaurantReward("Fresh Route Express", "25% discount voucher", 150, 25, LocalDateTime.now().plusMonths(3)));
        }
    }
}

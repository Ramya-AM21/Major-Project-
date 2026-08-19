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

        // 6. Seed Food Listings across various states
        // Listing 1: AVAILABLE
        FoodListing fl1 = new FoodListing();
        fl1.setProvider(p4);
        fl1.setFoodName("Mixed Veg Curry & Roti");
        fl1.setCategory("VEG");
        fl1.setQuantity(35.0);
        fl1.setUnit("MEALS");
        fl1.setAllergens("Gluten");
        fl1.setPreparationTime(Instant.now().minus(Duration.ofHours(1)));
        fl1.setExpiryTime(Instant.now().plus(Duration.ofHours(3)));
        fl1.setSafeConsumptionHours(4);
        fl1.setDistributionSession(DistributionSession.AFTERNOON);
        fl1.setAvailableFrom(Instant.now().minus(Duration.ofHours(1)));
        fl1.setAvailableUntil(Instant.now().plus(Duration.ofHours(1)));
        fl1.setImageUrl("https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=300");
        fl1.setPickupAddress(p4.getAddress());
        fl1.setPickupLatitude(p4.getLatitude());
        fl1.setPickupLongitude(p4.getLongitude());
        fl1.setStatus("AVAILABLE");
        foodListingRepository.save(fl1);

        // Listing 2: MATCHED (now AVAILABLE)
        FoodListing fl2 = new FoodListing();
        fl2.setProvider(p1);
        fl2.setFoodName("Paneer Pulav");
        fl2.setCategory("VEG");
        fl2.setQuantity(40.0);
        fl2.setUnit("MEALS");
        fl2.setAllergens("Dairy");
        fl2.setPreparationTime(Instant.now().minus(Duration.ofHours(2)));
        fl2.setExpiryTime(Instant.now().plus(Duration.ofHours(1)));
        fl2.setSafeConsumptionHours(3);
        fl2.setDistributionSession(DistributionSession.AFTERNOON);
        fl2.setAvailableFrom(Instant.now().minus(Duration.ofHours(1)));
        fl2.setAvailableUntil(Instant.now().plus(Duration.ofHours(1)));
        fl2.setImageUrl("https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&q=80&w=300");
        fl2.setPickupAddress(p1.getAddress());
        fl2.setPickupLatitude(p1.getLatitude());
        fl2.setPickupLongitude(p1.getLongitude());
        fl2.setStatus("AVAILABLE");
        foodListingRepository.save(fl2);

        // Task 1: Proposed/Created for Paneer Pulav -> Malleswaram Zone (Matches Rahul's route)
        DeliveryTask t1 = new DeliveryTask();
        t1.setFoodListing(fl2);
        t1.setVolunteer(null); // Unassigned so Rahul can choose it in real-time
        t1.setZone(z1);
        t1.setRouteDistance(4.8);
        t1.setRouteDeviation(1.2);
        t1.setMatchingScore(91.0);
        t1.setStatus("CREATED"); // Proposed CREATED state
        deliveryTaskRepository.save(t1);

        Verification vRec1 = new Verification();
        vRec1.setTask(t1);
        vRec1.setPickupOtp("524901");
        vRec1.setDeliveryOtp("183025");
        vRec1.setVerificationConfidence(1.0);
        verificationRepository.save(vRec1);

        // Listing 3: COMPLETED
        FoodListing fl3 = new FoodListing();
        fl3.setProvider(p2);
        fl3.setFoodName("Rice & Lentil Sambar");
        fl3.setCategory("VEG");
        fl3.setQuantity(60.0);
        fl3.setUnit("MEALS");
        fl3.setPreparationTime(Instant.now().minus(Duration.ofHours(8)));
        fl3.setExpiryTime(Instant.now().minus(Duration.ofHours(2))); // Expired now, but was completed earlier
        fl3.setSafeConsumptionHours(6);
        fl3.setDistributionSession(DistributionSession.AFTERNOON);
        fl3.setAvailableFrom(Instant.now().minus(Duration.ofHours(9)));
        fl3.setAvailableUntil(Instant.now().minus(Duration.ofHours(7)));
        fl3.setImageUrl("");
        fl3.setPickupAddress(p2.getAddress());
        fl3.setPickupLatitude(p2.getLatitude());
        fl3.setPickupLongitude(p2.getLongitude());
        fl3.setStatus("DELIVERED");
        foodListingRepository.save(fl3);

        DeliveryTask t2 = new DeliveryTask();
        t2.setFoodListing(fl3);
        t2.setVolunteer(v2); // Assigned to Ananya
        t2.setZone(z3);
        t2.setRouteDistance(5.4);
        t2.setRouteDeviation(0.8);
        t2.setMatchingScore(94.0);
        t2.setStatus("COMPLETED");
        deliveryTaskRepository.save(t2);

        Verification vRec2 = new Verification();
        vRec2.setTask(t2);
        vRec2.setPickupOtp("112233");
        vRec2.setDeliveryOtp("445566");
        vRec2.setPickupTimestamp(LocalDateTime.now().minusHours(4));
        vRec2.setDeliveryTimestamp(LocalDateTime.now().minusHours(3));
        vRec2.setPickupLatitude(p2.getLatitude());
        vRec2.setPickupLongitude(p2.getLongitude());
        vRec2.setDeliveryLatitude(z3.getLatitude());
        vRec2.setDeliveryLongitude(z3.getLongitude());
        vRec2.setDeliveryRadiusVerified(true);
        vRec2.setVerificationConfidence(0.96);
        verificationRepository.save(vRec2);

        // Listing 4: EXPIRED (A donation from Green Bowl Kitchen that expired without pickup)
        FoodListing fl4 = new FoodListing();
        fl4.setProvider(p1);
        fl4.setFoodName("Egg Biryani");
        fl4.setCategory("EGG");
        fl4.setQuantity(15.0);
        fl4.setUnit("MEALS");
        fl4.setPreparationTime(Instant.now().minus(Duration.ofHours(6)));
        fl4.setExpiryTime(Instant.now().minus(Duration.ofHours(1))); // Has already expired
        fl4.setSafeConsumptionHours(5);
        fl4.setDistributionSession(DistributionSession.AFTERNOON);
        fl4.setAvailableFrom(Instant.now().minus(Duration.ofHours(7)));
        fl4.setAvailableUntil(Instant.now().minus(Duration.ofHours(5)));
        fl4.setPickupAddress(p1.getAddress());
        fl4.setPickupLatitude(p1.getLatitude());
        fl4.setPickupLongitude(p1.getLongitude());
        fl4.setStatus("EXPIRED");
        foodListingRepository.save(fl4);

        // 7. Seed Restaurant Rewards Catalog
        if (restaurantRewardRepository.count() == 0) {
            restaurantRewardRepository.save(new RestaurantReward("Green Bowl Kitchen", "15% discount on Veg Mains", 100, 15, LocalDateTime.now().plusMonths(3)));
            restaurantRewardRepository.save(new RestaurantReward("Urban Harvest Cafe", "Free Cappuccino with any sandwich", 75, 100, LocalDateTime.now().plusMonths(3)));
            restaurantRewardRepository.save(new RestaurantReward("City Bites", "10% off on all prepared combos", 50, 10, LocalDateTime.now().plusMonths(3)));
            restaurantRewardRepository.save(new RestaurantReward("Fresh Route Express", "25% discount voucher", 150, 25, LocalDateTime.now().plusMonths(3)));
        }
    }
}

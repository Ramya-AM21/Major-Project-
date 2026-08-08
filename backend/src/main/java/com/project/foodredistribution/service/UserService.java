package com.project.foodredistribution.service;

import com.project.foodredistribution.dto.AuthRequest;
import com.project.foodredistribution.dto.AuthResponse;
import com.project.foodredistribution.dto.RegisterRequest;
import com.project.foodredistribution.entity.*;
import com.project.foodredistribution.exception.ResourceNotFoundException;
import com.project.foodredistribution.repository.FoodProviderRepository;
import com.project.foodredistribution.repository.UserRepository;
import com.project.foodredistribution.repository.VolunteerRepository;
import com.project.foodredistribution.security.JwtTokenProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final FoodProviderRepository foodProviderRepository;
    private final VolunteerRepository volunteerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;
    private final AuthenticationManager authenticationManager;

    public UserService(UserRepository userRepository,
                       FoodProviderRepository foodProviderRepository,
                       VolunteerRepository volunteerRepository,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider jwtTokenProvider,
                       UserDetailsService userDetailsService,
                       AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.foodProviderRepository = foodProviderRepository;
        this.volunteerRepository = volunteerRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.userDetailsService = userDetailsService;
        this.authenticationManager = authenticationManager;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already in use");
        }

        User user = new User(
                request.getName(),
                request.getEmail(),
                request.getPhone(),
                passwordEncoder.encode(request.getPassword()),
                request.getRole()
        );

        user = userRepository.save(user);

        if (request.getRole() == Role.PROVIDER) {
            String businessName = request.getBusinessName() != null ? request.getBusinessName() : request.getName();
            String address = request.getAddress() != null ? request.getAddress() : "Default Address";
            Double lat = request.getLatitude() != null ? request.getLatitude() : 12.9716;
            Double lng = request.getLongitude() != null ? request.getLongitude() : 77.5946;
            FoodProvider provider = new FoodProvider(user, businessName, address, lat, lng, request.getLicenseNumber());
            foodProviderRepository.save(provider);
        } else if (request.getRole() == Role.VOLUNTEER) {
            Volunteer volunteer = new Volunteer(user);
            volunteerRepository.save(volunteer);
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtTokenProvider.generateToken(userDetails);

        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole().name());
    }

    public AuthResponse login(AuthRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getEmail());
        String token = jwtTokenProvider.generateToken(userDetails);

        return new AuthResponse(token, user.getId(), user.getName(), user.getEmail(), user.getRole().name());
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
    }

    public User findById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }
}

package com.project.foodredistribution.repository;

import com.project.foodredistribution.entity.TokenTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TokenTransactionRepository extends JpaRepository<TokenTransaction, UUID> {
    List<TokenTransaction> findByVolunteerId(UUID volunteerId);
    List<TokenTransaction> findByTaskId(UUID taskId);
}

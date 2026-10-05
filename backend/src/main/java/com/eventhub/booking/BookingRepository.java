package com.eventhub.booking;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    Optional<Booking> findByReference(String reference);

    boolean existsByReference(String reference);

    Optional<Booking> findByUserIdAndIdempotencyKey(Long userId, String idempotencyKey);
}
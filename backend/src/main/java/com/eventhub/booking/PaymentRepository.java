package com.eventhub.booking;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByBookingId(Long bookingId);

    Optional<Payment> findFirstByBookingIdOrderByIdDesc(Long bookingId);

    Optional<Payment> findFirstByBookingIdAndStatus(Long bookingId, PaymentStatus status);
}
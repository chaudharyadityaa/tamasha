package com.eventhub.booking;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

/** A payment attempt for a booking. For now the only provider is DEMO: no money actually moves. */
@Entity
@Table(name = "payments")
public class Payment {

    public static final String DEMO_PROVIDER = "DEMO";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(name = "provider", nullable = false, length = 20)
    private String provider;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private PaymentStatus status;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "provider_reference", length = 100)
    private String providerReference;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Required by JPA. Not for application code. */
    protected Payment() {
    }

    /** A simulated successful payment for the booking's full amount. */
    public static Payment demoSuccess(Booking booking) {
        Payment payment = new Payment();
        payment.booking = booking;
        payment.provider = DEMO_PROVIDER;
        payment.status = PaymentStatus.SUCCEEDED;
        payment.amount = booking.getTotalAmount();
        payment.currency = booking.getCurrency();
        payment.providerReference = "DEMO-" + UUID.randomUUID();
        return payment;
    }

    public void markRefunded() {
        if (status != PaymentStatus.SUCCEEDED) {
            throw new IllegalStateException("Only a successful payment can be refunded (current: " + status + ")");
        }
        status = PaymentStatus.REFUNDED;
    }

    public boolean isDemo() {
        return DEMO_PROVIDER.equals(provider);
    }

    public Long getId() {
        return id;
    }

    public Booking getBooking() {
        return booking;
    }

    public String getProvider() {
        return provider;
    }

    public PaymentStatus getStatus() {
        return status;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getCurrency() {
        return currency;
    }

    public String getProviderReference() {
        return providerReference;
    }
}
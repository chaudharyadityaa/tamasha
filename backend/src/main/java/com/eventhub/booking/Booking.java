package com.eventhub.booking;

import com.eventhub.event.Event;
import com.eventhub.event.TicketType;
import com.eventhub.user.User;
import com.eventhub.venue.Seat;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

/**
 * A customer's purchase. All status changes go through the methods below, which enforce
 * the allowed transitions: PENDING -> CONFIRMED / CANCELLED / EXPIRED, CONFIRMED -> CANCELLED.
 */
@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reference", nullable = false, length = 20, updatable = false)
    private String reference;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private BookingStatus status = BookingStatus.PENDING_PAYMENT;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount = new BigDecimal("0.00");

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "cancelled_at")
    private Instant cancelledAt;

    @Column(name = "idempotency_key", length = 64)
    private String idempotencyKey;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.PERSIST)
    private List<BookingItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "booking", cascade = CascadeType.PERSIST)
    private List<BookingSeat> seats = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Required by JPA. Not for application code. */
    protected Booking() {
    }

    public Booking(User user, Event event, String reference, Instant expiresAt) {
        this.user = user;
        this.event = event;
        this.reference = reference;
        this.currency = event.getCurrency();
        this.expiresAt = expiresAt;
    }

    /** Adds a general-admission line, priced at the ticket type's current price (a snapshot). */
    public void addItem(TicketType ticketType, int quantity) {
        requirePending();
        if (quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be positive");
        }
        BookingItem item = new BookingItem(this, ticketType, quantity, ticketType.getPrice());
        items.add(item);
        totalAmount = totalAmount.add(item.getLineTotal());
    }

    /** Adds a reserved seat, priced at the ticket type's current price (a snapshot). */
    public void addSeat(Seat seat, TicketType ticketType) {
        requirePending();
        seats.add(new BookingSeat(this, seat, ticketType, ticketType.getPrice()));
        totalAmount = totalAmount.add(ticketType.getPrice());
    }

    public void confirm(Instant now) {
        requirePending();
        if (!now.isBefore(expiresAt)) {
            throw new IllegalStateException("The hold on this booking has expired");
        }
        status = BookingStatus.CONFIRMED;
        confirmedAt = now;
    }

    public void cancel(Instant now) {
        if (status != BookingStatus.PENDING_PAYMENT && status != BookingStatus.CONFIRMED) {
            throw new IllegalStateException("A " + status + " booking cannot be cancelled");
        }
        status = BookingStatus.CANCELLED;
        cancelledAt = now;
        releaseSeats(now);
    }

    /** Called when an unpaid hold runs out. Only allowed once the deadline has passed. */
    public void expire(Instant now) {
        requirePending();
        if (now.isBefore(expiresAt)) {
            throw new IllegalStateException("The hold has not expired yet");
        }
        status = BookingStatus.EXPIRED;
        releaseSeats(now);
    }

    private void releaseSeats(Instant now) {
        seats.forEach(seat -> seat.release(now));
    }

    private void requirePending() {
        if (status != BookingStatus.PENDING_PAYMENT) {
            throw new IllegalStateException("Booking is " + status + ", not PENDING_PAYMENT");
        }
    }

    public void setIdempotencyKey(String idempotencyKey) {
        this.idempotencyKey = idempotencyKey;
    }

    public Long getId() {
        return id;
    }

    public String getReference() {
        return reference;
    }

    public User getUser() {
        return user;
    }

    public Event getEvent() {
        return event;
    }

    public BookingStatus getStatus() {
        return status;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public Instant getConfirmedAt() {
        return confirmedAt;
    }

    public Instant getCancelledAt() {
        return cancelledAt;
    }

    public String getIdempotencyKey() {
        return idempotencyKey;
    }

    public List<BookingItem> getItems() {
        return Collections.unmodifiableList(items);
    }

    public List<BookingSeat> getSeats() {
        return Collections.unmodifiableList(seats);
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
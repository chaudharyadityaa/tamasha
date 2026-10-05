package com.eventhub.booking;

import com.eventhub.event.Event;
import com.eventhub.event.TicketType;
import com.eventhub.venue.Seat;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

/**
 * One reserved seat in a booking. It is "active" until released_at is set.
 * The database allows only one active claim per (event, seat).
 */
@Entity
@Table(name = "booking_seats")
public class BookingSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seat_id", nullable = false)
    private Seat seat;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_type_id", nullable = false)
    private TicketType ticketType;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "released_at")
    private Instant releasedAt;

    /** Required by JPA. Not for application code. */
    protected BookingSeat() {
    }

    BookingSeat(Booking booking, Seat seat, TicketType ticketType, BigDecimal unitPrice) {
        this.booking = booking;
        this.event = booking.getEvent();
        this.seat = seat;
        this.ticketType = ticketType;
        this.unitPrice = unitPrice;
    }

    void release(Instant now) {
        if (releasedAt == null) {
            releasedAt = now;
        }
    }

    public boolean isActive() {
        return releasedAt == null;
    }

    public Long getId() {
        return id;
    }

    public Seat getSeat() {
        return seat;
    }

    public TicketType getTicketType() {
        return ticketType;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public Instant getReleasedAt() {
        return releasedAt;
    }
}
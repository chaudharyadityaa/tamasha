package com.eventhub.booking;

import com.eventhub.event.Event;
import com.eventhub.event.TicketType;
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
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/** One admission: a reserved seat, or one general-admission ticket. */
@Entity
@Table(name = "tickets")
public class Ticket {

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
    @JoinColumn(name = "ticket_type_id", nullable = false)
    private TicketType ticketType;

    /** Set for reserved-seating tickets; null for general admission. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_seat_id")
    private BookingSeat bookingSeat;

    @Column(name = "code", nullable = false, length = 40, updatable = false)
    private String code;

    /** The price paid for this admission (a snapshot, like the booking line). */
    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private TicketStatus status = TicketStatus.VALID;

    @Column(name = "checked_in_at")
    private Instant checkedInAt;

    @Column(name = "checked_in_by")
    private Long checkedInBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Required by JPA. Not for application code. */
    protected Ticket() {
    }

    private Ticket(Booking booking, TicketType ticketType, BookingSeat bookingSeat, BigDecimal unitPrice) {
        this.booking = booking;
        this.event = booking.getEvent();
        this.ticketType = ticketType;
        this.bookingSeat = bookingSeat;
        this.unitPrice = unitPrice;
        this.code = TicketCode.generate();
    }

    static Ticket forSeat(Booking booking, BookingSeat seat) {
        return new Ticket(booking, seat.getTicketType(), seat, seat.getUnitPrice());
    }

    static Ticket forItem(Booking booking, BookingItem item) {
        return new Ticket(booking, item.getTicketType(), null, item.getUnitPrice());
    }

    /** Cancels an unused ticket. A ticket that was already used stays as a record of the entry. */
    void markVoid() {
        if (status == TicketStatus.VALID) {
            status = TicketStatus.VOID;
        }
    }

    public Long getId() {
        return id;
    }

    public Booking getBooking() {
        return booking;
    }

    public Event getEvent() {
        return event;
    }

    public TicketType getTicketType() {
        return ticketType;
    }

    public BookingSeat getBookingSeat() {
        return bookingSeat;
    }

    public String getCode() {
        return code;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public TicketStatus getStatus() {
        return status;
    }

    public Instant getCheckedInAt() {
        return checkedInAt;
    }

    public Long getCheckedInBy() {
        return checkedInBy;
    }
}
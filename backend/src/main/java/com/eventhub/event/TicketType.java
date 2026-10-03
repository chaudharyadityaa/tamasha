package com.eventhub.event;

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
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "ticket_types")
public class TicketType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    /** Set for general-admission types; null for reserved-seating types. */
    @Column(name = "quantity_total")
    private Integer quantityTotal;

    @Column(name = "quantity_sold", nullable = false)
    private int quantitySold = 0;

    /** Set for reserved-seating types (price applies to this venue section); null otherwise. */
    @Column(name = "seat_section", length = 50)
    private String seatSection;

    @Column(name = "max_per_booking", nullable = false)
    private int maxPerBooking;

    @Column(name = "sales_start")
    private Instant salesStart;

    @Column(name = "sales_end")
    private Instant salesEnd;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Required by JPA. Not for application code. */
    protected TicketType() {
    }

    private TicketType(Event event, String name, BigDecimal price, Integer quantityTotal,
                       String seatSection, int maxPerBooking, Instant salesStart, Instant salesEnd) {
        if (price == null || price.signum() < 0) {
            throw new IllegalArgumentException("Price cannot be negative");
        }
        if (price.scale() > 2) {
            throw new IllegalArgumentException("Price cannot have more than 2 decimal places");
        }
        if (maxPerBooking < 1 || maxPerBooking > 20) {
            throw new IllegalArgumentException("Max per booking must be between 1 and 20");
        }
        if (salesStart != null && salesEnd != null && !salesEnd.isAfter(salesStart)) {
            throw new IllegalArgumentException("Sales must end after they start");
        }
        this.event = event;
        this.name = name;
        this.price = price;
        this.quantityTotal = quantityTotal;
        this.seatSection = seatSection;
        this.maxPerBooking = maxPerBooking;
        this.salesStart = salesStart;
        this.salesEnd = salesEnd;
    }

    public static TicketType generalAdmission(Event event, String name, BigDecimal price,
                                              int quantityTotal, int maxPerBooking,
                                              Instant salesStart, Instant salesEnd) {
        if (quantityTotal <= 0) {
            throw new IllegalArgumentException("Quantity must be positive");
        }
        return new TicketType(event, name, price, quantityTotal, null, maxPerBooking, salesStart, salesEnd);
    }

    public static TicketType reservedSection(Event event, String name, BigDecimal price,
                                             String seatSection, int maxPerBooking,
                                             Instant salesStart, Instant salesEnd) {
        if (seatSection == null || seatSection.isBlank()) {
            throw new IllegalArgumentException("Seat section is required");
        }
        return new TicketType(event, name, price, null, seatSection, maxPerBooking, salesStart, salesEnd);
    }

    public Long getId() {
        return id;
    }

    public Event getEvent() {
        return event;
    }

    public String getName() {
        return name;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public Integer getQuantityTotal() {
        return quantityTotal;
    }

    public int getQuantitySold() {
        return quantitySold;
    }

    public String getSeatSection() {
        return seatSection;
    }

    public int getMaxPerBooking() {
        return maxPerBooking;
    }

    public Instant getSalesStart() {
        return salesStart;
    }

    public Instant getSalesEnd() {
        return salesEnd;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
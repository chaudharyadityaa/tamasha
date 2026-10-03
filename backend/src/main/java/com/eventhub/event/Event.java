package com.eventhub.event;

import com.eventhub.user.User;
import com.eventhub.venue.Venue;
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
import java.time.Instant;
import java.util.Locale;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "events")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizer_id", nullable = false)
    private User organizer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venue_id", nullable = false)
    private Venue venue;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    // The database column is TEXT (unlimited); length is enforced by request validation later.
    @Column(name = "description")
    private String description;

    @Column(name = "category", nullable = false, length = 50)
    private String category;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "seating_mode", nullable = false, length = 20)
    private SeatingMode seatingMode;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private EventStatus status = EventStatus.DRAFT;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "currency", nullable = false, length = 3)
    private String currency;

    @Column(name = "cancellation_cutoff_hours", nullable = false)
    private int cancellationCutoffHours = 24;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Required by JPA. Not for application code. */
    protected Event() {
    }

    public Event(User organizer, Venue venue, String title, String description,
                 String category, String imageUrl, Instant startsAt, Instant endsAt,
                 SeatingMode seatingMode, String currency) {
        requireValidSchedule(startsAt, endsAt);
        if (currency == null || currency.trim().length() != 3) {
            throw new IllegalArgumentException("Currency must be a 3-letter code such as INR");
        }
        this.organizer = organizer;
        this.venue = venue;
        this.title = title;
        this.description = description;
        this.category = category;
        this.imageUrl = imageUrl;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.seatingMode = seatingMode;
        this.currency = currency.trim().toUpperCase(Locale.ROOT);
    }

    public void updateDetails(String title, String description, String category,
                              String imageUrl, Instant startsAt, Instant endsAt) {
        requireValidSchedule(startsAt, endsAt);
        this.title = title;
        this.description = description;
        this.category = category;
        this.imageUrl = imageUrl;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
    }

    public void setCancellationCutoffHours(int hours) {
        if (hours < 0) {
            throw new IllegalArgumentException("Cancellation cutoff cannot be negative");
        }
        this.cancellationCutoffHours = hours;
    }

    public void publish() {
        if (status != EventStatus.DRAFT) {
            throw new IllegalStateException("Only a draft event can be published (current: " + status + ")");
        }
        status = EventStatus.PUBLISHED;
    }

    public void unpublish() {
        if (status != EventStatus.PUBLISHED) {
            throw new IllegalStateException("Only a published event can be unpublished (current: " + status + ")");
        }
        status = EventStatus.DRAFT;
    }

    public void cancel() {
        if (status == EventStatus.CANCELLED) {
            throw new IllegalStateException("Event is already cancelled");
        }
        status = EventStatus.CANCELLED;
    }

    private static void requireValidSchedule(Instant startsAt, Instant endsAt) {
        if (startsAt == null || endsAt == null || !endsAt.isAfter(startsAt)) {
            throw new IllegalArgumentException("Event must end after it starts");
        }
    }

    public Long getId() {
        return id;
    }

    public User getOrganizer() {
        return organizer;
    }

    public Venue getVenue() {
        return venue;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getCategory() {
        return category;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public SeatingMode getSeatingMode() {
        return seatingMode;
    }

    public EventStatus getStatus() {
        return status;
    }

    public String getCurrency() {
        return currency;
    }

    public int getCancellationCutoffHours() {
        return cancellationCutoffHours;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
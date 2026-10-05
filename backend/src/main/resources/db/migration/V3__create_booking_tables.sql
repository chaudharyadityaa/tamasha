-- V3: bookings, booking_items (general admission), booking_seats (reserved seats)

CREATE TABLE bookings (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reference       VARCHAR(20)    NOT NULL,
    user_id         BIGINT         NOT NULL REFERENCES users (id),
    event_id        BIGINT         NOT NULL REFERENCES events (id),
    status          VARCHAR(20)    NOT NULL DEFAULT 'PENDING_PAYMENT',
    total_amount    NUMERIC(12, 2) NOT NULL,
    currency        CHAR(3)        NOT NULL,
    expires_at      TIMESTAMPTZ    NOT NULL,
    confirmed_at    TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    idempotency_key VARCHAR(64),
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT ux_bookings_reference UNIQUE (reference),
    CONSTRAINT ux_bookings_id_event UNIQUE (id, event_id),
    CONSTRAINT ck_bookings_status CHECK (status IN ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED')),
    CONSTRAINT ck_bookings_total CHECK (total_amount >= 0),
    CONSTRAINT ck_bookings_cancelled_at CHECK ((status = 'CANCELLED') = (cancelled_at IS NOT NULL)),
    CONSTRAINT ck_bookings_confirmed_at CHECK (status <> 'CONFIRMED' OR confirmed_at IS NOT NULL)
);

CREATE INDEX idx_bookings_user_created ON bookings (user_id, created_at DESC);
CREATE INDEX idx_bookings_event ON bookings (event_id);
-- Lets the expiry sweeper find overdue holds quickly.
CREATE INDEX idx_bookings_pending_expiry ON bookings (expires_at) WHERE status = 'PENDING_PAYMENT';
-- The same customer cannot reuse an idempotency key (double-click / retry protection).
CREATE UNIQUE INDEX ux_bookings_idempotency ON bookings (user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE TABLE booking_items (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id     BIGINT         NOT NULL REFERENCES bookings (id),
    ticket_type_id BIGINT         NOT NULL REFERENCES ticket_types (id),
    quantity       INTEGER        NOT NULL,
    unit_price     NUMERIC(10, 2) NOT NULL,
    CONSTRAINT ux_booking_items_line UNIQUE (booking_id, ticket_type_id),
    CONSTRAINT ck_booking_items_quantity CHECK (quantity > 0),
    CONSTRAINT ck_booking_items_price CHECK (unit_price >= 0)
);

CREATE INDEX idx_booking_items_ticket_type ON booking_items (ticket_type_id);

CREATE TABLE booking_seats (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id     BIGINT         NOT NULL,
    event_id       BIGINT         NOT NULL,
    seat_id        BIGINT         NOT NULL REFERENCES seats (id),
    ticket_type_id BIGINT         NOT NULL REFERENCES ticket_types (id),
    unit_price     NUMERIC(10, 2) NOT NULL,
    released_at    TIMESTAMPTZ,
    -- The seat line must be for the same event as its booking.
    CONSTRAINT fk_booking_seats_booking_event FOREIGN KEY (booking_id, event_id)
        REFERENCES bookings (id, event_id),
    CONSTRAINT ux_booking_seats_booking_seat UNIQUE (booking_id, seat_id),
    CONSTRAINT ck_booking_seats_price CHECK (unit_price >= 0)
);

-- THE double-booking guard: at most one ACTIVE (not released) claim per seat per event.
CREATE UNIQUE INDEX ux_booking_seats_active_seat ON booking_seats (event_id, seat_id)
    WHERE released_at IS NULL;
CREATE INDEX idx_booking_seats_seat ON booking_seats (seat_id);
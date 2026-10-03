-- V1: core tables - users, venues, seats, events, ticket_types

CREATE TABLE users (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(120) NOT NULL,
    role          VARCHAR(20)  NOT NULL DEFAULT 'CUSTOMER',
    enabled       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_users_role CHECK (role IN ('CUSTOMER', 'ORGANIZER', 'ADMIN'))
);

CREATE UNIQUE INDEX ux_users_email_lower ON users (lower(email));

CREATE TABLE venues (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id     BIGINT       NOT NULL REFERENCES users (id),
    name         VARCHAR(150) NOT NULL,
    address_line VARCHAR(255) NOT NULL,
    city         VARCHAR(100) NOT NULL,
    region       VARCHAR(100),
    country      VARCHAR(100) NOT NULL,
    time_zone    VARCHAR(64)  NOT NULL DEFAULT 'Asia/Kolkata',
    capacity     INTEGER      NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_venues_capacity CHECK (capacity > 0)
);

CREATE INDEX idx_venues_owner ON venues (owner_id);
CREATE INDEX idx_venues_city ON venues (city);

CREATE TABLE seats (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    venue_id    BIGINT      NOT NULL REFERENCES venues (id),
    section     VARCHAR(50) NOT NULL,
    row_label   VARCHAR(10) NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    CONSTRAINT ux_seats_position UNIQUE (venue_id, section, row_label, seat_number)
);

CREATE TABLE events (
    id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    organizer_id             BIGINT       NOT NULL REFERENCES users (id),
    venue_id                 BIGINT       NOT NULL REFERENCES venues (id),
    title                    VARCHAR(200) NOT NULL,
    description              TEXT,
    category                 VARCHAR(50)  NOT NULL,
    image_url                VARCHAR(500),
    starts_at                TIMESTAMPTZ  NOT NULL,
    ends_at                  TIMESTAMPTZ  NOT NULL,
    seating_mode             VARCHAR(20)  NOT NULL,
    status                   VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    currency                 CHAR(3)      NOT NULL DEFAULT 'INR',
    cancellation_cutoff_hours INTEGER     NOT NULL DEFAULT 24,
    created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_events_time_order CHECK (ends_at > starts_at),
    CONSTRAINT ck_events_seating_mode CHECK (seating_mode IN ('GENERAL_ADMISSION', 'RESERVED_SEATING')),
    CONSTRAINT ck_events_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED')),
    CONSTRAINT ck_events_cutoff CHECK (cancellation_cutoff_hours >= 0)
);

CREATE INDEX idx_events_status_starts_at ON events (status, starts_at);
CREATE INDEX idx_events_organizer ON events (organizer_id);
CREATE INDEX idx_events_venue ON events (venue_id);

CREATE TABLE ticket_types (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    event_id         BIGINT         NOT NULL REFERENCES events (id),
    name             VARCHAR(100)   NOT NULL,
    price            NUMERIC(10, 2) NOT NULL,
    quantity_total   INTEGER,
    quantity_sold    INTEGER        NOT NULL DEFAULT 0,
    seat_section     VARCHAR(50),
    max_per_booking  INTEGER        NOT NULL DEFAULT 10,
    sales_start      TIMESTAMPTZ,
    sales_end        TIMESTAMPTZ,
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT ux_ticket_types_event_name UNIQUE (event_id, name),
    CONSTRAINT ck_ticket_types_price CHECK (price >= 0),
    CONSTRAINT ck_ticket_types_mode CHECK ((quantity_total IS NULL) <> (seat_section IS NULL)),
    CONSTRAINT ck_ticket_types_total CHECK (quantity_total IS NULL OR quantity_total > 0),
    CONSTRAINT ck_ticket_types_sold CHECK (quantity_sold >= 0 AND (quantity_total IS NULL OR quantity_sold <= quantity_total)),
    CONSTRAINT ck_ticket_types_max CHECK (max_per_booking BETWEEN 1 AND 20),
    CONSTRAINT ck_ticket_types_window CHECK (sales_start IS NULL OR sales_end IS NULL OR sales_end > sales_start)
);

CREATE UNIQUE INDEX ux_ticket_types_event_section
    ON ticket_types (event_id, seat_section) WHERE seat_section IS NOT NULL;
CREATE INDEX idx_ticket_types_event ON ticket_types (event_id);
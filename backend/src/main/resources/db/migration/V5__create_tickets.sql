-- V5: tickets (one per seat or per general-admission ticket bought), with check-in state.

CREATE TABLE tickets (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id      BIGINT         NOT NULL,
    event_id        BIGINT         NOT NULL,
    ticket_type_id  BIGINT         NOT NULL REFERENCES ticket_types (id),
    booking_seat_id BIGINT         REFERENCES booking_seats (id),
    code            VARCHAR(40)    NOT NULL,
    unit_price      NUMERIC(10, 2) NOT NULL,
    status          VARCHAR(20)    NOT NULL DEFAULT 'VALID',
    checked_in_at   TIMESTAMPTZ,
    checked_in_by   BIGINT         REFERENCES users (id),
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT ux_tickets_code UNIQUE (code),
    -- The ticket's event must be the booking's event.
    CONSTRAINT fk_tickets_booking_event FOREIGN KEY (booking_id, event_id)
        REFERENCES bookings (id, event_id),
    CONSTRAINT ck_tickets_status CHECK (status IN ('VALID', 'CHECKED_IN', 'VOID')),
    CONSTRAINT ck_tickets_price CHECK (unit_price >= 0),
    -- A ticket has a check-in time exactly when it is checked in.
    CONSTRAINT ck_tickets_checkin CHECK ((status = 'CHECKED_IN') = (checked_in_at IS NOT NULL))
);

-- A reserved seat is represented by at most one ticket.
CREATE UNIQUE INDEX ux_tickets_booking_seat ON tickets (booking_seat_id)
    WHERE booking_seat_id IS NOT NULL;
CREATE INDEX idx_tickets_booking ON tickets (booking_id);
CREATE INDEX idx_tickets_event_status ON tickets (event_id, status);
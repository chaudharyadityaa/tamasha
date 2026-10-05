-- V4: payment records. Only the DEMO provider exists for now (no money moves).

CREATE TABLE payments (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    booking_id         BIGINT         NOT NULL REFERENCES bookings (id),
    provider           VARCHAR(20)    NOT NULL,
    status             VARCHAR(20)    NOT NULL,
    amount             NUMERIC(12, 2) NOT NULL,
    currency           CHAR(3)        NOT NULL,
    provider_reference VARCHAR(100),
    created_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT ck_payments_status CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED')),
    CONSTRAINT ck_payments_amount CHECK (amount >= 0)
);

CREATE INDEX idx_payments_booking ON payments (booking_id);

-- A booking can never have two successful payments.
CREATE UNIQUE INDEX ux_payments_one_success_per_booking ON payments (booking_id)
    WHERE status = 'SUCCEEDED';

-- A provider's own reference can only be recorded once (protects against replayed callbacks later).
CREATE UNIQUE INDEX ux_payments_provider_reference ON payments (provider, provider_reference)
    WHERE provider_reference IS NOT NULL;
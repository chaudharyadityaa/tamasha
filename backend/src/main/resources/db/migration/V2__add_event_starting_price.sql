-- V2: stored "from" price for fast price filtering and sorting in public discovery.
-- It is set when an event is published (ticket types are frozen while published).

ALTER TABLE events ADD COLUMN starting_price NUMERIC(10, 2);

ALTER TABLE events ADD CONSTRAINT ck_events_starting_price
    CHECK (starting_price IS NULL OR starting_price >= 0);

-- Back-fill events that already have ticket types.
UPDATE events e
SET starting_price = (SELECT MIN(t.price) FROM ticket_types t WHERE t.event_id = e.id);
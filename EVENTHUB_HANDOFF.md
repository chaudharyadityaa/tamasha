# EventHub: project handoff

Paste this file into a new chat (or keep it in the repo as `docs/HANDOFF.md`) to continue exactly where this chat stopped.

**Where we stopped:** backend is complete and tested through **Checkpoint 10c** (169 tests expected). Next up is **Checkpoint 10d**. The frontend has not been started.

## How to start the new chat

Say something like:

> Continue building EventHub from Checkpoint 10d. Here is my handoff file. My backend is at `C:\Users\ASUS\Desktop\eventhub\backend`.

Then run these in PowerShell and paste the output, so the new chat can verify the real state instead of assuming it:

```powershell
cd C:\Users\ASUS\Desktop\eventhub
git status
git log --oneline -15
cd backend
.\mvnw.cmd clean test
```

Expected: a clean working tree (or only intended changes), and `Tests run: 169, Failures: 0, Errors: 0`.

## Working agreement

- Small verified checkpoints; wait for my confirmation before the next one.
- For each checkpoint: goal and reasoning, exact files, complete code, PowerShell commands with working directory, expected output, then troubleshoot from my real output.
- When a file needs more than one change, give the **full replacement file** (I once missed one of two edits).
- Never claim a command or test passed unless I showed the output.
- Beginner-friendly explanations of important decisions, professional code quality.

## Environment

- Repo: `C:\Users\ASUS\Desktop\eventhub` (git, branch `main`) with `backend\` and an empty `frontend\`.
- JDK 21.0.12, Git 2.44, Node 24, npm 11, Docker 29.8.0, Compose v5.5.1. Windows PowerShell.
- Spring Boot **4.1.1** (Hibernate 7, Spring Security 7, Jackson 3), Maven wrapper, Flyway, Testcontainers 2.
- PostgreSQL 17 in Docker: container `eventhub-db`, host port **5433**. Port 5432 belongs to a different project's container (`rohit-sweets-db`); do not touch it.
- IDE red marks can lag; trust `.\mvnw.cmd clean test`.

### Environment variables (set in the PowerShell session; never commit)

| Variable | Purpose |
|---|---|
| `EVENTHUB_DB_PASSWORD` | database password (same as `POSTGRES_PASSWORD` in the git-ignored `.env`) |
| `EVENTHUB_JWT_SECRET` | JWT signing secret, at least 32 random characters |
| `EVENTHUB_ADMIN_EMAIL`, `EVENTHUB_ADMIN_PASSWORD` | optional: creates the first admin at startup (password 12-72 chars) |
| `EVENTHUB_DEMO_PAYMENTS=true` | optional: enables the DEMO payment endpoint (never in production) |

Run the app:

```powershell
cd C:\Users\ASUS\Desktop\eventhub
docker compose up -d
cd backend
.\mvnw.cmd spring-boot:run
```

### Dev data in the local database

- `student@example.com`: ORGANIZER. `buyer1@example.com`, `buyer2@example.com`: customers. An admin exists if you set the admin variables. Passwords are the throwaway dev passwords from the checkpoint instructions.
- Events "Ghazal Evening" (general admission) and "Symphony Night" (reserved seating) exist.

## Architecture

Modular monolith under `com.eventhub`: `user`, `venue`, `event`, `seating`, `booking`, `security`, `auth`, `admin`, `config`, `common`. No Lombok. Entities use `@ManyToOne(LAZY)`, enums as strings, `Instant` timestamps, `BigDecimal` money, `ddl-auto=validate` (Flyway owns the schema).

### Migrations

| Version | Content |
|---|---|
| V1 | users, venues, seats, events, ticket_types |
| V2 | `events.starting_price` (set at publish) |
| V3 | bookings, booking_items, booking_seats; partial unique index `ux_booking_seats_active_seat` (`WHERE released_at IS NULL`); composite FK `(booking_id, event_id)`; idempotency unique index |
| V4 | payments; partial unique index allowing one `SUCCEEDED` payment per booking |

Never edit an applied migration. Add a new one.

### Endpoints so far

**Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`

**Public:** `GET /api/events` (q, category, city, from, to as UTC instants, minPrice, maxPrice, sort = date | date_desc | price_asc | price_desc | newest, page, size up to 50), `GET /api/events/{id}`, `GET /api/events/{id}/seats` (AVAILABLE / HELD / BOOKED)

**Customer:** `POST /api/bookings` (header `Idempotency-Key` optional), `GET /api/bookings/my?bucket=all|upcoming|past|cancelled`, `GET /api/bookings/{id}`, `POST /api/bookings/{id}/cancel`, `POST /api/bookings/{id}/demo-payment` (only when demo payments are enabled)

**Organizer (`/api/organizer/**`, role ORGANIZER):**
- venues: `POST`, `GET`, `GET /{id}`
- seats: `POST /venues/{id}/seat-blocks`, `GET /venues/{id}/seat-sections`, `DELETE /venues/{id}/seat-sections/{section}`
- events: `POST`, `GET`, `GET /{id}`, `PUT /{id}` (draft only), `POST /{id}/publish`, `/unpublish`, `/cancel`
- ticket types: `POST`, `GET`, `DELETE /{ticketTypeId}` under `/events/{id}/ticket-types`

**Admin (`/api/admin/**`, role ADMIN):** `GET /users`, `PUT /users/{id}/role`

### Key design decisions

- **Auth:** BCrypt, JWT access tokens (60 min, subject = user id, `role` claim), no refresh tokens yet. `ActorVerifier` re-checks the user and role in the database for sensitive actions (stale-token protection). Others' data returns 404, not 403.
- **Double-booking protection:** GA tickets use one atomic `UPDATE ... WHERE enough left`; reserved seats use the partial unique index; ids are claimed in sorted order to avoid deadlocks. `BookingService` uses `TransactionTemplate` so it can handle constraint violations after rollback (seat conflict, idempotent replay, reference retry).
- **Holds:** unpaid bookings hold seats/tickets for 15 minutes (`app.booking.hold-duration`). Expired seat holds are released at booking time; a scheduled sweeper (`SKIP LOCKED`) releases the rest.
- **State machine:** `PENDING_PAYMENT -> CONFIRMED | CANCELLED | EXPIRED`, `CONFIRMED -> CANCELLED`. Paid bookings can be cancelled until event start minus `cancellationCutoffHours` (default 24).
- **Payments:** no real provider. The DEMO payment is opt-in, labeled `demo: true`, and moves no money. A real provider would later add signed-webhook verification and idempotency.
- **Pessimistic locks:** `FOR UPDATE` on the event row for ticket-type changes and publish; on the venue row for seat changes; on the booking row for pay/cancel.

## Lessons learned

- In `@Transactional` tests, call `em.flush()` **before** `em.clear()`.
- Do not name a test helper the same as a static-imported method (`post`, `get`).
- Boot 4 test packages: `@DataJpaTest` in `org.springframework.boot.data.jpa.test.autoconfigure`, `@AutoConfigureMockMvc` in `org.springframework.boot.webmvc.test.autoconfigure`, `PostgreSQLContainer` in `org.testcontainers.postgresql`.

## Next steps

### Checkpoint 10d: protect bookings from organizer actions (not delivered yet)

- A `BookingGateway` **port interface in the `event` package**, implemented in the `booking` package (keeps the packages free of circular dependencies).
- Unpublish refused while active bookings exist (confirmed, or pending with time left).
- Cancelling an event cancels all its open bookings: releases seats and GA inventory, refunds demo payments, and ignores the customer cutoff window.
- Deleting a ticket type that any booking references is refused (409).
- Booking creation takes a `FOR SHARE` lock on the event row, so it cannot race with an organizer cancelling (`FOR UPDATE`).
- New: `GET /api/organizer/events/{id}/bookings` (paginated, customer name only) and `GET /api/organizer/events/{id}/stats` (bookings by status, confirmed revenue, per-ticket-type capacity / confirmed / held / available, occupancy %).
- Tests: guards, cascade, ownership, stats, plus a concurrency test of bookings racing an event cancellation.

### After 10d

1. Tickets with QR codes and server-side check-in (no repeat check-in), print-friendly ticket data.
2. Admin dashboard endpoints: platform stats, enable/disable users, manage events and bookings.
3. Hardening: login rate limiting, CORS for the frontend origin, decide on refresh tokens, Swagger/OpenAPI, README (setup, architecture, endpoints, env vars, tests, deployment).
4. React + TypeScript + Vite + Tailwind frontend using the real API.
5. GitHub presentation and free-tier deployment.

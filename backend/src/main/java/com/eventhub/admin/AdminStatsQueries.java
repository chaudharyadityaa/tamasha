package com.eventhub.admin;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Repository;

/** Grouped counting queries for the dashboard: the database does the work, not Java. */
@Repository
public class AdminStatsQueries {

    @PersistenceContext
    private EntityManager em;

    /** Counts per enum value, with 0 for values that have no rows. The query must select [enum, count]. */
    public <E extends Enum<E>> Map<E, Long> countsBy(String jpql, Class<E> enumType) {
        Map<E, Long> result = new EnumMap<>(enumType);
        for (E value : enumType.getEnumConstants()) {
            result.put(value, 0L);
        }
        for (Object[] row : em.createQuery(jpql, Object[].class).getResultList()) {
            result.put(enumType.cast(row[0]), ((Number) row[1]).longValue());
        }
        return result;
    }

    public long count(String jpql) {
        return ((Number) em.createQuery(jpql).getSingleResult()).longValue();
    }

    public long countAfter(String jpql, Instant now) {
        return ((Number) em.createQuery(jpql).setParameter("now", now).getSingleResult()).longValue();
    }

    /** Confirmed booking totals per currency. */
    public List<DashboardResponse.RevenueLine> confirmedRevenue() {
        String jpql = "select b.currency, sum(b.totalAmount) from Booking b "
                + "where b.status = com.eventhub.booking.BookingStatus.CONFIRMED "
                + "group by b.currency order by b.currency";
        return em.createQuery(jpql, Object[].class).getResultList().stream()
                .map(row -> new DashboardResponse.RevenueLine((String) row[0], (BigDecimal) row[1]))
                .toList();
    }
}
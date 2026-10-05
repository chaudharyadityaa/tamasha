package com.eventhub.booking;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.testsupport.TestFixtures;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

/** With the flag off (the default outside tests), the demo payment code does not even exist. */
@SpringBootTest(properties = "app.payments.demo-enabled=false")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@Transactional
class DemoPaymentDisabledTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private TestFixtures fx;
    @Autowired
    private ApplicationContext context;

    @Test
    void theDemoPaymentEndpointAndServiceAreAbsentWhenDisabled() throws Exception {
        User customer = fx.user(Role.CUSTOMER);

        assertThat(context.getBeanNamesForType(DemoPaymentService.class)).isEmpty();
        assertThat(context.getBeanNamesForType(DemoPaymentController.class)).isEmpty();
        mockMvc.perform(post("/api/bookings/1/demo-payment").header("Authorization", fx.bearer(customer)))
                .andExpect(status().isNotFound());
    }
}
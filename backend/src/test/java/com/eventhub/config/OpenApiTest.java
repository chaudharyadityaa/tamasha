package com.eventhub.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eventhub.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
class OpenApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void theApiDescriptionIsPublicAndDeclaresBearerAuthentication() throws Exception {
        mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.info.title").value("EventHub API"))
                .andExpect(jsonPath("$.paths['/api/events']").exists())
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer"));
    }

    @Test
    void theDocumentationIsSplitByAudience() throws Exception {
        mockMvc.perform(get("/v3/api-docs/organizer"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/organizer/venues']").exists())
                .andExpect(jsonPath("$.paths['/api/admin/users']").doesNotExist());
        mockMvc.perform(get("/v3/api-docs/admin"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/admin/dashboard']").exists());
    }

    @Test
    void swaggerUiIsServed() throws Exception {
        int statusCode = mockMvc.perform(get("/swagger-ui.html")).andReturn().getResponse().getStatus();

        assertThat(statusCode).isIn(200, 302); // springdoc redirects to /swagger-ui/index.html
    }
}
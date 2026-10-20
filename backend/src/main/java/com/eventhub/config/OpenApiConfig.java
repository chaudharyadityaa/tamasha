package com.eventhub.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String BEARER = "bearerAuth";

    @Bean
    public OpenAPI eventHubOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("EventHub API")
                        .version("1.0")
                        .description("Event discovery, seat and ticket booking, tickets with QR check-in, "
                                + "and organizer and admin tools. Log in with POST /api/auth/login, then press "
                                + "Authorize and paste the accessToken. Payments are DEMO only: no money moves."))
                .components(new Components().addSecuritySchemes(BEARER, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER));
    }

    // The documentation is split by audience, shown as a dropdown in Swagger UI.

    @Bean
    public GroupedOpenApi publicApi() {
        return GroupedOpenApi.builder().group("public").displayName("Auth and public browsing")
                .pathsToMatch("/api/auth/**", "/api/events/**").build();
    }

    @Bean
    public GroupedOpenApi customerApi() {
        return GroupedOpenApi.builder().group("customer").displayName("Customer: bookings and tickets")
                .pathsToMatch("/api/bookings/**", "/api/tickets/**").build();
    }

    @Bean
    public GroupedOpenApi organizerApi() {
        return GroupedOpenApi.builder().group("organizer").displayName("Organizer")
                .pathsToMatch("/api/organizer/**").build();
    }

    @Bean
    public GroupedOpenApi adminApi() {
        return GroupedOpenApi.builder().group("admin").displayName("Admin")
                .pathsToMatch("/api/admin/**").build();
    }
}
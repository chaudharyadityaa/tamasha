package com.eventhub.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.eventhub.TestcontainersConfiguration;
import com.eventhub.security.JwtProperties;
import com.eventhub.user.Role;
import com.eventhub.user.User;
import com.eventhub.user.UserRepository;
import com.jayway.jsonpath.JsonPath;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
@ActiveProfiles("test")
@Transactional
class LoginAndTokenTest {

    private static final String PASSWORD = "Sup3rSecret!";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository users;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtEncoder jwtEncoder; // the application's real signing encoder
    @Autowired
    private JwtProperties jwtProperties;

    private User saveUser(String email) {
        return users.saveAndFlush(new User(email, passwordEncoder.encode(PASSWORD), "Test User", Role.CUSTOMER));
    }

    private ResultActions login(String email, String password) throws Exception {
        String body = """
                {"email":"%s","password":"%s"}
                """.formatted(email, password);
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private String sign(JwtEncoder encoder, long userId, Instant issuedAt, Instant expiresAt, String issuer) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .subject(String.valueOf(userId))
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .claim("role", "ADMIN") // an attacker would claim the most powerful role
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    private ResultActions callMe(String token) throws Exception {
        return mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token));
    }

    @Test
    void loginReturnsATokenThatOpensTheMeEndpoint() throws Exception {
        saveUser("ana@example.com");

        MvcResult result = login("ana@example.com", PASSWORD)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value("ana@example.com"))
                .andExpect(jsonPath("$.user.role").value("CUSTOMER"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist())
                .andReturn();
        String token = JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");

        callMe(token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("ana@example.com"));
    }

    @Test
    void wrongPasswordGivesAGenericUnauthorized() throws Exception {
        saveUser("ana@example.com");

        login("ana@example.com", "wrong-password")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid email or password"));
    }

    @Test
    void unknownEmailGivesTheSameResponseAsAWrongPassword() throws Exception {
        login("nobody@example.com", PASSWORD)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid email or password"));
    }

    @Test
    void disabledAccountCannotLogIn() throws Exception {
        User user = saveUser("ana@example.com");
        user.setEnabled(false);
        users.saveAndFlush(user);

        login("ana@example.com", PASSWORD)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid email or password"));
    }

    @Test
    void meWithoutATokenIsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void garbageTokenIsUnauthorized() throws Exception {
        callMe("not.a.jwt").andExpect(status().isUnauthorized());
    }

    @Test
    void tokenSignedWithAnotherKeyIsRejectedEvenIfItClaimsToBeAdmin() throws Exception {
        User user = saveUser("ana@example.com");
        JwtEncoder forger = NimbusJwtEncoder
                .withSecretKey(new SecretKeySpec(
                        "a-completely-different-secret-key-0000".getBytes(StandardCharsets.UTF_8), "HmacSHA256"))
                .algorithm(MacAlgorithm.HS256)
                .build();
        Instant now = Instant.now();
        String forged = sign(forger, user.getId(), now, now.plus(1, ChronoUnit.HOURS), jwtProperties.issuer());

        callMe(forged).andExpect(status().isUnauthorized());
    }

    @Test
    void expiredTokenIsRejected() throws Exception {
        User user = saveUser("ana@example.com");
        Instant now = Instant.now();
        String expired = sign(jwtEncoder, user.getId(),
                now.minus(2, ChronoUnit.HOURS), now.minus(1, ChronoUnit.HOURS), jwtProperties.issuer());

        callMe(expired).andExpect(status().isUnauthorized());
    }

    @Test
    void tokenFromAnotherIssuerIsRejected() throws Exception {
        User user = saveUser("ana@example.com");
        Instant now = Instant.now();
        String wrongIssuer = sign(jwtEncoder, user.getId(), now, now.plus(1, ChronoUnit.HOURS), "someone-else");

        callMe(wrongIssuer).andExpect(status().isUnauthorized());
    }
}
# syntax=docker/dockerfile:1

# ---- Stage 1: build the application ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace

# Copy the build definition first, so downloaded dependencies stay cached until pom.xml changes.
COPY mvnw pom.xml ./
COPY .mvn .mvn
# Windows may have saved the script with CRLF line endings, which Linux cannot run.
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw && ./mvnw -B -ntp dependency:go-offline

COPY src src
# The tests run in CI (they need Docker for Testcontainers, which is not available while building an image).
RUN ./mvnw -B -ntp -DskipTests package

# ---- Stage 2: a small runtime image without the build tools ----
FROM eclipse-temurin:21-jre
RUN useradd --system --uid 10001 --no-create-home app
WORKDIR /app
COPY --from=build /workspace/target/*.jar app.jar
USER app

# Conservative memory settings for a 512 MB container: a single-threaded collector, fast startup compilation,
# small thread stacks, and a heap capped at about half of the container memory. Override with JAVA_OPTS if needed.
ENV JAVA_OPTS="-XX:+UseSerialGC -XX:MaxRAMPercentage=55 -XX:TieredStopAtLevel=1 -Xss512k"

EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
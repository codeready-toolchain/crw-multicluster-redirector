# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Quarkus-based multicluster redirector service for Developer Sandbox/CodeReady Workspaces (CRW). It provides a simple HTTP filter-based redirection mechanism and exposes configuration via REST endpoints.

## Build & Development Commands

### Development Mode
```bash
./mvnw compile quarkus:dev
```
Enables live coding with hot reload.

### Testing
```bash
# Run all tests
./mvnw test

# Run a single test class
./mvnw test -Dtest=ConfigurationProviderTest

# Run native integration tests
./mvnw verify -Pnative
```

### Building
```bash
# Standard JAR build
./mvnw package

# Uber JAR build
./mvnw package -Dquarkus.package.type=uber-jar

# Native executable
./mvnw package -Pnative

# Native build in container (no GraalVM required locally)
./mvnw package -Pnative -Dquarkus.native.container-build=true
```

### Container Images
```bash
# Build container image
./mvnw clean package -Dquarkus.container-image.build=true

# Build and push to registry
./mvnw clean package -Dquarkus.container-image.push=true

# Build and push native image
./mvnw package -Pnative -Dquarkus.native.container-build=true -Dquarkus.container-image.build=true -Dquarkus.container-image.push=true
```

### Deployment
```bash
# Deploy to OpenShift
oc process -f deploy/crw-multicluster-redirector.yaml | oc apply -f -
```

## Architecture

### Core Components

**RootFilter** (`src/main/java/.../filter/RootFilter.java`)
- Servlet filter intercepting all requests (`/*`)
- Handles 404 responses by redirecting non-file requests to `/`
- Uses pattern matching to distinguish files from routes (checks for file extensions)
- Key behavior: If a resource isn't found and doesn't look like a file, redirect to root

**ConfigurationProvider** (`src/main/java/.../config/ConfigurationProvider.java`)
- REST endpoint at `/config`
- Returns the registration service URL configured in application.properties
- Allows runtime configuration retrieval

**Health Probes** (`src/main/java/.../health/`)
- `LivenessProbe`: Exposes `/health/live` for Kubernetes liveness checks
- `ReadinessProbe`: Exposes `/health/ready` for Kubernetes readiness checks
- Both use MicroProfile Health

### Configuration

**application.properties** contains:
- `developer.sandbox.registration-service.url`: Main registration service URL
- `%dev.developer.sandbox.registration-service.url`: Dev profile override (CRC testing)
- Container image settings (registry: quay.io, image name)

Dev profile (`%dev.`) is used when running `./mvnw quarkus:dev`.

### Technology Stack

- **Quarkus 3.12.0**: Framework
- **Java 11**: Language version
- **RESTEasy**: REST endpoints
- **Undertow**: Servlet container
- **SmallRye Health**: Health check implementation
- **Kubernetes Config**: Configuration integration
- **Maven**: Build tool

### Testing Structure

Tests follow Quarkus conventions:
- `*Test.java`: Standard JUnit 5 tests running in JVM mode
- `Native*IT.java`: Integration tests for native builds (run with `mvnw verify -Pnative`)

Each main component has corresponding test coverage in mirrored package structure under `src/test/java/`.

## Key Patterns

1. **404 Handling**: The application treats 404s specially - non-file paths are redirected to `/` to support SPA-like routing
2. **Environment Profiles**: Dev vs production URLs configured via Quarkus profiles
3. **Health Endpoints**: Standard K8s health checks at `/health/live` and `/health/ready`
4. **Config Endpoint**: `/config` endpoint exposes runtime configuration
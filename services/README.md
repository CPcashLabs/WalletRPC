# services

## Directory Positioning
This directory contains chain-facing service abstractions.

## Main Code Scope
- TRON and fee-related runtime service logic.

## Functional Role
- Encapsulates chain protocol details and fee calculations.
- Exposes reusable service APIs to wallet hooks and transaction flows.

## Architectural Constraint (P0)
- All service-layer network calls must be RPC-only (no centralized backend business APIs).
- Service logic must not introduce telemetry, analytics, or user-identifying uploads.

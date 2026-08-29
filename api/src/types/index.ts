export * from "./openapi.js";
import type { components } from "./openapi.js";

/** Response payload for GET /health. */
export type HealthResponse = components["schemas"]["HealthResponse"];
/** Unified success envelope from the spec. */
export type APIResponse = components["schemas"]["APIResponse"];
/** Pagination fields carried by collection responses. */
export type Pagination = components["schemas"]["Pagination"];
/** Request body for POST /auth/register. */
export type RegisterRequest = components["schemas"]["RegisterRequest"];
/** Request body for POST /auth/login. */
export type LoginRequest = components["schemas"]["LoginRequest"];
/** Response payload for auth endpoints. */
export type AuthResult = components["schemas"]["AuthResult"];
/** Public user representation. */
export type User = components["schemas"]["User"];

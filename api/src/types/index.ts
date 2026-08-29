export * from "./openapi.js";
import type { components } from "./openapi.js";

/** Response payload for GET /health. */
export type HealthResponse = components["schemas"]["HealthResponse"];
/** Unified success envelope from the spec. */
export type APIResponse = components["schemas"]["APIResponse"];
/** Pagination fields carried by collection responses. */
export type Pagination = components["schemas"]["Pagination"];

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
/** Result of POST /auth/register. */
export type RegisterResult = components["schemas"]["RegisterResult"];
/** Request body for POST /auth/setup-2fa. */
export type SetupTwoFactorRequest = components["schemas"]["SetupTwoFactorRequest"];
/** Response payload for POST /auth/setup-2fa. */
export type SetupTwoFactorResult = components["schemas"]["SetupTwoFactorResult"];
/** Result of POST /auth/login: proof the password was accepted. */
export type PendingLogin = components["schemas"]["PendingLogin"];
/** Request body for POST /auth/verify-totp. */
export type VerifyTotpRequest = components["schemas"]["VerifyTotpRequest"];
/** Public user representation. */
export type User = components["schemas"]["User"];
/** Organization view with the caller's role. */
export type Organization = components["schemas"]["Organization"];
/** Organization member with user info. */
export type Member = components["schemas"]["Member"];
/** Request body for POST /organizations. */
export type CreateOrganizationRequest = components["schemas"]["CreateOrganizationRequest"];
/** Request body for POST /organizations/{orgId}/members. */
export type InviteMemberRequest = components["schemas"]["InviteMemberRequest"];
/** Request body for PATCH /organizations/{orgId}/members/{userId}. */
export type ChangeMemberRoleRequest = components["schemas"]["ChangeMemberRoleRequest"];
/** Project view. */
export type Project = components["schemas"]["Project"];
/** Task view. */
export type Task = components["schemas"]["Task"];
/** Request body for POST /organizations/{orgId}/projects. */
export type CreateProjectRequest = components["schemas"]["CreateProjectRequest"];
/** Request body for POST /projects/{projectId}/tasks. */
export type CreateTaskRequest = components["schemas"]["CreateTaskRequest"];
/** Request body for PATCH /tasks/{taskId}. */
export type UpdateTaskRequest = components["schemas"]["UpdateTaskRequest"];


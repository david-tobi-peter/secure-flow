export * from "./1788044400000-CreateUsers.js";
export * from "./1788050000000-CreateOrganizationsAndMemberships.js";
export * from "./1788060000000-AddMembershipRoleCheck.js";
export * from "./1788070000000-CreateProjectsAndTasks.js";
import { CreateUsers1788044400000 } from "./1788044400000-CreateUsers.js";
import { CreateOrganizationsAndMemberships1788050000000 } from "./1788050000000-CreateOrganizationsAndMemberships.js";
import { AddMembershipRoleCheck1788060000000 } from "./1788060000000-AddMembershipRoleCheck.js";
import { CreateProjectsAndTasks1788070000000 } from "./1788070000000-CreateProjectsAndTasks.js";

/** All migrations; registered on the data source. */
export const migrations = [
  CreateUsers1788044400000,
  CreateOrganizationsAndMemberships1788050000000,
  AddMembershipRoleCheck1788060000000,
  CreateProjectsAndTasks1788070000000,
];

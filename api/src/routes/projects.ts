import { Router } from "express";
import { Container } from "typedi";
import { ProjectController, TaskController } from "@/controllers/index.js";
import { requireAuth } from "@/middleware/index.js";

const projectController = Container.get(ProjectController);
const taskController = Container.get(TaskController);

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

projectsRouter.post("/organizations/:orgId/projects", projectController.create);
projectsRouter.get("/organizations/:orgId/projects", projectController.list);
projectsRouter.get("/organizations/:orgId/projects/:projectId", projectController.get);
projectsRouter.delete("/organizations/:orgId/projects/:projectId", projectController.delete);

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

tasksRouter.get("/organizations/:orgId/projects/:projectId/tasks", taskController.list);
tasksRouter.post("/organizations/:orgId/projects/:projectId/tasks", taskController.create);
tasksRouter.get(
  "/organizations/:orgId/projects/:projectId/tasks/:taskId",
  taskController.get,
);
tasksRouter.patch(
  "/organizations/:orgId/projects/:projectId/tasks/:taskId",
  taskController.update,
);
tasksRouter.delete(
  "/organizations/:orgId/projects/:projectId/tasks/:taskId",
  taskController.delete,
);

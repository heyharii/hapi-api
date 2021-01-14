import Hapi from "@hapi/hapi";
import Joi from "joi";
import Boom from "@hapi/boom";
import { isTaskOfUserOrAdmin, isBoardOfUserOrAdmin } from "../auth-helpers";

const tasksPlugin = {
  name: "app/tasks",
  dependencies: ["prisma"],
  register: async function (server: Hapi.Server) {
    server.route([
      {
        method: "GET",
        path: "/boards/{boardId}/tasks",
        handler: getTasksHandler,
        options: {
          auth: {
            mode: "required",
          },
          cors: true,
          pre: [isBoardOfUserOrAdmin],
          validate: {
            params: Joi.object({
              boardId: Joi.number().integer(),
            }),
            failAction: (request, h, err) => {
              throw err;
            },
          },
        },
      },
      {
        method: "GET",
        path: "/tasks/{taskId}",
        handler: getTaskHandler,
        options: {
          auth: {
            mode: "required",
          },
          cors: true,
          pre: [isTaskOfUserOrAdmin],
          validate: {
            params: Joi.object({
              taskId: Joi.number().integer(),
            }),
            failAction: (request, h, err) => {
              throw err;
            },
          },
        },
      },
      {
        method: "POST",
        path: "/boards/{boardId}/tasks",
        handler: createTaskHandler,
        options: {
          pre: [isBoardOfUserOrAdmin],
          auth: {
            mode: "required",
          },
          cors: true,
          validate: {
            params: Joi.object({
              boardId: Joi.number().integer(),
            }),
            payload: createTaskValidator,
            failAction: (request, h, err) => {
              throw err;
            },
          },
        },
      },
      {
        method: "PUT",
        path: "/tasks/{taskId}",
        handler: updateTaskHandler,
        options: {
          pre: [isTaskOfUserOrAdmin],
          auth: {
            mode: "required",
          },
          cors: true,
          validate: {
            params: Joi.object({
              taskId: Joi.number().integer(),
            }),
            payload: updateTaskValidator,
            failAction: (request, h, err) => {
              throw err;
            },
          },
        },
      },
      {
        method: "DELETE",
        path: "/tasks/{taskId}",
        handler: deleteTaskHandler,
        options: {
          pre: [isTaskOfUserOrAdmin],
          auth: {
            mode: "required",
          },
          cors: true,
          validate: {
            params: Joi.object({
              taskId: Joi.number().integer(),
            }),
            failAction: (request, h, err) => {
              throw err;
            },
          },
        },
      },
      {
        method: "PUT",
        path: "/tasks/{taskId}/move/target/{boardId}",
        handler: moveTaskHandler,
        options: {
          pre: [isTaskOfUserOrAdmin],
          auth: {
            mode: "required",
          },
          cors: true,
          validate: {
            params: Joi.object({
              taskId: Joi.number().integer(),
              boardId: Joi.number().integer(),
            }),
            failAction: (request, h, err) => {
              throw err;
            },
          },
        },
      },
    ]);
  },
};

export default tasksPlugin;

const taskInputValidator = Joi.object({
  title: Joi.string().alter({
    create: (schema) => schema.required(),
    update: (schema) => schema.optional(),
  }),
  weight: Joi.number().alter({
    create: (schema) => schema.required(),
    update: (schema) => schema.optional(),
  }),
});

const createTaskValidator = taskInputValidator.tailor("create");
const updateTaskValidator = taskInputValidator.tailor("update");

interface TaskInput {
  title: string;
  weight: number;
}

async function getTasksHandler(request: Hapi.Request, h: Hapi.ResponseToolkit) {
  const { prisma } = request.server.app;
  const boardId = parseInt(request.params.boardId, 10);

  try {
    const task = await prisma.task.findMany({
      where: {
        boardId: boardId,
      },
    });
    if (!task) {
      return h.response().code(404);
    } else {
      return h.response(task).code(200);
    }
  } catch (err) {
    request.log("error", err);
    return Boom.badImplementation("failed to get task");
  }
}

async function getTaskHandler(request: Hapi.Request, h: Hapi.ResponseToolkit) {
  const { prisma } = request.server.app;
  const taskId = parseInt(request.params.taskId, 10);

  try {
    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
      },
    });
    if (!task) {
      return h.response().code(404);
    } else {
      return h.response(task).code(200);
    }
  } catch (err) {
    request.log("error", err);
    return Boom.badImplementation("failed to get task");
  }
}

async function createTaskHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const payload = request.payload as TaskInput;
  const boardId = parseInt(request.params.boardId, 10);
  const { userId } = request.auth.credentials;

  try {
    const createdTask = await prisma.task.create({
      data: {
        title: payload.title,
        weight: payload.weight,
        board: {
          connect: {
            id: boardId,
          },
        },
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
    return h.response(createdTask).code(201);
  } catch (err) {
    request.log("error", err);
    return Boom.badImplementation("failed to create task");
  }
}

async function deleteTaskHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const taskId = parseInt(request.params.taskId, 10);

  try {
    await prisma.task.delete({
      where: {
        id: taskId,
      },
    });
    return h.response().code(204);
  } catch (err) {
    request.log("error", err);
    return Boom.badImplementation("failed to delete task");
  }
}

async function updateTaskHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const taskId = parseInt(request.params.taskId, 10);
  const payload = request.payload as Partial<TaskInput>;

  try {
    const updatedTask = await prisma.task.update({
      where: {
        id: taskId,
      },
      data: payload,
    });
    return h.response(updatedTask).code(200);
  } catch (err) {
    request.log("error", err);
    return Boom.badImplementation("failed to update task");
  }
}

async function moveTaskHandler(request: Hapi.Request, h: Hapi.ResponseToolkit) {
  const { prisma } = request.server.app;
  const taskId = parseInt(request.params.taskId, 10);
  const boardId = parseInt(request.params.boardId, 10);

  try {
    const updatedTask = await prisma.task.update({
      where: {
        id: taskId,
      },
      data: {
        board: {
          connect: {
            id: boardId,
          },
        },
      },
    });
    return h.response(updatedTask).code(200);
  } catch (err) {
    request.log("error", err);
    return Boom.badImplementation("failed to update task");
  }
}

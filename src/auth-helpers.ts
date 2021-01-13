import Hapi from "@hapi/hapi";
import Boom from "@hapi/boom";

export async function isAdmin(request: Hapi.Request, h: Hapi.ResponseToolkit) {
  if (request.auth.credentials.isAdmin) {
    return h.continue;
  }

  throw Boom.forbidden();
}

export async function isRequestedUserOrAdmin(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { userId, isAdmin } = request.auth.credentials;

  if (isAdmin) {
    return h.continue;
  }

  const requestedUserId = parseInt(request.params.userId, 10);

  if (requestedUserId === userId) {
    return h.continue;
  }

  throw Boom.forbidden();
}

export async function isBoardOfUserOrAdmin(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { isAdmin, userId } = request.auth.credentials;

  if (isAdmin) {
    return h.continue;
  }

  const boardId = parseInt(request.params.boardId, 10);

  const { prisma } = request.server.app;
  const board = await prisma.board.findUnique({
    where: {
      id: boardId,
    },
  });

  if (!board) {
    throw Boom.notFound("Board not found");
  }

  if (board?.userId === userId) {
    return h.continue;
  }
  throw Boom.forbidden();
}

export async function isTaskOfUserOrAdmin(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { isAdmin, userId } = request.auth.credentials;

  if (isAdmin) {
    return h.continue;
  }

  const taskId = parseInt(request.params.taskId, 10);

  const { prisma } = request.server.app;
  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
    },
  });

  if (!task) {
    throw Boom.notFound("Task not found");
  }

  if (task?.userId === userId) {
    return h.continue;
  }
  throw Boom.forbidden();
}

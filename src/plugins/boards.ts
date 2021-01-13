import Hapi from "@hapi/hapi";
import Joi from "joi";
import Boom from "@hapi/boom";
import { isBoardOfUserOrAdmin, isRequestedUserOrAdmin } from "../auth-helpers";

const boardsPlugin = {
  name: "app/boards",
  dependencies: ["prisma"],
  register: async function (server: Hapi.Server) {
    server.route([
      {
        method: "GET",
        path: "/boards/{boardId}",
        handler: getBoardHandler,
        options: {
          pre: [isBoardOfUserOrAdmin],
          auth: {
            mode: "required",
          },
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
        path: "/boards",
        handler: getBoardsHandler,
        options: {
          auth: {
            mode: "required",
          },
        },
      },
      {
        method: "POST",
        path: "/boards",
        handler: createBoardHandler,
        options: {
          auth: {
            mode: "required",
          },
          validate: {
            payload: createBoardValidator,
            failAction: (request, h, err) => {
              throw err;
            },
          },
        },
      },
      {
        method: "PUT",
        path: "/boards/{boardId}",
        handler: updateBoardHandler,
        options: {
          pre: [isBoardOfUserOrAdmin],
          auth: {
            mode: "required",
          },
          validate: {
            params: Joi.object({
              boardId: Joi.number().integer(),
            }),
            payload: updateBoardValidator,
            failAction: (request, h, err) => {
              throw err;
            },
          },
        },
      },
      {
        method: "DELETE",
        path: "/boards/{boardId}",
        handler: deleteBoardHandler,
        options: {
          pre: [isBoardOfUserOrAdmin],
          auth: {
            mode: "required",
          },
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
    ]);
  },
};

export default boardsPlugin;

const boardInputValidator = Joi.object({
  title: Joi.string().alter({
    create: (schema) => schema.required(),
    update: (schema) => schema.optional(),
  }),
  description: Joi.string().alter({
    create: (schema) => schema.required(),
    update: (schema) => schema.optional(),
  }),
});

const createBoardValidator = boardInputValidator.tailor("create");
const updateBoardValidator = boardInputValidator.tailor("update");

interface BoardInput {
  title: string;
  description: string;
}

async function getBoardHandler(request: Hapi.Request, h: Hapi.ResponseToolkit) {
  const { prisma } = request.server.app;
  const boardId = parseInt(request.params.boardId, 10);

  try {
    const board = await prisma.board.findUnique({
      where: {
        id: boardId,
      },
    });
    if (!board) {
      return h.response().code(404);
    } else {
      return h.response(board).code(200);
    }
  } catch (err) {
    request.log("error", err);
    return Boom.badImplementation("failed to get board");
  }
}

async function getBoardsHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const { userId } = request.auth.credentials;

  try {
    const boards = await prisma.board.findMany({
      where: {
        userId: userId,
      },
    });
    return h.response(boards).code(200);
  } catch (err) {
    request.log("error", err);
    return Boom.badImplementation("failed to get board");
  }
}

async function createBoardHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const payload = request.payload as BoardInput;
  const { userId } = request.auth.credentials;

  try {
    const createdBoard = await prisma.board.create({
      data: {
        title: payload.title,
        description: payload.description,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
    return h.response(createdBoard).code(201);
  } catch (err) {
    request.log("error", err);
    return Boom.badImplementation("failed to create board");
  }
}

async function updateBoardHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const boardId = parseInt(request.params.boardId, 10);
  const payload = request.payload as Partial<BoardInput>;

  try {
    const updatedBoard = await prisma.board.update({
      where: {
        id: boardId,
      },
      data: payload,
    });
    return h.response(updatedBoard).code(200);
  } catch (err) {
    request.log("error", err);
    return Boom.badImplementation("failed to update board");
  }
}

async function deleteBoardHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const boardId = parseInt(request.params.boardId, 10);

  try {
    await prisma.$transaction([
      prisma.task.deleteMany({
        where: {
          boardId: boardId,
        },
      }),
      prisma.board.delete({
        where: {
          id: boardId,
        },
      }),
    ]);
    return h.response().code(204);
  } catch (err) {
    request.log("error", err);
    return Boom.badImplementation("failed to delete board");
  }
}

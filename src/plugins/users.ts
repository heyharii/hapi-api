import Hapi from "@hapi/hapi";
import Joi from "joi";
import Boom from "@hapi/boom";
import { isAdmin, isRequestedUserOrAdmin } from "../auth-helpers";

const usersPlugin = {
  name: "app/users",
  dependencies: ["prisma"],
  register: async function (server: Hapi.Server) {
    server.route([
      {
        method: "GET",
        path: "/users",
        handler: getUsersHandler,
        options: {
          pre: [isAdmin],
          auth: {
            mode: "required",
          },
          cors: true,
          validate: {
            failAction: (request, h, err) => {
              throw err;
            },
          },
        },
      },
      {
        method: "GET",
        path: "/users/{userId}",
        handler: getUserHandler,
        options: {
          pre: [isRequestedUserOrAdmin],
          auth: {
            mode: "required",
          },
          cors: true,
          validate: {
            params: Joi.object({
              userId: Joi.number().integer(),
            }),
            failAction: (request, h, err) => {
              throw err;
            },
          },
        },
      },
      {
        method: "POST",
        path: "/users",
        handler: createUserHandler,
        options: {
          pre: [isAdmin],
          auth: {
            mode: "required",
          },
          cors: true,
          validate: {
            payload: userInputValidator,
            failAction: (request, h, err) => {
              throw err;
            },
          },
        },
      },
      {
        method: "DELETE",
        path: "/users/{userId}",
        handler: deleteUserHandler,
        options: {
          pre: [isAdmin],
          auth: {
            mode: "required",
          },
          cors: true,
          validate: {
            params: Joi.object({
              userId: Joi.number().integer(),
            }),
            failAction: (request, h, err) => {
              throw err;
            },
          },
        },
      },
      {
        method: "PUT",
        path: "/users/{userId}",
        handler: updateUserHandler,
        options: {
          pre: [isRequestedUserOrAdmin],
          auth: {
            mode: "required",
          },
          cors: true,
          validate: {
            params: Joi.object({
              userId: Joi.number().integer(),
            }),
            payload: userInputValidator,
            failAction: (request, h, err) => {
              throw err;
            },
          },
        },
      },
    ]);
  },
};

export default usersPlugin;

const userInputValidator = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().optional(),
  email: Joi.string().email().required(),
});

interface UserInput {
  firstName: string;
  lastName: string;
  email: string;
  social: {
    facebook?: string;
    twitter?: string;
    github?: string;
    website?: string;
  };
}

async function getUsersHandler(request: Hapi.Request, h: Hapi.ResponseToolkit) {
  const { prisma } = request.server.app;

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
    return h.response(users).code(200);
  } catch (err) {
    request.log("error", err);
    return Boom.badImplementation("failed to get users");
  }
}

async function getUserHandler(request: Hapi.Request, h: Hapi.ResponseToolkit) {
  const { prisma } = request.server.app;
  const userId = parseInt(request.params.userId, 10);

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
    if (!user) {
      return h.response().code(404);
    } else {
      return h.response(user).code(200);
    }
  } catch (err) {
    request.log("error", err);
    return Boom.badImplementation("failed to get user");
  }
}

async function createUserHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const payload = request.payload as UserInput;

  try {
    const createdUser = await prisma.user.create({
      data: {
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
    return h.response(createdUser).code(201);
  } catch (err) {
    request.log("error", err);
    return Boom.badImplementation("failed to create user");
  }
}

async function deleteUserHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const userId = parseInt(request.params.userId, 10);

  try {
    await prisma.$transaction([
      prisma.token.deleteMany({
        where: {
          userId: userId,
        },
      }),
      prisma.user.delete({
        where: {
          id: userId,
        },
      }),
    ]);

    return h.response().code(204);
  } catch (err) {
    request.log("error", err);
    return Boom.badImplementation("failed to delete user");
  }
}

async function updateUserHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const userId = parseInt(request.params.userId, 10);
  const payload = request.payload as Partial<UserInput>;

  try {
    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: payload,
    });
    return h.response(updatedUser).code(200);
  } catch (err) {
    request.log("error", err);
    return Boom.badImplementation("failed to update user");
  }
}

import Hapi from "@hapi/hapi";
import Joi from "joi";
import Boom from "@hapi/boom";
import jwt from "jsonwebtoken";
import { add } from "date-fns";

declare module "@hapi/hapi" {
  interface AuthCredentials {
    userId: number;
    tokenId: number;
    isAdmin: boolean;
  }
}

const authPlugin: Hapi.Plugin<null> = {
  name: "app/auth",
  dependencies: ["prisma", "hapi-auth-jwt2"],
  register: async function (server: Hapi.Server) {
    if (!process.env.JWT_SECRET) {
      server.log(
        "warn",
        "The JWT_SECRET env var is not set. This is unsafe! If running in production, set it."
      );
    }

    server.auth.strategy(API_AUTH_STATEGY, "jwt", {
      key: JWT_SECRET,
      verifyOptions: { algorithms: [JWT_ALGORITHM] },
      validate: validateAPIToken,
    });

    server.auth.default(API_AUTH_STATEGY);

    server.route([
      {
        method: "POST",
        path: "/auth",
        handler: authenticateHandler,
        options: {
          auth: false,
          validate: {
            payload: Joi.object({
              email: Joi.string().email().required(),
            }),
          },
        },
      },
    ]);
  },
};
export default authPlugin;

export const API_AUTH_STATEGY = "API";

const JWT_SECRET = process.env.JWT_SECRET || "SUPER_SECRET_JWT_SECRET";

const JWT_ALGORITHM = "HS256";

const AUTHENTICATION_TOKEN_EXPIRATION_HOURS = 168;

const apiTokenSchema = Joi.object({
  tokenId: Joi.number().integer().required(),
});

interface APITokenPayload {
  tokenId: number;
}

interface AuthenticateInput {
  email: string;
}

const validateAPIToken = async (
  decoded: APITokenPayload,
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) => {
  const { prisma } = request.server.app;
  const { tokenId } = decoded;
  const { error } = apiTokenSchema.validate(decoded);

  if (error) {
    request.log(["error", "auth"], `API token error: ${error.message}`);
    return { isValid: false };
  }

  try {
    const fetchedToken = await prisma.token.findUnique({
      where: {
        id: tokenId,
      },
      include: {
        user: true,
      },
    });

    if (!fetchedToken || !fetchedToken?.valid) {
      return { isValid: false, errorMessage: "Invalid token" };
    }

    if (fetchedToken.expiration < new Date()) {
      return { isValid: false, errorMessage: "Token expired" };
    }

    return {
      isValid: true,
      credentials: {
        tokenId: decoded.tokenId,
        userId: fetchedToken.userId,
        isAdmin: fetchedToken.user.isAdmin,
      },
    };
  } catch (error) {
    request.log(["error", "auth", "db"], error);
    return { isValid: false, errorMessage: "DB Error" };
  }
};

async function authenticateHandler(
  request: Hapi.Request,
  h: Hapi.ResponseToolkit
) {
  const { prisma } = request.server.app;
  const { email } = request.payload as AuthenticateInput;

  try {
    const fetchEmail = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });

    if (!fetchEmail) {
      return Boom.unauthorized();
    }

    if (fetchEmail) {
      const tokenExpiration = add(new Date(), {
        hours: AUTHENTICATION_TOKEN_EXPIRATION_HOURS,
      });
      const createdToken = await prisma.token.create({
        data: {
          expiration: tokenExpiration,
          user: {
            connect: {
              email,
            },
          },
        },
      });

      const authToken = generateAuthToken(createdToken.id);
      return h.response({ token: authToken }).code(200);
    } else {
      return Boom.unauthorized();
    }
  } catch (error) {
    return Boom.badImplementation(error.message);
  }
}

function generateAuthToken(tokenId: number): string {
  const jwtPayload = { tokenId };

  return jwt.sign(jwtPayload, JWT_SECRET, {
    algorithm: JWT_ALGORITHM,
    noTimestamp: true,
  });
}

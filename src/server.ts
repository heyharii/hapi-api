import Hapi from "@hapi/hapi";
import hapiAuthJWT from "hapi-auth-jwt2";
import prismaPlugin from "./plugins/prisma";
import dotenv from "dotenv";
import usersPlugin from "./plugins/users";
import authPlugin from "./plugins/auth";
import boardsPlugin from "./plugins/boards";
import tasksPlugin from "./plugins/tasks";

dotenv.config();

const server: Hapi.Server = Hapi.server({
  port: process.env.PORT || 3000,
  host: process.env.HOST || "0.0.0.0",
});

export async function createServer(): Promise<Hapi.Server> {
  await server.initialize();
  await server.register([
    hapiAuthJWT,
    authPlugin,
    prismaPlugin,
    usersPlugin,
    boardsPlugin,
    tasksPlugin,
  ]);
  return server;
}

export async function startServer(server: Hapi.Server): Promise<Hapi.Server> {
  await server.start();
  console.log("info", `Server running on ${server.info.uri}`);
  return server;
}

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

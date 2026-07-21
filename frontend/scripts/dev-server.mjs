import { createServer } from "vite";

const port = Number(process.env.PORT ?? 5173);

const server = await createServer({
  server: {
    host: "127.0.0.1",
    port,
  },
});

await server.listen();
server.printUrls();

const shutdown = async () => {
  await server.close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

setInterval(() => undefined, 60 * 60 * 1000);

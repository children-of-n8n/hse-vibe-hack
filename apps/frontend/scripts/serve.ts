import index from "../src/app/index.html";

const server = Bun.serve({
  port: process.env.PORT ?? 8000,
  routes: {
    "/": index,
  },
  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Listening at ${server.url}`);

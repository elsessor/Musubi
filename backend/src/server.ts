import { app } from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.port, () => {
  console.log(`Auth backend running on http://localhost:${env.port}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${env.port} is already in use. Stop the other backend instance or set a free PORT in backend/.env and match NEXT_PUBLIC_API_BASE_URL in frontend/.env.`);
  } else {
    console.error(`Unable to start the auth backend: ${error.message}`);
  }
  process.exit(1);
});

import cors from "cors";
import express from "express";

import { env } from "./config/env.js";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware.js";
import { authRouter } from "./routes/auth.routes.js";

export const app = express();

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        env.frontendUrl,
        "https://musubi-1bf94.web.app",
        "https://musubi-1bf94.firebaseapp.com",
        "http://localhost:3000"
      ];
      if (allowedOrigins.includes(origin) || allowedOrigins.some((item) => item && origin.startsWith(item))) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true
  })
);
app.use(express.json());

app.get("/", (_request: express.Request, response: express.Response) => {
  response.status(200).json({ name: "Musubi API Backend", status: "online", health: "/health" });
});

app.get("/health", (_request: express.Request, response: express.Response) => {
  response.status(200).json({ status: "ok" });
});

app.use("/auth", authRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

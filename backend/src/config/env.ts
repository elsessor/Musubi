import dotenv from "dotenv";

dotenv.config();

const requiredKeys = [
  "FIREBASE_SERVICE_ACCOUNT_PATH",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "FRONTEND_URL"
] as const;

type EnvKey = (typeof requiredKeys)[number];

function readEnv(key: EnvKey): string {
  const value = process.env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function readPort(): number {
  const value = process.env.PORT?.trim();

  if (!value) {
    return 5000;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }

  return port;
}

export const env = {
  port: readPort(),
  firebaseServiceAccountPath: readEnv("FIREBASE_SERVICE_ACCOUNT_PATH"),
  jwtSecret: readEnv("JWT_SECRET"),
  jwtExpiresIn: readEnv("JWT_EXPIRES_IN"),
  frontendUrl: readEnv("FRONTEND_URL")
};

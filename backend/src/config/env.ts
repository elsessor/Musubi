import dotenv from "dotenv";

dotenv.config();

const requiredKeys = [
  "PORT",
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

export const env = {
  port: Number(readEnv("PORT")),
  firebaseServiceAccountPath: readEnv("FIREBASE_SERVICE_ACCOUNT_PATH"),
  jwtSecret: readEnv("JWT_SECRET"),
  jwtExpiresIn: readEnv("JWT_EXPIRES_IN"),
  frontendUrl: readEnv("FRONTEND_URL")
};

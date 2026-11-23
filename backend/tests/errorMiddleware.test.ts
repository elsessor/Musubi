import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response, NextFunction } from "express";
import { errorMiddleware } from "../src/middleware/error.middleware.js";
import { AppError } from "../src/utils/AppError.js";

function handle(error: unknown) {
  let status = 0;
  let body: any;
  const response = { status: (value: number) => { status = value; return response; }, json: (value: any) => { body = value; } };
  errorMiddleware(error, { path: "/auth/organizations/club" } as Request, response as unknown as Response, (() => {}) as NextFunction);
  return { status, body };
}

test("Firestore quota errors are never reported as Gemini limits", (t) => {
  t.mock.method(console, "error", () => {});
  for (const error of [new Error("8 RESOURCE_EXHAUSTED: Quota exceeded."), Object.assign(new Error("Capacity unavailable"), { code: 8 })]) {
    const result = handle(error);
    assert.equal(result.status, 503);
    assert.equal(result.body.code, "DATABASE_QUOTA_EXCEEDED");
    assert.match(result.body.message, /Cloud Firestore/);
    assert.doesNotMatch(result.body.message, /Gemini|5 requests|30 seconds/);
  }
});

test("AI quota errors retain a distinct retryable response without invented limits", (t) => {
  t.mock.method(console, "error", () => {});
  const result = handle(new Error("Genkit AI generation failed: 429 Too Many Requests. Quota exceeded"));
  assert.equal(result.status, 429);
  assert.equal(result.body.code, "AI_QUOTA_EXCEEDED");
  assert.doesNotMatch(result.body.message, /5 requests|30 seconds|database/i);
});

test("validation and unexpected errors keep their existing behavior", (t) => {
  t.mock.method(console, "error", () => {});
  assert.deepEqual(handle(new AppError("Organization not found", 404)), { status: 404, body: { message: "Organization not found" } });
  assert.deepEqual(handle(new Error("Unexpected failure")), { status: 500, body: { message: "Unexpected failure" } });
});

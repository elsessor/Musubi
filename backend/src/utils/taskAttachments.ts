import { AppError } from "./AppError.js";

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const ATTACHMENT_CHUNK_BYTES = 512 * 1024;
export const MAX_TASK_ATTACHMENTS = 50;

export type TaskAttachment = {
  id: string;
  type: "file" | "link";
  name: string;
  url?: string;
  contentType?: string;
  size?: number;
  uploadedByUID: string;
  uploadedByName: string;
  uploadedAt: string;
};

export function validateAttachmentName(value: unknown): string {
  if (typeof value !== "string") throw new AppError("Enter an attachment name.", 400);
  const name = value.trim();
  if (!name || name.length > 255 || /[\x00-\x1f\x7f]/.test(name)) throw new AppError("Attachment names must be between 1 and 255 characters.", 400);
  return name;
}

export function validateAttachmentLink(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) throw new AppError("Enter a valid http or https link.", 400);
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid protocol");
    return url.href;
  } catch {
    throw new AppError("Enter a valid http or https link.", 400);
  }
}

export function splitAttachmentFile(file: Buffer): Buffer[] {
  if (!file.length) throw new AppError("Empty files cannot be attached.", 400);
  if (file.length > MAX_ATTACHMENT_BYTES) throw new AppError("Each attachment must be 5 MB or smaller.", 413);
  const chunks: Buffer[] = [];
  for (let offset = 0; offset < file.length; offset += ATTACHMENT_CHUNK_BYTES) chunks.push(file.subarray(offset, offset + ATTACHMENT_CHUNK_BYTES));
  return chunks;
}

export function normalizeAttachmentContentType(value: unknown): string {
  return typeof value === "string" && /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i.test(value)
    ? value : "application/octet-stream";
}

import type { TaskAttachment } from "../components/events/types";

export function safeAttachmentUrl(value?: string): string | null {
  try {
    const url = new URL(value || "");
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export function getAttachmentPreview(attachment: Pick<TaskAttachment, "name" | "contentType">) {
  const mime = (attachment.contentType || "").split(";")[0].trim().toLowerCase();
  const extension = attachment.name.split(".").pop()?.toLowerCase() || "";
  const inferred: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", avif: "image/avif",
    pdf: "application/pdf", txt: "text/plain", csv: "text/csv", md: "text/plain", json: "application/json",
    mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime"
  };
  const contentType = !mime || mime === "application/octet-stream" ? inferred[extension] || mime : mime;
  // Never render uploaded HTML or SVG as active documents.
  const kind = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif", "image/bmp"].includes(contentType) ? "image"
    : contentType === "application/pdf" ? "pdf"
    : contentType.startsWith("audio/") ? "audio"
    : contentType.startsWith("video/") ? "video"
    : contentType.startsWith("text/") || ["application/json", "application/xml"].includes(contentType) ? "text"
    : "unsupported";
  return { kind, contentType };
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, ExternalLink, FileText, Link as LinkIcon, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuthStore } from "@/store/authStore";
import { downloadTaskAttachment } from "@/services/events.service";
import { getAttachmentPreview, safeAttachmentUrl } from "@/utils/attachmentPreview";
import type { TaskAttachment } from "./types";

export function AttachmentPreview({ eventId, taskId, attachment, onClose }: {
  eventId: string; taskId: string; attachment: TaskAttachment; onClose: () => void;
}) {
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const [fileUrl, setFileUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(attachment.type === "file");
  const [error, setError] = useState("");
  const [mediaError, setMediaError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  const returnFocus = useRef(typeof document === "undefined" ? null : document.activeElement as HTMLElement | null);
  const preview = getAttachmentPreview(attachment);
  const linkUrl = safeAttachmentUrl(attachment.url);

  useEffect(() => { setCopied(false); setCopyError(""); }, [attachment.id, linkUrl]);

  async function copyLink() {
    if (!linkUrl) return;
    setCopyError("");
    try {
      await navigator.clipboard.writeText(linkUrl);
      setCopied(true);
    } catch {
      setCopied(false);
      setCopyError("Could not copy the link. Select and copy the URL above.");
    }
  }

  useEffect(() => {
    if (attachment.type === "link") return;
    let cancelled = false;
    let objectUrl = "";
    async function load() {
      setLoading(true);
      try {
        const blob = await downloadTaskAttachment(firebaseUser, eventId, taskId, attachment.id);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob.slice(0, blob.size, preview.contentType || "application/octet-stream"));
        setFileUrl(objectUrl);
        if (preview.kind === "text") {
          const contents = await blob.slice(0, 200_000).text();
          if (!cancelled) setText(contents + (blob.size > 200_000 ? "\n\nPreview shortened. Download to read the full file." : ""));
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "The preview could not be loaded.");
      } finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [attachment.id, attachment.type, eventId, taskId, firebaseUser, preview.contentType, preview.kind]);

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[92vh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl bg-white sm:max-w-4xl" onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus.current?.focus(); }}>
      <DialogTitle className="break-words pr-8 text-base text-slate-900">{attachment.name}</DialogTitle>
      <DialogDescription className="text-xs text-slate-500">Attachment preview · Added by {attachment.uploadedByName}</DialogDescription>
      {loading ? <div role="status" className="flex min-h-52 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" />Loading preview…</div>
        : error ? <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
        : attachment.type === "link" ? <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-6">
          <LinkIcon className="text-blue-500" />
          <p className="text-sm font-semibold text-slate-800">{linkUrl ? new URL(linkUrl).hostname : "Invalid link"}</p>
          <p className="break-all text-sm text-slate-600">{linkUrl || "This attachment does not contain a valid web link."}</p>
          <p className="text-xs text-slate-500">Open the website to view its full content.</p>
        </div>
        : mediaError || preview.kind === "unsupported" ? <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500"><FileText size={32} /><p>A preview is unavailable for this file. Download it to view its contents.</p></div>
        : preview.kind === "image" ? <div className="flex min-h-52 items-center justify-center rounded-xl bg-slate-100 p-3">{/* Native image supports private blob URLs without an optimization proxy. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fileUrl} alt={attachment.name} className="max-h-[65vh] max-w-full object-contain" onError={() => setMediaError(true)} />
        </div>
        : preview.kind === "pdf" ? <iframe title={`Preview of ${attachment.name}`} src={fileUrl} sandbox="allow-same-origin" className="h-[65vh] w-full rounded-xl border border-slate-200" />
        : preview.kind === "video" ? <video src={fileUrl} controls playsInline className="max-h-[65vh] w-full rounded-xl bg-slate-900" onError={() => setMediaError(true)} />
        : preview.kind === "audio" ? <audio src={fileUrl} controls className="my-8 w-full" onError={() => setMediaError(true)} />
        : <pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-xs text-slate-800">{text}</pre>}
      {copyError && <p role="alert" className="text-xs text-rose-600">{copyError}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        {attachment.type === "link" && linkUrl ? <>
          <button type="button" onClick={() => void copyLink()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            {copied ? <Check size={15} /> : <Copy size={15} />}<span role="status">{copied ? "Copied!" : "Copy link"}</span>
          </button>
          <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><ExternalLink size={15} />Open link</a>
        </>
          : fileUrl ? <a href={fileUrl} download={attachment.name} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><Download size={15} />Download</a> : null}
      </div>
    </DialogContent>
  </Dialog>;
}

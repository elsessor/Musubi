"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Download, ExternalLink, FileText, Image as ImageIcon, Link as LinkIcon, Loader2, Paperclip, Plus, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useToastStore } from "@/store/toastStore";
import { addTaskFileAttachment, addTaskLinkAttachment, downloadTaskAttachment } from "@/services/events.service";
import type { Task, TaskAttachment } from "./types";
import { AttachmentPreview } from "./AttachmentPreview";
import { safeAttachmentUrl } from "@/utils/attachmentPreview";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function fileSize(size: number): string {
  return size >= 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`;
}

export function TaskAttachments({ eventId, task, canAdd, onTaskUpdated }: {
  eventId: string;
  task: Task;
  canAdd: boolean;
  onTaskUpdated: (task: Task) => void;
}) {
  const firebaseUser = useAuthStore((state) => state.firebaseUser);
  const inputRef = useRef<HTMLInputElement>(null);
  const formId = useId();
  const [attachments, setAttachments] = useState<TaskAttachment[]>(task.attachments || []);
  const [showOptions, setShowOptions] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [previewAttachment, setPreviewAttachment] = useState<TaskAttachment | null>(null);

  useEffect(() => { setAttachments(task.attachments || []); }, [task.id, task.attachments]);

  function saved(updatedTask: Task) {
    setAttachments(updatedTask.attachments || []);
    onTaskUpdated(updatedTask);
  }

  async function uploadFiles(files: File[]) {
    if (!files.length || !canAdd || busy) return;
    setError("");
    if (files.some((file) => file.size > MAX_FILE_BYTES || !file.size)) {
      setError("Choose non-empty files that are 5 MB or smaller.");
      return;
    }
    if (attachments.length + files.length > 50) { setError("A subtask can have up to 50 attachments."); return; }
    setBusy(true);
    try {
      for (const file of files) saved(await addTaskFileAttachment(firebaseUser, eventId, task.id, file));
      setShowOptions(false);
      useToastStore.getState().showToast({ title: "Attachments added", description: "Your files have been saved successfully.", tone: "success" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The attachment could not be saved. Please try again.");
    } finally { setBusy(false); }
  }

  async function addLink() {
    if (!canAdd || busy) return;
    setError("");
    let url: URL;
    try {
      url = new URL(linkUrl.trim());
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid protocol");
    } catch { setError("Enter a valid link starting with http:// or https://."); return; }
    setBusy(true);
    try {
      saved(await addTaskLinkAttachment(firebaseUser, eventId, task.id, { name: linkName.trim(), url: url.href }));
      setLinkName(""); setLinkUrl(""); setShowLink(false); setShowOptions(false);
      useToastStore.getState().showToast({ title: "Link added", description: "Your link has been saved successfully.", tone: "success" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The link could not be saved. Please try again.");
    } finally { setBusy(false); }
  }

  async function download(attachment: TaskAttachment) {
    if (downloadingId) return;
    setError(""); setDownloadingId(attachment.id);
    try {
      const blob = await downloadTaskAttachment(firebaseUser, eventId, task.id, attachment.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = attachment.name;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The attachment could not be downloaded. Please try again.");
    } finally { setDownloadingId(null); }
  }

  return (
    <section aria-label="Task attachments" className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-700"><Paperclip size={14} /> Attachments <span className="font-medium text-slate-400">({attachments.length})</span></h4>
        {canAdd ? <button type="button" disabled={busy} onClick={() => { setShowOptions(!showOptions); setError(""); }} className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}{busy ? "Saving attachment…" : "Add attachment"}
        </button> : null}
      </div>

      {showOptions && canAdd ? <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"><ImageIcon size={13} /> File or photo</button>
          <button type="button" disabled={busy} onClick={() => setShowLink(!showLink)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"><LinkIcon size={13} /> Link</button>
        </div>
        <p className="text-[10px] text-slate-400">Up to 5 MB per file. Attachments are saved when added.</p>
        <input ref={inputRef} type="file" multiple aria-label="Select files or photos to attach" className="hidden" onChange={(event) => { const files = Array.from(event.target.files || []); event.target.value = ""; void uploadFiles(files); }} />
        {showLink ? <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3" onKeyDown={(event) => { if (event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); void addLink(); } }}>
          <label htmlFor={`${formId}-url`} className="block text-[11px] font-semibold text-slate-600">Link</label>
          <input id={`${formId}-url`} type="text" inputMode="url" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} disabled={busy} placeholder="https://…" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-500" />
          <label htmlFor={`${formId}-name`} className="block text-[11px] font-semibold text-slate-600">Name (optional)</label>
          <input id={`${formId}-name`} type="text" maxLength={255} value={linkName} onChange={(event) => setLinkName(event.target.value)} disabled={busy} placeholder="e.g. Event photos or submission document" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-500" />
          <div className="flex justify-end gap-2">
            <button type="button" disabled={busy} aria-label="Cancel adding link" onClick={() => setShowLink(false)} className="rounded-lg px-2 py-1.5 text-slate-400 hover:bg-slate-50"><X size={14} /></button>
            <button type="button" disabled={busy || !linkUrl.trim()} onClick={() => void addLink()} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Add link</button>
          </div>
        </div> : null}
      </div> : null}

      {error ? <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
      {attachments.length ? <ul className="space-y-2">
        {attachments.map((attachment) => <li key={attachment.id} className="rounded-xl border border-slate-200 bg-white p-2.5">
          <div className="flex items-center gap-2">
            {attachment.type === "link" ? <LinkIcon size={14} className="shrink-0 text-blue-500" /> : attachment.contentType?.startsWith("image/") ? <ImageIcon size={14} className="shrink-0 text-blue-500" /> : <FileText size={14} className="shrink-0 text-slate-400" />}
            <button type="button" title={`Preview ${attachment.name}`} onClick={() => setPreviewAttachment(attachment)} className="min-w-0 flex-1 truncate text-left text-xs font-medium text-slate-700 hover:text-blue-600 hover:underline">{attachment.name}</button>
            {attachment.type === "link" ? (safeAttachmentUrl(attachment.url) ? <a href={safeAttachmentUrl(attachment.url)!} target="_blank" rel="noopener noreferrer" aria-label={`Open ${attachment.name}`} className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><ExternalLink size={14} /></a> : null) : <button type="button" aria-label={`Download ${attachment.name}`} disabled={Boolean(downloadingId)} onClick={() => void download(attachment)} className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50">{downloadingId === attachment.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}</button>}
          </div>
          <p className="mt-1 truncate text-[10px] text-slate-400">{attachment.uploadedByName}{typeof attachment.size === "number" ? ` · ${fileSize(attachment.size)}` : ""}</p>
        </li>)}
      </ul> : <p className="text-xs text-slate-400">No attachments yet.</p>}
      {previewAttachment ? <AttachmentPreview key={previewAttachment.id} eventId={eventId} taskId={task.id} attachment={previewAttachment} onClose={() => setPreviewAttachment(null)} /> : null}
    </section>
  );
}

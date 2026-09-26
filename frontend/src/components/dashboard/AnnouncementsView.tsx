"use client";

import { useState } from "react";
import { ChevronRight, Megaphone, Pin, Plus, X } from "lucide-react";
import type { Announcement } from "@/services/announcements.service";

type AnnouncementsViewProps = {
  announcements: Announcement[];
  isLeader: boolean;
  onPostAnnouncement: () => void;
};

export function AnnouncementsView({
  announcements,
  isLeader,
  onPostAnnouncement
}: AnnouncementsViewProps) {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  return (
    <div className="mt-6 space-y-4 max-w-full">
      {/* Header bar below tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-400">
          {announcements.length} {announcements.length === 1 ? "announcement" : "announcements"} posted
        </p>

        {isLeader && (
          <button
            type="button"
            onClick={onPostAnnouncement}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#152a45] active:scale-[0.98] self-start sm:self-auto"
          >
            <Plus className="size-4 stroke-[2.5]" />
            Post Announcement
          </button>
        )}
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-12 text-center shadow-xs">
          <Megaphone className="size-8 text-slate-400 mb-2" strokeWidth={1.5} />
          <p className="text-sm font-bold text-slate-800">Announcements</p>
          <p className="mt-1 text-xs text-slate-400">
            Announcements will appear here once they are added to your organization.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              onClick={() => setSelectedAnnouncement(ann)}
              className="group flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs transition hover:border-slate-300 hover:shadow-md cursor-pointer"
            >
              <div className="space-y-1.5 min-w-0 pr-4">
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  {ann.isPinned && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 text-[11px] font-bold text-rose-600">
                      <span className="text-xs">📌</span> Pinned
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                      ann.targetAudience === "Leaders Only"
                        ? "bg-violet-50 text-violet-700 border-violet-200/80"
                        : "bg-blue-50 text-blue-700 border-blue-200/80"
                    }`}
                  >
                    {ann.targetAudience}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition truncate">
                  {ann.title}
                </h3>

                {/* Author & Date line */}
                <p className="text-xs font-medium text-slate-400">
                  Posted by {ann.authorName} · {ann.createdAt}
                </p>
              </div>

              <ChevronRight className="size-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Announcement Detail View Modal */}
      {selectedAnnouncement && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedAnnouncement.isPinned && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200/80 px-2.5 py-0.5 text-[11px] font-bold text-rose-600">
                      <span>📌</span> Pinned
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                      selectedAnnouncement.targetAudience === "Leaders Only"
                        ? "bg-violet-50 text-violet-700 border-violet-200/80"
                        : "bg-blue-50 text-blue-700 border-blue-200/80"
                    }`}
                  >
                    {selectedAnnouncement.targetAudience}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 leading-snug">
                  {selectedAnnouncement.title}
                </h2>
                <p className="text-xs font-medium text-slate-400">
                  Posted by {selectedAnnouncement.authorName} · {selectedAnnouncement.createdAt}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition shrink-0"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-xs sm:text-sm text-slate-700 leading-relaxed font-medium whitespace-pre-wrap border border-slate-100 max-h-80 overflow-y-auto">
              {selectedAnnouncement.content || "No additional text content provided."}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAnnouncement(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Post Announcement Modal Component ──────────────────────────────────────────

type PostAnnouncementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    content: string;
    targetAudience: string;
    isPinned: boolean;
  }) => Promise<void>;
};

export function PostAnnouncementModal({
  isOpen,
  onClose,
  onSubmit
}: PostAnnouncementModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetAudience, setTargetAudience] = useState<"All Members" | "Leaders Only">("All Members");
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const isValid = Boolean(title.trim() && content.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit({ title, content, targetAudience, isPinned });
      setTitle("");
      setContent("");
      setTargetAudience("All Members");
      setIsPinned(false);
      onClose();
    } catch (err) {
      console.error("[PostAnnouncementModal] Error posting announcement:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-[#f1f4f8] text-[#1e3a5f]">
              <Megaphone className="size-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-snug">Post Announcement</h3>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                Broadcast a message to your organization
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* TITLE Input */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              TITLE <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Preparation Meeting for Culture Week"
              required
              className="w-full rounded-2xl border-none bg-[#f1f4f8] px-4 py-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition"
            />
          </div>

          {/* MESSAGE Textarea */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              MESSAGE <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              placeholder="Write your announcement here..."
              required
              className="w-full rounded-2xl border-none bg-[#f1f4f8] px-4 py-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition leading-relaxed"
            />
          </div>

          {/* 2-Column Row for TARGET AUDIENCE & OPTIONS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Target Audience Button Group */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                TARGET AUDIENCE
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setTargetAudience("All Members")}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition text-center ${
                    targetAudience === "All Members"
                      ? "bg-[#1e3a5f] text-white shadow-xs"
                      : "bg-[#f1f4f8] hover:bg-slate-200/60 text-slate-600 font-semibold"
                  }`}
                >
                  All Members
                </button>
                <button
                  type="button"
                  onClick={() => setTargetAudience("Leaders Only")}
                  className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition text-center ${
                    targetAudience === "Leaders Only"
                      ? "bg-[#1e3a5f] text-white shadow-xs"
                      : "bg-[#f1f4f8] hover:bg-slate-200/60 text-slate-600 font-semibold"
                  }`}
                >
                  Leaders Only
                </button>
              </div>
            </div>

            {/* Options Checkbox Card */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                OPTIONS
              </label>
              <div
                onClick={() => setIsPinned(!isPinned)}
                className="rounded-2xl bg-[#f1f4f8] p-3 flex items-start gap-3 cursor-pointer hover:bg-slate-200/60 transition select-none h-[88px]"
              >
                <div
                  className={`size-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition ${
                    isPinned ? "bg-[#1e3a5f] border-[#1e3a5f] text-white" : "border-slate-400 bg-white"
                  }`}
                >
                  {isPinned && <span className="text-xs font-extrabold">✓</span>}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 leading-snug">Pin announcement</p>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    Shows at the top of the feed
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !isValid}
              className={`w-full rounded-2xl py-3 text-xs font-bold transition ${
                isValid && !submitting
                  ? "bg-[#9cb0c9] text-white hover:bg-[#859cb8] active:scale-[0.98]"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              {submitting ? "Posting..." : "Post Announcement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

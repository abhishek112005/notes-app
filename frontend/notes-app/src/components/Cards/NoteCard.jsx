import React, { useState } from "react";
import { MdPushPin, MdEdit, MdDelete, MdShare, MdHistory, MdArchive, MdClose, MdContentCopy, MdCheck } from "react-icons/md";
import { marked } from "marked";
import moment from "moment";

const COLOR_ACCENT = {
  default: "",
  purple: "border-t-2 border-t-purple-500",
  blue:   "border-t-2 border-t-blue-500",
  green:  "border-t-2 border-t-green-500",
  yellow: "border-t-2 border-t-yellow-500",
  red:    "border-t-2 border-t-red-500",
  pink:   "border-t-2 border-t-pink-500",
};

const NoteCard = ({
  _id, title, date, content, tags, isPinned, color = "default",
  moodEmoji, mood, versions = [],
  onEdit, onDelete, onShowToast, updateNotePinStatus,
  onArchive, onShare, onSummarize, onMood, onSpeak,
}) => {
  const [pinned, setPinned]           = useState(isPinned);
  const [showView, setShowView]       = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [shareLink, setShareLink]     = useState(null);
  const [copied, setCopied]           = useState(false);

  const handlePin = async () => {
    try {
      await updateNotePinStatus(_id, !pinned);
      setPinned(!pinned);
      onShowToast(`Note ${!pinned ? "pinned" : "unpinned"}`, "success");
    } catch { onShowToast("Failed to update pin", "error"); }
  };

  const handleShare = async () => {
    const token = await onShare(_id);
    if (token) setShareLink(`${window.location.origin}/share/${token}`);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const previewHtml = marked.parse(content.slice(0, 280) + (content.length > 280 ? "…" : ""), { breaks: true });
  const fullHtml    = marked.parse(content, { breaks: true });

  return (
    <>
      {/* ── Card ── */}
      <div className={`group glass-card hover:bg-white/[0.07] rounded-xl flex flex-col transition-all duration-200 hover:shadow-xl hover:shadow-violet-950/30 ${COLOR_ACCENT[color] || ""}`}>

        {/* Top row: title + actions */}
        <div className="flex items-start gap-2 px-4 pt-4 pb-2">
          {moodEmoji && <span title={mood} className="text-base shrink-0 mt-0.5">{moodEmoji}</span>}
          <h3
            className="flex-1 font-semibold text-sm text-zinc-100 cursor-pointer hover:text-white line-clamp-2 leading-snug min-w-0 tracking-wide"
            onClick={() => setShowView(true)}
          >
            {title}
          </h3>
          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <IconBtn icon={<MdEdit />}    title="Edit"   onClick={onEdit} hoverColor="text-amber-400" />
            <IconBtn icon={<MdPushPin />} title={pinned ? "Unpin" : "Pin"} onClick={handlePin} hoverColor={pinned ? "text-yellow-400" : "text-zinc-300"} active={pinned} />
            <IconBtn icon={<MdDelete />}  title="Delete" onClick={onDelete} hoverColor="text-red-400" />
          </div>
        </div>

        {/* Preview */}
        <div className="px-4 pb-3 cursor-pointer flex-1" onClick={() => setShowView(true)}>
          <div className="prose-notes line-clamp-3 text-xs" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>

        {/* Bottom row */}
        <div className="px-4 pb-3 flex items-center justify-between gap-2 border-t border-white/[0.05] pt-2.5">
          <div className="flex flex-wrap gap-1.5 min-w-0">
            {tags?.slice(0, 2).map((tag, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300 font-medium">
                {tag}
              </span>
            ))}
            {tags?.length > 2 && <span className="text-[10px] text-zinc-600">+{tags.length - 2}</span>}
            {!tags?.length && <span className="text-[10px] text-zinc-600">{date}</span>}
          </div>
          <div className="flex items-center gap-0.5 shrink-0 text-zinc-600">
            <IconBtn icon={<MdShare />}   title="Share"          onClick={handleShare}          hoverColor="text-zinc-300" size="sm" />
            <IconBtn icon={<MdArchive />} title="Archive"        onClick={() => onArchive(_id)} hoverColor="text-zinc-300" size="sm" />
            {versions?.length > 0 && (
              <IconBtn icon={<MdHistory />} title="Version history" onClick={() => setShowHistory(true)} hoverColor="text-zinc-300" size="sm" />
            )}
          </div>
        </div>
      </div>

      {/* ── Full view modal ── */}
      {showView && (
        <NoteModal onClose={() => setShowView(false)} title={title}>
          {moodEmoji && <div className="flex items-center gap-2 text-sm text-zinc-400 mb-3"><span className="text-xl">{moodEmoji}</span>{mood}</div>}
          <div className="prose-notes" dangerouslySetInnerHTML={{ __html: fullHtml }} />
          {tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-white/[0.06]">
              {tags.map((t, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300">{t}</span>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-white/[0.06]">
            <AiBtn label="Summarize"   onClick={() => { setShowView(false); onSummarize(_id, content); }} />
            <AiBtn label="Detect mood" onClick={() => { setShowView(false); onMood(_id, content); }} />
            <AiBtn label="Read aloud"  onClick={() => { setShowView(false); onSpeak(title, content); }} />
          </div>
          <p className="text-xs text-zinc-600 mt-3">{date}</p>
        </NoteModal>
      )}

      {/* ── Share modal ── */}
      {shareLink && (
        <NoteModal onClose={() => setShareLink(null)} title="Share Note">
          <p className="text-sm text-zinc-400 mb-3">Anyone with this link can view this note (read-only):</p>
          <div className="flex items-center gap-2 glass-input rounded-lg px-3 py-2">
            <span className="text-xs text-zinc-300 flex-1 truncate">{shareLink}</span>
            <button onClick={copyLink} className="text-violet-400 hover:text-white transition-colors shrink-0">
              {copied ? <MdCheck className="text-green-400" /> : <MdContentCopy />}
            </button>
          </div>
        </NoteModal>
      )}

      {/* ── Version history modal ── */}
      {showHistory && (
        <NoteModal onClose={() => setShowHistory(false)} title="Version History">
          {versions.length === 0 ? (
            <p className="text-zinc-500 text-sm">No previous versions saved yet.</p>
          ) : (
            <div className="space-y-3">
              {versions.map((v, i) => (
                <div key={i} className="glass-card rounded-lg p-3">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span className="text-zinc-200 text-sm font-medium truncate">{v.title}</span>
                    <span className="text-xs text-zinc-500 shrink-0">{moment(v.savedAt).fromNow()}</span>
                  </div>
                  <p className="text-zinc-500 text-xs line-clamp-2">{v.content}</p>
                  <button
                    onClick={() => { onShowToast("Version restored!", "success"); setShowHistory(false); }}
                    className="mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                  >Restore →</button>
                </div>
              ))}
            </div>
          )}
        </NoteModal>
      )}
    </>
  );
};

const IconBtn = ({ icon, title, onClick, hoverColor = "text-zinc-300", active = false, size = "md" }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-1 rounded transition-colors ${size === "sm" ? "text-sm" : "text-base"} ${
      active ? hoverColor : `text-zinc-600 hover:${hoverColor}`
    }`}
  >
    {icon}
  </button>
);

const AiBtn = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/25 transition-colors"
  >
    ✨ {label}
  </button>
);

const NoteModal = ({ onClose, title, children }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3">
    <div className="glass-modal rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl shadow-black/60">
      <div className="flex justify-between items-center px-5 py-4 border-b border-white/[0.07] shrink-0">
        <h3 className="font-semibold text-zinc-100 truncate pr-4 tracking-wide">{title}</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors shrink-0"><MdClose /></button>
      </div>
      <div className="px-5 py-4 overflow-y-auto">{children}</div>
    </div>
  </div>
);

export default NoteCard;

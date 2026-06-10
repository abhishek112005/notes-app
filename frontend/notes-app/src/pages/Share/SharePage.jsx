import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { BASE_URL } from "../../utils/constants";
import { marked } from "marked";
import moment from "moment";
import { MdOpenInNew, MdOutlineNotes } from "react-icons/md";

const SharePage = () => {
  const { token } = useParams();
  const [note,    setNote]    = useState(null);
  const [error,   setError]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE_URL}/share/${token}`)
      .then(r => r.json())
      .then(data => { if (data.error) setError(true); else setNote(data.note); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen text-zinc-100 relative">
      {/* Ambient background */}
      <div className="fixed inset-0 -z-10" style={{
        background: "radial-gradient(ellipse at 20% 30%, rgba(124,58,237,0.2) 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(79,70,229,0.15) 0%, transparent 55%), #060608"
      }} />

      {/* Header */}
      <header className="h-14 border-b border-white/[0.06] flex items-center px-5"
        style={{ background: "rgba(6,4,14,0.7)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shadow-md shadow-violet-900/40">
            <MdOutlineNotes className="text-white text-sm" />
          </div>
          <span className="font-semibold text-sm text-white tracking-widest uppercase">My Notes</span>
        </Link>
        <span className="ml-4 text-xs text-zinc-600 border border-white/[0.08] px-2 py-0.5 rounded-full backdrop-blur-sm">Shared note</span>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-10">
        {loading ? (
          <div className="flex justify-center mt-24">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center mt-24 text-center">
            <div className="w-14 h-14 rounded-xl glass-card flex items-center justify-center mb-4 text-2xl">
              🔗
            </div>
            <h2 className="text-lg font-semibold text-white mb-1 tracking-wide">Link not found</h2>
            <p className="text-sm text-zinc-500 mb-6">This note may have been deleted or the share link was removed.</p>
            <Link to="/login" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
              Sign in to My Notes →
            </Link>
          </div>
        ) : (
          <>
            {/* Note header */}
            <div className="mb-8">
              {note.moodEmoji && (
                <div className="flex items-center gap-2 text-sm text-zinc-500 mb-3">
                  <span className="text-xl">{note.moodEmoji}</span>
                  <span>{note.mood}</span>
                </div>
              )}
              <h1 className="text-2xl font-bold text-white mb-2 leading-tight tracking-wide">{note.title}</h1>
              <p className="text-xs text-zinc-600">{moment(note.createdOn).format("MMMM Do, YYYY")}</p>

              {note.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {note.tags.map((t, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Content */}
            <div className="glass-modal rounded-xl px-6 py-5">
              <div className="prose-notes" dangerouslySetInnerHTML={{ __html: marked.parse(note.content, { breaks: true }) }} />
            </div>

            {/* Footer */}
            <div className="mt-8 pt-5 border-t border-white/[0.06] flex items-center justify-between">
              <p className="text-xs text-zinc-700">Read-only · shared via My Notes</p>
              <Link to="/signup" className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                Create your own notes <MdOpenInNew className="text-[10px]" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SharePage;

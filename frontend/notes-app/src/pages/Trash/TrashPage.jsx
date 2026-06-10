import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MdArrowBack, MdRestore, MdDeleteForever, MdDelete, MdOutlineNotes } from "react-icons/md";
import axiosInstance from "../../utils/axiosInstance";
import Toast from "../../components/ToastMessage/Toast";
import moment from "moment";
import { marked } from "marked";

const TrashPage = () => {
  const [notes,   setNotes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState({ isShown: false, message: "", type: "" });
  const navigate = useNavigate();

  const showToast = (msg, type = "success") => {
    setToast({ isShown: true, message: msg, type });
    setTimeout(() => setToast({ isShown: false, message: "", type: "" }), 3000);
  };

  const fetchTrash = async () => {
    setLoading(true);
    try { const { data } = await axiosInstance.get("/get-trash"); setNotes(data.notes || []); }
    catch { navigate("/login"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTrash(); }, []);

  const restore = async (id) => { await axiosInstance.put(`/restore-note/${id}`); showToast("Note restored"); fetchTrash(); };
  const permDelete = async (id) => {
    if (!window.confirm("Permanently delete? This cannot be undone.")) return;
    await axiosInstance.delete(`/permanent-delete/${id}`);
    showToast("Permanently deleted", "delete");
    fetchTrash();
  };

  return (
    <div className="min-h-screen text-zinc-100 relative">
      {/* Ambient background */}
      <div className="fixed inset-0 -z-10" style={{
        background: "radial-gradient(ellipse at 30% 30%, rgba(124,58,237,0.15) 0%, transparent 55%), #060608"
      }} />

      {/* Header */}
      <header className="h-14 border-b border-white/[0.06] flex items-center gap-3 px-5"
        style={{ background: "rgba(6,4,14,0.7)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
        <Link to="/dashboard" className="text-zinc-500 hover:text-zinc-200 transition-colors p-1">
          <MdArrowBack className="text-lg" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0 shadow-md shadow-violet-900/40">
            <MdOutlineNotes className="text-white text-sm" />
          </div>
          <span className="font-semibold text-sm text-white tracking-widest uppercase">My Notes</span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <MdDelete className="text-zinc-600" />
          <h1 className="text-sm font-medium text-zinc-300 tracking-wide">Trash</h1>
        </div>
        <span className="ml-auto text-xs text-zinc-600">{notes.length} item{notes.length !== 1 ? "s" : ""}</span>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center mt-20">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-24 text-center">
            <div className="w-14 h-14 rounded-xl glass-card flex items-center justify-center mb-4">
              <MdDelete className="text-zinc-500 text-2xl" />
            </div>
            <p className="text-zinc-400 font-medium mb-1 tracking-wide">Trash is empty</p>
            <p className="text-zinc-600 text-sm mb-5">Deleted notes will appear here.</p>
            <Link to="/dashboard" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
              ← Back to notes
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-zinc-600 mb-4 text-center">Notes in trash are kept until permanently deleted.</p>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {notes.map(note => <TrashCard key={note._id} note={note} onRestore={() => restore(note._id)} onDelete={() => permDelete(note._id)} />)}
            </div>
          </>
        )}
      </div>

      <Toast isShown={toast.isShown} message={toast.message} type={toast.type} onClose={() => setToast({ isShown: false, message: "", type: "" })} />
    </div>
  );
};

const TrashCard = ({ note, onRestore, onDelete }) => {
  const preview = marked.parse(note.content.slice(0, 200), { breaks: true });
  return (
    <div className="glass-card rounded-xl p-4 flex flex-col gap-3 opacity-70 hover:opacity-100 hover:bg-white/[0.07] transition-all duration-200">
      <div>
        <h3 className="text-zinc-300 font-medium text-sm truncate tracking-wide">{note.title}</h3>
        <p className="text-xs text-zinc-600 mt-0.5">Trashed {moment(note.trashedAt).fromNow()}</p>
        <div className="prose-notes text-xs line-clamp-3 mt-2" dangerouslySetInnerHTML={{ __html: preview }} />
      </div>
      {note.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.map((t, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-zinc-600">{t}</span>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-auto">
        <button onClick={onRestore}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 transition-colors">
          <MdRestore /> Restore
        </button>
        <button onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors">
          <MdDeleteForever /> Delete forever
        </button>
      </div>
    </div>
  );
};

export default TrashPage;

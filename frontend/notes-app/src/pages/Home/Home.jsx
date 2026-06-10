import React, { useEffect, useState, useCallback, useRef } from "react";
import NoteCard from "../../components/Cards/NoteCard";
import AddEditNotes from "./AddEditNotes";
import EmptyCard from "../../components/EmptyCard/EmptyCard";
import Toast from "../../components/ToastMessage/Toast";
import Modal from "react-modal";
import { useNavigate, Link } from "react-router-dom";
import {
  MdAdd, MdSearch, MdClose, MdOutlineNotes, MdPushPin,
  MdArchive, MdDelete, MdMenu, MdOutlineKeyboard,
  MdSort, MdLogout,
} from "react-icons/md";
import axiosInstance from "../../utils/axiosInstance";
import { connectSocket, getSocket, disconnectSocket } from "../../utils/socketInstance";
import { getInitials } from "../../utils/helper";
import moment from "moment";
import jsPDF from "jspdf";

const CATEGORIES = ["All", "General", "Work", "Personal", "Ideas", "Meeting Notes", "Journal"];
const CAT_ICONS  = { All: <MdOutlineNotes />, Archived: <MdArchive /> };

const SORT_OPTIONS = [
  { value: "newest",  label: "Newest first" },
  { value: "oldest",  label: "Oldest first" },
  { value: "alpha",   label: "A → Z" },
  { value: "updated", label: "Last edited" },
];

const CAT_COLORS = ["#7c3aed","#2563eb","#059669","#d97706","#db2777","#0891b2","#65a30d"];

const SHORTCUTS = [
  { keys: "Ctrl+N", desc: "New note" },
  { keys: "Ctrl+K", desc: "Focus search" },
  { keys: "Esc",    desc: "Close / clear" },
];

Modal.setAppElement("#root");

const Home = () => {
  const [modal, setModal]             = useState({ isShown: false, type: "add", data: null });
  const [toast, setToast]             = useState({ isShown: false, message: "", type: "" });
  const [allNotes, setAllNotes]       = useState([]);
  const [userInfo, setUserInfo]       = useState(null);
  const [search, setSearch]           = useState("");
  const [category, setCategory]       = useState("All");
  const [sort, setSort]               = useState("newest");
  const [aiSummary, setAiSummary]     = useState(() => {
    try { const s = sessionStorage.getItem("aiSummary"); return s ? JSON.parse(s) : { noteId: null, text: "" }; }
    catch { return { noteId: null, text: "" }; }
  });
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchRef = useRef(null);
  const navigate  = useNavigate();

  const showToast = useCallback((msg, type = "success") => {
    clearTimeout(window._toastTimer);
    setToast({ isShown: true, message: msg, type });
    window._toastTimer = setTimeout(() => setToast({ isShown: false, message: "", type: "" }), 3000);
  }, []);

  const fetchNotes = useCallback(async () => {
    try {
      if (search.trim()) {
        const { data } = await axiosInstance.get(`/search-notes?q=${encodeURIComponent(search)}`);
        setAllNotes(data.notes || []);
        return;
      }
      const params = new URLSearchParams({ sort });
      if (category !== "All" && category !== "Archived") params.set("category", category);
      const endpoint = category === "Archived" ? "/get-archived" : `/get-all-notes?${params}`;
      const { data } = await axiosInstance.get(endpoint);
      setAllNotes(data.notes || []);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.clear(); navigate("/login"); }
    }
  }, [search, category, sort, navigate]);

  const fetchUser = useCallback(async () => {
    try {
      const { data } = await axiosInstance.get("/get-user");
      if (data?.user) setUserInfo(data.user);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.clear(); navigate("/login"); }
    }
  }, [navigate]);

  useEffect(() => { fetchNotes(); fetchUser(); }, [fetchNotes, fetchUser]);
  useEffect(() => { const id = setTimeout(fetchNotes, 350); return () => clearTimeout(id); }, [search]);

  useEffect(() => {
    connectSocket();
    const socket = getSocket();
    socket.on("notes-updated", fetchNotes);
    return () => { socket.off("notes-updated"); disconnectSocket(); };
  }, [fetchNotes]);

  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") { e.preventDefault(); setModal({ isShown: true, type: "add", data: null }); }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") { setModal({ isShown: false, type: "add", data: null }); setSearch(""); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const selectCategory = (cat) => {
    setCategory(cat);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const onLogout = async () => {
    try { await axiosInstance.post("/logout"); } catch (_) {}
    disconnectSocket();
    localStorage.clear();
    navigate("/login");
  };

  const handleDelete    = async (id) => { await axiosInstance.delete(`/delete-note/${id}`); showToast("Moved to trash", "delete"); fetchNotes(); };
  const handlePin       = async (id, isPinned) => { await axiosInstance.put(`/update-note-pinned/${id}`, { isPinned }); fetchNotes(); };
  const handleArchive   = async (id) => { await axiosInstance.put(`/archive-note/${id}`); showToast("Archived", "success"); fetchNotes(); };
  const handleShare     = async (id) => {
    try { const { data } = await axiosInstance.post(`/generate-share/${id}`); return data.shareToken; }
    catch { showToast("Failed to generate link", "error"); return null; }
  };
  const handleSummarize = async (id, content) => {
    showToast("Generating summary…", "success");
    try {
      const { data } = await axiosInstance.post("/ai/summarize", { content });
      if (!data.error) {
        const val = { noteId: id, text: data.summary };
        setAiSummary(val);
        try { sessionStorage.setItem("aiSummary", JSON.stringify(val)); } catch {}
      }
    }
    catch { showToast("AI unavailable — add GROQ_API_KEY to .env", "error"); }
  };
  const handleMood = async (id, content) => {
    showToast("Detecting mood…", "success");
    try { const { data } = await axiosInstance.post("/ai/mood", { content, noteId: id }); if (!data.error) { showToast(`${data.moodEmoji} ${data.mood}`, "success"); fetchNotes(); } }
    catch { showToast("AI unavailable — add GROQ_API_KEY to .env", "error"); }
  };
  const handleSpeak = (title, content) => { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${title}. ${content}`)); };

  const pinnedNotes   = allNotes.filter(n => n.isPinned);
  const unpinnedNotes = allNotes.filter(n => !n.isPinned);

  const renderGrid = (notes) => (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
      {notes.map(note => (
        <div key={note._id}>
          <NoteCard
            {...note}
            date={moment(note.createdOn).format("MMM D, YYYY")}
            onEdit={() => setModal({ isShown: true, type: "edit", data: note })}
            onDelete={() => handleDelete(note._id)}
            onShowToast={showToast}
            updateNotePinStatus={handlePin}
            onArchive={handleArchive}
            onShare={handleShare}
            onSummarize={handleSummarize}
            onMood={handleMood}
            onSpeak={handleSpeak}
          />
          {aiSummary.noteId === note._id && (
            <div className="mt-2 p-3 bg-violet-500/10 border border-violet-500/25 backdrop-blur-sm rounded-xl text-sm text-violet-200">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-violet-400 uppercase tracking-wider">✨ AI Summary</span>
                <button onClick={() => { setAiSummary({ noteId: null, text: "" }); sessionStorage.removeItem("aiSummary"); }} className="text-zinc-500 hover:text-white"><MdClose /></button>
              </div>
              {aiSummary.text}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const displayCat = category === "All" ? "All Notes" : category;

  return (
    <div className="flex h-screen overflow-hidden text-zinc-100 relative">

      {/* ── Ambient background ── */}
      <div className="fixed inset-0 -z-10" style={{
        background: "radial-gradient(ellipse at 10% 60%, rgba(124,58,237,0.18) 0%, transparent 50%), radial-gradient(ellipse at 85% 10%, rgba(79,70,229,0.14) 0%, transparent 50%), radial-gradient(ellipse at 55% 90%, rgba(139,92,246,0.1) 0%, transparent 50%), #060608"
      }} />

      {/* ── Mobile backdrop ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ══════════════ SIDEBAR ══════════════ */}
      <aside className={`
        fixed lg:relative top-0 left-0 h-[100dvh] z-40 lg:z-auto
        flex flex-col shrink-0 transition-transform duration-300 ease-in-out
        border-r border-white/[0.06]
        ${sidebarOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden"}
      `} style={{ background: "rgba(6,4,14,0.75)", backdropFilter: "blur(40px)", WebkitBackdropFilter: "blur(40px)" }}>

        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.06]">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-900/40">
            <MdOutlineNotes className="text-white text-sm" />
          </div>
          <span className="font-semibold text-sm text-white tracking-widest uppercase">My Notes</span>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-zinc-600 hover:text-zinc-300 lg:hidden">
            <MdClose />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-0.5"
          style={{ WebkitOverflowScrolling: 'touch' }}>
          {[
            { label: "All Notes", cat: "All",      icon: <MdOutlineNotes /> },
            { label: "Pinned",    cat: "pinned",   icon: <MdPushPin /> },
            { label: "Archived",  cat: "Archived", icon: <MdArchive /> },
          ].map(({ label, cat, icon }) => (
            <button
              key={cat}
              onClick={() => cat === "pinned" ? selectCategory("All") : selectCategory(cat)}
              className={`w-full flex items-center gap-2.5 text-sm px-3 py-2 rounded-lg transition-all ${
                category === cat
                  ? "bg-violet-500/20 text-violet-300 font-medium border border-violet-500/20"
                  : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
              }`}
            >
              <span className="text-base shrink-0">{icon}</span>
              {label}
            </button>
          ))}

          <div className="border-t border-white/[0.06] my-3" />

          <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold px-3 mb-2">Categories</p>
          {CATEGORIES.filter(c => c !== "All").map((cat, i) => (
            <button
              key={cat}
              onClick={() => selectCategory(cat)}
              className={`w-full flex items-center gap-2.5 text-sm px-3 py-2 rounded-lg transition-all ${
                category === cat
                  ? "bg-violet-500/20 text-violet-300 font-medium border border-violet-500/20"
                  : "text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200"
              }`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
              {cat}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-white/[0.06] space-y-0.5">
          <Link to="/trash" onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
            className="flex items-center gap-2.5 text-sm px-3 py-2 rounded-lg text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300 transition-colors">
            <MdDelete className="text-base" /> Trash
          </Link>
          <button onClick={() => setShowShortcuts(true)}
            className="w-full flex items-center gap-2.5 text-sm px-3 py-2 rounded-lg text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300 transition-colors">
            <MdOutlineKeyboard className="text-base" /> Shortcuts
          </button>
          <button onClick={onLogout}
            className="w-full flex items-center gap-2.5 text-sm px-3 py-2 rounded-lg text-zinc-500 hover:bg-white/[0.05] hover:text-red-400 transition-colors">
            <MdLogout className="text-base" /> Logout
          </button>
        </div>
      </aside>

      {/* ══════════════ MAIN ══════════════ */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Topbar ── */}
        <header className="shrink-0 h-14 border-b border-white/[0.06] flex items-center gap-3 px-4 lg:px-5"
          style={{ background: "rgba(6,4,14,0.6)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors">
            <MdMenu className="text-lg" />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-xl relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-base pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search notes… (Ctrl+K)"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full glass-input rounded-lg pl-9 pr-8 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                <MdClose className="text-sm" />
              </button>
            )}
          </div>

          {/* Sort */}
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="glass-input text-zinc-400 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-violet-500/50 transition-colors hidden sm:block">
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value} style={{background:"#0a0810"}}>{o.label}</option>)}
          </select>

          {/* Profile */}
          {(() => {
            const cleanName = userInfo?.fullName
              ?.split(" ")
              .filter(w => w && w.toLowerCase() !== "undefined")
              .join(" ") || null;
            return (
              <div className="flex items-center gap-2 ml-auto shrink-0">
                <div className="hidden lg:block text-right max-w-[140px]">
                  <p className="text-xs font-medium text-zinc-300 leading-none tracking-wide truncate">{cleanName || "User"}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-semibold shrink-0 shadow-md shadow-violet-900/40">
                  {cleanName ? getInitials(cleanName) : "U"}
                </div>
              </div>
            );
          })()}
        </header>

        {/* ── Content ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 lg:px-6 py-6 max-w-screen-xl mx-auto">

            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-semibold text-white tracking-wide">{displayCat}</h1>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {allNotes.length} note{allNotes.length !== 1 ? "s" : ""}
                  {search ? ` matching "${search}"` : ""}
                </p>
              </div>
              <button
                onClick={() => setModal({ isShown: true, type: "add", data: null })}
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition-colors shadow-lg shadow-violet-900/40 tracking-wide"
              >
                <MdAdd className="text-lg" /> New Note
              </button>
            </div>

            {allNotes.length === 0 ? (
              <EmptyCard onAdd={() => setModal({ isShown: true, type: "add", data: null })} />
            ) : (
              <div className="space-y-6">
                {pinnedNotes.length > 0 && (
                  <section>
                    <p className="text-[11px] uppercase tracking-widest text-zinc-600 font-semibold mb-3 flex items-center gap-1.5">
                      <MdPushPin className="text-yellow-600/70" /> Pinned
                    </p>
                    {renderGrid(pinnedNotes)}
                  </section>
                )}
                {unpinnedNotes.length > 0 && (
                  <section>
                    {pinnedNotes.length > 0 && (
                      <p className="text-[11px] uppercase tracking-widest text-zinc-600 font-semibold mb-3">Notes</p>
                    )}
                    {renderGrid(unpinnedNotes)}
                  </section>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* FAB — mobile only */}
      <button
        onClick={() => setModal({ isShown: true, type: "add", data: null })}
        className="fixed bottom-6 right-6 w-12 h-12 bg-violet-600 hover:bg-violet-500 text-white rounded-full shadow-xl shadow-violet-900/50 flex items-center justify-center transition-all hover:scale-110 z-40 lg:hidden"
        title="New note (Ctrl+N)"
      >
        <MdAdd className="text-2xl" />
      </button>

      {/* ── Add/Edit Modal ── */}
      <Modal
        isOpen={modal.isShown}
        onRequestClose={() => setModal({ isShown: false, type: "add", data: null })}
        style={{ overlay: { backgroundColor: "rgba(0,0,0,0.6)", zIndex: 50, backdropFilter: "blur(8px)", overflowY: "auto" } }}
        className="w-[96%] sm:w-[90%] md:w-[580px] max-h-[92vh] overflow-y-auto glass-modal rounded-2xl p-5 md:p-6 mx-auto mt-8 md:mt-14 shadow-2xl shadow-black/60 outline-none"
      >
        <AddEditNotes
          type={modal.type}
          noteData={modal.data}
          onclose={() => setModal({ isShown: false, type: "add", data: null })}
          getAllNotes={fetchNotes}
          showToastMessage={showToast}
        />
      </Modal>

      {/* ── Shortcuts Modal ── */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal rounded-2xl p-6 w-full max-w-xs shadow-2xl shadow-black/60">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold tracking-wide">Keyboard Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)} className="text-zinc-500 hover:text-white"><MdClose /></button>
            </div>
            <div className="space-y-3">
              {SHORTCUTS.map(({ keys, desc }) => (
                <div key={keys} className="flex justify-between items-center gap-4">
                  <span className="text-zinc-400 text-sm">{desc}</span>
                  <kbd className="glass-card text-zinc-300 text-xs px-2.5 py-1 rounded-lg font-mono shrink-0">{keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <Toast isShown={toast.isShown} message={toast.message} type={toast.type} onClose={() => setToast({ isShown: false, message: "", type: "" })} />
    </div>
  );
};

export default Home;

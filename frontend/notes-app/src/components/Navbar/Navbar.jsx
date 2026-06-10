import React, { useState, useEffect } from 'react';
import ProfileInfo from '../Cards/ProfileInfo';
import { useNavigate } from "react-router-dom";
import { MdOutlineKeyboard, MdClose } from 'react-icons/md';
import axiosInstance from '../../utils/axiosInstance';
import { disconnectSocket } from '../../utils/socketInstance';

const SHORTCUTS = [
  { keys: 'Ctrl + N', desc: 'New note' },
  { keys: 'Ctrl + K', desc: 'Focus search' },
  { keys: 'Esc',      desc: 'Close / clear search' },
];

const Navbar = ({ userInfo }) => {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const navigate = useNavigate();

  // Allow Navbar to open shortcuts via custom event from Home keyboard handler
  useEffect(() => {
    const open = () => setShowShortcuts(true);
    window.addEventListener("show-shortcuts", open);
    return () => window.removeEventListener("show-shortcuts", open);
  }, []);

  const onLogout = async () => {
    try { await axiosInstance.post('/logout'); } catch (_) {}
    disconnectSocket();
    localStorage.clear();
    navigate('/login');
  };

  return (
    <>
      <div className="backdrop-blur-md bg-[#1f2937]/60 rounded-b-xl shadow-lg flex items-center justify-between px-4 md:px-6 py-3 mx-2 md:mx-4 mt-2 mb-0 border border-gray-600/50">
        {/* Brand */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className="w-1.5 h-8 md:h-10 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full shrink-0" />
          <div className="min-w-0">
            <h2 className="text-base md:text-xl font-bold text-white tracking-tight leading-none truncate">My Notes</h2>
            <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">Your intelligent workspace</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            title="Keyboard shortcuts"
            onClick={() => setShowShortcuts(true)}
            className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 hidden sm:flex"
          >
            <MdOutlineKeyboard className="text-xl" />
          </button>
          <ProfileInfo userInfo={userInfo} onLogout={onLogout} />
        </div>
      </div>

      {showShortcuts && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e1e2f] border border-white/20 rounded-2xl p-6 w-full max-w-xs shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold text-lg">Shortcuts</h3>
              <button onClick={() => setShowShortcuts(false)} className="text-gray-400 hover:text-white">
                <MdClose className="text-xl" />
              </button>
            </div>
            <div className="space-y-3">
              {SHORTCUTS.map(({ keys, desc }) => (
                <div key={keys} className="flex justify-between items-center gap-4">
                  <span className="text-gray-300 text-sm">{desc}</span>
                  <kbd className="bg-white/10 border border-white/20 text-white text-xs px-2 py-1 rounded-md font-mono shrink-0">{keys}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;

import React from "react";
import { MdAdd, MdOutlineLightbulb, MdOutlineEditNote } from "react-icons/md";

const EmptyCard = ({ onAdd }) => (
  <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
    <div className="flex gap-4 mb-6">
      <div className="w-12 h-12 rounded-xl glass-card flex items-center justify-center text-violet-400/60 text-xl">
        <MdOutlineLightbulb />
      </div>
      <div className="w-12 h-12 rounded-xl glass-card flex items-center justify-center text-violet-400/60 text-xl">
        <MdOutlineEditNote />
      </div>
    </div>
    <h3 className="text-zinc-300 font-semibold text-lg mb-1">No notes yet</h3>
    <p className="text-zinc-500 text-sm mb-6 max-w-xs">
      Create your first note to get started. You can add text, markdown, tags, and more.
    </p>
    <button
      onClick={onAdd}
      className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-violet-900/40"
    >
      <MdAdd className="text-lg" /> New Note
    </button>
  </div>
);

export default EmptyCard;

import React, { useState } from 'react';
import { MdAdd, MdClose } from "react-icons/md";

const TagInput = ({ tags, setTags }) => {
  const [inputValue, setInputValue] = useState("");

  const addNewTag = () => {
    const val = inputValue.trim();
    if (val && !tags.includes(val)) {
      setTags([...tags, val]);
      setInputValue("");
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") { e.preventDefault(); addNewTag(); } };
  const handleRemove  = (tag) => setTags(tags.filter(t => t !== tag));

  return (
    <div>
      {tags?.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          {tags.map((tag, i) => (
            <span key={i} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/25 text-violet-300">
              #{tag}
              <button type="button" onClick={() => handleRemove(tag)} className="text-violet-400/70 hover:text-violet-200 transition-colors ml-0.5">
                <MdClose size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a tag…"
          className="flex-1 text-sm glass-input rounded-lg px-3 py-2 text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 transition-colors"
        />
        <button
          type="button"
          onClick={addNewTag}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-500 transition-colors shrink-0"
        >
          <MdAdd className="text-white" size={18} />
        </button>
      </div>
    </div>
  );
};

export default TagInput;

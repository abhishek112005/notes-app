import React, { useState } from 'react';
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";

const PasswordInput = ({ value, onChange, placeholder }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center glass-input rounded-lg px-3.5 focus-within:border-violet-500/50 transition-colors">
      <input
        value={value}
        onChange={onChange}
        type={show ? "text" : "password"}
        placeholder={placeholder || "Password"}
        className="flex-1 text-sm bg-transparent text-zinc-200 placeholder:text-zinc-600 py-2.5 outline-none"
      />
      <button type="button" onClick={() => setShow(!show)} className="text-zinc-500 hover:text-zinc-300 transition-colors ml-2">
        {show ? <FaRegEye size={16} /> : <FaRegEyeSlash size={16} />}
      </button>
    </div>
  );
};

export default PasswordInput;

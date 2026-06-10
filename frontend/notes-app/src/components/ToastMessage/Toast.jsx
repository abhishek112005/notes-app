import React, { useEffect } from "react";
import { MdCheck, MdDeleteOutline, MdClose, MdInfoOutline } from "react-icons/md";

const Toast = ({ isShown, message, type, onClose }) => {
  useEffect(() => {
    if (isShown) {
      const t = setTimeout(onClose, 3000);
      return () => clearTimeout(t);
    }
  }, [isShown, onClose]);

  const isDelete  = type === "delete";
  const isError   = type === "error";
  const icon      = isDelete ? <MdDeleteOutline /> : isError ? <MdInfoOutline /> : <MdCheck />;
  const iconColor = isDelete ? "text-red-400" : isError ? "text-yellow-400" : "text-green-400";
  const barColor  = isDelete ? "bg-red-500" : isError ? "bg-yellow-500" : "bg-green-500";

  return (
    <div className={`fixed top-5 right-5 z-[100] transition-all duration-300 ${isShown ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
      <div className="flex items-center gap-3 glass-modal rounded-xl px-4 py-3 shadow-2xl shadow-black/60 min-w-[240px] max-w-sm relative overflow-hidden">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${barColor} rounded-l-xl`} />
        <span className={`text-lg ${iconColor} shrink-0`}>{icon}</span>
        <p className="text-sm text-zinc-200 flex-1">{message}</p>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors shrink-0">
          <MdClose className="text-base" />
        </button>
      </div>
    </div>
  );
};

export default Toast;

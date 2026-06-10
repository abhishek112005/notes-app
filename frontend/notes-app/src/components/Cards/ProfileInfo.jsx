import React from 'react';
import { getInitials } from '../../utils/helper';

const ProfileInfo = ({ userInfo, onLogout }) => {
  return (
    <div className="flex items-center gap-2 md:gap-3">
      <div className="w-9 h-9 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-indigo-600 text-white font-semibold text-sm shrink-0">
        {userInfo?.fullName ? getInitials(userInfo.fullName) : "U"}
      </div>
      {/* Name — hidden on small screens */}
      <div className="hidden md:block">
        <p className="text-sm font-medium text-white leading-none">{userInfo?.fullName || "User"}</p>
        <button onClick={onLogout} className="text-xs text-gray-400 hover:text-red-400 transition-colors mt-0.5">
          Logout
        </button>
      </div>
      {/* Logout button — visible on mobile as a compact button */}
      <button
        onClick={onLogout}
        className="md:hidden text-xs text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-white/10 border border-white/10"
      >
        Out
      </button>
    </div>
  );
};

export default ProfileInfo;

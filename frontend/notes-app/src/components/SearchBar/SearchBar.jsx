import React from "react";
import { MdClear, MdSearch } from "react-icons/md";

const SearchBar = ({ value, onChange, handleSearch, onClearSearch }) => {
  return (
    <div className="flex items-center bg-white/20 backdrop-blur border border-white/30 rounded-full px-4 py-2 w-full max-w-md shadow-md">
      <MdSearch className="text-white mr-2 text-xl" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder="Search notes..."
        className="bg-transparent outline-none text-white placeholder-gray-300 flex-grow"
      />
      {value && (
        <MdClear
          className="text-white ml-2 text-xl cursor-pointer"
          onClick={onClearSearch}
        />
      )}
    </div>
  );
};

export default SearchBar;

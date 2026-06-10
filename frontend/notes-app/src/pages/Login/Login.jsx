import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PasswordInput from "../../components/Input/PasswordInput";
import { validateEmail } from "../../utils/helper";
import axiosInstance from "../../utils/axiosInstance";
import { MdOutlineNotes } from "react-icons/md";

const Login = () => {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateEmail(email)) { setError("Please enter a valid email address."); return; }
    if (!password)              { setError("Please enter your password."); return; }
    setError("");
    try {
      const { data } = await axiosInstance.post("/login", { email, password });
      if (data?.accessToken) {
        localStorage.setItem("token", data.accessToken);
        if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 -z-10" style={{
        background: "radial-gradient(ellipse at 20% 50%, rgba(124,58,237,0.2) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(79,70,229,0.15) 0%, transparent 55%), #060608"
      }} />

      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-900/50">
            <MdOutlineNotes className="text-white text-lg" />
          </div>
          <span className="text-xl font-semibold text-white tracking-wide">My Notes</span>
        </div>

        {/* Glass card */}
        <div className="glass-modal rounded-2xl p-7 shadow-2xl shadow-black/60">
          <h1 className="text-lg font-semibold text-white mb-1 tracking-wide">Sign in</h1>
          <p className="text-sm text-zinc-500 mb-6">Welcome back to your workspace</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1.5 tracking-widest uppercase">Email</label>
              <input
                type="text"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full glass-input rounded-lg px-3.5 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs text-zinc-500 font-medium block mb-1.5 tracking-widest uppercase">Password</label>
              <PasswordInput value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors shadow-lg shadow-violet-900/40 mt-1 tracking-wide"
            >
              Sign in
            </button>
          </form>

          <p className="text-xs text-center text-zinc-600 mt-5">
            Don't have an account?{" "}
            <Link to="/signup" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

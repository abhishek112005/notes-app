import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PasswordInput from "../../components/Input/PasswordInput";
import { validateEmail } from "../../utils/helper";
import axiosInstance from "../../utils/axiosInstance";
import { MdOutlineNotes, MdCheck } from "react-icons/md";

const SignUp = () => {
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState(null);
  const [success,  setSuccess]  = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (!name)                 { setError("Please enter your name"); return; }
    if (!validateEmail(email)) { setError("Please enter a valid email"); return; }
    if (!password)             { setError("Please enter a password"); return; }
    setError("");
    try {
      const { data } = await axiosInstance.post("/create-account", { fullName: name, email, password });
      if (data?.error) { setError(data.message); return; }
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
        background: "radial-gradient(ellipse at 80% 50%, rgba(124,58,237,0.2) 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, rgba(79,70,229,0.15) 0%, transparent 55%), #060608"
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
          {success ? (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/25 flex items-center justify-center mb-4">
                <MdCheck className="text-green-400 text-2xl" />
              </div>
              <h2 className="text-white font-semibold text-lg mb-1 tracking-wide">Account created!</h2>
              <p className="text-zinc-500 text-sm mb-5">Your workspace is ready.</p>
              <button
                onClick={() => navigate("/login")}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors tracking-wide"
              >
                Go to Login
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-white mb-1 tracking-wide">Create account</h1>
              <p className="text-sm text-zinc-500 mb-6">Start managing your notes today</p>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-500 font-medium block mb-1.5 tracking-widest uppercase">Full name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full glass-input rounded-lg px-3.5 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
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
                  Create account
                </button>
              </form>

              <p className="text-xs text-center text-zinc-600 mt-5">
                Already have an account?{" "}
                <Link to="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignUp;

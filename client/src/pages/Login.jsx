import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Music2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res?.success) {
        navigate(from, { replace: true });
      } else {
        setError(res?.error?.message || 'Incorrect email or password.');
      }
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Authentication failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#000000] text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Centered Spotify-style Auth Box */}
      <div className="w-full max-w-[440px] bg-[#121212] sm:border sm:border-[#282828] rounded-xl p-8 sm:p-10 shadow-2xl animate-fadeIn">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
            <div className="w-11 h-11 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Music2 className="w-5 h-5 text-black fill-black" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">Musicfy</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Log in to Musicfy
          </h1>
        </div>

        {/* Spotify-style Error Banner */}
        {error && (
          <div className="mb-6 p-3 rounded-lg bg-[#E22134]/15 border border-[#E22134]/40 text-[#F15E6C] text-xs font-semibold flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#E22134]" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-white mb-2">
              Email or username
            </label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email or username"
              autoComplete="username"
              className="w-full px-3.5 py-3 rounded-md bg-[#121212] border border-[#727272] text-sm text-white placeholder-[#727272] hover:border-white focus:border-white focus:outline-none focus:ring-1 focus:ring-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                className="w-full px-3.5 py-3 pr-11 rounded-md bg-[#121212] border border-[#727272] text-sm text-white placeholder-[#727272] hover:border-white focus:border-white focus:outline-none focus:ring-1 focus:ring-white transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-[#A7A7A7] hover:text-white transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-[#A7A7A7] hover:text-white">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded bg-[#121212] border-[#727272] accent-[#1DB954] cursor-pointer"
              />
              <span>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-full bg-[#1ED760] hover:bg-[#1fdf64] hover:scale-[1.02] active:scale-[0.98] text-black font-extrabold text-sm tracking-wide transition-all shadow-md mt-6 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              'Log In'
            )}
          </button>

          <div className="text-center pt-2">
            <a
              href="#forgot"
              onClick={(e) => {
                e.preventDefault();
                alert('If an account exists for this email, a password reset link has been sent.');
              }}
              className="text-xs text-white hover:underline font-medium"
            >
              Forgot your password?
            </a>
          </div>
        </form>

        {/* Divider */}
        <div className="border-t border-[#282828] my-7" />

        {/* Switch Link */}
        <div className="text-center text-xs text-[#A7A7A7]">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="text-white font-bold hover:underline hover:text-[#1ED760] transition-colors ml-1"
          >
            Sign up for Musicfy
          </Link>
        </div>
      </div>
    </div>
  );
}

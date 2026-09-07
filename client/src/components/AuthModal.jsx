import React, { useState } from 'react';
import { X, Sparkles, LogIn, UserPlus, Eye, EyeOff, Lock, Mail, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isRegister && !agreedTerms) {
      setError('Please agree to the Musicfy Terms of Service and Privacy Policy to register.');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        if (!username.trim()) {
          setError('Please enter a username.');
          setLoading(false);
          return;
        }
        if (!email.trim()) {
          setError('Please enter a valid email address.');
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          setError('Password must be at least 8 characters long.');
          setLoading(false);
          return;
        }

        const res = await register(username.trim(), email.trim(), password);
        if (!res?.success) {
          setError(res?.error?.message || 'Registration failed');
          setLoading(false);
          return;
        }
      } else {
        const res = await login(email.trim(), password);
        if (!res?.success) {
          setError(res?.error?.message || 'Invalid email/username or password');
          setLoading(false);
          return;
        }
      }
      onClose();
    } catch (err) {
      const serverMsg = err.response?.data?.error?.message 
        || err.response?.data?.message 
        || (typeof err.response?.data?.error === 'string' ? err.response.data.error : null)
        || err.message;
      setError(serverMsg || (isRegister ? 'Account creation failed' : 'Authentication failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#121216]/95 border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#71717A] hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#10B981] to-[#34D399] flex items-center justify-center green-glow shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {isRegister ? 'Join Musicfy' : 'Welcome Back'}
            </h3>
            <p className="text-xs text-[#A1A1AA]">
              {isRegister ? 'Create your personal music universe' : 'Sign in to access your library & playlists'}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#71717A] absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a handle (e.g. musiclover)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#18181C] border border-[#27272A] text-sm text-white focus:outline-none focus:border-[#10B981]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
              {isRegister ? 'Email Address' : 'Email or Username'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#71717A] absolute left-3.5 top-3.5" />
              <input
                type={isRegister ? 'email' : 'text'}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isRegister ? 'name@example.com' : 'Email or handle'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#18181C] border border-[#27272A] text-sm text-white focus:outline-none focus:border-[#10B981]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A1A1AA] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#71717A] absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? 'At least 8 characters' : '••••••••'}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#18181C] border border-[#27272A] text-sm text-white focus:outline-none focus:border-[#10B981]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-[#71717A] hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Terms Checkbox for Registration Mode */}
          {isRegister && (
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#A1A1AA] hover:text-white leading-relaxed select-none group">
                <input
                  type="checkbox"
                  id="authmodal-terms"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#18181C] border-[#27272A] accent-[#10B981] cursor-pointer mt-0.5 shrink-0"
                />
                <span>
                  I agree to the{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white underline hover:text-[#34D399] font-semibold"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Terms of Service
                  </a>{' '}
                  and acknowledge the{' '}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white underline hover:text-[#34D399] font-semibold"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Privacy Policy
                  </a>.
                </span>
              </label>
              {!agreedTerms && (
                <p className="text-[10px] text-amber-400/80 mt-1 pl-6">
                  * Terms acceptance required to sign up
                </p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (isRegister && !agreedTerms)}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 mt-2 ${
              loading || (isRegister && !agreedTerms)
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/40 opacity-60'
                : 'bg-gradient-to-r from-[#10B981] to-[#34D399] text-white green-glow hover:opacity-90 cursor-pointer'
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                {isRegister ? 'Create Musicfy Account' : 'Sign In'}
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); setAgreedTerms(false); }}
            className="text-xs text-[#A1A1AA] hover:text-[#34D399] transition-colors"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}

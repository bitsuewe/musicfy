import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Music2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password Strength Score (0 to 4)
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: 'bg-zinc-700' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    switch (score) {
      case 1: return { score: 1, label: 'Weak (Need 8+ characters)', color: 'bg-[#E22134]' };
      case 2: return { score: 2, label: 'Fair', color: 'bg-amber-500' };
      case 3: return { score: 3, label: 'Good', color: 'bg-[#1DB954]' };
      case 4: return { score: 4, label: 'Strong & Secure', color: 'bg-[#1ED760]' };
      default: return { score: 0, label: 'Too short', color: 'bg-[#E22134]' };
    }
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!agreedTerms) {
      setError('You must agree to the Musicfy Terms of Service and Privacy Policy to create an account.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await register(username, email, password);
      if (res?.success) {
        navigate('/', { replace: true });
      } else {
        setError(res?.error?.message || 'Registration failed.');
      }
    } catch (err) {
      const serverMsg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        (typeof err.response?.data?.error === 'string' ? err.response.data.error : null) ||
        err.message;
      setError(serverMsg || 'Account creation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#000000] text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Centered Spotify-style Auth Box */}
      <div className="w-full max-w-[440px] bg-[#121212] sm:border sm:border-[#282828] rounded-xl p-8 sm:p-10 shadow-2xl animate-fadeIn my-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-7">
          <Link to="/" className="inline-flex items-center gap-2 mb-5 group">
            <div className="w-11 h-11 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Music2 className="w-5 h-5 text-black fill-black" />
            </div>
            <span className="text-xl font-black tracking-tight text-white">Musicfy</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Sign up for Musicfy
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-1.5">
            Create your account to unlock unlimited streaming, custom playlists & offline downloads.
          </p>
        </div>

        {/* Spotify-style Error Banner */}
        {error && (
          <div className="mb-5 p-3 rounded-lg bg-[#E22134]/15 border border-[#E22134]/40 text-[#F15E6C] text-xs font-semibold flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#E22134]" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-white mb-1.5">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              autoComplete="email"
              className="w-full px-3.5 py-3 rounded-md bg-[#121212] border border-[#727272] text-sm text-white placeholder-[#727272] hover:border-white focus:border-white focus:outline-none focus:ring-1 focus:ring-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-white mb-1.5">
              What should we call you?
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              className="w-full px-3.5 py-3 rounded-md bg-[#121212] border border-[#727272] text-sm text-white placeholder-[#727272] hover:border-white focus:border-white focus:outline-none focus:ring-1 focus:ring-white transition-colors"
            />
            <p className="text-[11px] text-[#A7A7A7] mt-1">This appears on your Musicfy profile.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-white mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
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

            {/* Password strength indicator */}
            {password && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1 h-1">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`h-full flex-1 rounded-full transition-all duration-300 ${
                        strength.score >= step ? strength.color : 'bg-zinc-800'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-[#A7A7A7] font-medium">{strength.label}</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-white mb-1.5">
              Confirm password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              autoComplete="new-password"
              className="w-full px-3.5 py-3 rounded-md bg-[#121212] border border-[#727272] text-sm text-white placeholder-[#727272] hover:border-white focus:border-white focus:outline-none focus:ring-1 focus:ring-white transition-colors"
            />
          </div>

          {/* Mandatory Terms & Conditions Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#A7A7A7] hover:text-white leading-relaxed select-none group">
              <input
                type="checkbox"
                id="musicfy-register-terms"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="w-4 h-4 rounded bg-[#121212] border-[#727272] accent-[#1DB954] cursor-pointer mt-0.5 shrink-0"
              />
              <span className="text-xs">
                I agree to the{' '}
                <Link
                  to="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white underline hover:text-[#1ED760] font-semibold"
                  onClick={(e) => e.stopPropagation()}
                >
                  Musicfy Terms of Service
                </Link>{' '}
                and acknowledge the{' '}
                <Link
                  to="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white underline hover:text-[#1ED760] font-semibold"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </Link>.
              </span>
            </label>
            {!agreedTerms && (
              <p className="text-[11px] text-amber-400/80 mt-1 pl-6">
                * You must accept the terms & conditions above to enable registration.
              </p>
            )}
          </div>

          {/* Submit Button: Unworkable & Disabled Until Terms Are Accepted */}
          <button
            type="submit"
            disabled={loading || !agreedTerms}
            className={`w-full py-3.5 rounded-full font-extrabold text-sm tracking-wide transition-all shadow-md mt-6 flex items-center justify-center gap-2 ${
              loading || !agreedTerms
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50 opacity-60'
                : 'bg-[#1ED760] hover:bg-[#1fdf64] hover:scale-[1.02] active:scale-[0.98] text-black cursor-pointer'
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              'Sign Up for Musicfy'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="border-t border-[#282828] my-7" />

        {/* Switch Link */}
        <div className="text-center text-xs text-[#A7A7A7]">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-white font-bold hover:underline hover:text-[#1ED760] transition-colors ml-1"
          >
            Log in here.
          </Link>
        </div>
      </div>
    </div>
  );
}

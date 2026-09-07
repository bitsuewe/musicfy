import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Music2, ArrowLeft, Shield, FileText, Cookie, CheckCircle2, Lock, Scale, Sparkles, Globe, Mail } from 'lucide-react';

export default function Terms() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('terms'); // 'terms', 'privacy', 'cookies'

  useEffect(() => {
    if (location.pathname === '/privacy' || location.hash === '#privacy') {
      setActiveTab('privacy');
    } else if (location.hash === '#cookies') {
      setActiveTab('cookies');
    } else {
      setActiveTab('terms');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location]);

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA] font-['Plus_Jakarta_Sans',sans-serif] selection:bg-[#1DB954]/30 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#121216]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Music2 className="w-4 h-4 text-black fill-black" />
            </div>
            <span className="text-lg font-black tracking-tight text-white">Musicfy</span>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded-full ml-1.5 border border-[#10B981]/30">
              Legal Hub
            </span>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#A1A1AA] hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-2 rounded-xl transition-all border border-white/5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to App</span>
          </Link>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="border-b border-white/5 bg-gradient-to-b from-[#18181C] to-[#09090B] px-4 sm:px-8 py-12">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1DB954]/10 border border-[#1DB954]/30 text-[#1DB954] text-xs font-bold mb-4">
            <Shield className="w-3.5 h-3.5" />
            <span>Transparency & Trust</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
            Legal Terms & Policies
          </h1>
          <p className="text-sm sm:text-base text-[#A1A1AA] max-w-2xl mx-auto">
            Everything you need to know about your rights, privacy, local offline caching, and conditions of using the Musicfy music platform.
          </p>
          <p className="text-xs text-[#71717A] mt-3 font-medium">
            Effective Date: September 2026 • Version 2.4
          </p>

          {/* Tab Switcher */}
          <div className="flex items-center justify-center gap-2 mt-8 p-1.5 bg-[#121216] border border-white/10 rounded-2xl max-w-md mx-auto shadow-xl">
            <button
              onClick={() => setActiveTab('terms')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'terms'
                  ? 'bg-[#1DB954] text-black shadow-md'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Terms of Service</span>
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'privacy'
                  ? 'bg-[#1DB954] text-black shadow-md'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Privacy Policy</span>
            </button>
            <button
              onClick={() => setActiveTab('cookies')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'cookies'
                  ? 'bg-[#1DB954] text-black shadow-md'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Cookie className="w-3.5 h-3.5" />
              <span>Cookie Policy</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-12 text-sm leading-relaxed text-[#D4D4D8]">
        {/* ========================================================================= */}
        {/* TERMS OF SERVICE TAB */}
        {/* ========================================================================= */}
        {activeTab === 'terms' && (
          <article className="space-y-10 animate-fadeIn">
            <div className="bg-[#121216] border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-black text-white mb-4 flex items-center gap-2.5">
                <Scale className="w-6 h-6 text-[#1DB954]" />
                1. Acceptance of Terms
              </h2>
              <p className="mb-4">
                Welcome to <strong>Musicfy</strong> ("Musicfy", "we", "us", or "our"). By visiting, browsing, registering for an account, or using any feature of our web application or mobile services, you ("User", "you") agree to be legally bound by these Terms of Service ("Terms") and our Privacy Policy. If you do not accept or agree to these Terms, you must immediately cease accessing and using Musicfy.
              </p>
              <p>
                We reserve the right to revise, modify, or update these Terms at any time. Continued use of Musicfy following any changes constitutes your binding acceptance of the updated Terms.
              </p>
            </div>

            <div className="bg-[#121216] border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-black text-white mb-4 flex items-center gap-2.5">
                <Music2 className="w-6 h-6 text-[#1DB954]" />
                2. Musicfy Services & Guest vs. Member Access
              </h2>
              <p className="mb-3">
                Musicfy provides an online music streaming, recommendation, and discovery ecosystem. The platform offers two tiers of service:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-zinc-700 text-zinc-200 mb-2">
                    Guest Mode (Non-Logged In)
                  </span>
                  <ul className="text-xs text-[#A1A1AA] space-y-1.5 list-disc pl-4">
                    <li>Preview audio tracks (limited to 30-second clips, similar to Spotify's guest policy).</li>
                    <li>Browse top charts, artists, and public playlists.</li>
                    <li>Cannot create custom playlists or favorite songs.</li>
                    <li>Cannot download tracks for offline playback.</li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-[#1DB954]/10 border border-[#1DB954]/30">
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-[#1DB954] text-black mb-2">
                    Registered Member (Free Account)
                  </span>
                  <ul className="text-xs text-[#D4D4D8] space-y-1.5 list-disc pl-4">
                    <li>Full, unrestricted playback of the entire music catalog.</li>
                    <li>Full access to "Your Library", custom playlists & Liked Songs.</li>
                    <li>High-performance offline downloads stored locally on your device.</li>
                    <li>Synchronized personal queue, playback history, and listening stats.</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-[#A1A1AA]">
                Creating an account requires accepting these terms and confirming that you are at least 13 years old (or the legal age of digital consent in your jurisdiction).
              </p>
            </div>

            <div className="bg-[#121216] border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-black text-white mb-4 flex items-center gap-2.5">
                <Sparkles className="w-6 h-6 text-[#1DB954]" />
                3. Offline Downloads & Local Device Storage Policy
              </h2>
              <p className="mb-3">
                Musicfy provides a client-side progressive caching system allowing logged-in members to download audio files directly into their local browser storage (using IndexedDB and the Cache API) for uninterrupted offline listening:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
                <li>
                  <strong>Personal Offline Use Only:</strong> All audio files cached or downloaded via Musicfy are encrypted and retained solely within your browser or device container for private, personal playback.
                </li>
                <li>
                  <strong>No Commercial Redistribution:</strong> You agree not to extract, reverse engineer, resell, broadcast, or redistribute downloaded audio files outside the Musicfy application.
                </li>
                <li>
                  <strong>Device Storage Retention:</strong> Offline tracks remain stored on your physical device until manually removed by you, your browser cache is cleared, or storage quotas enforced by your operating system are exceeded.
                </li>
              </ul>
            </div>

            <div className="bg-[#121216] border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-black text-white mb-4 flex items-center gap-2.5">
                <Shield className="w-6 h-6 text-[#1DB954]" />
                4. Intellectual Property & Copyright (DMCA)
              </h2>
              <p className="mb-3">
                Musicfy respects the intellectual property rights of artists, producers, and labels. All trademarks, service marks, trade names, and copyrighted media displayed on Musicfy remain the sole property of their respective creators and owners.
              </p>
              <p className="mb-3">
                If you believe that any material available on or through Musicfy infringes upon any copyright you own or control, please submit a formal DMCA notification to our designated copyright agent at <strong className="text-white">legal@musicfy.app</strong> containing:
              </p>
              <ol className="list-decimal pl-5 space-y-1.5 text-xs text-[#A1A1AA]">
                <li>Identification of the copyrighted work claimed to have been infringed.</li>
                <li>The specific URL or track identifier on Musicfy.</li>
                <li>Your contact details (name, physical address, email, and telephone number).</li>
                <li>A statement of good faith belief that the disputed use is not authorized by the copyright owner.</li>
                <li>A statement under penalty of perjury that the information provided is accurate and that you are authorized to act on behalf of the owner.</li>
              </ol>
            </div>

            <div className="bg-[#121216] border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-black text-white mb-4 flex items-center gap-2.5">
                <Lock className="w-6 h-6 text-[#1DB954]" />
                5. User Accounts & Security Obligations
              </h2>
              <p className="mb-3">
                When registering an account on Musicfy, you must provide accurate, current, and complete information, including a unique username and valid email address. You are solely responsible for:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
                <li>Safeguarding your password and account credentials.</li>
                <li>All activities that occur under your username and profile.</li>
                <li>Promptly notifying us at <span className="text-[#1DB954]">security@musicfy.app</span> if you detect any unauthorized access or compromise of your account.</li>
              </ul>
              <p className="mt-4 text-xs text-[#A1A1AA]">
                Musicfy reserves the right to suspend or terminate accounts that violate our community standards, engage in automated scraping, abuse API endpoints, or compromise platform integrity.
              </p>
            </div>
          </article>
        )}

        {/* ========================================================================= */}
        {/* PRIVACY POLICY TAB */}
        {/* ========================================================================= */}
        {activeTab === 'privacy' && (
          <article className="space-y-10 animate-fadeIn">
            <div className="bg-[#121216] border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-black text-white mb-4 flex items-center gap-2.5">
                <Lock className="w-6 h-6 text-[#1DB954]" />
                1. Information We Collect
              </h2>
              <p className="mb-4">
                At Musicfy, we prioritize user privacy and practice strict data minimization. We only collect the data necessary to deliver a world-class audio experience:
              </p>
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <h3 className="font-bold text-white text-sm">Account Information</h3>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    When you register, we collect your selected username, email address, and an encrypted hash of your password (using industry-standard bcrypt hashing). We never store your plaintext password.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <h3 className="font-bold text-white text-sm">Listening History & Preferences</h3>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    To populate your personal profile, generate tailored recommendations, and synchronize your Liked Songs and playlists across your devices, we log tracks you play, save, or add to your library.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                  <h3 className="font-bold text-white text-sm">Device & Diagnostic Telemetry</h3>
                  <p className="text-xs text-[#A1A1AA] mt-1">
                    Basic diagnostic data such as browser type, operating system, network connection state (online/offline), and error telemetry to ensure smooth playback and audio engine stability.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#121216] border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-black text-white mb-4 flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-[#1DB954]" />
                2. How We Use Your Data
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
                <li>
                  <strong>Audio Delivery & Synchronization:</strong> Maintaining your personal library, playlists, and recently played tracks across desktop and mobile sessions.
                </li>
                <li>
                  <strong>Personalized Recommendations:</strong> Curating smart playlists, discover mixes, and artist suggestions based on your listening habits.
                </li>
                <li>
                  <strong>Security & Authentication:</strong> Verifying your identity during login, preventing brute-force attacks, and safeguarding against fraudulent activity.
                </li>
                <li>
                  <strong>We Never Sell Your Data:</strong> Musicfy does not sell, rent, or trade your personal information to third-party data brokers or behavioral advertising networks.
                </li>
              </ul>
            </div>

            <div className="bg-[#121216] border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-black text-white mb-4 flex items-center gap-2.5">
                <Globe className="w-6 h-6 text-[#1DB954]" />
                3. Your Privacy Rights (GDPR & CCPA)
              </h2>
              <p className="mb-4">
                Regardless of your location, Musicfy grants all registered users comprehensive control over their personal data:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <strong className="text-white block mb-1">Right to Access:</strong>
                  You can inspect all profile details, playlists, and saved tracks at any time via your profile page.
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <strong className="text-white block mb-1">Right to Erasure:</strong>
                  You can request full deletion of your account, profile, and associated records by emailing <span className="text-[#1DB954]">privacy@musicfy.app</span>.
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <strong className="text-white block mb-1">Right to Data Portability:</strong>
                  Request an export of your created playlists and favorites in standard JSON format.
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <strong className="text-white block mb-1">Local Storage Cleansing:</strong>
                  You can instantly clear all offline cached music and local storage tokens directly in your browser settings.
                </div>
              </div>
            </div>
          </article>
        )}

        {/* ========================================================================= */}
        {/* COOKIE POLICY TAB */}
        {/* ========================================================================= */}
        {activeTab === 'cookies' && (
          <article className="space-y-10 animate-fadeIn">
            <div className="bg-[#121216] border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-black text-white mb-4 flex items-center gap-2.5">
                <Cookie className="w-6 h-6 text-[#1DB954]" />
                1. What Are Cookies and Local Storage?
              </h2>
              <p className="mb-3">
                Cookies and browser Web Storage (such as <code className="text-[#1DB954] bg-black/40 px-1.5 py-0.5 rounded text-xs">localStorage</code> and <code className="text-[#1DB954] bg-black/40 px-1.5 py-0.5 rounded text-xs">IndexedDB</code>) are small data files saved on your computer or mobile device when you access a web application.
              </p>
              <p>
                Musicfy uses these storage technologies strictly to operate the platform smoothly, remember your audio settings, and keep you securely signed in.
              </p>
            </div>

            <div className="bg-[#121216] border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-black text-white mb-4 flex items-center gap-2.5">
                <Shield className="w-6 h-6 text-[#1DB954]" />
                2. Categories of Storage We Use
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-bold text-white text-sm">Essential & Authentication (Mandatory)</h3>
                    <span className="text-[10px] uppercase font-extrabold bg-[#1DB954]/20 text-[#1DB954] px-2 py-0.5 rounded">Always Active</span>
                  </div>
                  <p className="text-xs text-[#A1A1AA]">
                    Maintains your authenticated session token, verifies user role permissions, and ensures secure communication with the Musicfy API and Supabase database. Without these, you cannot stay logged in.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-bold text-white text-sm">Playback & Audio Preferences (Functional)</h3>
                    <span className="text-[10px] uppercase font-extrabold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Functional</span>
                  </div>
                  <p className="text-xs text-[#A1A1AA]">
                    Remembers your preferred volume slider position, mute toggle, shuffle mode, repeat state, active queue, and whether you have dismissed informational banners.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-bold text-white text-sm">Offline Storage & Cached Audio (IndexedDB)</h3>
                    <span className="text-[10px] uppercase font-extrabold bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">Offline Engine</span>
                  </div>
                  <p className="text-xs text-[#A1A1AA]">
                    Stores your downloaded audio tracks and song metadata directly on your device so you can listen without an internet connection.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#121216] border border-white/10 rounded-2xl p-6 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-black text-white mb-4 flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-[#1DB954]" />
                3. Managing Your Cookie & Storage Choices
              </h2>
              <p className="mb-3">
                You can manage your cookie preferences anytime using our floating cookie banner or by clearing your browser's site data. Note that disabling essential local storage will cause you to be logged out and reset your volume and player settings to defaults.
              </p>
              <div className="mt-4">
                <button
                  onClick={() => {
                    localStorage.removeItem('musicfy_cookie_consent');
                    window.location.reload();
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all cursor-pointer border border-white/10"
                >
                  Reset Cookie Consent Preferences
                </button>
              </div>
            </div>
          </article>
        )}

        {/* Contact Footer */}
        <div className="border-t border-white/10 pt-8 mt-12 text-center text-xs text-[#71717A]">
          <p className="flex items-center justify-center gap-1.5 font-medium mb-2 text-[#A1A1AA]">
            <Mail className="w-3.5 h-3.5 text-[#1DB954]" />
            Questions regarding our legal policies? Contact us at{' '}
            <a href="mailto:support@musicfy.app" className="text-white hover:underline hover:text-[#1DB954]">
              support@musicfy.app
            </a>
          </p>
          <p>© {new Date().getFullYear()} Musicfy Inc. All rights reserved. Musicfy is an independent audio platform.</p>
        </div>
      </main>
    </div>
  );
}

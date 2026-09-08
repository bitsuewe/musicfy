import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import { WifiOff, Lock, X } from 'lucide-react';

import Sidebar from './components/Sidebar';
import SidePlayer from './components/SidePlayer';
import MobileNav from './components/MobileNav';
import Navbar from './components/Navbar';
import PersistentPlayer from './components/PersistentPlayer';
import ProtectedRoute from './components/ProtectedRoute';

import Home from './pages/Home';
import Discover from './pages/Discover';
import Artist from './pages/Artist';
import Playlist from './pages/Playlist';
import Library from './pages/Library';
import Social from './pages/Social';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Register from './pages/Register';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';

import CreatePlaylistModal from './components/CreatePlaylistModal';
import AuthModal from './components/AuthModal';
import AddToPlaylistModal from './components/AddToPlaylistModal';
import CookieBanner from './components/CookieBanner';

import { usePlayer } from './context/PlayerContext';

function AppContent() {
  const { user } = useAuth();
  const { toastMessage } = usePlayer();
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [targetTrackForPlaylist, setTargetTrackForPlaylist] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [authWarningBanner, setAuthWarningBanner] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.authWarning || location.state?.from?.pathname === '/library') {
      setAuthWarningBanner('Please sign in or log in to access your Library, saved playlists, and liked songs.');
    }
  }, [location]);

  useEffect(() => {
    if (user) {
      setAuthWarningBanner(null);
    }
  }, [user]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handlePlaylistCreated = (newPlaylist) => {
    if (newPlaylist && newPlaylist.id) {
      navigate(`/playlist/${newPlaylist.id}`);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090B] text-[#FAFAFA] antialiased select-none">
      
      {/* ⚠️ Library / Authentication Warning Banner for Non-Logged In Users */}
      {authWarningBanner && !user && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#18181C]/98 border border-[#10B981]/50 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-2xl flex items-center gap-4 text-xs font-bold animate-fadeIn max-w-xl w-[92vw]">
          <div className="w-8 h-8 rounded-full bg-[#10B981]/20 flex items-center justify-center text-[#10B981] shrink-0 shadow-sm">
            <Lock className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm">Sign in to access Your Library</p>
            <p className="text-[#A1A1AA] text-xs font-medium mt-0.5">{authWarningBanner}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setShowAuthModal(true);
                setAuthWarningBanner(null);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[#10B981] hover:bg-[#059669] text-black font-extrabold text-xs shadow-md transition-all cursor-pointer active:scale-95"
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthWarningBanner(null)}
              className="p-1 rounded-full text-white/50 hover:text-white transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* YouTube Music Exact Top Offline Banner */}
      {!isOnline && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 bg-[#18181C]/95 border border-[#10B981]/50 text-white px-4 py-2 rounded-full shadow-2xl backdrop-blur-xl flex items-center gap-3 text-xs font-bold animate-fadeIn">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-[#10B981]" />
            <span>You're offline • Only downloaded music is available</span>
          </div>
          <button
            onClick={() => navigate('/library?tab=downloads')}
            className="px-2.5 py-1 rounded-lg bg-[#10B981] hover:bg-[#059669] text-black font-extrabold text-[11px] shadow-sm transition-all"
          >
            Downloads
          </button>
        </div>
      )}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#18181C]/95 border border-white/20 text-white px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-2.5 text-xs font-bold pointer-events-none animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* High-Fidelity Audio Engine, Background Keeper & Picture-in-Picture (PiP) Carrier */}
      <div 
        aria-hidden="true" 
        className="fixed pointer-events-none overflow-hidden"
        style={{ position: 'fixed', bottom: 0, left: 0, width: '200px', height: '120px', opacity: 0.001, pointerEvents: 'none', zIndex: -100 }}
      >
        <div id="musicfy-yt-player-iframe" style={{ width: '200px', height: '120px' }} />
        {/* High-Fidelity Native HTML5 Audio Engine (Both online stream & offline cached tracks) */}
        <audio id="musicfy-offline-audio" playsInline preload="auto" crossOrigin="anonymous" />
        {/* Mobile Background Audio Anchor */}
        <audio
          id="musicfy-bg-audio-anchor"
          loop
          playsInline
          preload="auto"
          src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"
        />
        {/* Floating Background Picture-in-Picture (PiP) Engine */}
        <canvas id="musicfy-pip-canvas" width="512" height="512" />
        <video id="musicfy-pip-video" playsInline autoPlay muted />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block h-full">
        <Sidebar
          onRequestCreatePlaylist={() => setShowCreatePlaylistModal(true)}
          onRequestAuth={() => setShowAuthModal(true)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <Navbar onRequestAuth={() => setShowAuthModal(true)} />
        
        <main className="flex-1 overflow-y-auto bg-[#09090B] pb-24 md:pb-20">
          <Routes>
            {/* Public Discovery Routes */}
            <Route path="/" element={<Home onAddToPlaylist={(track) => setTargetTrackForPlaylist(track)} />} />
            <Route path="/discover" element={<Discover onAddToPlaylist={(track) => setTargetTrackForPlaylist(track)} />} />
            <Route path="/artist/:id" element={<Artist onAddToPlaylist={(track) => setTargetTrackForPlaylist(track)} />} />
            <Route path="/playlist/:id" element={<Playlist onAddToPlaylist={(track) => setTargetTrackForPlaylist(track)} />} />
            
            {/* Dedicated Auth Pages */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Member Routes */}
            <Route path="/library" element={
              <ProtectedRoute>
                <Library
                  onRequestCreatePlaylist={() => setShowCreatePlaylistModal(true)}
                  onAddToPlaylist={(track) => setTargetTrackForPlaylist(track)}
                />
              </ProtectedRoute>
            } />
            <Route path="/social" element={
              <ProtectedRoute>
                <Social />
              </ProtectedRoute>
            } />
            <Route path="/profile/:id" element={
              <ProtectedRoute>
                <Profile onAddToPlaylist={(track) => setTargetTrackForPlaylist(track)} />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            } />
            {/* Legal & Policy Pages */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Terms />} />

            {/* Custom 404 Catch-All Page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>

      {/* Spotify-Style Side Controller & Queue Panel */}
      <SidePlayer onAddToPlaylist={(track) => setTargetTrackForPlaylist(track)} />

      {/* Global Persistent Player Controls */}
      <PersistentPlayer />

      {/* Mobile Bottom Navigation */}
      <MobileNav
        onRequestCreatePlaylist={() => setShowCreatePlaylistModal(true)}
        onRequestAuth={() => setShowAuthModal(true)}
      />

      {/* Modals & Popups */}
      <CreatePlaylistModal
        isOpen={showCreatePlaylistModal}
        onClose={() => setShowCreatePlaylistModal(false)}
        onCreated={handlePlaylistCreated}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <AddToPlaylistModal
        isOpen={!!targetTrackForPlaylist}
        track={targetTrackForPlaylist}
        onClose={() => setTargetTrackForPlaylist(null)}
      />

      {/* Cookie Consent Banner */}
      <CookieBanner />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <Router>
          <AppContent />
        </Router>
      </PlayerProvider>
    </AuthProvider>
  );
}

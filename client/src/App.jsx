import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';

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

import CreatePlaylistModal from './components/CreatePlaylistModal';
import AuthModal from './components/AuthModal';
import AddToPlaylistModal from './components/AddToPlaylistModal';

function AppContent() {
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [targetTrackForPlaylist, setTargetTrackForPlaylist] = useState(null);
  const navigate = useNavigate();

  const handlePlaylistCreated = (newPlaylist) => {
    if (newPlaylist && newPlaylist.id) {
      navigate(`/playlist/${newPlaylist.id}`);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090B] text-[#FAFAFA] antialiased select-none">
      
      {/* YouTube IFrame Container Permanent Mount (Invisible compliance element) */}
      <div className="fixed -top-[9999px] -left-[9999px] w-1 h-1 pointer-events-none opacity-0 overflow-hidden">
        <div id="musicfy-yt-player-iframe" />
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

      {/* Modals */}
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

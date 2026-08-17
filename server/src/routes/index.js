import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import * as musicController from '../controllers/musicController.js';
import * as playlistController from '../controllers/playlistController.js';
import * as socialController from '../controllers/socialController.js';
import * as adminController from '../controllers/adminController.js';
import { requireAuth, optionalAuth, requireAdmin } from '../middleware/auth.js';
import { validateRegisterInput, validateLoginInput } from '../validators/authValidator.js';
import { validatePlaylistInput, validateAddTrackInput } from '../validators/playlistValidator.js';

const router = Router();

// Spicify Production Authentication Endpoints
router.post('/auth/register', validateRegisterInput, authController.register);
router.post('/auth/login', validateLoginInput, authController.login);
router.post('/auth/logout', authController.logout);
router.post('/auth/logout-all', requireAuth, authController.logoutAll);
router.get('/auth/me', optionalAuth, authController.getMe);
router.post('/auth/verify-email', authController.verifyEmail);
router.post('/auth/resend-verification', requireAuth, authController.resendVerification);
router.post('/auth/forgot-password', authController.forgotPassword);
router.post('/auth/reset-password', authController.resetPassword);
router.post('/auth/change-password', requireAuth, authController.changePassword);

// Music Discovery Endpoints
router.get('/music/search', musicController.searchMusic);
router.get('/music/trending', musicController.getTrending);
router.get('/music/artist/:id', musicController.getArtist);
router.get('/music/recommendations', optionalAuth, musicController.getRecommendations);

// Playlist Endpoints
router.get('/playlists', optionalAuth, playlistController.getPlaylists);
router.post('/playlists', requireAuth, validatePlaylistInput, playlistController.createPlaylist);
router.get('/playlists/:id', playlistController.getPlaylistById);
router.patch('/playlists/:id', requireAuth, playlistController.updatePlaylist);
router.delete('/playlists/:id', requireAuth, playlistController.deletePlaylist);
router.post('/playlists/:id/tracks', requireAuth, validateAddTrackInput, playlistController.addTrackToPlaylist);
router.delete('/playlists/:id/tracks/:trackId', requireAuth, playlistController.removeTrackFromPlaylist);

// Social & History Endpoints
router.post('/tracks/:trackId/like', requireAuth, socialController.toggleLikeTrack);
router.get('/likes', requireAuth, socialController.getUserLikes);
router.post('/history', optionalAuth, socialController.logHistory);
router.get('/history', optionalAuth, socialController.getUserHistory);
router.get('/users/:id', socialController.getUserProfile);
router.post('/users/:userId/follow', requireAuth, socialController.toggleFollowUser);
router.get('/social/activity', optionalAuth, socialController.getActivityFeed);
router.get('/social/notifications', requireAuth, socialController.getNotifications);

// Admin Endpoints
router.get('/admin/stats', requireAuth, requireAdmin, adminController.getAdminStats);
router.get('/admin/users', requireAuth, requireAdmin, adminController.getAdminUsers);

export default router;

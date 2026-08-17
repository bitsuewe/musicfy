import { prisma } from '../config/db.js';
import bcrypt from 'bcryptjs';
import { FALLBACK_TRACKS } from '../services/youtubeService.js';

export async function seed() {
  console.log('🌱 Seeding Musicfy Database...');

  try {
    // Clean old records
    await prisma.notification.deleteMany().catch(() => {});
    await prisma.follow.deleteMany().catch(() => {});
    await prisma.listeningHistory.deleteMany().catch(() => {});
    await prisma.like.deleteMany().catch(() => {});
    await prisma.playlistTrack.deleteMany().catch(() => {});
    await prisma.collaborator.deleteMany().catch(() => {});
    await prisma.playlist.deleteMany().catch(() => {});
    await prisma.track.deleteMany().catch(() => {});
    await prisma.user.deleteMany().catch(() => {});

    // Spotify Production Standard: 12 Salt Rounds for Bcrypt
    const passwordHash = await bcrypt.hash('musicfy123', 12);

    // 1. Create Users
    const admin = await prisma.user.create({
      data: {
        username: 'MusicfyAdmin',
        email: 'admin@musicfy.com',
        passwordHash,
        role: 'ADMIN',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=MusicfyAdmin',
        bio: 'Musicfy System Administrator & Music Curator.'
      }
    });

    const alex = await prisma.user.create({
      data: {
        username: 'Alex',
        email: 'alex@musicfy.com',
        passwordHash,
        role: 'USER',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alex',
        bio: 'Synthwave & late night drive music enthusiast.'
      }
    });

    const sam = await prisma.user.create({
      data: {
        username: 'Sam',
        email: 'sam@musicfy.com',
        passwordHash,
        role: 'USER',
        avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sam',
        bio: 'Lo-Fi beats and ambient focus listener.'
      }
    });

    // 2. Create Tracks
    for (const t of FALLBACK_TRACKS) {
      await prisma.track.create({
        data: {
          id: t.id,
          title: t.title,
          artistName: t.artistName,
          channelId: t.channelId,
          thumbnail: t.thumbnail,
          durationSec: t.durationSec,
          viewCount: t.viewCount,
          publishedAt: t.publishedAt,
          category: t.category
        }
      });
    }

    // 3. Create Playlists
    await prisma.playlist.create({
      data: {
        title: 'Late Night Drive',
        description: 'Atmospheric synthwave and pop for midnight cruises.',
        coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
        ownerId: alex.id,
        isPublic: true,
        isCollab: true,
        tracks: {
          create: [
            { trackId: 'fHI8X4OXluQ', position: 1, addedById: alex.id },
            { trackId: 'L_LUpnjgPso', position: 2, addedById: alex.id },
            { trackId: 'kxyV6Xz7m3g', position: 3, addedById: sam.id }
          ]
        }
      }
    });

    console.log('✅ Musicfy Database Seeded Successfully!');
  } catch (err) {
    console.warn('Database seed notice: Update DATABASE_URL in server/.env with your local PostgreSQL password to persist initial seed records.', err.message);
  }
}

if (process.argv[1]?.endsWith('seed.js')) {
  seed().then(() => prisma.$disconnect()).catch(() => process.exit(0));
}

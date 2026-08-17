import React, { useState, useEffect } from 'react';
import { Users, Radio, Music, Play } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import api from '../services/api';

export default function Social() {
  const { playTrack } = usePlayer();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      const res = await api.get('/social/activity');
      setFeed(res.data.feed || []);
    } catch (err) {
      console.error('Fetch activity feed failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 pb-32 animate-fadeIn select-none">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#34D399] mb-1">
          <Radio className="w-4 h-4 animate-pulse" /> Live Listening Feed
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Friends Activity</h1>
        <p className="text-sm text-[#A1A1AA] font-medium mt-1">
          See what music your friends and community members are playing right now.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-[#111114] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : feed.length === 0 ? (
        <div className="py-16 text-center text-[#A1A1AA]">
          <Users className="w-10 h-10 mx-auto text-[#27272A] mb-2" />
          <p className="text-sm font-semibold">No recent activity found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feed.map((item) => (
            <div
              key={item.id}
              onClick={() => item.track && playTrack(item.track)}
              className="p-4 rounded-2xl bg-[#111114] border border-[#27272A] hover:border-[#10B981]/40 flex items-center justify-between cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <img
                  src={item.user?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=Musicfy'}
                  alt=""
                  className="w-12 h-12 rounded-full border border-[#27272A] object-cover"
                />
                <div className="overflow-hidden min-w-0">
                  <p className="text-xs text-[#A1A1AA]">
                    <span className="font-bold text-white hover:text-[#34D399]">{item.user?.username}</span> {item.action}
                  </p>
                  <h4 className="text-sm font-bold text-white truncate mt-0.5 group-hover:text-[#34D399]">
                    {item.track?.title}
                  </h4>
                  <p className="text-xs text-[#A1A1AA] truncate">{item.track?.artistName}</p>
                </div>
              </div>

              <button className="w-9 h-9 rounded-full bg-[#18181C] border border-[#27272A] group-hover:border-[#10B981] group-hover:bg-[#10B981] text-white flex items-center justify-center transition-colors">
                <Play className="w-4 h-4 fill-white ml-0.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

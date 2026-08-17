import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, Music, Activity, Database, CheckCircle, Flame } from 'lucide-react';
import api from '../services/api';

export default function Admin() {
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users')
      ]);
      setData(statsRes.data);
      setUsers(usersRes.data.users || []);
    } catch (err) {
      console.error('Fetch admin data error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return <div className="p-8 text-center text-[#A1A1AA]">Loading Admin Portal...</div>;
  }

  const { stats, topTracks } = data;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-10 pb-32 animate-fadeIn select-none">
      <div className="flex items-center gap-3 border-b border-[#27272A] pb-6">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin System Portal</h1>
          <p className="text-sm text-[#A1A1AA]">Live platform telemetry, API quota health & user moderation</p>
        </div>
      </div>

      {/* Analytics KPI Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-2xl bg-[#111114] border border-[#27272A]">
          <p className="text-xs font-semibold text-[#A1A1AA]">Total Registered Users</p>
          <h3 className="text-2xl font-extrabold text-white mt-1">{stats.totalUsers}</h3>
        </div>
        <div className="p-4 rounded-2xl bg-[#111114] border border-[#27272A]">
          <p className="text-xs font-semibold text-[#A1A1AA]">Total Playlists</p>
          <h3 className="text-2xl font-extrabold text-white mt-1">{stats.totalPlaylists}</h3>
        </div>
        <div className="p-4 rounded-2xl bg-[#111114] border border-[#27272A]">
          <p className="text-xs font-semibold text-[#A1A1AA]">Logged Track Plays</p>
          <h3 className="text-2xl font-extrabold text-[#34D399] mt-1">{stats.totalPlays}</h3>
        </div>
        <div className="p-4 rounded-2xl bg-[#111114] border border-[#27272A]">
          <p className="text-xs font-semibold text-[#A1A1AA]">Liked Track Events</p>
          <h3 className="text-2xl font-extrabold text-white mt-1">{stats.totalLikes}</h3>
        </div>
        <div className="p-4 rounded-2xl bg-[#111114] border border-[#27272A]">
          <p className="text-xs font-semibold text-[#A1A1AA]">Cache Hit Rate</p>
          <h3 className="text-2xl font-extrabold text-emerald-400 mt-1">{stats.cacheHitRate}</h3>
        </div>
        <div className="p-4 rounded-2xl bg-[#111114] border border-[#27272A]">
          <p className="text-xs font-semibold text-[#A1A1AA]">API Quota Status</p>
          <h3 className="text-xs font-bold text-emerald-400 mt-2 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Healthy
          </h3>
        </div>
      </div>

      {/* Top Played Tracks Chart */}
      {topTracks?.length > 0 && (
        <section className="p-6 rounded-3xl bg-[#111114] border border-[#27272A]">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#34D399]" /> Most Played Tracks
          </h3>
          <div className="space-y-3">
            {topTracks.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#18181C] text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[#10B981]">#{i + 1}</span>
                  <img src={item.track?.thumbnail} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  <div>
                    <p className="font-bold text-white">{item.track?.title}</p>
                    <p className="text-[#A1A1AA]">{item.track?.artistName}</p>
                  </div>
                </div>
                <span className="font-mono text-white font-semibold">{item.plays} plays</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* User Management Table */}
      <section className="p-6 rounded-3xl bg-[#111114] border border-[#27272A]">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#34D399]" /> User Management & Roles
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#A1A1AA]">
            <thead className="text-[11px] uppercase font-bold text-[#FAFAFA] border-b border-[#27272A]">
              <tr>
                <th className="pb-3">User</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Role</th>
                <th className="pb-3">Playlists</th>
                <th className="pb-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272A]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#18181C]">
                  <td className="py-3 flex items-center gap-2 font-bold text-white">
                    <img src={u.avatarUrl} alt="" className="w-6 h-6 rounded-full bg-[#18181C]" />
                    {u.username}
                  </td>
                  <td className="py-3 font-mono">{u.email}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-800 text-zinc-300'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 font-mono">{u._count?.playlists || 0}</td>
                  <td className="py-3">{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

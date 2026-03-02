'use client';

import React, { useEffect, useState } from 'react';
import { Users, Wifi, WifiOff, Activity } from 'lucide-react';

export interface UserPresence {
  userId: string;
  userName: string;
  userEmail: string;
  lastActive: string;
  isOnline: boolean;
  currentPage?: string;
  editingExpenseId?: string;
  color: string;
}

interface CollaborativeIndicatorProps {
  onlineUsers?: UserPresence[];
  currentUserId?: string;
  language: string;
}

const USER_COLORS = [
  'bg-blue-500',
  'bg-red-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-yellow-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-cyan-500',
];

export default function CollaborativeIndicator({
  onlineUsers = [],
  currentUserId,
  language,
}: CollaborativeIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);

  const onlineCount = onlineUsers.filter((u) => u.isOnline && u.userId !== currentUserId).length;
  const otherUsers = onlineUsers.filter((u) => u.userId !== currentUserId);

  if (onlineCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Collapsed View */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="relative group flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition"
      >
        <Users size={18} />
        <span className="font-semibold">{onlineCount}</span>

        {/* Online Avatars */}
        <div className="flex -space-x-2">
          {otherUsers
            .filter((u) => u.isOnline)
            .slice(0, 3)
            .map((user) => {
              const colorIndex = user.userId.charCodeAt(0) % USER_COLORS.length;
              return (
                <div
                  key={user.userId}
                  className={`w-6 h-6 rounded-full ${USER_COLORS[colorIndex]} flex items-center justify-center text-white text-xs font-bold border-2 border-indigo-600`}
                  title={user.userName}
                >
                  {user.userName.charAt(0).toUpperCase()}
                </div>
              );
            })}
          {onlineCount > 3 && (
            <div className="w-6 h-6 rounded-full bg-indigo-800 flex items-center justify-center text-white text-xs font-bold border-2 border-indigo-600">
              +{onlineCount - 3}
            </div>
          )}
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
          {onlineCount} usuário{onlineCount !== 1 ? 's' : ''} online
        </div>
      </button>

      {/* Expanded Details */}
      {showDetails && (
        <div className="absolute bottom-20 right-0 w-72 rounded-lg bg-white shadow-xl border border-gray-200 p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
            <Activity className="text-indigo-600" size={20} />
            <h3 className="font-bold text-gray-900">Atividade Colaborativa</h3>
          </div>

          {/* Online Users */}
          <div>
            <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
              <Wifi size={14} className="text-green-600" />
              Online Agora ({onlineCount})
            </p>
            <div className="space-y-2">
              {otherUsers
                .filter((u) => u.isOnline)
                .map((user) => {
                  const colorIndex = user.userId.charCodeAt(0) % USER_COLORS.length;
                  const lastActiveDate = new Date(user.lastActive);
                  const now = new Date();
                  const diffMinutes = Math.floor(
                    (now.getTime() - lastActiveDate.getTime()) / 1000 / 60
                  );

                  return (
                    <div key={user.userId} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <div
                        className={`w-8 h-8 rounded-full ${USER_COLORS[colorIndex]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                      >
                        {user.userName.charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {user.userName}
                        </p>
                        <p className="text-xs text-gray-600 truncate">{user.userEmail}</p>
                        {user.editingExpenseId && (
                          <p className="text-xs text-indigo-600 font-semibold">
                            📝 Editando uma despesa
                          </p>
                        )}
                        {user.currentPage && (
                          <p className="text-xs text-gray-500">
                            Em: <span className="font-semibold">{user.currentPage}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex-shrink-0">
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Offline Users */}
          {otherUsers.filter((u) => !u.isOnline).length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                <WifiOff size={14} className="text-gray-400" />
                Offline
              </p>
              <div className="space-y-2">
                {otherUsers
                  .filter((u) => !u.isOnline)
                  .slice(0, 3)
                  .map((user) => {
                    const colorIndex = user.userId.charCodeAt(0) % USER_COLORS.length;
                    const lastActiveDate = new Date(user.lastActive);
                    const now = new Date();
                    const diffMinutes = Math.floor(
                      (now.getTime() - lastActiveDate.getTime()) / 1000 / 60
                    );

                    let timeAgo = '';
                    if (diffMinutes < 60) {
                      timeAgo = `${diffMinutes}m atrás`;
                    } else if (diffMinutes < 1440) {
                      timeAgo = `${Math.floor(diffMinutes / 60)}h atrás`;
                    } else {
                      timeAgo = `${Math.floor(diffMinutes / 1440)} dias atrás`;
                    }

                    return (
                      <div
                        key={user.userId}
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded opacity-60"
                      >
                        <div
                          className={`w-8 h-8 rounded-full ${USER_COLORS[colorIndex]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                        >
                          {user.userName.charAt(0).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {user.userName}
                          </p>
                          <p className="text-xs text-gray-500">{timeAgo}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Footer Info */}
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              💡 As alterações são sincronizadas em tempo real entre todos os usuários online.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

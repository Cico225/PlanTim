import { useState, useEffect } from 'react';
import { FiTrendingUp, FiAward, FiStar, FiUser } from 'react-icons/fi';
import { lmsService } from '@/services/lmsService';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface LeaderboardEntry {
  id: number;
  name: string;
  total_points: number;
  rank: number;
}

export default function Leaderboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'all' | 'week' | 'month'>('all');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await lmsService.getLeaderboard(period, 20);
      setLeaderboard(data.leaderboard || []);
      setCurrentUserRank(data.current_user_rank || null);
    } catch (error: any) {
      console.error('Failed to load leaderboard:', error);
      toast.error('Neuspješno učitavanje ljestvice');
    } finally {
      setLoading(false);
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white';
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800';
      case 3:
        return 'bg-gradient-to-r from-amber-600 to-amber-700 text-white';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white';
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden p-3 sm:space-y-6 sm:p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            <FiTrendingUp className="text-purple-500" />
            Ljestvica
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Rang lista korisnika po osvojenim bodovima
          </p>
        </div>

        {/* Period Filter */}
        <div className="grid w-full grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800 sm:flex sm:w-auto sm:gap-2">
          {[
            { value: 'week', label: 'Sedmica' },
            { value: 'month', label: 'Mjesec' },
            { value: 'all', label: 'Ukupno' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value as any)}
              className={`rounded-md px-2 py-2 text-xs font-medium transition-colors sm:px-4 sm:py-2 sm:text-sm ${
                period === option.value
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Current user rank card */}
      {currentUserRank && (
        <div className="rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 p-4 text-white shadow-lg sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-blue-100">Vaša pozicija</p>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-bold sm:text-4xl">#{currentUserRank}</span>
                <span className="text-sm text-blue-200 sm:text-base">od {leaderboard.length} korisnika</span>
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-blue-100">Vaši bodovi</p>
              <div className="flex items-center gap-2">
                <FiStar className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-2xl font-bold sm:text-3xl">
                  {leaderboard.find(e => e.id === user?.id)?.total_points || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="card overflow-hidden">
        {leaderboard.length === 0 ? (
          <div className="p-12 text-center">
            <FiAward className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Nema podataka
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Još nema korisnika na ljestvici za odabrani period.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {leaderboard.map((entry) => {
              const isCurrentUser = entry.id === user?.id;
              const rankIcon = getRankIcon(entry.rank);
              
              return (
                <div 
                  key={entry.id}
                  className={`flex items-center gap-3 p-3 transition-colors sm:p-4 ${
                    isCurrentUser 
                      ? 'bg-blue-50 dark:bg-blue-900/20' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {/* Rank */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold sm:h-12 sm:w-12 sm:text-lg ${getRankStyle(entry.rank)}`}>
                    {rankIcon || entry.rank}
                  </div>

                  {/* User info */}
                  <div className="min-w-0 flex-1">
                    <h3 className={`truncate font-semibold ${
                      isCurrentUser 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {entry.name}
                      {isCurrentUser && <span className="ml-1 text-sm font-normal">(Vi)</span>}
                    </h3>
                  </div>

                  {/* Points */}
                  <div className="flex shrink-0 items-center gap-1 text-right sm:gap-2">
                    <FiStar className={`h-4 w-4 sm:h-5 sm:w-5 ${
                      entry.rank <= 3 ? 'text-yellow-500' : 'text-gray-400'
                    }`} />
                    <span className="text-base font-bold text-gray-900 dark:text-white sm:text-lg">
                      {entry.total_points.toLocaleString()}
                    </span>
                    <span className="hidden text-sm text-gray-500 dark:text-gray-400 sm:inline">bodova</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          Kako osvojiti bodove?
        </h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Završite lekciju: <span className="font-medium">+10 bodova</span></li>
          <li>• Položite kviz: <span className="font-medium">+20 bodova</span></li>
          <li>• Završite kurs: <span className="font-medium">+50 bodova</span></li>
          <li>• Pogledajte video do kraja: <span className="font-medium">+5 bodova</span></li>
          <li>• Osvojite bedž: <span className="font-medium">+10-500 bodova</span></li>
        </ul>
      </div>
    </div>
  );
}







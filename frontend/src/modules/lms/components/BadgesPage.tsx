import { useState, useEffect } from 'react';
import { 
  FiAward, FiStar, FiBook, FiCheckCircle, FiZap, FiGift, FiLock 
} from 'react-icons/fi';
import { lmsService, Badge } from '@/services/lmsService';
import toast from 'react-hot-toast';

export default function BadgesPage() {
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      setLoading(true);
      const data = await lmsService.getBadges();
      setBadges(data.badges || []);
    } catch (error: any) {
      console.error('Failed to load badges:', error);
      toast.error('Neuspješno učitavanje bedževa');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'FiStar': return <FiStar className="w-8 h-8" />;
      case 'FiBook': return <FiBook className="w-8 h-8" />;
      case 'FiAward': return <FiAward className="w-8 h-8" />;
      case 'FiCheckCircle': return <FiCheckCircle className="w-8 h-8" />;
      case 'FiFire': return <FiZap className="w-8 h-8" />;
      case 'FiGift': return <FiGift className="w-8 h-8" />;
      default: return <FiAward className="w-8 h-8" />;
    }
  };

  const filteredBadges = badges.filter(badge => {
    if (filter === 'earned') return badge.is_earned;
    if (filter === 'locked') return !badge.is_earned;
    return true;
  });

  const earnedCount = badges.filter(b => b.is_earned).length;
  const totalCount = badges.length;
  const progressPercent = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

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
            <FiAward className="text-amber-500" />
            Bedževi
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Sakupljajte bedževe završavanjem kurseva i izazova
          </p>
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-amber-100">Osvojeni bedževi</p>
            <p className="text-4xl font-bold">{earnedCount} / {totalCount}</p>
          </div>
          <div className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center">
            <span className="text-2xl font-bold">{progressPercent}%</span>
          </div>
        </div>
        <div className="w-full bg-white/30 rounded-full h-3">
          <div 
            className="bg-white h-3 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Filter */}
      <div className="grid w-full grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800 sm:flex sm:w-fit sm:gap-2">
        {[
          { value: 'all', label: 'Svi' },
          { value: 'earned', label: 'Osvojeni' },
          { value: 'locked', label: 'Zaključani' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === option.value
                ? 'bg-white dark:bg-gray-700 text-amber-600 dark:text-amber-400 shadow'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Badges Grid */}
      {filteredBadges.length === 0 ? (
        <div className="card p-12 text-center">
          <FiAward className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Nema bedževa
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filter === 'earned' 
              ? 'Još nemate osvojenih bedževa. Nastavite učiti!'
              : 'Nema dostupnih bedževa.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBadges.map((badge) => (
            <div 
              key={badge.id}
              className={`card p-6 transition-all duration-300 hover:shadow-lg ${
                badge.is_earned 
                  ? 'border-2 border-amber-400 dark:border-amber-500' 
                  : 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
              }`}
            >
              <div className="flex flex-col items-center text-center">
                {/* Badge Icon */}
                <div 
                  className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 relative ${
                    badge.is_earned 
                      ? 'text-white shadow-lg' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                  }`}
                  style={badge.is_earned ? { backgroundColor: badge.color } : {}}
                >
                  {badge.is_earned ? (
                    getIcon(badge.icon)
                  ) : (
                    <>
                      {getIcon(badge.icon)}
                      <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/30">
                        <FiLock className="w-6 h-6 text-white" />
                      </div>
                    </>
                  )}
                </div>

                {/* Badge Name */}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  {badge.name}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {badge.description}
                </p>

                {/* Points reward */}
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <FiStar className="w-4 h-4" />
                  <span className="text-sm font-medium">+{badge.points_reward} bodova</span>
                </div>

                {/* Earned date */}
                {badge.is_earned && badge.earned_at && (
                  <p className="text-xs text-gray-500 mt-2">
                    Osvojeno: {new Date(badge.earned_at).toLocaleDateString('hr-HR')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Badge Types Info */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Vrste bedževa
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
              <FiCheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Kursevi</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Za završene kurseve</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white">
              <FiAward className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Kvizovi</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Za položene kvizove</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white">
              <FiZap className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Streak</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Za kontinuitet učenja</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white">
              <FiStar className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Bodovi</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Za sakupljene bodove</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}







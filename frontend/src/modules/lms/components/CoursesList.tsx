import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiBook, FiClock, FiUser, FiStar, FiArrowRight, FiFilter, FiSettings } from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';
import { lmsService, Course } from '@/services/lmsService';
import toast from 'react-hot-toast';

export default function CoursesList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    level: '',
  });

  const isManager = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    loadCourses();
  }, [filters]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await lmsService.getCourses({
        ...filters,
        published: isManager ? undefined : true,
      });
      setCourses(response.data || []);
    } catch (error: any) {
      console.error('Failed to load courses:', error);
      toast.error('Neuspješno učitavanje kurseva');
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return colors[level] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  const getLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      beginner: 'Početnički',
      intermediate: 'Srednji',
      advanced: 'Napredni',
    };
    return labels[level] || level;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">Kursevi</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 sm:text-base">
            Pronađite i započnite novi kurs
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={() => navigate('/lms/my-courses')}
            className="btn-secondary"
          >
            Moji kursevi
          </button>
          {isManager && (
            <>
              <button
                onClick={() => navigate('/lms/manage')}
                className="btn-secondary"
              >
                Upravljanje kursevima
              </button>
              <button
                onClick={() => navigate('/lms/manage/new')}
                className="btn-primary"
              >
                + Novi kurs
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4 flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
        <FiFilter className="text-gray-500 dark:text-gray-400" />
        <select
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          className="input w-full sm:w-auto min-w-0"
        >
          <option value="">Sve kategorije</option>
          <option value="it">IT</option>
          <option value="business">Biznis</option>
          <option value="marketing">Marketing</option>
          <option value="design">Dizajn</option>
        </select>
        <select
          value={filters.level}
          onChange={(e) => setFilters({ ...filters, level: e.target.value })}
          className="input w-full sm:w-auto min-w-0"
        >
          <option value="">Svi nivoi</option>
          <option value="beginner">Početnički</option>
          <option value="intermediate">Srednji</option>
          <option value="advanced">Napredni</option>
        </select>
      </div>

      {/* Courses Grid */}
      {courses.length === 0 ? (
        <div className="card p-12 text-center">
          <FiBook className="mx-auto text-6xl text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Nema dostupnih kurseva
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Trenutno nema kurseva koji zadovoljavaju vaše kriterijume.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="card hover:shadow-lg transition-shadow cursor-pointer group flex flex-col h-full overflow-hidden"
              onClick={() => navigate(`/lms/courses/${course.id}`)}
            >
              {/* Cover Image */}
              {course.cover_image ? (
                <div className="relative h-40 sm:h-48 overflow-hidden">
                  <img
                    src={course.cover_image}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {course.is_featured && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                        <FiStar className="w-3 h-3" />
                        Istaknuto
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative h-32 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <FiBook className="w-12 h-12 text-white/50" />
                  {course.is_featured && (
                    <div className="absolute top-2 right-2">
                      <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                        <FiStar className="w-3 h-3" />
                        Istaknuto
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Content */}
              <div className="p-4 sm:p-5 flex flex-col flex-1">
                {/* Level & Category */}
                <div className="flex items-center justify-between mb-3 gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${getLevelColor(course.level)}`}>
                    {getLevelLabel(course.level)}
                  </span>
                  {course.category && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {course.category}
                    </span>
                  )}
                </div>
                
                {/* Title */}
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                  {course.title}
                </h3>
                
                {/* Description */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 flex-1">
                  {course.description || 'Nema opisa'}
                </p>
                
                {/* Stats */}
                <div className="flex items-center flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {(course.duration || course.duration === 0) && (
                    <span className="flex items-center gap-1">
                      <FiClock className="w-4 h-4 flex-shrink-0" />
                      <span>{course.duration}h</span>
                    </span>
                  )}
                  {course.lessons_count !== undefined && course.lessons_count > 0 && (
                    <span className="flex items-center gap-1">
                      <FiBook className="w-4 h-4 flex-shrink-0" />
                      <span>{course.lessons_count} lekcija</span>
                    </span>
                  )}
                  {course.enrollments_count !== undefined && course.enrollments_count > 0 && (
                    <span className="flex items-center gap-1">
                      <FiUser className="w-4 h-4 flex-shrink-0" />
                      <span>{course.enrollments_count} upisanih</span>
                    </span>
                  )}
                </div>
                
                {/* Instructor */}
                {course.instructor && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <FiUser className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{course.instructor.name}</span>
                  </div>
                )}
                
                {/* Action Button */}
                <button className="btn-primary w-full flex items-center justify-center gap-2 mt-auto">
                  Pregledaj kurs
                  <FiArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


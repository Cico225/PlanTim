import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBook, FiClock, FiCheckCircle, FiTrendingUp } from 'react-icons/fi';
import { lmsService, Enrollment } from '@/services/lmsService';
import toast from 'react-hot-toast';

export default function MyCourses() {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEnrollments();
  }, []);

  const loadEnrollments = async () => {
    try {
      setLoading(true);
      const data = await lmsService.getMyEnrollments();
      // Ensure data is an array
      setEnrollments(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load enrollments:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error
        || error.message
        || 'Neuspješno učitavanje kurseva';
      
      toast.error(errorMessage);
      setEnrollments([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
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
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">Moji kursevi</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 sm:text-base">
          Kursevi u kojima ste upisani
        </p>
      </div>

      {enrollments.length === 0 ? (
        <div className="card p-12 text-center">
          <FiBook className="mx-auto text-6xl text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Niste upisani u nijedan kurs
          </h3>
          <button
            onClick={() => navigate('/lms')}
            className="btn-primary mt-4"
          >
            Pronađi kurseve
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((enrollment) => (
            <div
              key={enrollment.id}
              className="card hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/lms/courses/${enrollment.course_id}`)}
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {enrollment.course?.title || `Kurs #${enrollment.course_id || enrollment.id}`}
                </h3>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Progres</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {enrollment.progress || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(Math.max(enrollment.progress || 0, 0), 100)}%` }}
                    ></div>
                  </div>
                </div>
                {enrollment.completed_at && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                    <FiCheckCircle className="w-5 h-5" />
                    <span className="text-sm font-semibold">Završeno</span>
                  </div>
                )}
                {enrollment.final_score !== undefined && enrollment.final_score !== null && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
                    <FiTrendingUp className="w-4 h-4" />
                    <span>Rezultat: {typeof enrollment.final_score === 'number' ? enrollment.final_score.toFixed(1) : enrollment.final_score}%</span>
                    {enrollment.grade && (
                      <span className="font-semibold">({enrollment.grade})</span>
                    )}
                  </div>
                )}
                {enrollment.recommend_retake && (
                  <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900 rounded text-sm text-yellow-800 dark:text-yellow-200">
                    Preporučeno ponovno polaganje
                  </div>
                )}
                {enrollment.enrolled_at && (
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-500">
                    Upisan: {new Date(enrollment.enrolled_at).toLocaleDateString('sr-RS')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



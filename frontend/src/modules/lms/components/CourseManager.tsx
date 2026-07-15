import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEdit, FiTrash2, FiEye } from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';
import { lmsService, Course } from '@/services/lmsService';
import toast from 'react-hot-toast';

export default function CourseManager() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const isManager = user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (isManager) {
      loadCourses();
    }
  }, [isManager]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await lmsService.getCourses({ published: undefined });
      setCourses(response.data || []);
    } catch (error: any) {
      console.error('Failed to load courses:', error);
      toast.error('Neuspješno učitavanje kurseva');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (courseId: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj kurs?')) {
      return;
    }

    try {
      await lmsService.deleteCourse(courseId);
      toast.success('Kurs je uspješno obrisan');
      // Remove course from local state immediately for better UX
      setCourses(courses.filter(course => course.id !== courseId));
      // Also reload to ensure consistency
      loadCourses();
    } catch (error: any) {
      console.error('Failed to delete course:', error);
      toast.error(error?.response?.data?.message || 'Neuspješno brisanje kursa');
    }
  };

  if (!isManager) {
    return (
      <div className="p-6">
        <div className="card p-12 text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Nemate pristup ovom dijelu
          </h3>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden p-3 sm:space-y-6 sm:p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">Upravljanje kursevima</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 sm:text-base">
            Kreirajte i upravljajte kursevima
          </p>
        </div>
        <button
          onClick={() => navigate('/lms/manage/new')}
          className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto"
        >
          <FiPlus className="w-4 h-4" />
          Novi kurs
        </button>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {courses.map((course) => (
          <div key={course.id} className="card p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900 dark:text-white">{course.title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{course.category || 'Nema kategorije'}</p>
              </div>
              <span
                className={`shrink-0 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                  course.is_published
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }`}
              >
                {course.is_published ? 'Objavljeno' : 'Skica'}
              </span>
            </div>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
              Upisanih: {course.enrollments_count || 0}
            </p>
            <div className="flex justify-end gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
              <button
                onClick={() => navigate(`/lms/courses/${course.id}`)}
                className="rounded p-2 text-blue-600 dark:text-blue-400"
                title="Pregled"
              >
                <FiEye className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate(`/lms/manage/${course.id}/edit`)}
                className="rounded p-2 text-yellow-600 dark:text-yellow-400"
                title="Uredi"
              >
                <FiEdit className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate(`/lms/courses/${course.id}`)}
                className="rounded p-2 text-blue-600 dark:text-blue-400"
                title="Dodaj sadržaj"
              >
                <FiPlus className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleDelete(course.id)}
                className="rounded p-2 text-red-600 dark:text-red-400"
                title="Obriši"
              >
                <FiTrash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card hidden overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Naslov
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Upisanih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Akcije
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {courses.map((course) => (
                <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {course.title}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {course.category || 'Nema kategorije'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        course.is_published
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}
                    >
                      {course.is_published ? 'Objavljeno' : 'Skica'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {course.enrollments_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`/lms/courses/${course.id}`)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        title="Pregled"
                      >
                        <FiEye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => navigate(`/lms/manage/${course.id}/edit`)}
                        className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300"
                        title="Uredi"
                      >
                        <FiEdit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => navigate(`/lms/courses/${course.id}`)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                        title="Dodaj sadržaj"
                      >
                        <FiPlus className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                        title="Obriši"
                      >
                        <FiTrash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


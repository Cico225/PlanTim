import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiBook, FiPlay, FiCheckCircle, FiClock, FiUser, FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import { lmsService, Course, Lesson, Quiz } from '@/services/lmsService';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [deletingLessonId, setDeletingLessonId] = useState<number | null>(null);
  const [deletingQuizId, setDeletingQuizId] = useState<number | null>(null);

  useEffect(() => {
    if (courseId) {
      loadCourseData();
    }
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const [courseData, lessonsData, quizzesData] = await Promise.all([
        lmsService.getCourse(Number(courseId)),
        lmsService.getLessons(Number(courseId)),
        lmsService.getQuizzes(Number(courseId)),
      ]);
      setCourse(courseData);
      setLessons(lessonsData);
      setQuizzes(quizzesData);
    } catch (error: any) {
      console.error('Failed to load course:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error
        || error.message
        || 'Neuspješno učitavanje kursa';
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!courseId) return;
    try {
      setEnrolling(true);
      await lmsService.enrollInCourse(Number(courseId));
      toast.success('Uspješno upisan u kurs');
      loadCourseData();
    } catch (error: any) {
      console.error('Failed to enroll:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error
        || error.message
        || 'Greška na serveru. Pokušajte ponovo.';
      
      toast.error(errorMessage);
    } finally {
      setEnrolling(false);
    }
  };

  const handleDeleteLesson = async (lesson: Lesson, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!courseId || !lesson.id) return;

    const confirmed = window.confirm(
      `Obrisati lekciju „${lesson.title}"? Ova radnja se ne može poništiti.`
    );
    if (!confirmed) return;

    try {
      setDeletingLessonId(lesson.id);
      await lmsService.deleteLesson(Number(courseId), lesson.id);
      setLessons((prev) => prev.filter((l) => l.id !== lesson.id));
      toast.success('Lekcija je obrisana');
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || 'Neuspješno brisanje lekcije'
      );
    } finally {
      setDeletingLessonId(null);
    }
  };

  const handleDeleteQuiz = async (quiz: Quiz, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!courseId || !quiz.id) return;

    const confirmed = window.confirm(
      `Obrisati kviz „${quiz.title}"? Ova radnja se ne može poništiti.`
    );
    if (!confirmed) return;

    try {
      setDeletingQuizId(quiz.id);
      await lmsService.deleteQuiz(Number(courseId), quiz.id);
      setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id));
      toast.success('Kviz je obrisan');
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || error?.message || 'Neuspješno brisanje kviza'
      );
    } finally {
      setDeletingQuizId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6">
        <div className="card p-12 text-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Kurs nije pronađen
          </h3>
        </div>
      </div>
    );
  }

  const isEnrolled = !!course.user_enrollment;
  const isManager = user?.role === 'admin' || user?.role === 'manager';

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 max-w-full overflow-x-hidden">
      {/* Course Header */}
      <div className="card p-4 sm:p-6">
        <button
          onClick={() => navigate('/lms/maloprodaja/katalog')}
          className="text-blue-600 dark:text-blue-400 mb-4 hover:underline"
        >
          ← Nazad na kurseve
        </button>
        
        {course.cover_image && (
          <img
            src={course.cover_image}
            alt={course.title}
            className="mb-4 h-40 w-full rounded-lg object-cover sm:mb-6 sm:h-64"
          />
        )}

        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div className="min-w-0 flex-1">
            <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              {course.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {course.description}
            </p>
            
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm text-gray-600 dark:text-gray-400">
              {course.instructor && (
                <div className="flex items-center gap-2">
                  <FiUser className="w-4 h-4" />
                  <span>{course.instructor.name}</span>
                </div>
              )}
              {course.duration && (
                <div className="flex items-center gap-2">
                  <FiClock className="w-4 h-4" />
                  <span>{course.duration}h</span>
                </div>
              )}
              {lessons.length > 0 && (
                <div className="flex items-center gap-2">
                  <FiBook className="w-4 h-4" />
                  <span>{lessons.length} lekcija</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {isManager && (
              <button
                onClick={() => navigate(`/lms/maloprodaja/manage/${course.id}/edit`)}
                className="btn-secondary flex w-full items-center justify-center gap-2 sm:w-auto"
              >
                <FiEdit className="w-4 h-4" />
                Uredi
              </button>
            )}
            {!isEnrolled && !isManager && (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto"
              >
                <FiPlus className="w-4 h-4" />
                {enrolling ? 'Upisivanje...' : 'Upisi se'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lessons */}
      {(isEnrolled || isManager) && (
        <div className="card p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">
              Lekcije
            </h2>
            {isManager && (
              <button
                onClick={() => navigate(`/lms/maloprodaja/courses/${courseId}/lessons/new`)}
                className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto"
              >
                <FiPlus className="w-4 h-4" />
                Dodaj lekciju
              </button>
            )}
          </div>
          {lessons.length > 0 ? (
          <div className="space-y-3">
            {lessons.map((lesson, index) => (
              <div
                key={lesson.id}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 sm:p-4"
                onClick={() => navigate(`/lms/maloprodaja/courses/${courseId}/lessons/${lesson.id}`)}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600 dark:bg-blue-900 dark:text-blue-400 sm:h-10 sm:w-10">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-gray-900 dark:text-white">
                      {lesson.title}
                    </h3>
                    {lesson.duration && (
                      <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        {lesson.duration} min
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  {lesson.user_progress?.is_completed && (
                    <FiCheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {isManager && (
                    <>
                      <button
                        type="button"
                        title="Uredi lekciju"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/lms/maloprodaja/courses/${courseId}/lessons/${lesson.id}/edit`);
                        }}
                        className="rounded-lg p-2 text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                      >
                        <FiEdit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Obriši lekciju"
                        disabled={deletingLessonId === lesson.id}
                        onClick={(e) => handleDeleteLesson(lesson, e)}
                        className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      >
                        {deletingLessonId === lesson.id ? (
                          <span className="block h-4 w-4 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
                        ) : (
                          <FiTrash2 className="h-4 w-4" />
                        )}
                      </button>
                    </>
                  )}
                  <FiPlay className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>Nema lekcija. {isManager && 'Kliknite "Dodaj lekciju" da dodate prvu lekciju.'}</p>
            </div>
          )}
        </div>
      )}

      {/* Quizzes */}
      {(isEnrolled || isManager) && (
        <div className="card p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">
              Testovi
            </h2>
            {isManager && (
              <button
                onClick={() => navigate(`/lms/maloprodaja/courses/${courseId}/quizzes/new`)}
                className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto"
              >
                <FiPlus className="w-4 h-4" />
                Dodaj kviz
              </button>
            )}
          </div>
          {quizzes.length > 0 ? (
          <div className="space-y-3">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 sm:p-4"
                onClick={() => navigate(`/lms/maloprodaja/courses/${courseId}/quizzes/${quiz.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold text-gray-900 dark:text-white">
                    {quiz.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Prolazni rezultat: {quiz.passing_score}%
                  </p>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  {quiz.latest_attempt?.passed && (
                    <FiCheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {isManager && (
                    <>
                      <button
                        type="button"
                        title="Uredi kviz"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/lms/maloprodaja/courses/${courseId}/quizzes/${quiz.id}/edit`);
                        }}
                        className="rounded-lg p-2 text-emerald-700 transition hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                      >
                        <FiEdit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Obriši kviz"
                        disabled={deletingQuizId === quiz.id}
                        onClick={(e) => handleDeleteQuiz(quiz, e)}
                        className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      >
                        {deletingQuizId === quiz.id ? (
                          <span className="block h-4 w-4 animate-spin rounded-full border-2 border-rose-300 border-t-rose-600" />
                        ) : (
                          <FiTrash2 className="h-4 w-4" />
                        )}
                      </button>
                    </>
                  )}
                  <FiPlay className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>Nema kvizova. {isManager && 'Kliknite "Dodaj kviz" da dodate prvi kviz.'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


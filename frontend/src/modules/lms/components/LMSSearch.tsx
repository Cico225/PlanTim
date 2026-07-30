import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiSearch, FiBook, FiFileText, FiHelpCircle, FiX, FiArrowRight } from 'react-icons/fi';
import { lmsService } from '@/services/lmsService';
import toast from 'react-hot-toast';
import debounce from 'lodash/debounce';

interface SearchResults {
  courses: Array<{ id: number; title: string; description?: string; type: string }>;
  lessons: Array<{ id: number; title: string; course_id: number; course_title: string; type: string }>;
  quizzes: Array<{ id: number; title: string; course_id: number; course_title: string; type: string }>;
}

export default function LMSSearch() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [filter, setFilter] = useState<'all' | 'courses' | 'lessons' | 'quizzes'>('all');

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, searchFilter: string) => {
      if (searchQuery.length < 2) {
        setResults(null);
        setTotalResults(0);
        return;
      }

      try {
        setLoading(true);
        const data = await lmsService.search(searchQuery, searchFilter as any);
        setResults(data.results);
        setTotalResults(data.total);
      } catch (error: any) {
        console.error('Search failed:', error);
        toast.error('Pretraga nije uspjela');
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (query) {
      debouncedSearch(query, filter);
      setSearchParams({ q: query });
    } else {
      setResults(null);
      setTotalResults(0);
      setSearchParams({});
    }
  }, [query, filter, debouncedSearch, setSearchParams]);

  const handleClear = () => {
    setQuery('');
    setResults(null);
    setTotalResults(0);
  };

  const handleResultClick = (type: string, id: number, courseId?: number) => {
    switch (type) {
      case 'course':
        navigate(`/lms/maloprodaja/courses/${id}`);
        break;
      case 'lesson':
        navigate(`/lms/maloprodaja/courses/${courseId}/lesson/${id}`);
        break;
      case 'quiz':
        navigate(`/lms/maloprodaja/courses/${courseId}/quiz/${id}`);
        break;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'course': return <FiBook className="w-5 h-5 text-blue-500" />;
      case 'lesson': return <FiFileText className="w-5 h-5 text-green-500" />;
      case 'quiz': return <FiHelpCircle className="w-5 h-5 text-purple-500" />;
      default: return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'course': return 'Kurs';
      case 'lesson': return 'Lekcija';
      case 'quiz': return 'Kviz';
      default: return type;
    }
  };

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden p-3 sm:space-y-6 sm:p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          <FiSearch className="text-blue-500" />
          Pretraga
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Pretražite kurseve, lekcije i kvizove po sadržaju
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Unesite pojam za pretragu..."
          className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-12 pr-12 text-base text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:py-4 sm:text-lg"
          autoFocus
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <FiX className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {[
          { value: 'all', label: 'Sve' },
          { value: 'courses', label: 'Kursevi' },
          { value: 'lessons', label: 'Lekcije' },
          { value: 'quizzes', label: 'Kvizovi' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === option.value
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Results */}
      {!loading && results && (
        <div className="space-y-6">
          {/* Results count */}
          <p className="text-gray-600 dark:text-gray-400">
            Pronađeno <span className="font-semibold">{totalResults}</span> rezultata za "{query}"
          </p>

          {/* Courses */}
          {(filter === 'all' || filter === 'courses') && results.courses.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FiBook className="text-blue-500" />
                Kursevi ({results.courses.length})
              </h2>
              <div className="space-y-2">
                {results.courses.map((item) => (
                  <div
                    key={`course-${item.id}`}
                    onClick={() => handleResultClick('course', item.id)}
                    className="card flex cursor-pointer items-center justify-between gap-2 p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {getIcon('course')}
                      <div className="min-w-0">
                        <h3 className="truncate font-medium text-gray-900 dark:text-white">{item.title}</h3>
                        {item.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <FiArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lessons */}
          {(filter === 'all' || filter === 'lessons') && results.lessons.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FiFileText className="text-green-500" />
                Lekcije ({results.lessons.length})
              </h2>
              <div className="space-y-2">
                {results.lessons.map((item) => (
                  <div
                    key={`lesson-${item.id}`}
                    onClick={() => handleResultClick('lesson', item.id, item.course_id)}
                    className="card flex cursor-pointer items-center justify-between gap-2 p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {getIcon('lesson')}
                      <div className="min-w-0">
                        <h3 className="truncate font-medium text-gray-900 dark:text-white">{item.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Kurs: {item.course_title}
                        </p>
                      </div>
                    </div>
                    <FiArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quizzes */}
          {(filter === 'all' || filter === 'quizzes') && results.quizzes.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FiHelpCircle className="text-purple-500" />
                Kvizovi ({results.quizzes.length})
              </h2>
              <div className="space-y-2">
                {results.quizzes.map((item) => (
                  <div
                    key={`quiz-${item.id}`}
                    onClick={() => handleResultClick('quiz', item.id, item.course_id)}
                    className="card flex cursor-pointer items-center justify-between gap-2 p-4 transition-shadow hover:shadow-md"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {getIcon('quiz')}
                      <div className="min-w-0">
                        <h3 className="truncate font-medium text-gray-900 dark:text-white">{item.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Kurs: {item.course_title}
                        </p>
                      </div>
                    </div>
                    <FiArrowRight className="w-5 h-5 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {totalResults === 0 && (
            <div className="text-center py-12">
              <FiSearch className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Nema rezultata
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Nije pronađen nijedan rezultat za "{query}". Pokušajte s drugim pojmom.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Initial state */}
      {!loading && !results && !query && (
        <div className="text-center py-12">
          <FiSearch className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Započnite pretragu
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Unesite najmanje 2 znaka za pretragu sadržaja.
          </p>
        </div>
      )}
    </div>
  );
}







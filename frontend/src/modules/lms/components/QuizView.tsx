import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiArrowRight,
  FiAward,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiRepeat,
  FiSend,
  FiX,
  FiXCircle,
} from 'react-icons/fi';
import { lmsService, Quiz, QuizAttempt, SurpriseReward } from '@/services/lmsService';
import toast from 'react-hot-toast';
import ScratchCard from './ScratchCard';
import SpinWheel from './SpinWheel';

const UNANSWERED_PLACEHOLDER = '—';

export default function QuizView() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [startTime, setStartTime] = useState(new Date());
  const [now, setNow] = useState(Date.now());
  const [surpriseAvailable, setSurpriseAvailable] = useState<{ scratch_card: boolean; spin_wheel: boolean } | null>(null);
  const [surpriseRewards, setSurpriseRewards] = useState<SurpriseReward[]>([]);
  const [surpriseSettings, setSurpriseSettings] = useState<any>(null);
  const [showSurprise, setShowSurprise] = useState<'scratch_card' | 'spin_wheel' | null>(null);
  const [wonReward, setWonReward] = useState<any>(null);
  const autoSubmitted = useRef(false);

  useEffect(() => {
    if (courseId && quizId) {
      loadQuiz();
    }
  }, [courseId, quizId]);

  const timeLimitMs = quiz?.time_limit ? quiz.time_limit * 60 * 1000 : 0;
  const remainingMs = timeLimitMs ? Math.max(0, timeLimitMs - (now - startTime.getTime())) : 0;

  useEffect(() => {
    if (!timeLimitMs || result) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timeLimitMs, result]);

  useEffect(() => {
    if (timeLimitMs && remainingMs === 0 && !result && !submitting && !autoSubmitted.current) {
      autoSubmitted.current = true;
      toast('Vrijeme je isteklo — odgovori su poslani', { icon: '⏰' });
      handleSubmit(true);
    }
  }, [remainingMs, timeLimitMs, result, submitting]);

  const checkSurpriseAvailability = async () => {
    try {
      const availability = await lmsService.checkSurpriseAvailability(Number(courseId), Number(quizId));
      setSurpriseAvailable(availability);

      if (availability.scratch_card || availability.spin_wheel) {
        const surprises = await lmsService.getCourseSurprises(Number(courseId));
        setSurpriseSettings(surprises.settings);
        const filteredRewards = surprises.rewards.filter(
          (r) =>
            r.is_active &&
            ((availability.scratch_card && r.type === 'scratch_card') ||
              (availability.spin_wheel && r.type === 'spin_wheel'))
        );
        setSurpriseRewards(filteredRewards);
      }
    } catch (error: any) {
      console.error('Failed to check surprise availability:', error);
    }
  };

  const handlePlaySurprise = async (type: 'scratch_card' | 'spin_wheel') => {
    try {
      if (type === 'spin_wheel') {
        setShowSurprise(type);
        return;
      }

      const response = await lmsService.playSurprise(Number(courseId), {
        surprise_type: type,
        quiz_id: Number(quizId),
      });

      setWonReward(response.reward);
      setShowSurprise(type);

      if (response.reward.reward_type === 'bonus_points' && response.reward.points_value) {
        toast.success(`Osvojili ste ${response.reward.points_value} bonus bodova!`);
      } else {
        toast.success(`Osvojili ste: ${response.reward.title}!`);
      }
    } catch (error: any) {
      console.error('Failed to play surprise:', error);
      toast.error(error.response?.data?.error || 'Neuspješno pokretanje iznenađenja');
    }
  };

  const handleSpinWheelComplete = async (_selectedReward: any) => {
    try {
      const response = await lmsService.playSurprise(Number(courseId), {
        surprise_type: 'spin_wheel',
        quiz_id: Number(quizId),
      });

      setWonReward(response.reward);

      if (response.reward.reward_type === 'bonus_points' && response.reward.points_value) {
        toast.success(`Osvojili ste ${response.reward.points_value} bonus bodova!`);
      } else {
        toast.success(`Osvojili ste: ${response.reward.title}!`);
      }
    } catch (error: any) {
      console.error('Failed to play spin wheel:', error);
      toast.error(error.response?.data?.error || 'Neuspješno pokretanje točka');
    }
  };

  const handleSurpriseComplete = () => {
    setShowSurprise(null);
    setSurpriseAvailable(null);
  };

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const data = await lmsService.getQuiz(Number(courseId), Number(quizId));
      setQuiz(data);
    } catch (error: any) {
      console.error('Failed to load quiz:', error);
      toast.error('Neuspješno učitavanje kviza');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (force = false) => {
    if (!quiz || !courseId || !quizId) return;
    const questions = quiz.questions || [];

    if (!force && questions.some((q) => !answers[q.id]?.trim())) {
      toast.error('Molimo odgovorite na sva pitanja');
      return;
    }

    const answersArray = questions.map((q) => ({
      question_id: q.id,
      answer: answers[q.id]?.trim() ? answers[q.id].toString() : UNANSWERED_PLACEHOLDER,
    }));

    try {
      setSubmitting(true);
      const response = await lmsService.submitQuiz(
        Number(courseId),
        Number(quizId),
        answersArray,
        startTime.toISOString()
      );
      setResult(response.attempt);
      toast.success(response.message);

      if (response.attempt.passed) {
        checkSurpriseAvailability();
      }
    } catch (error: any) {
      console.error('Failed to submit quiz:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const restart = () => {
    setResult(null);
    setAnswers({});
    setCurrent(0);
    setStartTime(new Date());
    setNow(Date.now());
    autoSubmitted.current = false;
    loadQuiz();
  };

  const backButton = (
    <button
      onClick={() => navigate(`/lms/maloprodaja/courses/${courseId}`)}
      className="flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
    >
      <FiArrowLeft className="h-4 w-4" />
      Nazad na kurs
    </button>
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="max-w-full overflow-x-hidden p-3 sm:p-4 md:p-6">
        <div className="card p-8 text-center sm:p-12">
          <h3 className="text-xl font-semibold">{quiz ? 'Kviz nema pitanja' : 'Kviz nije pronađen'}</h3>
        </div>
      </div>
    );
  }

  if (result) {
    const percentage = parseFloat(String(result.percentage ?? 0));
    const passed = result.passed === true;
    const results: any[] = result.question_results || [];
    const correctCount = results.filter((r) => r.is_correct).length;
    const circumference = 2 * Math.PI * 52;

    return (
      <div className="max-w-full space-y-4 overflow-x-hidden p-3 sm:space-y-6 sm:p-4 md:p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {backButton}

          <div className="card overflow-hidden">
            <div
              className={`flex flex-col items-center gap-4 p-6 text-center text-white sm:p-8 ${
                passed
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                  : 'bg-gradient-to-br from-rose-500 to-orange-500'
              }`}
            >
              <div className="relative h-32 w-32">
                <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="10" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="white"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - Math.min(100, percentage) / 100)}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{percentage.toFixed(0)}%</span>
                  <span className="text-xs opacity-90">ocjena {result.grade || '—'}</span>
                </div>
              </div>
              <div>
                <h2 className="flex items-center justify-center gap-2 text-2xl font-bold">
                  {passed ? <FiCheckCircle className="h-7 w-7" /> : <FiXCircle className="h-7 w-7" />}
                  {passed ? 'Kviz je položen!' : 'Kviz nije položen'}
                </h2>
                <p className="mt-1 text-sm opacity-90">
                  Prolazni rezultat je {quiz.passing_score}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-gray-200 border-b border-gray-200 text-center dark:divide-gray-700 dark:border-gray-700">
              <Stat label="Tačno" value={`${correctCount}/${results.length || quiz.questions.length}`} />
              <Stat label="Bodovi" value={String(result.score ?? 0)} />
              <Stat label="Pokušaj" value={`#${result.attempt_number ?? 1}`} />
            </div>

            <div className="space-y-6 p-4 sm:p-6">
              {result.recommend_retake && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                  Preporučeno je da ponovo položite ovaj kviz kako biste postigli bolji rezultat.
                </div>
              )}

              {/* Surprises */}
              {passed && surpriseAvailable && !showSurprise && (
                <div className="rounded-xl border border-purple-300 bg-gradient-to-r from-purple-100 to-pink-100 p-4 dark:border-purple-700 dark:from-purple-900 dark:to-pink-900">
                  <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                    🎉 Čestitamo! Osvojili ste iznenađenje!
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {surpriseAvailable.scratch_card && (
                      <button onClick={() => handlePlaySurprise('scratch_card')} className="btn-primary flex items-center gap-2">
                        🎫 Zagrebi grebalicu
                      </button>
                    )}
                    {surpriseAvailable.spin_wheel && (
                      <button onClick={() => handlePlaySurprise('spin_wheel')} className="btn-primary flex items-center gap-2">
                        🎡 Zavrti točak
                      </button>
                    )}
                  </div>
                </div>
              )}

              {showSurprise === 'scratch_card' && wonReward && (
                <ScratchCard reward={wonReward} onComplete={handleSurpriseComplete} />
              )}

              {showSurprise === 'spin_wheel' && surpriseRewards.length > 0 && (
                <div className="w-full overflow-x-auto">
                  <div className="flex min-w-max justify-center">
                    <SpinWheel
                      rewards={surpriseRewards.filter(
                        (r): r is SurpriseReward & { id: number } => r.id != null
                      )}
                      onSpinComplete={handleSpinWheelComplete}
                      segments={surpriseSettings?.spin_wheel_segments || 8}
                    />
                  </div>
                  {wonReward && (
                    <div className="mt-4 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 p-4 text-center text-white shadow-lg sm:p-6">
                      <h3 className="mb-2 text-xl font-bold sm:text-2xl">{wonReward.title}</h3>
                      {wonReward.description && (
                        <p className="mb-4 text-base opacity-90 sm:text-lg">{wonReward.description}</p>
                      )}
                      {wonReward.reward_type === 'bonus_points' && wonReward.points_value && (
                        <p className="mb-4 text-3xl font-bold sm:text-4xl">+{wonReward.points_value} bodova</p>
                      )}
                      {wonReward.message && <p className="text-xs opacity-80 sm:text-sm">{wonReward.message}</p>}
                      <button
                        onClick={handleSurpriseComplete}
                        className="btn-secondary mt-4 w-full bg-white py-2 text-sm text-purple-600 hover:bg-gray-100 sm:w-auto sm:py-3 sm:text-base"
                      >
                        Zatvori
                      </button>
                    </div>
                  )}
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Pregled odgovora</h3>
                  {results.map((qResult, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 rounded-xl border-2 p-4 ${
                        qResult.is_correct
                          ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20'
                          : 'border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/20'
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${
                          qResult.is_correct ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      >
                        {qResult.is_correct ? <FiCheck className="h-4 w-4" /> : <FiX className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {index + 1}. {qResult.question}
                          </p>
                          <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-300">
                            {qResult.points_earned}/{qResult.total_points}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          Vaš odgovor:{' '}
                          <span className={qResult.is_correct ? 'font-medium text-emerald-700 dark:text-emerald-400' : 'font-medium text-rose-700 dark:text-rose-400'}>
                            {qResult.user_answer && qResult.user_answer !== UNANSWERED_PLACEHOLDER
                              ? qResult.user_answer
                              : 'Nije odgovoreno'}
                          </span>
                        </p>
                        {!qResult.is_correct && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Tačan odgovor:{' '}
                            <span className="font-medium text-emerald-700 dark:text-emerald-400">
                              {qResult.correct_answer}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                {(result.recommend_retake || !passed) && (
                  <button onClick={restart} className="btn-primary flex items-center justify-center gap-2">
                    <FiRepeat className="h-4 w-4" />
                    Polaži ponovo
                  </button>
                )}
                <button
                  onClick={() => navigate(`/lms/maloprodaja/courses/${courseId}`)}
                  className="btn-secondary"
                >
                  Nazad na kurs
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const questions = quiz.questions;
  const question = questions[current];
  const answeredCount = questions.filter((q) => answers[q.id]?.trim()).length;
  const isLast = current === questions.length - 1;
  const allAnswered = answeredCount === questions.length;
  const setAnswer = (value: string) => setAnswers((a) => ({ ...a, [question.id]: value }));
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const lowTime = timeLimitMs > 0 && remainingMs < 60000;

  return (
    <div className="max-w-full space-y-4 overflow-x-hidden p-3 sm:space-y-6 sm:p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        {backButton}

        <div className="card overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-violet-500 to-indigo-600 p-5 text-white sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide opacity-80">
                  <FiAward className="h-3.5 w-3.5" />
                  Kviz · prolaz {quiz.passing_score}%
                </p>
                <h1 className="mt-1 text-xl font-bold sm:text-2xl">{quiz.title}</h1>
                {quiz.description && <p className="mt-1 text-sm opacity-90">{quiz.description}</p>}
              </div>
              {timeLimitMs > 0 && (
                <div
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 font-mono text-lg font-bold ${
                    lowTime ? 'animate-pulse bg-rose-500' : 'bg-white/20'
                  }`}
                >
                  <FiClock className="h-4 w-4" />
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
              )}
            </div>
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs opacity-90">
                <span>
                  Pitanje {current + 1} od {questions.length}
                </span>
                <span>Odgovoreno {answeredCount}/{questions.length}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/25">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: `${(answeredCount / questions.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Question navigator */}
          <div className="flex flex-wrap gap-1.5 border-b border-gray-200 p-3 dark:border-gray-700">
            {questions.map((q, i) => {
              const answered = !!answers[q.id]?.trim();
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrent(i)}
                  className={`h-8 w-8 rounded-lg text-sm font-semibold transition ${
                    i === current
                      ? 'bg-indigo-600 text-white shadow ring-2 ring-indigo-300 dark:ring-indigo-800'
                      : answered
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Question */}
          <div className="space-y-4 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white sm:text-xl">{question.question}</h2>
              <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {question.points} {question.points === 1 ? 'bod' : 'boda'}
              </span>
            </div>

            {question.type === 'multiple_choice' && question.options && (
              <div className="space-y-2">
                {(Array.isArray(question.options) ? question.options : []).map((option: any, optIndex: number) => {
                  const optionValue = typeof option === 'string' ? option : option.value || option.label || option;
                  const optionLabel = typeof option === 'object' ? option.label || option.value : option;
                  const selected = answers[question.id] === optionValue;
                  return (
                    <button
                      key={optIndex}
                      type="button"
                      onClick={() => setAnswer(optionValue)}
                      className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition sm:p-4 ${
                        selected
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition ${
                          selected
                            ? 'border-indigo-500 bg-indigo-500 text-white'
                            : 'border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {selected ? <FiCheck /> : String.fromCharCode(65 + optIndex)}
                      </span>
                      <span className="text-gray-900 dark:text-white">{optionLabel}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {question.type === 'true_false' && (
              <div className="grid grid-cols-2 gap-3">
                {['Tačno', 'Netačno'].map((value) => {
                  const selected = answers[question.id] === value;
                  const positive = value === 'Tačno';
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAnswer(value)}
                      className={`flex flex-col items-center gap-2 rounded-xl border-2 p-5 text-base font-semibold transition ${
                        selected
                          ? positive
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          positive ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/50'
                        }`}
                      >
                        {positive ? <FiCheck className="h-5 w-5" /> : <FiX className="h-5 w-5" />}
                      </span>
                      {value}
                    </button>
                  );
                })}
              </div>
            )}

            {question.type === 'short_answer' && (
              <input
                type="text"
                value={answers[question.id] || ''}
                onChange={(e) => setAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isLast) setCurrent((c) => c + 1);
                }}
                className="input w-full text-base"
                placeholder="Upišite odgovor..."
                autoFocus
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <button
              type="button"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="btn-secondary flex items-center gap-2 disabled:opacity-40"
            >
              <FiArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Prethodno</span>
            </button>

            {isLast ? (
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={submitting || !allAnswered}
                title={allAnswered ? undefined : 'Odgovorite na sva pitanja'}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FiSend className="h-4 w-4" />
                {submitting ? 'Slanje...' : allAnswered ? 'Pošalji odgovore' : `Još ${questions.length - answeredCount} bez odgovora`}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
                className="btn-primary flex items-center gap-2"
              >
                Sljedeće
                <FiArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3">
      <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  );
}

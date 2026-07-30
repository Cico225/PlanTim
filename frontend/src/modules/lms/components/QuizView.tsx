import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { lmsService, Quiz, QuizQuestion, QuizAttempt, SurpriseReward } from '@/services/lmsService';
import toast from 'react-hot-toast';
import ScratchCard from './ScratchCard';
import SpinWheel from './SpinWheel';

export default function QuizView() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [startTime] = useState(new Date());
  const [surpriseAvailable, setSurpriseAvailable] = useState<{ scratch_card: boolean; spin_wheel: boolean } | null>(null);
  const [surpriseRewards, setSurpriseRewards] = useState<SurpriseReward[]>([]);
  const [surpriseSettings, setSurpriseSettings] = useState<any>(null);
  const [showSurprise, setShowSurprise] = useState<'scratch_card' | 'spin_wheel' | null>(null);
  const [wonReward, setWonReward] = useState<any>(null);

  useEffect(() => {
    if (courseId && quizId) {
      loadQuiz();
    }
  }, [courseId, quizId]);

  const checkSurpriseAvailability = async () => {
    try {
      const availability = await lmsService.checkSurpriseAvailability(Number(courseId), Number(quizId));
      setSurpriseAvailable(availability);

      // Load rewards if available
      if (availability.scratch_card || availability.spin_wheel) {
        const surprises = await lmsService.getCourseSurprises(Number(courseId));
        setSurpriseSettings(surprises.settings);
        const filteredRewards = surprises.rewards.filter(r => 
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
      // For spin wheel, show the wheel first, then play on spin
      if (type === 'spin_wheel') {
        setShowSurprise(type);
        return;
      }

      // For scratch card, play immediately
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

  const handleSpinWheelComplete = async (selectedReward: any) => {
    try {
      // Call API to record the win
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

  const handleSubmit = async () => {
    if (!quiz || !courseId || !quizId) return;

    const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
      question_id: Number(questionId),
      answer: answer.toString(),
    }));

    if (answersArray.length !== (quiz.questions?.length || 0)) {
      toast.error('Molimo odgovorite na sva pitanja');
      return;
    }

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

      // Check for surprises if quiz passed
      if (response.attempt.passed) {
        checkSurpriseAvailability();
      }
    } catch (error: any) {
      console.error('Failed to submit quiz:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!quiz || !quiz.questions) {
    return (
      <div className="p-3 sm:p-4 md:p-6 max-w-full overflow-x-hidden">
        <div className="card p-8 sm:p-12 text-center">
          <h3 className="text-xl font-semibold">Kviz nije pronađen</h3>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 max-w-full overflow-x-hidden">
        <button
          onClick={() => navigate(`/lms/maloprodaja/courses/${courseId}`)}
          className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
        >
          <FiArrowLeft className="w-4 h-4" />
          Nazad na kurs
        </button>

        <div className="card p-4 sm:p-6">
          <div className="text-center mb-6">
            {result.passed === true ? (
              <FiCheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            ) : (
              <FiXCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            )}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {result.passed === true ? 'Kviz položeno!' : 'Kviz nije položen'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Rezultat: {parseFloat(String(result.percentage ?? 0)).toFixed(1)}% ({result.grade || 'N/A'})
            </p>
          </div>

          {result.recommend_retake && (
            <div className="bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 dark:text-yellow-200">
                Preporučeno je da ponovo položite ovaj kviz kako biste postigli bolji rezultat.
              </p>
            </div>
          )}

          {/* Surprises */}
          {result.passed && surpriseAvailable && !showSurprise && (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 border border-purple-300 dark:border-purple-700 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                🎉 Čestitamo! Osvojili ste iznenađenje!
              </h3>
              <div className="flex flex-wrap gap-3">
                {surpriseAvailable.scratch_card && (
                  <button
                    onClick={() => handlePlaySurprise('scratch_card')}
                    className="btn-primary flex items-center gap-2"
                  >
                    🎫 Zagrebi grebalicu
                  </button>
                )}
                {surpriseAvailable.spin_wheel && (
                  <button
                    onClick={() => handlePlaySurprise('spin_wheel')}
                    className="btn-primary flex items-center gap-2"
                  >
                    🎡 Zavrti točak
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Show Scratch Card */}
          {showSurprise === 'scratch_card' && wonReward && (
            <div className="mb-6">
              <ScratchCard
                reward={wonReward}
                onComplete={handleSurpriseComplete}
              />
            </div>
          )}

          {/* Show Spin Wheel */}
          {showSurprise === 'spin_wheel' && surpriseRewards.length > 0 && (
            <div className="mb-6 w-full overflow-x-auto">
              <div className="flex justify-center min-w-max">
                <SpinWheel
                  rewards={surpriseRewards}
                  onSpinComplete={handleSpinWheelComplete}
                  segments={surpriseSettings?.spin_wheel_segments || 8}
                />
              </div>
              {wonReward && (
                <div className="mt-4 p-4 sm:p-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg text-center text-white shadow-lg">
                  <h3 className="text-xl sm:text-2xl font-bold mb-2">{wonReward.title}</h3>
                  {wonReward.description && (
                    <p className="text-base sm:text-lg opacity-90 mb-4">{wonReward.description}</p>
                  )}
                  {wonReward.reward_type === 'bonus_points' && wonReward.points_value && (
                    <p className="text-3xl sm:text-4xl font-bold mb-4">+{wonReward.points_value} bodova</p>
                  )}
                  {wonReward.message && (
                    <p className="text-xs sm:text-sm opacity-80">{wonReward.message}</p>
                  )}
                  <button
                    onClick={handleSurpriseComplete}
                    className="mt-4 btn-secondary bg-white text-purple-600 hover:bg-gray-100 w-full sm:w-auto text-sm sm:text-base py-2 sm:py-3"
                  >
                    Zatvori
                  </button>
                </div>
              )}
            </div>
          )}

          {result.question_results && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Detalji odgovora
              </h3>
              {result.question_results.map((qResult: any, index: number) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    qResult.is_correct
                      ? 'bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700'
                      : 'bg-red-50 dark:bg-red-900 border-red-200 dark:border-red-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {qResult.question}
                    </p>
                    <span className="text-sm font-semibold">
                      {qResult.points_earned}/{qResult.total_points} poena
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Vaš odgovor: {qResult.user_answer || 'Nije odgovoreno'}
                  </p>
                  {!qResult.is_correct && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Tačan odgovor: {qResult.correct_answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            {result.recommend_retake && (
              <button
                onClick={() => {
                  setResult(null);
                  setAnswers({});
                  loadQuiz();
                }}
                className="btn-primary"
              >
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
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 max-w-full overflow-x-hidden">
      <button
        onClick={() => navigate(`/lms/maloprodaja/courses/${courseId}`)}
        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
      >
        <FiArrowLeft className="w-4 h-4" />
        Nazad na kurs
      </button>

      <div className="card p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {quiz.title}
        </h1>
        
        {quiz.description && (
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {quiz.description}
          </p>
        )}

        <div className="space-y-6">
          {quiz.questions.map((question, index) => (
            <div key={question.id} className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {index + 1}. {question.question}
                </h3>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {question.points} poena
                </span>
              </div>

              {question.type === 'multiple_choice' && question.options && (
                <div className="space-y-2">
                  {(Array.isArray(question.options) ? question.options : []).map((option: any, optIndex: number) => {
                    const optionValue = typeof option === 'string' ? option : option.value || option.label || option;
                    const optionLabel = typeof option === 'object' ? option.label || option.value : option;
                    const displayLabel = ['A', 'B', 'C', 'D', 'E', 'F'][optIndex] || (optIndex + 1).toString();
                    
                    return (
                      <label
                        key={optIndex}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                          answers[question.id] === optionValue
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={optionValue}
                          checked={answers[question.id] === optionValue}
                          onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {displayLabel}.
                        </span>
                        <span className="text-gray-900 dark:text-white">{optionLabel}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {question.type === 'true_false' && (
                <select
                  value={answers[question.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                  className="input w-full"
                  required
                >
                  <option value="">Izaberite odgovor</option>
                  <option value="Tačno">Tačno</option>
                  <option value="Netačno">Netačno</option>
                </select>
              )}

              {question.type === 'short_answer' && (
                <input
                  type="text"
                  value={answers[question.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })}
                  className="input w-full"
                  placeholder="Unesite odgovor..."
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Odgovoreno: {Object.keys(answers).length} / {quiz.questions.length}
          </p>
          <button
            onClick={handleSubmit}
            disabled={submitting || Object.keys(answers).length !== quiz.questions.length}
            className="btn-primary"
          >
            {submitting ? 'Slanje...' : 'Pošalji odgovore'}
          </button>
        </div>
      </div>
    </div>
  );
}


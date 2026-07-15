import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSave, FiPlus, FiTrash2, FiMove } from 'react-icons/fi';
import { lmsService, Quiz, QuizQuestion } from '@/services/lmsService';
import toast from 'react-hot-toast';

interface QuestionForm {
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options: string[];
  correct_answer: string;
  points: string;
  order: string;
}

export default function QuizForm() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const navigate = useNavigate();
  const isEdit = !!quizId;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    passing_score: '70',
    time_limit: '',
    max_attempts: '',
    order: '1',
    is_published: false,
    questions: [] as QuestionForm[],
  });

  useEffect(() => {
    if (isEdit && courseId && quizId) {
      loadQuiz();
    }
    if (!isEdit && courseId) {
      loadNextOrder();
    }
  }, [courseId, quizId, isEdit]);

  const loadQuiz = async () => {
    try {
      const quiz = await lmsService.getQuiz(Number(courseId), Number(quizId));
      setFormData({
        title: quiz.title || '',
        description: quiz.description || '',
        passing_score: quiz.passing_score?.toString() || '70',
        time_limit: quiz.time_limit?.toString() || '',
        max_attempts: quiz.max_attempts?.toString() || '',
        order: quiz.order?.toString() || '1',
        is_published: quiz.is_published || false,
        questions: (quiz.questions || []).map((q: QuizQuestion) => ({
          question: q.question,
          type: q.type,
          options: Array.isArray(q.options) ? q.options : [],
          correct_answer: q.correct_answer || '',
          points: q.points?.toString() || '1',
          order: q.order?.toString() || '1',
        })),
      });
    } catch (error: any) {
      console.error('Failed to load quiz:', error);
      toast.error('Neuspješno učitavanje kviza');
    }
  };

  const loadNextOrder = async () => {
    try {
      const quizzes = await lmsService.getQuizzes(Number(courseId));
      const nextOrder = quizzes.length > 0 ? Math.max(...quizzes.map(q => q.order || 0)) + 1 : 1;
      setFormData({ ...formData, order: nextOrder.toString() });
    } catch (error) {
      // Ignore error
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Naslov kviza je obavezan');
      return;
    }

    if (formData.questions.length === 0) {
      toast.error('Dodajte barem jedno pitanje');
      return;
    }

    // Validate questions
    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      if (!q.question.trim()) {
        toast.error(`Pitanje ${i + 1}: Tekst pitanja je obavezan`);
        return;
      }
      if (q.type === 'multiple_choice' && q.options.length < 2) {
        toast.error(`Pitanje ${i + 1}: Dodajte barem 2 opcije`);
        return;
      }
      if (!q.correct_answer.trim()) {
        toast.error(`Pitanje ${i + 1}: Tačan odgovor je obavezan`);
        return;
      }
    }

    try {
      setLoading(true);
      const submitData = {
        title: formData.title,
        description: formData.description,
        passing_score: parseInt(formData.passing_score),
        time_limit: formData.time_limit ? parseInt(formData.time_limit) : undefined,
        max_attempts: formData.max_attempts ? parseInt(formData.max_attempts) : undefined,
        order: parseInt(formData.order),
        is_published: formData.is_published,
        questions: formData.questions.map((q, index) => ({
          question: q.question,
          type: q.type,
          options: q.type === 'multiple_choice' ? q.options : undefined,
          correct_answer: q.correct_answer,
          points: parseInt(q.points),
          order: parseInt(q.order) || index + 1,
        })),
      };

      if (isEdit && quizId) {
        toast.error('Ažuriranje kviza će biti dodato');
        return;
      } else {
        await lmsService.createQuiz(Number(courseId), submitData);
        toast.success('Kviz uspješno kreiran');
      }
      
      navigate(`/lms/courses/${courseId}`);
    } catch (error: any) {
      console.error('Failed to save quiz:', error);
      toast.error('Neuspješno čuvanje kviza');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
          question: '',
          type: 'multiple_choice',
          options: ['', ''],
          correct_answer: '',
          points: '1',
          order: (formData.questions.length + 1).toString(),
        },
      ],
    });
  };

  const handleRemoveQuestion = (index: number) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index),
    });
  };

  const handleQuestionChange = (index: number, field: keyof QuestionForm, value: any) => {
    const newQuestions = [...formData.questions];
    if (field === 'options') {
      newQuestions[index].options = value;
    } else {
      (newQuestions[index] as any)[field] = value;
    }
    setFormData({ ...formData, questions: newQuestions });
  };

  const handleAddOption = (questionIndex: number) => {
    const newQuestions = [...formData.questions];
    newQuestions[questionIndex].options.push('');
    setFormData({ ...formData, questions: newQuestions });
  };

  const handleRemoveOption = (questionIndex: number, optionIndex: number) => {
    const newQuestions = [...formData.questions];
    newQuestions[questionIndex].options = newQuestions[questionIndex].options.filter(
      (_, i) => i !== optionIndex
    );
    setFormData({ ...formData, questions: newQuestions });
  };

  const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
    const newQuestions = [...formData.questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setFormData({ ...formData, questions: newQuestions });
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 max-w-full overflow-x-hidden">
      <div className="max-w-5xl mx-auto">
      <button
        onClick={() => navigate(`/lms/courses/${courseId}`)}
        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
      >
        <FiArrowLeft className="w-4 h-4" />
        Nazad na kurs
      </button>

      <div className="card p-4 sm:p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          {isEdit ? 'Uredi kviz' : 'Novi kviz'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Osnovne informacije
            </h2>

            <div>
              <label className="label">Naslov kviza *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input"
                required
                placeholder="Unesite naslov kviza"
              />
            </div>

            <div>
              <label className="label">Opis</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows={3}
                placeholder="Kratak opis kviza"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Prolazni rezultat (%) *</label>
                <input
                  type="number"
                  value={formData.passing_score}
                  onChange={(e) => setFormData({ ...formData, passing_score: e.target.value })}
                  className="input"
                  required
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="label">Vremensko ograničenje (min)</label>
                <input
                  type="number"
                  value={formData.time_limit}
                  onChange={(e) => setFormData({ ...formData, time_limit: e.target.value })}
                  className="input"
                  min="0"
                  placeholder="Opciono"
                />
              </div>

              <div>
                <label className="label">Maksimalno pokušaja</label>
                <input
                  type="number"
                  value={formData.max_attempts}
                  onChange={(e) => setFormData({ ...formData, max_attempts: e.target.value })}
                  className="input"
                  min="1"
                  placeholder="Opciono"
                />
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Pitanja ({formData.questions.length})
              </h2>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="btn-secondary text-sm flex items-center gap-2"
              >
                <FiPlus className="w-4 h-4" />
                Dodaj pitanje
              </button>
            </div>

            {formData.questions.map((question, qIndex) => (
              <div key={qIndex} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Pitanje {qIndex + 1}
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(qIndex)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                  >
                    <FiTrash2 className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <label className="label">Tekst pitanja *</label>
                  <textarea
                    value={question.question}
                    onChange={(e) => handleQuestionChange(qIndex, 'question', e.target.value)}
                    className="input"
                    rows={2}
                    required
                    placeholder="Unesite pitanje"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Tip pitanja *</label>
                    <select
                      value={question.type}
                      onChange={(e) => {
                        const newType = e.target.value as any;
                        handleQuestionChange(qIndex, 'type', newType);
                        if (newType !== 'multiple_choice') {
                          handleQuestionChange(qIndex, 'options', []);
                        } else if (question.options.length === 0) {
                          handleQuestionChange(qIndex, 'options', ['', '']);
                        }
                      }}
                      className="input"
                      required
                    >
                      <option value="multiple_choice">Više izbora (A, B, C, D...)</option>
                      <option value="true_false">Tačno/Netačno</option>
                      <option value="short_answer">Kratak odgovor</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Bodovi *</label>
                    <input
                      type="number"
                      value={question.points}
                      onChange={(e) => handleQuestionChange(qIndex, 'points', e.target.value)}
                      className="input"
                      required
                      min="1"
                    />
                  </div>
                </div>

                {question.type === 'multiple_choice' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="label">Opcije odgovora *</label>
                      <button
                        type="button"
                        onClick={() => handleAddOption(qIndex)}
                        className="btn-secondary text-xs flex items-center gap-1"
                      >
                        <FiPlus className="w-3 h-3" />
                        Dodaj opciju
                      </button>
                    </div>
                    {question.options.map((option, optIndex) => (
                      <div key={optIndex} className="flex items-center gap-2">
                        <span className="font-semibold text-gray-700 dark:text-gray-300 w-6">
                          {String.fromCharCode(65 + optIndex)}.
                        </span>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(qIndex, optIndex, e.target.value)}
                          className="input flex-1"
                          placeholder={`Opcija ${String.fromCharCode(65 + optIndex)}`}
                          required
                        />
                        {question.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(qIndex, optIndex)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <div>
                      <label className="label">Tačan odgovor *</label>
                      <select
                        value={question.correct_answer}
                        onChange={(e) => handleQuestionChange(qIndex, 'correct_answer', e.target.value)}
                        className="input"
                        required
                      >
                        <option value="">Izaberite tačan odgovor</option>
                        {question.options.map((option, optIndex) => (
                          <option key={optIndex} value={option}>
                            {String.fromCharCode(65 + optIndex)}. {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {question.type === 'true_false' && (
                  <div>
                    <label className="label">Tačan odgovor *</label>
                    <select
                      value={question.correct_answer}
                      onChange={(e) => handleQuestionChange(qIndex, 'correct_answer', e.target.value)}
                      className="input"
                      required
                    >
                      <option value="">Izaberite tačan odgovor</option>
                      <option value="Tačno">Tačno</option>
                      <option value="Netačno">Netačno</option>
                    </select>
                  </div>
                )}

                {question.type === 'short_answer' && (
                  <div>
                    <label className="label">Tačan odgovor *</label>
                    <input
                      type="text"
                      value={question.correct_answer}
                      onChange={(e) => handleQuestionChange(qIndex, 'correct_answer', e.target.value)}
                      className="input"
                      required
                      placeholder="Unesite tačan odgovor"
                    />
                  </div>
                )}
              </div>
            ))}

            {formData.questions.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>Nema pitanja. Kliknite "Dodaj pitanje" da dodate prvo pitanje.</p>
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Postavke
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Redoslijed</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                  className="input"
                  min="1"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="text-gray-900 dark:text-white">Objavi kviz</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate(`/lms/courses/${courseId}`)}
              className="btn-secondary"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={loading || formData.questions.length === 0}
              className="btn-primary flex items-center gap-2"
            >
              <FiSave className="w-4 h-4" />
              {loading ? 'Čuvanje...' : 'Sačuvaj'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}





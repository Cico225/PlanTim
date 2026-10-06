import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiArrowDown,
  FiArrowLeft,
  FiArrowUp,
  FiAward,
  FiCheck,
  FiCheckSquare,
  FiChevronDown,
  FiClock,
  FiCopy,
  FiEdit3,
  FiList,
  FiPlus,
  FiRepeat,
  FiSave,
  FiSettings,
  FiTrash2,
  FiType,
  FiX,
} from 'react-icons/fi';
import { lmsService, QuizQuestion } from '@/services/lmsService';
import toast from 'react-hot-toast';

type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

interface QuestionForm {
  uid: string;
  question: string;
  type: QuestionType;
  options: string[];
  correct_answer: string;
  points: string;
}

const newUid = () => `q${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const TYPE_META: Record<QuestionType, { label: string; hint: string; icon: typeof FiList; accent: string }> = {
  multiple_choice: {
    label: 'Više izbora',
    hint: 'A, B, C, D…',
    icon: FiList,
    accent: 'from-amber-500 to-orange-600',
  },
  true_false: {
    label: 'Tačno / Netačno',
    hint: 'Dvije opcije',
    icon: FiCheckSquare,
    accent: 'from-emerald-500 to-teal-600',
  },
  short_answer: {
    label: 'Kratak odgovor',
    hint: 'Polaznik upisuje',
    icon: FiType,
    accent: 'from-sky-500 to-blue-600',
  },
};

function createQuestion(type: QuestionType): QuestionForm {
  return {
    uid: newUid(),
    question: '',
    type,
    options: type === 'multiple_choice' ? ['', '', ''] : [],
    correct_answer: '',
    points: '1',
  };
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
  });
  const [questions, setQuestions] = useState<QuestionForm[]>([]);
  const [collapsed, setCollapsed] = useState<string[]>([]);

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
      });
      const loaded = (quiz.questions || []).map((q: QuizQuestion) => ({
        uid: newUid(),
        question: q.question,
        type: q.type,
        options: Array.isArray(q.options)
          ? (q.options as any[]).map((o) => (typeof o === 'string' ? o : o.value || o.label || ''))
          : [],
        correct_answer: q.correct_answer || '',
        points: q.points?.toString() || '1',
      }));
      setQuestions(loaded);
      setCollapsed(loaded.map((q) => q.uid));
    } catch (error: any) {
      console.error('Failed to load quiz:', error);
      toast.error('Neuspješno učitavanje kviza');
    }
  };

  const loadNextOrder = async () => {
    try {
      const quizzes = await lmsService.getQuizzes(Number(courseId));
      const nextOrder = quizzes.length > 0 ? Math.max(...quizzes.map((q) => q.order || 0)) + 1 : 1;
      setFormData((f) => ({ ...f, order: nextOrder.toString() }));
    } catch (error) {
      // Ignore error
    }
  };

  const updateQuestion = (index: number, patch: Partial<QuestionForm>) => {
    setQuestions((qs) => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const changeType = (index: number, type: QuestionType) => {
    const current = questions[index];
    if (current.type === type) return;
    updateQuestion(index, {
      type,
      correct_answer: '',
      options: type === 'multiple_choice' ? (current.options.length >= 2 ? current.options : ['', '', '']) : [],
    });
  };

  const addQuestion = (type: QuestionType) => {
    setQuestions((qs) => [...qs, createQuestion(type)]);
  };

  const duplicateQuestion = (index: number) => {
    setQuestions((qs) => {
      const copy = { ...qs[index], uid: newUid(), options: [...qs[index].options] };
      const next = [...qs];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const removeQuestion = (index: number) => {
    setQuestions((qs) => qs.filter((_, i) => i !== index));
  };

  const moveQuestion = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= questions.length) return;
    setQuestions((qs) => {
      const next = [...qs];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const toggleCollapsed = (uid: string) => {
    setCollapsed((c) => (c.includes(uid) ? c.filter((x) => x !== uid) : [...c, uid]));
  };

  const setOption = (qIndex: number, optIndex: number, value: string) => {
    const q = questions[qIndex];
    const wasCorrect = q.correct_answer !== '' && q.options[optIndex] === q.correct_answer;
    const options = q.options.map((o, i) => (i === optIndex ? value : o));
    updateQuestion(qIndex, { options, ...(wasCorrect ? { correct_answer: value } : {}) });
  };

  const removeOption = (qIndex: number, optIndex: number) => {
    const q = questions[qIndex];
    const removed = q.options[optIndex];
    updateQuestion(qIndex, {
      options: q.options.filter((_, i) => i !== optIndex),
      ...(removed === q.correct_answer ? { correct_answer: '' } : {}),
    });
  };

  const questionIssue = (q: QuestionForm): string | null => {
    if (!q.question.trim()) return 'Nedostaje tekst pitanja';
    if (q.type === 'multiple_choice') {
      const filled = q.options.filter((o) => o.trim());
      if (filled.length < 2) return 'Potrebna su barem 2 odgovora';
      if (new Set(filled.map((o) => o.trim())).size !== filled.length) return 'Odgovori se ne smiju ponavljati';
      if (!q.correct_answer.trim() || !filled.includes(q.correct_answer)) return 'Označite tačan odgovor';
    } else if (!q.correct_answer.trim()) {
      return 'Unesite tačan odgovor';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Naslov kviza je obavezan');
      return;
    }

    if (questions.length === 0) {
      toast.error('Dodajte barem jedno pitanje');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const issue = questionIssue(questions[i]);
      if (issue) {
        setCollapsed((c) => c.filter((x) => x !== questions[i].uid));
        toast.error(`Pitanje ${i + 1}: ${issue}`);
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
        questions: questions.map((q, index) => ({
          question: q.question,
          type: q.type,
          options: q.type === 'multiple_choice' ? q.options.filter((o) => o.trim()) : undefined,
          correct_answer: q.correct_answer,
          points: parseInt(q.points) || 1,
          order: index + 1,
        })),
      };

      if (isEdit && quizId) {
        await lmsService.updateQuiz(Number(courseId), Number(quizId), submitData as any);
        toast.success('Kviz uspješno ažuriran');
      } else {
        await lmsService.createQuiz(Number(courseId), submitData as any);
        toast.success('Kviz uspješno kreiran');
      }

      navigate(`/lms/maloprodaja/courses/${courseId}`);
    } catch (error: any) {
      console.error('Failed to save quiz:', error);
      toast.error('Neuspješno čuvanje kviza');
    } finally {
      setLoading(false);
    }
  };

  const totalPoints = questions.reduce((sum, q) => sum + (parseInt(q.points) || 0), 0);
  const readyCount = questions.filter((q) => !questionIssue(q)).length;

  return (
    <div className="max-w-full space-y-4 overflow-x-clip p-3 sm:space-y-6 sm:p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <button
          onClick={() => navigate(`/lms/maloprodaja/courses/${courseId}`)}
          className="flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
        >
          <FiArrowLeft className="h-4 w-4" />
          Nazad na kurs
        </button>

        <form onSubmit={handleSubmit} className="card space-y-6 p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow">
              <FiAward className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
                {isEdit ? 'Uredi kviz' : 'Novi kviz'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Postavite pravila kviza i dodajte pitanja. Tačan odgovor označite klikom.
              </p>
            </div>
          </div>

          {/* Basic info */}
          <section className="space-y-4 rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
            <SectionTitle icon={FiEdit3} title="Osnovne informacije" />
            <div>
              <label className="label">Naslov kviza *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="input text-base font-medium"
                required
                placeholder="Npr. Provjera znanja — prodajne vještine"
              />
            </div>
            <div>
              <label className="label">Opis</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input"
                rows={2}
                placeholder="Kratko uputstvo za polaznike"
              />
            </div>
          </section>

          {/* Rules */}
          <section className="space-y-4 rounded-2xl border border-gray-200 p-4 dark:border-gray-700">
            <SectionTitle icon={FiSettings} title="Pravila" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <RuleCard icon={FiAward} label="Prolazni rezultat" suffix="%" accent="text-violet-600">
                <input
                  type="number"
                  value={formData.passing_score}
                  onChange={(e) => setFormData({ ...formData, passing_score: e.target.value })}
                  className="w-full border-0 bg-transparent p-0 text-2xl font-bold text-gray-900 outline-none focus:ring-0 dark:text-white"
                  required
                  min="0"
                  max="100"
                />
              </RuleCard>
              <RuleCard icon={FiClock} label="Vremensko ograničenje" suffix="min" accent="text-sky-600">
                <input
                  type="number"
                  value={formData.time_limit}
                  onChange={(e) => setFormData({ ...formData, time_limit: e.target.value })}
                  className="w-full border-0 bg-transparent p-0 text-2xl font-bold text-gray-900 outline-none placeholder:text-base placeholder:font-normal placeholder:text-gray-400 focus:ring-0 dark:text-white"
                  min="0"
                  placeholder="bez limita"
                />
              </RuleCard>
              <RuleCard icon={FiRepeat} label="Maksimalno pokušaja" accent="text-emerald-600">
                <input
                  type="number"
                  value={formData.max_attempts}
                  onChange={(e) => setFormData({ ...formData, max_attempts: e.target.value })}
                  className="w-full border-0 bg-transparent p-0 text-2xl font-bold text-gray-900 outline-none placeholder:text-base placeholder:font-normal placeholder:text-gray-400 focus:ring-0 dark:text-white"
                  min="1"
                  placeholder="neograničeno"
                />
              </RuleCard>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Number(formData.passing_score) || 0}
              onChange={(e) => setFormData({ ...formData, passing_score: e.target.value })}
              className="w-full accent-violet-600"
              aria-label="Prolazni rezultat"
            />
          </section>

          {/* Questions */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionTitle icon={FiList} title={`Pitanja (${questions.length})`} />
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-violet-100 px-3 py-1 font-medium text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
                  Ukupno {totalPoints} bodova
                </span>
                <span
                  className={`rounded-full px-3 py-1 font-medium ${
                    readyCount === questions.length && questions.length > 0
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                  }`}
                >
                  {readyCount}/{questions.length} spremno
                </span>
              </div>
            </div>

            {questions.map((q, qIndex) => {
              const meta = TYPE_META[q.type];
              const Icon = meta.icon;
              const issue = questionIssue(q);
              const isCollapsed = collapsed.includes(q.uid);

              return (
                <div
                  key={q.uid}
                  className={`overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-gray-900 ${
                    issue ? 'border-gray-200 dark:border-gray-700' : 'border-emerald-200 dark:border-emerald-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/60">
                    <button
                      type="button"
                      onClick={() => toggleCollapsed(q.uid)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-sm font-bold text-white ${meta.accent}`}
                      >
                        {qIndex + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {q.question.trim() || 'Novo pitanje'}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Icon className="h-3 w-3" />
                          {meta.label} · {q.points || 0} {Number(q.points) === 1 ? 'bod' : 'boda'}
                          {issue ? (
                            <span className="ml-1 text-amber-600 dark:text-amber-400">· {issue}</span>
                          ) : (
                            <FiCheck className="ml-1 h-3 w-3 text-emerald-600" />
                          )}
                        </span>
                      </span>
                      <FiChevronDown
                        className={`ml-auto h-4 w-4 shrink-0 text-gray-400 transition ${isCollapsed ? '' : 'rotate-180'}`}
                      />
                    </button>
                    <div className="flex items-center gap-0.5">
                      <IconButton title="Pomjeri gore" disabled={qIndex === 0} onClick={() => moveQuestion(qIndex, -1)}>
                        <FiArrowUp className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        title="Pomjeri dolje"
                        disabled={qIndex === questions.length - 1}
                        onClick={() => moveQuestion(qIndex, 1)}
                      >
                        <FiArrowDown className="h-4 w-4" />
                      </IconButton>
                      <IconButton title="Dupliraj" onClick={() => duplicateQuestion(qIndex)}>
                        <FiCopy className="h-4 w-4" />
                      </IconButton>
                      <IconButton title="Obriši pitanje" danger onClick={() => removeQuestion(qIndex)}>
                        <FiTrash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="space-y-4 p-4">
                      <div>
                        <label className="label">Pitanje *</label>
                        <textarea
                          value={q.question}
                          onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                          className="input text-base font-medium"
                          rows={2}
                          placeholder="Unesite pitanje"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto]">
                        <div>
                          <label className="label">Tip pitanja</label>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {(Object.keys(TYPE_META) as QuestionType[]).map((type) => {
                              const m = TYPE_META[type];
                              const TIcon = m.icon;
                              const active = q.type === type;
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => changeType(qIndex, type)}
                                  className={`flex items-center gap-2 rounded-xl border-2 p-2 text-left transition ${
                                    active
                                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                                      : 'border-gray-200 hover:border-blue-300 dark:border-gray-700'
                                  }`}
                                >
                                  <span
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white ${m.accent}`}
                                  >
                                    <TIcon className="h-4 w-4" />
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-gray-900 dark:text-white">
                                      {m.label}
                                    </span>
                                    <span className="block text-xs text-gray-500 dark:text-gray-400">{m.hint}</span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="label">Bodovi</label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuestion(qIndex, { points: String(Math.max(1, (parseInt(q.points) || 1) - 1)) })
                              }
                              className="h-10 w-10 rounded-lg border border-gray-300 text-lg font-bold text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              value={q.points}
                              onChange={(e) => updateQuestion(qIndex, { points: e.target.value })}
                              className="input w-16 text-center font-bold"
                              min="1"
                            />
                            <button
                              type="button"
                              onClick={() => updateQuestion(qIndex, { points: String((parseInt(q.points) || 0) + 1) })}
                              className="h-10 w-10 rounded-lg border border-gray-300 text-lg font-bold text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {q.type === 'multiple_choice' && (
                        <div>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <label className="label mb-0">Odgovori *</label>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Kliknite na krug da označite tačan odgovor
                            </span>
                          </div>
                          <div className="space-y-2">
                            {q.options.map((option, optIndex) => {
                              const isCorrect = q.correct_answer !== '' && option === q.correct_answer;
                              return (
                                <div
                                  key={optIndex}
                                  className={`flex items-center gap-2 rounded-xl border-2 p-2 transition ${
                                    isCorrect
                                      ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/30'
                                      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    title={isCorrect ? 'Tačan odgovor' : 'Označi kao tačan'}
                                    disabled={!option.trim()}
                                    onClick={() => updateQuestion(qIndex, { correct_answer: option })}
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                      isCorrect
                                        ? 'border-emerald-500 bg-emerald-500 text-white'
                                        : 'border-gray-300 text-transparent hover:border-emerald-400 dark:border-gray-600'
                                    }`}
                                  >
                                    <FiCheck className="h-4 w-4" />
                                  </button>
                                  <span className="w-5 shrink-0 text-center text-sm font-bold text-gray-500 dark:text-gray-400">
                                    {String.fromCharCode(65 + optIndex)}
                                  </span>
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => setOption(qIndex, optIndex, e.target.value)}
                                    className="min-w-0 flex-1 border-0 bg-transparent p-1 text-sm text-gray-900 outline-none focus:ring-0 dark:text-white"
                                    placeholder={`Odgovor ${String.fromCharCode(65 + optIndex)}`}
                                  />
                                  {q.options.length > 2 && (
                                    <IconButton title="Ukloni odgovor" danger onClick={() => removeOption(qIndex, optIndex)}>
                                      <FiX className="h-4 w-4" />
                                    </IconButton>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {q.options.length < 8 && (
                            <button
                              type="button"
                              onClick={() => updateQuestion(qIndex, { options: [...q.options, ''] })}
                              className="mt-2 flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                            >
                              <FiPlus className="h-4 w-4" />
                              Dodaj odgovor
                            </button>
                          )}
                        </div>
                      )}

                      {q.type === 'true_false' && (
                        <div>
                          <label className="label">Tačan odgovor *</label>
                          <div className="grid grid-cols-2 gap-3">
                            {['Tačno', 'Netačno'].map((value) => {
                              const active = q.correct_answer === value;
                              const positive = value === 'Tačno';
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => updateQuestion(qIndex, { correct_answer: value })}
                                  className={`flex items-center justify-center gap-2 rounded-xl border-2 p-4 text-base font-semibold transition ${
                                    active
                                      ? positive
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                        : 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                      : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  {positive ? <FiCheck className="h-5 w-5" /> : <FiX className="h-5 w-5" />}
                                  {value}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {q.type === 'short_answer' && (
                        <div>
                          <label className="label">Tačan odgovor *</label>
                          <input
                            type="text"
                            value={q.correct_answer}
                            onChange={(e) => updateQuestion(qIndex, { correct_answer: e.target.value })}
                            className="input"
                            placeholder="Unesite tačan odgovor"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Odgovor polaznika se poredi s ovim tekstom.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="rounded-2xl border-2 border-dashed border-gray-300 p-4 dark:border-gray-600">
              <p className="mb-3 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                {questions.length === 0 ? 'Dodajte prvo pitanje' : 'Dodaj još jedno pitanje'}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(Object.keys(TYPE_META) as QuestionType[]).map((type) => {
                  const m = TYPE_META[type];
                  const TIcon = m.icon;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addQuestion(type)}
                      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white ${m.accent}`}
                      >
                        <TIcon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-gray-900 dark:text-white">{m.label}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400">{m.hint}</span>
                      </span>
                      <FiPlus className="ml-auto h-4 w-4 text-gray-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Settings */}
          <section className="flex flex-col gap-4 rounded-2xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
            <div className="flex items-center gap-3">
              <label className="label mb-0 whitespace-nowrap">Redoslijed</label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                className="input w-24"
                min="1"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-3">
              <span className="text-sm font-medium text-gray-900 dark:text-white">Objavi kviz</span>
              <button
                type="button"
                role="switch"
                aria-checked={formData.is_published}
                onClick={() => setFormData({ ...formData, is_published: !formData.is_published })}
                className={`relative h-6 w-11 rounded-full transition ${
                  formData.is_published ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    formData.is_published ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </label>
          </section>

          {/* Actions */}
          <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex items-center justify-between gap-3 border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6 dark:border-gray-700 dark:bg-gray-900/95">
            <span className="hidden text-sm text-gray-500 dark:text-gray-400 sm:block">
              {questions.length} pitanja · {totalPoints} bodova · prolaz {formData.passing_score || 0}%
            </span>
            <div className="ml-auto flex gap-3">
              <button
                type="button"
                onClick={() => navigate(`/lms/maloprodaja/courses/${courseId}`)}
                className="btn-secondary"
              >
                Otkaži
              </button>
              <button
                type="submit"
                disabled={loading || questions.length === 0}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                <FiSave className="h-4 w-4" />
                {loading ? 'Čuvanje...' : 'Sačuvaj'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof FiList; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
      <Icon className="h-5 w-5 text-gray-400" />
      {title}
    </h2>
  );
}

function RuleCard({
  icon: Icon,
  label,
  suffix,
  accent,
  children,
}: {
  icon: typeof FiList;
  label: string;
  suffix?: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 focus-within:border-blue-400 dark:border-gray-700 dark:bg-gray-800/50">
      <div className={`mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${accent}`}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        {children}
        {suffix && <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{suffix}</span>}
      </div>
    </div>
  );
}

function IconButton({
  children,
  title,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg p-1.5 transition disabled:cursor-not-allowed disabled:opacity-30 ${
        danger
          ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40'
          : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700'
      }`}
    >
      {children}
    </button>
  );
}

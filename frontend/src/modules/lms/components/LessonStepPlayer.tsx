import { useEffect, useMemo, useRef, useState } from 'react';
import { FiArrowRight, FiCheck, FiCheckCircle, FiHelpCircle, FiLock, FiRotateCcw, FiX } from 'react-icons/fi';
import { LessonContentBlock } from '@/services/lmsService';
import { VideoEmbed } from './LessonContentBuilder';

type QuestionBlock = Extract<LessonContentBlock, { type: 'question' }>;

interface Props {
  lessonId: number;
  blocks: LessonContentBlock[];
  unlockAll?: boolean;
  onFinished: (finished: boolean) => void;
}

/**
 * Shows blocks step by step. Content up to (and including) the next unanswered
 * question is visible; everything after it stays locked until the learner picks
 * the correct answer(s).
 */
export default function LessonStepPlayer({ lessonId, blocks, unlockAll, onFinished }: Props) {
  const storageKey = `lms_lesson_steps_${lessonId}`;
  const [passed, setPassed] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch {
      return [];
    }
  });
  const [revealed, setRevealed] = useState<string[]>(passed);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(passed));
  }, [passed, storageKey]);

  const gateIndex = useMemo(() => {
    if (unlockAll) return blocks.length;
    const idx = blocks.findIndex((b) => b.type === 'question' && !revealed.includes(b.id));
    return idx === -1 ? blocks.length : idx;
  }, [blocks, revealed, unlockAll]);

  const questions = blocks.filter((b): b is QuestionBlock => b.type === 'question');
  const passedCount = questions.filter((q) => unlockAll || passed.includes(q.id)).length;
  const allPassed = passedCount === questions.length;

  useEffect(() => {
    onFinished(allPassed);
  }, [allPassed, onFinished]);

  const scrollTarget = useRef<string | null>(null);
  useEffect(() => {
    if (!scrollTarget.current) return;
    document.getElementById(`lesson-step-${scrollTarget.current}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    scrollTarget.current = null;
  }, [gateIndex]);

  const continueAfter = (index: number) => {
    const block = blocks[index];
    scrollTarget.current = blocks[index + 1]?.id ?? null;
    setRevealed((r) => (r.includes(block.id) ? r : [...r, block.id]));
  };

  const visibleCount = Math.min(gateIndex + 1, blocks.length);
  const lockedCount = blocks.length - visibleCount;
  const progress = questions.length ? Math.round((passedCount / questions.length) * 100) : 100;

  return (
    <div className="space-y-5">
      {questions.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">Napredak kroz lekciju</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {passedCount}/{questions.length} pitanja
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {blocks.slice(0, visibleCount).map((block, index) => (
        <div key={block.id} id={`lesson-step-${block.id}`} className="scroll-mt-4">
          {block.type === 'text' && (
            <div
              className="prose max-w-none dark:prose-invert"
              style={{ overflowWrap: 'break-word' }}
              dangerouslySetInnerHTML={{ __html: block.html }}
            />
          )}
          {block.type === 'image' && block.url && (
            <figure>
              <img
                src={block.url}
                alt={block.caption || ''}
                className="max-h-[28rem] w-full rounded-xl border border-gray-200 object-contain dark:border-gray-700"
              />
              {block.caption && (
                <figcaption className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                  {block.caption}
                </figcaption>
              )}
            </figure>
          )}
          {block.type === 'video' && block.url && (
            <figure>
              <VideoEmbed url={block.url} />
              {block.caption && (
                <figcaption className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                  {block.caption}
                </figcaption>
              )}
            </figure>
          )}
          {block.type === 'question' && (
            <QuestionStep
              block={block}
              alreadyPassed={unlockAll || passed.includes(block.id)}
              isGate={index === gateIndex}
              onPassed={() => setPassed((p) => (p.includes(block.id) ? p : [...p, block.id]))}
              onContinue={() => continueAfter(index)}
              hasNext={index < blocks.length - 1}
            />
          )}
        </div>
      ))}

      {lockedCount > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
          <FiLock className="h-5 w-5 shrink-0" />
          Još {lockedCount} {lockedCount === 1 ? 'korak je zaključan' : 'koraka je zaključano'} — odgovorite tačno na
          pitanje iznad da nastavite.
        </div>
      )}
    </div>
  );
}

function QuestionStep({
  block,
  alreadyPassed,
  isGate,
  hasNext,
  onPassed,
  onContinue,
}: {
  block: QuestionBlock;
  alreadyPassed: boolean;
  isGate: boolean;
  hasNext: boolean;
  onPassed: () => void;
  onContinue: () => void;
}) {
  const correctIdx = block.options.map((o, i) => (o.is_correct ? i : -1)).filter((i) => i >= 0);
  const multi = correctIdx.length > 1;
  const [selected, setSelected] = useState<number[]>(alreadyPassed ? correctIdx : []);
  const [status, setStatus] = useState<'idle' | 'wrong' | 'correct'>(alreadyPassed ? 'correct' : 'idle');
  const [attempts, setAttempts] = useState(0);

  const toggle = (i: number) => {
    if (status === 'correct') return;
    setStatus('idle');
    setSelected((s) => (multi ? (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]) : [i]));
  };

  const confirm = () => {
    const ok = selected.length === correctIdx.length && selected.every((i) => correctIdx.includes(i));
    setAttempts((a) => a + 1);
    if (ok) {
      setStatus('correct');
      onPassed();
    } else {
      setStatus('wrong');
    }
  };

  const retry = () => {
    setSelected([]);
    setStatus('idle');
  };

  return (
    <div
      className={`overflow-hidden rounded-2xl border-2 shadow-sm transition ${
        status === 'correct'
          ? 'border-emerald-400 dark:border-emerald-600'
          : status === 'wrong'
          ? 'border-rose-400 dark:border-rose-600'
          : 'border-amber-300 dark:border-amber-700'
      }`}
    >
      <div className="flex items-start gap-3 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:from-amber-950/30 dark:to-orange-950/30">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <FiHelpCircle className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            Provjera znanja {multi && '· više tačnih odgovora'}
          </p>
          <p className="mt-0.5 text-base font-semibold text-gray-900 dark:text-white sm:text-lg">{block.question}</p>
        </div>
      </div>

      <div className="space-y-2 bg-white p-4 dark:bg-gray-900">
        {block.options.map((option, i) => {
          const isSelected = selected.includes(i);
          const showCorrect = status === 'correct' && option.is_correct;
          const showWrong = status === 'wrong' && isSelected;
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              disabled={status === 'correct'}
              className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition ${
                showCorrect
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
                  : showWrong
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40'
                  : isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
              } ${status === 'correct' ? 'cursor-default' : ''}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center ${
                  multi ? 'rounded-lg' : 'rounded-full'
                } border-2 text-sm font-bold ${
                  showCorrect
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : showWrong
                    ? 'border-rose-500 bg-rose-500 text-white'
                    : isSelected
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400'
                }`}
              >
                {showCorrect ? <FiCheck /> : showWrong ? <FiX /> : String.fromCharCode(65 + i)}
              </span>
              <span className="text-sm text-gray-900 dark:text-white sm:text-base">{option.text}</span>
            </button>
          );
        })}

        {status === 'wrong' && (
          <div className="flex flex-col gap-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2">
              <FiX className="h-4 w-4 shrink-0" />
              Netačno. Pročitajte ponovo sadržaj iznad i pokušajte još jednom.
            </span>
            <button
              type="button"
              onClick={retry}
              className="flex items-center justify-center gap-1 rounded-lg bg-white px-3 py-1.5 font-medium text-rose-700 shadow-sm hover:bg-rose-100 dark:bg-rose-900 dark:text-rose-200"
            >
              <FiRotateCcw className="h-4 w-4" />
              Pokušaj ponovo
            </button>
          </div>
        )}

        {status === 'correct' && (
          <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <p className="flex items-center gap-2 font-semibold">
              <FiCheckCircle className="h-4 w-4 shrink-0" />
              Tačno!{attempts > 1 && ` (iz ${attempts}. pokušaja)`}
            </p>
            {block.explanation && <p className="mt-1">{block.explanation}</p>}
          </div>
        )}

        <div className="flex justify-end pt-1">
          {status !== 'correct' && (
            <button
              type="button"
              onClick={confirm}
              disabled={selected.length === 0 || status === 'wrong'}
              className="btn-primary flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiCheck className="h-4 w-4" />
              Potvrdi odgovor
            </button>
          )}
          {status === 'correct' && isGate && hasNext && (
            <button
              type="button"
              onClick={onContinue}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-emerald-700"
            >
              Nastavi
              <FiArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

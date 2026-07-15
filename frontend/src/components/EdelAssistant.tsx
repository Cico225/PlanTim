import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSend, FiX } from 'react-icons/fi';
import { apiService } from '@/services/api';

interface ChatRow {
  id: number;
  chat_id: number;
  role: string;
  content: string;
  created_at?: string;
}

interface AIChatResponse {
  chat_id: number;
  user_message: ChatRow;
  ai_message: ChatRow;
}

type Bubble = { role: 'user' | 'assistant'; content: string };

function splitDisplayName(fullName: string | undefined) {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '', single: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '', single: parts[0] };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
    single: '',
  };
}

interface EdelAssistantProps {
  open: boolean;
  onClose: () => void;
  /** Puno ime iz profila (ime i prezime u jednom polju) */
  userDisplayName?: string;
}

const GREETING_DELAY_FIRST_MS = 380;
const GREETING_GAP_MS = 720;

export default function EdelAssistant({ open, onClose, userDisplayName }: EdelAssistantProps) {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Bubble[]>([]);
  const [chatId, setChatId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [greetingStep, setGreetingStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open, loading, greetingStep]);

  useEffect(() => {
    if (!open) {
      setGreetingStep(0);
      return;
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setGreetingStep(3);
      return;
    }
    setGreetingStep(0);
    const t1 = window.setTimeout(() => setGreetingStep(1), GREETING_DELAY_FIRST_MS);
    const t2 = window.setTimeout(() => setGreetingStep(2), GREETING_DELAY_FIRST_MS + GREETING_GAP_MS);
    const t3 = window.setTimeout(
      () => setGreetingStep(3),
      GREETING_DELAY_FIRST_MS + GREETING_GAP_MS * 2
    );
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [open, userDisplayName, i18n.language]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setChatId(null);
    setInput('');
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await apiService.post<AIChatResponse>('/ai/chat', {
        chat_id: chatId ?? undefined,
        message: text,
        model: 'gemini-1.5-flash',
      });
      setChatId(res.chat_id);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.ai_message?.content ?? '' },
      ]);
    } catch (err: unknown) {
      let detail = t('ai.chatError');
      if (err && typeof err === 'object' && 'response' in err) {
        const data = (err as { response?: { data?: { error?: string; message?: string; hint?: string } } }).response?.data;
        if (data?.error && typeof data.error === 'string') {
          detail = data.error;
          if (data.hint && typeof data.hint === 'string' && !detail.includes(data.hint)) {
            detail = `${detail}\n\n${data.hint}`;
          }
        } else if (data?.message && typeof data.message === 'string' && /gemini|google|openai|api|model|quota|invalid/i.test(data.message)) {
          detail = `${t('ai.chatError')} (${data.message})`;
          if (data.hint && typeof data.hint === 'string' && !detail.includes(data.hint)) {
            detail = `${detail}\n\n${data.hint}`;
          }
        }
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: detail }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const magenta = '#9d174d';
  const magentaDark = '#831843';
  const { firstName, lastName, single } = splitDisplayName(userDisplayName);
  const welcomeLine = lastName
    ? t('ai.panelWelcomeBoth', { firstName, lastName })
    : t('ai.panelWelcomeSingle', { name: single || t('ai.panelWelcomeGuest') });

  const bubbleBase =
    'max-w-[95%] self-start rounded-2xl border px-3.5 py-2.5 text-left shadow-sm transition-all duration-500 ease-out motion-reduce:transition-none';

  return (
    <>
      <aside
        className="fixed top-0 right-0 z-[100] flex h-full w-full max-w-md flex-col border-l border-[#831843]/30 bg-white shadow-2xl animate-slide-in-right dark:border-[#831843]/40 dark:bg-dark-900"
        style={{ boxShadow: `-12px 0 40px -8px rgba(131, 24, 67, 0.35)` }}
        role="dialog"
        aria-modal="false"
        aria-labelledby="edel-panel-title"
      >
        <div
          className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white"
          style={{ background: `linear-gradient(135deg, ${magenta} 0%, ${magentaDark} 100%)` }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-white/50 bg-white shadow-md">
              <img
                src="/edel-mascot.png"
                alt=""
                className="h-full w-full object-cover object-top"
              />
            </div>
            <div className="min-w-0">
              <h2 id="edel-panel-title" className="truncate text-lg font-semibold tracking-tight">
                Edel
              </h2>
              <p className="truncate text-xs text-white/85">{t('ai.title')}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={resetChat}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/95 hover:bg-white/15"
            >
              {t('ai.newChat')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-white hover:bg-white/15"
              aria-label={t('ai.closePanel')}
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          {/* Fiksna maskota — ne skroluje se; samo tekst ispod ide u skrolabilnu zonu */}
          <div className="shrink-0 border-b border-gray-100 bg-gradient-to-b from-rose-50/60 to-white px-4 pb-2 pt-2 dark:border-dark-700 dark:from-[#2a1420]/50 dark:to-dark-900">
            <div className="flex flex-col items-center">
              <div className="w-40 shrink-0 sm:w-44" aria-hidden>
                <div className="flex min-h-[10.5rem] w-full items-center justify-center overflow-hidden rounded-2xl border-[3px] border-[#9d174d]/25 bg-gradient-to-b from-pink-50 to-white shadow-md dark:border-[#9d174d]/40 dark:from-dark-800 dark:to-dark-900 sm:min-h-[12rem]">
                  <img
                    src="/edel-mascot.png"
                    alt=""
                    className="pointer-events-none max-h-[11rem] w-full select-none object-contain object-center sm:max-h-[13rem]"
                  />
                </div>
              </div>
              <p className="mt-1.5 text-center text-sm font-bold tracking-tight text-gray-900 dark:text-white">
                Edel
              </p>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-2 pb-3"
          >
            <div className="flex flex-col gap-2.5" aria-live="polite" aria-label={t('ai.speechRegionLabel')}>
              <div
                className={`${bubbleBase} border-[#9d174d]/25 bg-gradient-to-br from-rose-50/90 to-white text-base font-semibold text-gray-900 dark:border-[#9d174d]/35 dark:from-[#3d0d24]/40 dark:to-dark-800 dark:text-white ${
                  greetingStep >= 1
                    ? 'translate-y-0 opacity-100'
                    : 'pointer-events-none -translate-y-1 opacity-0'
                }`}
                aria-hidden={greetingStep < 1}
              >
                {welcomeLine}
              </div>

              <div
                className={`${bubbleBase} border-gray-200 bg-white text-sm leading-relaxed text-gray-700 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-200 ${
                  greetingStep >= 2
                    ? 'translate-y-0 opacity-100'
                    : 'pointer-events-none -translate-y-1 opacity-0'
                }`}
                aria-hidden={greetingStep < 2}
              >
                {t('ai.panelWelcomeIntro')}
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50/80 p-3 dark:border-dark-700 dark:bg-dark-800/60">
              {messages.map((m, i) => (
                <div
                  key={`${m.role}-${i}`}
                  className={`max-w-[95%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'ml-auto bg-[#9d174d] text-white'
                      : 'mr-auto border border-gray-200 bg-white text-gray-800 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-100'
                  }`}
                >
                  {m.content}
                </div>
              ))}
              {loading && (
                <div className="mr-auto rounded-2xl border border-dashed border-[#9d174d]/40 bg-white px-3 py-2 text-sm text-gray-500 dark:bg-dark-800 dark:text-gray-400">
                  {t('ai.thinking')}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-900">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={t('ai.askQuestion')}
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none ring-[#9d174d]/20 focus:border-[#9d174d] focus:ring-2 dark:border-dark-600 dark:bg-dark-800 dark:text-white dark:placeholder-gray-500"
              disabled={loading}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
              style={{ backgroundColor: magenta }}
              aria-label={t('ai.send')}
            >
              <FiSend className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

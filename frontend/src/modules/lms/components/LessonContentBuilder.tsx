import { useEffect, useRef, useState } from 'react';
import {
  FiAlignLeft,
  FiArrowDown,
  FiArrowUp,
  FiBold,
  FiCheck,
  FiHelpCircle,
  FiImage,
  FiItalic,
  FiList,
  FiPlus,
  FiTrash2,
  FiUpload,
  FiVideo,
  FiX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { apiService } from '@/services/api';
import { LessonContentBlock, LessonQuestionOption } from '@/services/lmsService';

type BlockType = LessonContentBlock['type'];
type QuestionBlock = Extract<LessonContentBlock, { type: 'question' }>;
type MediaBlock = Extract<LessonContentBlock, { type: 'image' | 'video' }>;

const newId = () => `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const BLOCK_META: Record<BlockType, { label: string; description: string; icon: typeof FiAlignLeft; accent: string }> = {
  text: {
    label: 'Tekst',
    description: 'Paragraf, naslov ili lista',
    icon: FiAlignLeft,
    accent: 'from-sky-500 to-blue-600',
  },
  image: {
    label: 'Slika',
    description: 'Upload ili link slike',
    icon: FiImage,
    accent: 'from-emerald-500 to-teal-600',
  },
  video: {
    label: 'Video',
    description: 'YouTube, Vimeo ili fajl',
    icon: FiVideo,
    accent: 'from-rose-500 to-pink-600',
  },
  question: {
    label: 'Pitanje (više izbora)',
    description: 'Polaznik mora tačno odgovoriti da nastavi',
    icon: FiHelpCircle,
    accent: 'from-amber-500 to-orange-600',
  },
};

function createBlock(type: BlockType): LessonContentBlock {
  switch (type) {
    case 'text':
      return { id: newId(), type: 'text', html: '' };
    case 'image':
    case 'video':
      return { id: newId(), type, url: '', caption: '' };
    case 'question':
      return {
        id: newId(),
        type: 'question',
        question: '',
        explanation: '',
        options: [
          { text: '', is_correct: true },
          { text: '', is_correct: false },
          { text: '', is_correct: false },
        ],
      };
  }
}

export function validateContentBlocks(blocks: LessonContentBlock[]): string | null {
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.type !== 'question') continue;
    const label = `Blok ${i + 1} (pitanje)`;
    if (!block.question.trim()) return `${label}: unesite tekst pitanja`;
    const filled = block.options.filter((o) => o.text.trim());
    if (filled.length < 2) return `${label}: potrebna su barem 2 odgovora`;
    if (!filled.some((o) => o.is_correct)) return `${label}: označite barem jedan tačan odgovor`;
  }
  return null;
}

interface Props {
  blocks: LessonContentBlock[];
  onChange: (blocks: LessonContentBlock[]) => void;
}

export default function LessonContentBuilder({ blocks, onChange }: Props) {
  const [paletteAt, setPaletteAt] = useState<number | null>(null);

  const update = (index: number, block: LessonContentBlock) => {
    const next = [...blocks];
    next[index] = block;
    onChange(next);
  };

  const insert = (index: number, type: BlockType) => {
    const next = [...blocks];
    next.splice(index, 0, createBlock(type));
    onChange(next);
    setPaletteAt(null);
  };

  const remove = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const questionCount = blocks.filter((b) => b.type === 'question').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {blocks.length} {blocks.length === 1 ? 'blok' : 'blokova'}
        </span>
        <span className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          {questionCount} {questionCount === 1 ? 'pitanje' : 'pitanja'} za provjeru
        </span>
      </div>

      {blocks.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-300 p-6 text-center dark:border-gray-600">
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Lekcija se sastoji od koraka. Dodajte tekst, slike, video i pitanja — polaznik prelazi na sljedeći
            korak tek kada tačno odgovori na pitanje.
          </p>
          <BlockPalette onPick={(type) => insert(0, type)} />
        </div>
      )}

      {blocks.map((block, index) => {
        const meta = BLOCK_META[block.type];
        const Icon = meta.icon;
        return (
          <div key={block.id}>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/60">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white ${meta.accent}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Korak {index + 1}
                  </span>
                  <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">{meta.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <IconButton title="Pomjeri gore" disabled={index === 0} onClick={() => move(index, -1)}>
                    <FiArrowUp className="h-4 w-4" />
                  </IconButton>
                  <IconButton
                    title="Pomjeri dolje"
                    disabled={index === blocks.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <FiArrowDown className="h-4 w-4" />
                  </IconButton>
                  <IconButton title="Obriši blok" danger onClick={() => remove(index)}>
                    <FiTrash2 className="h-4 w-4" />
                  </IconButton>
                </div>
              </div>
              <div className="p-4">
                {block.type === 'text' && (
                  <RichTextEditor value={block.html} onChange={(html) => update(index, { ...block, html })} />
                )}
                {(block.type === 'image' || block.type === 'video') && (
                  <MediaBlockEditor block={block} onChange={(b) => update(index, b)} />
                )}
                {block.type === 'question' && (
                  <QuestionBlockEditor block={block} onChange={(b) => update(index, b)} />
                )}
              </div>
            </div>

            <div className="relative flex justify-center py-2">
              {paletteAt === index + 1 ? (
                <div className="w-full rounded-2xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/30">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Izaberite tip bloka</span>
                    <IconButton title="Zatvori" onClick={() => setPaletteAt(null)}>
                      <FiX className="h-4 w-4" />
                    </IconButton>
                  </div>
                  <BlockPalette onPick={(type) => insert(index + 1, type)} />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPaletteAt(index + 1)}
                  className="flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs font-medium text-gray-500 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-blue-950/40"
                >
                  <FiPlus className="h-3 w-3" />
                  Dodaj blok
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BlockPalette({ onPick }: { onPick: (type: BlockType) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {(Object.keys(BLOCK_META) as BlockType[]).map((type) => {
        const meta = BLOCK_META[type];
        const Icon = meta.icon;
        return (
          <button
            key={type}
            type="button"
            onClick={() => onPick(type)}
            className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-700"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white ${meta.accent}`}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-900 dark:text-white">{meta.label}</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">{meta.description}</span>
            </span>
          </button>
        );
      })}
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

function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML ?? '');
  };

  const tools: Array<{ title: string; label: React.ReactNode; run: () => void }> = [
    { title: 'Naslov', label: <span className="text-xs font-bold">H2</span>, run: () => exec('formatBlock', 'h2') },
    { title: 'Podnaslov', label: <span className="text-xs font-bold">H3</span>, run: () => exec('formatBlock', 'h3') },
    { title: 'Paragraf', label: <span className="text-xs font-bold">P</span>, run: () => exec('formatBlock', 'p') },
    { title: 'Podebljano', label: <FiBold className="h-4 w-4" />, run: () => exec('bold') },
    { title: 'Kurziv', label: <FiItalic className="h-4 w-4" />, run: () => exec('italic') },
    { title: 'Lista', label: <FiList className="h-4 w-4" />, run: () => exec('insertUnorderedList') },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-gray-600">
      <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 p-1.5 dark:border-gray-700 dark:bg-gray-800">
        {tools.map((tool) => (
          <button
            key={tool.title}
            type="button"
            title={tool.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={tool.run}
            className="flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-gray-700 hover:bg-white hover:shadow-sm dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {tool.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        data-placeholder="Upišite tekst ovog koraka..."
        className="prose prose-sm min-h-[120px] max-w-none bg-white p-3 text-gray-900 outline-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)] dark:prose-invert dark:bg-gray-900 dark:text-white"
      />
    </div>
  );
}

function MediaBlockEditor({ block, onChange }: { block: MediaBlock; onChange: (b: MediaBlock) => void }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isImage = block.type === 'image';

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Molimo odaberite sliku');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Slika ne smije biti veća od 5MB');
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('image', file);
      const res = await apiService.upload<{ url: string }>('/lms/lessons/upload-image', fd);
      onChange({ ...block, url: res.url });
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Neuspješno učitavanje slike');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {block.url && isImage && (
        <img
          src={block.url}
          alt={block.caption || ''}
          className="max-h-64 w-full rounded-xl border border-gray-200 bg-gray-50 object-contain dark:border-gray-700 dark:bg-gray-800"
        />
      )}
      {block.url && !isImage && <VideoEmbed url={block.url} />}

      <div className="flex flex-col gap-2 sm:flex-row">
        {isImage && (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="btn-secondary flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <FiUpload className="h-4 w-4" />
              {uploading ? 'Učitavanje...' : 'Učitaj sliku'}
            </button>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </>
        )}
        <input
          type="url"
          value={block.url}
          onChange={(e) => onChange({ ...block, url: e.target.value })}
          className="input flex-1"
          placeholder={isImage ? 'ili zalijepite URL slike' : 'https://youtube.com/watch?v=... ili URL video fajla'}
        />
      </div>
      <input
        type="text"
        value={block.caption || ''}
        onChange={(e) => onChange({ ...block, caption: e.target.value })}
        className="input"
        placeholder="Opis / potpis (opciono)"
      />
    </div>
  );
}

function QuestionBlockEditor({ block, onChange }: { block: QuestionBlock; onChange: (b: QuestionBlock) => void }) {
  const setOptions = (options: LessonQuestionOption[]) => onChange({ ...block, options });
  const correctCount = block.options.filter((o) => o.is_correct).length;

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Pitanje *</label>
        <textarea
          value={block.question}
          onChange={(e) => onChange({ ...block, question: e.target.value })}
          className="input text-base font-medium"
          rows={2}
          placeholder="Npr. Koji je prvi korak pri dočeku kupca?"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="label mb-0">Odgovori *</label>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Kliknite na krug da označite tačan odgovor
            {correctCount > 1 && ' — polaznik mora izabrati sve tačne'}
          </span>
        </div>
        <div className="space-y-2">
          {block.options.map((option, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-xl border-2 p-2 transition ${
                option.is_correct
                  ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/30'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
              }`}
            >
              <button
                type="button"
                title={option.is_correct ? 'Tačan odgovor' : 'Označi kao tačan'}
                onClick={() =>
                  setOptions(block.options.map((o, j) => (j === i ? { ...o, is_correct: !o.is_correct } : o)))
                }
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition ${
                  option.is_correct
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-gray-300 text-transparent hover:border-emerald-400 dark:border-gray-600'
                }`}
              >
                <FiCheck className="h-4 w-4" />
              </button>
              <span className="w-5 shrink-0 text-center text-sm font-bold text-gray-500 dark:text-gray-400">
                {String.fromCharCode(65 + i)}
              </span>
              <input
                type="text"
                value={option.text}
                onChange={(e) =>
                  setOptions(block.options.map((o, j) => (j === i ? { ...o, text: e.target.value } : o)))
                }
                className="min-w-0 flex-1 border-0 bg-transparent p-1 text-sm text-gray-900 outline-none focus:ring-0 dark:text-white"
                placeholder={`Odgovor ${String.fromCharCode(65 + i)}`}
              />
              {block.options.length > 2 && (
                <IconButton
                  title="Ukloni odgovor"
                  danger
                  onClick={() => setOptions(block.options.filter((_, j) => j !== i))}
                >
                  <FiX className="h-4 w-4" />
                </IconButton>
              )}
            </div>
          ))}
        </div>
        {block.options.length < 8 && (
          <button
            type="button"
            onClick={() => setOptions([...block.options, { text: '', is_correct: false }])}
            className="mt-2 flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            <FiPlus className="h-4 w-4" />
            Dodaj odgovor
          </button>
        )}
      </div>

      <div>
        <label className="label">Objašnjenje nakon tačnog odgovora (opciono)</label>
        <textarea
          value={block.explanation || ''}
          onChange={(e) => onChange({ ...block, explanation: e.target.value })}
          className="input"
          rows={2}
          placeholder="Kratko pojašnjenje koje polaznik vidi kada odgovori tačno"
        />
      </div>
    </div>
  );
}

export function getVideoEmbedUrl(url: string): string | null {
  const youtube = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#/]+)/);
  if (youtube?.[1]) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo?.[1]) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

export function VideoEmbed({ url }: { url: string }) {
  const embed = getVideoEmbedUrl(url);
  return (
    <div className="aspect-video overflow-hidden rounded-xl bg-gray-900">
      {embed ? (
        <iframe
          src={embed}
          className="h-full w-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          title="Video"
        />
      ) : (
        <video src={url} controls className="h-full w-full" />
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Search } from 'lucide-react';
import { GUIDE_CATEGORIES, GUIDE_SECTIONS } from './guideContent';

export default function UserGuide() {
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState('intro');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return GUIDE_SECTIONS;
    return GUIDE_SECTIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.overview.toLowerCase().includes(q)
    );
  }, [search]);

  const active = GUIDE_SECTIONS.find((s) => s.id === activeId) || GUIDE_SECTIONS[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Korisničko uputstvo</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Kratki vodič kroz PlanTim i Planika module
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pretraži..."
              className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-primary-400 dark:border-dark-600 dark:bg-dark-800 dark:text-white"
            />
          </div>

          <nav className="space-y-4">
            {GUIDE_CATEGORIES.map((cat) => {
              const items = filtered.filter((s) => s.category === cat.id);
              if (!items.length) return null;
              return (
                <div key={cat.id}>
                  <p className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {cat.label}
                  </p>
                  <div className="space-y-0.5">
                    {items.map((section) => (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setActiveId(section.id)}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                          section.id === activeId
                            ? 'bg-primary-50 font-medium text-primary-800 dark:bg-primary-950/40 dark:text-primary-200'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-dark-700'
                        }`}
                      >
                        {section.title}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <article className="rounded-xl border border-gray-200 bg-white p-5 dark:border-dark-700 dark:bg-dark-800 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{active.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {active.overview}
              </p>
            </div>
            {active.route && (
              <Link
                to={active.route}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Otvori
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          <ol className="mt-6 space-y-3">
            {active.steps.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-dark-600 dark:bg-dark-900/40"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{step.title}</div>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </article>
      </div>
    </div>
  );
}

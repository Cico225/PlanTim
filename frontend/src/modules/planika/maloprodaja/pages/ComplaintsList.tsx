import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiArrowRight, FiFilter, FiPlus, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { retailComplaintsService } from '@/services/retailComplaintsService';
import {
  COMPLAINT_STATUS_LABELS,
  ComplaintCapabilities,
  ComplaintStatus,
  RetailComplaint,
} from '@/types/retail-complaints';

const statusColors: Record<ComplaintStatus, string> = {
  zaprimljena: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  ponovo_uslikati: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  odbijena: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  opravdana: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

export default function ComplaintsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<RetailComplaint[]>([]);
  const [capabilities, setCapabilities] = useState<ComplaintCapabilities | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const requestedTab = searchParams.get('tab');
  const activeTab = requestedTab === 'obrada' ? 'obrada' : 'unos';

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  useEffect(() => {
    if (!capabilities) return;

    const canOpenUnos = capabilities.can_create;
    const canOpenObrada = capabilities.can_review;

    if (activeTab === 'obrada' && !canOpenObrada) {
      setSearchParams({ tab: canOpenUnos ? 'unos' : 'obrada' }, { replace: true });
      return;
    }

    if (activeTab === 'unos' && !canOpenUnos && canOpenObrada) {
      setSearchParams({ tab: 'obrada' }, { replace: true });
    }
  }, [activeTab, capabilities, setSearchParams]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [caps, list] = await Promise.all([
        retailComplaintsService.getCapabilities(),
        retailComplaintsService.list({
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: search.trim() || undefined,
        }),
      ]);
      setCapabilities(caps);
      setComplaints(list);
    } catch {
      toast.error('Greška pri učitavanju reklamacija');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const showCreateButton = capabilities?.can_create && activeTab === 'unos';
  const statusCounts = useMemo(() => {
    return complaints.reduce<Record<string, number>>((acc, complaint) => {
      acc[complaint.status] = (acc[complaint.status] || 0) + 1;
      return acc;
    }, {});
  }, [complaints]);
  const statusOptions = [
    { value: 'all', label: 'Sve', count: complaints.length },
    ...Object.entries(COMPLAINT_STATUS_LABELS).map(([value, label]) => ({
      value,
      label,
      count: statusCounts[value] || 0,
    })),
  ];
  const summaryCards =
    activeTab === 'obrada'
      ? [
          { label: 'Ukupno za pregled', value: complaints.length, tone: 'amber' },
          { label: 'Zaprimljene', value: statusCounts.zaprimljena || 0, tone: 'blue' },
          { label: 'Ponovno slikanje', value: statusCounts.ponovo_uslikati || 0, tone: 'yellow' },
          { label: 'Završene', value: (statusCounts.odbijena || 0) + (statusCounts.opravdana || 0), tone: 'green' },
        ]
      : [
          { label: 'Moje / prodavnica', value: complaints.length, tone: 'amber' },
          { label: 'Zaprimljene', value: statusCounts.zaprimljena || 0, tone: 'blue' },
          { label: 'Za ponovno slikanje', value: statusCounts.ponovo_uslikati || 0, tone: 'yellow' },
          { label: 'Zaključene', value: (statusCounts.odbijena || 0) + (statusCounts.opravdana || 0), tone: 'green' },
        ];
  const summaryCardStyles: Record<string, string> = {
    amber: 'from-amber-50 to-orange-50 text-amber-900 dark:from-amber-900/20 dark:to-orange-900/10 dark:text-amber-100',
    blue: 'from-blue-50 to-sky-50 text-blue-900 dark:from-blue-900/20 dark:to-sky-900/10 dark:text-blue-100',
    yellow: 'from-yellow-50 to-amber-50 text-yellow-900 dark:from-yellow-900/20 dark:to-amber-900/10 dark:text-yellow-100',
    green: 'from-emerald-50 to-green-50 text-emerald-900 dark:from-emerald-900/20 dark:to-green-900/10 dark:text-emerald-100',
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-amber-50/40 to-orange-50/30 p-5 shadow-sm dark:border-dark-700 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900 sm:p-8">
        <Link
          to="/planika/retail"
          className="inline-block text-xs text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 sm:text-sm"
        >
          ← Maloprodaja
        </Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
              Planika
            </p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              Reklamacije
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
              {activeTab === 'obrada'
                ? 'Pregled i obrada reklamacija za referenta zaduženog za odobravanje i osporavanje.'
                : 'Unos i pregled reklamacija koje evidentiraju prodavači i šefovi prodavnica.'}
            </p>
          </div>
          {showCreateButton && (
            <Link
              to="/planika/retail/reklamacije/nova?tab=unos"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
            >
              <FiPlus size={18} />
              Nova reklamacija
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {capabilities?.can_create && (
          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'unos' })}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              activeTab === 'unos'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-700 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-300'
            }`}
          >
            Unos i pregled reklamacija
          </button>
        )}
        {capabilities?.can_review && (
          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'obrada' })}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              activeTab === 'obrada'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'border border-gray-200 bg-white text-gray-700 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-300'
            }`}
          >
            Obrada reklamacija
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border border-gray-200 bg-gradient-to-br p-4 shadow-sm dark:border-dark-700 ${summaryCardStyles[card.tone]}`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">{card.label}</p>
            <p className="mt-2 text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="card space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <form onSubmit={handleSearch} className="flex flex-1 gap-2">
            <div className="relative flex-1">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pretraga po broju, kupcu, artiklu..."
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm dark:border-dark-600 dark:bg-dark-900"
              />
            </div>
            <button type="submit" className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium dark:bg-dark-700">
              Traži
            </button>
          </form>

          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <FiFilter className="text-gray-400" size={16} />
            <span>Prikazano: {complaints.length}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === option.value
                  ? 'border-amber-500 bg-amber-500 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300 hover:text-amber-700 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-300'
              }`}
            >
              <span>{option.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 ${
                  statusFilter === option.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 dark:bg-dark-700 dark:text-gray-300'
                }`}
              >
                {option.count}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
          </div>
        ) : complaints.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center dark:border-dark-700">
            <p className="text-gray-500 dark:text-gray-400">Nema reklamacija za prikaz.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((complaint) => (
              <Link
                key={complaint.id}
                to={`/planika/retail/reklamacije/${complaint.id}?tab=${activeTab}`}
                className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 transition hover:border-amber-200 hover:bg-amber-50/40 dark:border-dark-700 dark:bg-dark-900/30 dark:hover:border-amber-500/30 xl:flex-row xl:items-center xl:justify-between"
              >
                <div className="grid min-w-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.3fr),minmax(0,1fr)] xl:grid-cols-[minmax(0,1.4fr),minmax(0,1fr),auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {complaint.complaint_number}
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[complaint.status]}`}>
                        {COMPLAINT_STATUS_LABELS[complaint.status]}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                      {complaint.customer_name}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {complaint.article_code ? `Artikal: ${complaint.article_code}` : 'Bez šifre artikla'}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{complaint.store_name}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {new Date(complaint.created_at).toLocaleDateString('bs-BA')}
                    </p>
                    {complaint.customer_phone && (
                      <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                        Kontakt: {complaint.customer_phone}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 xl:justify-end">
                    <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                      <p>{complaint.customer_city || 'Bez mjesta'}</p>
                    </div>
                    <FiArrowRight className="shrink-0 text-gray-400" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

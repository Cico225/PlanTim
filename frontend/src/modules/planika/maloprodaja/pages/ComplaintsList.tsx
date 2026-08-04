import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiArrowRight, FiFilter, FiPlus, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { retailComplaintsService } from '@/services/retailComplaintsService';
import {
  ComplaintCapabilities,
  ComplaintStatus,
  RetailComplaint,
  isComplaintSubmitted,
} from '@/types/retail-complaints';
import { ComplaintStatusBadge, getComplaintPhaseLabel } from '../components/ComplaintStatusUI';

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
  }, [statusFilter, activeTab]);

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
          for_review: activeTab === 'obrada' ? true : undefined,
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
    { value: 'zaprimljena', label: 'Zaprimljena', count: statusCounts.zaprimljena || 0 },
    { value: 'odobrena', label: 'Odobrena', count: statusCounts.odobrena || 0 },
    { value: 'odbijena', label: 'Odbijena', count: statusCounts.odbijena || 0 },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            to="/planika/retail"
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            ← Maloprodaja
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Reklamacije</h1>
        </div>
        {showCreateButton && (
          <Link
            to="/planika/retail/reklamacije/nova?tab=unos"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
          >
            <FiPlus size={18} />
            Nova reklamacija
          </Link>
        )}
      </div>

      {(capabilities?.can_create || capabilities?.can_review) && (
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 dark:border-dark-600 dark:bg-dark-800">
          {capabilities?.can_create && (
            <button
              type="button"
              onClick={() => setSearchParams({ tab: 'unos' })}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'unos'
                  ? 'bg-amber-500 text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-300'
              }`}
            >
              Prodavnica
            </button>
          )}
          {capabilities?.can_review && (
            <button
              type="button"
              onClick={() => setSearchParams({ tab: 'obrada' })}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'obrada'
                  ? 'bg-slate-700 text-white dark:bg-slate-600'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-300'
              }`}
            >
              Direkcija
            </button>
          )}
        </div>
      )}

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
            <span>{complaints.length}</span>
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
                  : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-300'
              }`}
            >
              {option.label}
              <span
                className={`rounded-full px-1.5 ${
                  statusFilter === option.value ? 'bg-white/20' : 'bg-gray-100 dark:bg-dark-700'
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
          <div className="divide-y divide-gray-100 dark:divide-dark-700">
            {complaints.map((complaint) => {
              const inStore = complaint.status === 'zaprimljena' && !isComplaintSubmitted(complaint);

              return (
                <Link
                  key={complaint.id}
                  to={`/planika/retail/reklamacije/${complaint.id}?tab=${activeTab}`}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0 hover:opacity-90"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {complaint.complaint_number}
                      </span>
                      <ComplaintStatusBadge status={complaint.status as ComplaintStatus} size="sm" />
                      <span
                        className={`text-[11px] font-medium ${
                          inStore ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {getComplaintPhaseLabel(complaint)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-gray-700 dark:text-gray-300">
                      {complaint.customer_name}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {complaint.store_name} · {complaint.article_code || 'Bez šifre'} ·{' '}
                      {new Date(complaint.created_at).toLocaleDateString('bs-BA')}
                    </p>
                  </div>
                  <FiArrowRight className="shrink-0 text-gray-400" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState<RetailComplaint[]>([]);
  const [capabilities, setCapabilities] = useState<ComplaintCapabilities | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadData();
  }, [statusFilter]);

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
              {capabilities?.can_review
                ? 'Pregled i obrada reklamacija iz svih prodavnica.'
                : 'Unos i pregled reklamacija vaše prodavnice.'}
            </p>
          </div>
          {capabilities?.can_create && (
            <Link
              to="/planika/retail/reklamacije/nova"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
            >
              <FiPlus size={18} />
              Nova reklamacija
            </Link>
          )}
        </div>
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

          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-400" size={16} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-dark-600 dark:bg-dark-900"
            >
              <option value="all">Svi statusi</option>
              {Object.entries(COMPLAINT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
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
                to={`/planika/retail/reklamacije/${complaint.id}`}
                className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 transition hover:border-amber-200 hover:bg-amber-50/40 dark:border-dark-700 dark:bg-dark-900/30 dark:hover:border-amber-500/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {complaint.complaint_number}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[complaint.status]}`}>
                      {COMPLAINT_STATUS_LABELS[complaint.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{complaint.customer_name}</p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {complaint.store_name} · {new Date(complaint.created_at).toLocaleDateString('bs-BA')}
                    {complaint.article_code ? ` · ${complaint.article_code}` : ''}
                  </p>
                </div>
                <FiArrowRight className="shrink-0 text-gray-400" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Briefcase, Plus, Edit2, Trash2, Eye, MapPin, Calendar, Users as UsersIcon, Search, Filter } from 'lucide-react';
import { atsService } from '../../../services/atsService';
import toast from 'react-hot-toast';

interface JobPosition {
  id: number;
  title: string;
  department_id?: number;
  department_name?: string;
  location?: string;
  employment_type?: string;
  status: 'draft' | 'open' | 'closed' | 'on_hold';
  description?: string;
  requirements?: string;
  posted_date?: string;
  closing_date?: string;
  created_at: string;
  updated_at: string;
}

export default function ATSPositions() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingPosition, setEditingPosition] = useState<JobPosition | null>(null);
  const queryClient = useQueryClient();

  const { data: positions, isLoading } = useQuery({
    queryKey: ['ats-positions', statusFilter, searchTerm],
    queryFn: () => atsService.getPositions({ status: statusFilter !== 'all' ? statusFilter : undefined, search: searchTerm }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => atsService.deletePosition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-positions'] });
      toast.success('Pozicija je uspješno obrisana');
    },
    onError: () => {
      toast.error('Greška pri brisanju pozicije');
    },
  });

  const handleDelete = (id: number) => {
    if (confirm('Da li ste sigurni da želite obrisati ovu poziciju?')) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'draft': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Otvoreno';
      case 'closed': return 'Zatvoreno';
      case 'on_hold': return 'Na čekanju';
      case 'draft': return 'Nacrt';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-blue-500" />
            Otvorene pozicije
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Upravljanje oglasima za posao</p>
        </div>
        <button
          onClick={() => {
            setEditingPosition(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova pozicija
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Pretraži pozicije..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">Svi statusi</option>
            <option value="open">Otvoreno</option>
            <option value="draft">Nacrt</option>
            <option value="on_hold">Na čekanju</option>
            <option value="closed">Zatvoreno</option>
          </select>
        </div>
      </div>

      {/* Positions List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : positions?.data && positions.data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {positions.data.map((position: JobPosition) => (
            <div
              key={position.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {position.title}
                  </h3>
                  {position.department_name && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{position.department_name}</p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(position.status)}`}>
                  {getStatusLabel(position.status)}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {position.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4" />
                    {position.location}
                  </div>
                )}
                {position.posted_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    {new Date(position.posted_date).toLocaleDateString('sr-RS')}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setEditingPosition(position);
                    setShowForm(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Izmeni
                </button>
                <button
                  onClick={() => handleDelete(position.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Obriši
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nema pozicija za prikaz</p>
        </div>
      )}

      {/* Position Form Modal */}
      {showForm && (
        <PositionFormModal
          position={editingPosition}
          onClose={() => {
            setShowForm(false);
            setEditingPosition(null);
          }}
        />
      )}
    </div>
  );
}

function PositionFormModal({ position, onClose }: { position: JobPosition | null; onClose: () => void }) {
  const [formData, setFormData] = useState({
    title: position?.title || '',
    department_id: position?.department_id || '',
    location: position?.location || '',
    employment_type: position?.employment_type || 'full-time',
    status: position?.status || 'draft',
    description: position?.description || '',
    requirements: position?.requirements || '',
    closing_date: position?.closing_date || '',
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => atsService.createPosition(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-positions'] });
      toast.success('Pozicija je uspješno kreirana');
      onClose();
    },
    onError: () => {
      toast.error('Greška pri kreiranju pozicije');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => atsService.updatePosition(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-positions'] });
      toast.success('Pozicija je uspješno ažurirana');
      onClose();
    },
    onError: () => {
      toast.error('Greška pri ažuriranju pozicije');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (position) {
      updateMutation.mutate({ id: position.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {position ? 'Izmeni poziciju' : 'Nova pozicija'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Naziv pozicije *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Lokacija
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tip zaposlenja
              </label>
              <select
                value={formData.employment_type}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="full-time">Puno vrijeme</option>
                <option value="part-time">Djelimično</option>
                <option value="contract">Ugovor</option>
                <option value="intern">Praksa</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="draft">Nacrt</option>
              <option value="open">Otvoreno</option>
              <option value="on_hold">Na čekanju</option>
              <option value="closed">Zatvoreno</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Opis
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Zahtjevi
            </label>
            <textarea
              rows={4}
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Otkaži
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {position ? 'Sačuvaj izmene' : 'Kreiraj poziciju'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}










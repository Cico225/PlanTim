import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, Plus, Edit2, Trash2, Mail, Calendar, DollarSign, CheckCircle, XCircle, Search, Filter, Send } from 'lucide-react';
import { atsService, type Offer } from '../../../services/atsService';
import toast from 'react-hot-toast';

export default function ATSOffers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const queryClient = useQueryClient();

  const { data: offers, isLoading } = useQuery({
    queryKey: ['ats-offers', statusFilter, searchTerm],
    queryFn: () => atsService.getOffers({ 
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => atsService.deleteOffer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-offers'] });
      toast.success('Ponuda je uspješno obrisana');
    },
    onError: () => {
      toast.error('Greška pri brisanju ponude');
    },
  });

  const sendMutation = useMutation({
    mutationFn: (id: number) => atsService.sendOffer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-offers'] });
      toast.success('Ponuda je uspješno poslata');
    },
    onError: () => {
      toast.error('Greška pri slanju ponude');
    },
  });

  const handleDelete = (id: number) => {
    if (confirm('Da li ste sigurni da želite obrisati ovu ponudu?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSend = (id: number) => {
    if (confirm('Da li želite poslati ovu ponudu kandidatu?')) {
      sendMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'accepted': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'expired': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Na čekanju';
      case 'sent': return 'Poslato';
      case 'accepted': return 'Prihvaćeno';
      case 'rejected': return 'Odbijeno';
      case 'expired': return 'Isteklo';
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-yellow-500" />
            Ponude
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Slanje i upravljanje ponudama</p>
        </div>
        <button
          onClick={() => {
            setEditingOffer(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova ponuda
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Pretraži ponude..."
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
            <option value="pending">Na čekanju</option>
            <option value="sent">Poslato</option>
            <option value="accepted">Prihvaćeno</option>
            <option value="rejected">Odbijeno</option>
            <option value="expired">Isteklo</option>
          </select>
        </div>
      </div>

      {/* Offers List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto"></div>
        </div>
      ) : offers?.data && offers.data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.data.map((offer: Offer) => (
            <div
              key={offer.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {offer.candidate_name || `Kandidat #${offer.candidate_id}`}
                  </h3>
                  {offer.position_title && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{offer.position_title}</p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(offer.status)}`}>
                  {getStatusLabel(offer.status)}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {offer.salary && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <DollarSign className="w-4 h-4" />
                    {offer.salary.toLocaleString('sr-RS')} KM
                  </div>
                )}
                {offer.start_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    Početak: {new Date(offer.start_date).toLocaleDateString('sr-RS')}
                  </div>
                )}
                {offer.sent_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4" />
                    Poslato: {new Date(offer.sent_date).toLocaleDateString('sr-RS')}
                  </div>
                )}
                {offer.response_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    {offer.status === 'accepted' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    Odgovor: {new Date(offer.response_date).toLocaleDateString('sr-RS')}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                {offer.status === 'pending' && (
                  <button
                    onClick={() => handleSend(offer.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Pošalji
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingOffer(offer);
                    setShowForm(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Izmeni
                </button>
                <button
                  onClick={() => handleDelete(offer.id)}
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
          <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nema ponuda za prikaz</p>
        </div>
      )}

      {/* Offer Form Modal */}
      {showForm && (
        <OfferFormModal
          offer={editingOffer}
          onClose={() => {
            setShowForm(false);
            setEditingOffer(null);
          }}
        />
      )}
    </div>
  );
}

function OfferFormModal({ offer, onClose }: { offer: Offer | null; onClose: () => void }) {
  const [formData, setFormData] = useState({
    candidate_id: offer?.candidate_id || '',
    position_id: offer?.position_id || '',
    salary: offer?.salary || '',
    start_date: offer?.start_date ? offer.start_date.split('T')[0] : '',
    status: offer?.status || 'pending',
    notes: offer?.notes || '',
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => atsService.createOffer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-offers'] });
      toast.success('Ponuda je uspješno kreirana');
      onClose();
    },
    onError: () => {
      toast.error('Greška pri kreiranju ponude');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => atsService.updateOffer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-offers'] });
      toast.success('Ponuda je uspješno ažurirana');
      onClose();
    },
    onError: () => {
      toast.error('Greška pri ažuriranju ponude');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      salary: formData.salary ? Number(formData.salary) : undefined,
    };
    if (offer) {
      updateMutation.mutate({ id: offer.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {offer ? 'Izmeni ponudu' : 'Nova ponuda'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Plata (KM)
              </label>
              <input
                type="number"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Datum početka
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
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
              <option value="pending">Na čekanju</option>
              <option value="sent">Poslato</option>
              <option value="accepted">Prihvaćeno</option>
              <option value="rejected">Odbijeno</option>
              <option value="expired">Isteklo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Napomene
            </label>
            <textarea
              rows={4}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              {offer ? 'Sačuvaj izmene' : 'Kreiraj ponudu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}










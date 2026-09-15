import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Plus, Edit2, Trash2, Calendar, Clock, User, Video, Phone, MapPin, Search, Filter } from 'lucide-react';
import { atsService, type Candidate, type Interview, type JobPosition } from '../../../services/atsService';
import toast from 'react-hot-toast';
import { formatDate } from '@/utils/dateFormat';
import type { AtsLinkTarget } from './ATSCandidates';

type Props = {
  initialPrefill?: AtsLinkTarget | null;
  onPrefillConsumed?: () => void;
};

export default function ATSInterviews({ initialPrefill, onPrefillConsumed }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingInterview, setEditingInterview] = useState<Interview | null>(null);
  const [prefill, setPrefill] = useState<AtsLinkTarget | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialPrefill?.candidate_id) {
      setPrefill(initialPrefill);
      setEditingInterview(null);
      setShowForm(true);
      onPrefillConsumed?.();
    }
  }, [initialPrefill, onPrefillConsumed]);

  const { data: interviews, isLoading } = useQuery({
    queryKey: ['ats-interviews', statusFilter, searchTerm],
    queryFn: () => atsService.getInterviews({
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => atsService.deleteInterview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-interviews'] });
      queryClient.invalidateQueries({ queryKey: ['ats-candidates'] });
      toast.success('Intervju je uspješno obrisan');
    },
    onError: () => {
      toast.error('Greška pri brisanju intervjua');
    },
  });

  const handleDelete = (id: number) => {
    if (confirm('Da li ste sigurni da želite obrisati ovaj intervju?')) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'no_show': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Zakazan';
      case 'completed': return 'Završen';
      case 'cancelled': return 'Otkazan';
      case 'no_show': return 'Nije se pojavio';
      default: return status;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'phone': return <Phone className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'in-person': return <MapPin className="w-4 h-4" />;
      case 'technical': return <ClipboardCheck className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'phone': return 'Telefonski';
      case 'video': return 'Video';
      case 'in-person': return 'Licno';
      case 'technical': return 'Tehnički';
      default: return type;
    }
  };

  const filtered = (interviews?.data || []).filter((interview: Interview) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (interview.candidate_name || '').toLowerCase().includes(q) ||
      (interview.position_title || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-purple-500" />
            Intervjui
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Planiranje i praćenje intervjua</p>
        </div>
        <button
          onClick={() => {
            setEditingInterview(null);
            setPrefill(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novi intervju
        </button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Pretraži intervjue..."
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
            <option value="scheduled">Zakazan</option>
            <option value="completed">Završen</option>
            <option value="cancelled">Otkazan</option>
            <option value="no_show">Nije se pojavio</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((interview: Interview) => (
            <div
              key={interview.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {interview.candidate_name || `Kandidat #${interview.candidate_id}`}
                    </h3>
                    <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                      {getTypeIcon(interview.interview_type)}
                      <span className="text-sm">{getTypeLabel(interview.interview_type)}</span>
                    </div>
                  </div>
                  {interview.position_title && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{interview.position_title}</p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(interview.status)}`}>
                  {getStatusLabel(interview.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  {formatDate(interview.scheduled_date)}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  {interview.scheduled_time}
                </div>
                {interview.interviewer_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <User className="w-4 h-4" />
                    {interview.interviewer_name}
                  </div>
                )}
                {interview.rating && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Ocena: {interview.rating}/5</span>
                  </div>
                )}
              </div>

              {interview.feedback && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{interview.feedback}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setPrefill(null);
                    setEditingInterview(interview);
                    setShowForm(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Izmeni
                </button>
                <button
                  onClick={() => handleDelete(interview.id)}
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
          <ClipboardCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nema intervjua za prikaz</p>
        </div>
      )}

      {showForm && (
        <InterviewFormModal
          interview={editingInterview}
          prefill={prefill}
          onClose={() => {
            setShowForm(false);
            setEditingInterview(null);
            setPrefill(null);
          }}
        />
      )}
    </div>
  );
}

function InterviewFormModal({
  interview,
  prefill,
  onClose,
}: {
  interview: Interview | null;
  prefill?: AtsLinkTarget | null;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    candidate_id: interview?.candidate_id
      ? String(interview.candidate_id)
      : prefill?.candidate_id
        ? String(prefill.candidate_id)
        : '',
    position_id: interview?.position_id
      ? String(interview.position_id)
      : prefill?.position_id
        ? String(prefill.position_id)
        : '',
    interview_type: interview?.interview_type || 'phone',
    scheduled_date: interview?.scheduled_date ? interview.scheduled_date.split('T')[0] : '',
    scheduled_time: interview?.scheduled_time || '',
    status: interview?.status || 'scheduled',
    notes: interview?.notes || '',
    feedback: interview?.feedback || '',
    rating: interview?.rating ? String(interview.rating) : '',
  });

  const queryClient = useQueryClient();

  const { data: candidatesData } = useQuery({
    queryKey: ['ats-candidates-options'],
    queryFn: () => atsService.getCandidates(),
  });

  const { data: positionsData } = useQuery({
    queryKey: ['ats-positions-options'],
    queryFn: () => atsService.getPositions(),
  });

  const candidates: Candidate[] = candidatesData?.data || [];
  const positions: JobPosition[] = positionsData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: Partial<Interview>) => atsService.createInterview(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-interviews'] });
      queryClient.invalidateQueries({ queryKey: ['ats-candidates'] });
      toast.success('Intervju je uspješno kreiran');
      onClose();
    },
    onError: () => {
      toast.error('Greška pri kreiranju intervjua');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Interview> }) => atsService.updateInterview(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ats-interviews'] });
      queryClient.invalidateQueries({ queryKey: ['ats-candidates'] });
      toast.success('Intervju je uspješno ažuriran');
      onClose();
    },
    onError: () => {
      toast.error('Greška pri ažuriranju intervjua');
    },
  });

  const handleCandidateChange = (candidateId: string) => {
    const selected = candidates.find((c) => String(c.id) === candidateId);
    setFormData((prev) => ({
      ...prev,
      candidate_id: candidateId,
      position_id: selected?.position_id ? String(selected.position_id) : prev.position_id,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.candidate_id || !formData.position_id) {
      toast.error('Odaberite kandidata i poziciju');
      return;
    }
    const payload: Partial<Interview> = {
      candidate_id: Number(formData.candidate_id),
      position_id: Number(formData.position_id),
      interview_type: formData.interview_type as Interview['interview_type'],
      scheduled_date: formData.scheduled_date,
      scheduled_time: formData.scheduled_time,
      status: formData.status as Interview['status'],
      notes: formData.notes || undefined,
      feedback: formData.feedback || undefined,
      rating: formData.rating ? Number(formData.rating) : undefined,
    };
    if (interview) {
      updateMutation.mutate({ id: interview.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {interview ? 'Izmeni intervju' : 'Novi intervju'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kandidat *
              </label>
              <select
                required
                value={formData.candidate_id}
                onChange={(e) => handleCandidateChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">— Odaberite kandidata —</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                    {c.position_title ? ` · ${c.position_title}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pozicija *
              </label>
              <select
                required
                value={formData.position_id}
                onChange={(e) => setFormData({ ...formData, position_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">— Odaberite poziciju —</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tip intervjua *
              </label>
              <select
                required
                value={formData.interview_type}
                onChange={(e) => setFormData({ ...formData, interview_type: e.target.value as Interview['interview_type'] })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="phone">Telefonski</option>
                <option value="video">Video</option>
                <option value="in-person">Lično</option>
                <option value="technical">Tehnički</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Interview['status'] })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="scheduled">Zakazan</option>
                <option value="completed">Završen</option>
                <option value="cancelled">Otkazan</option>
                <option value="no_show">Nije se pojavio</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Datum *
              </label>
              <input
                type="date"
                required
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vrijeme *
              </label>
              <input
                type="time"
                required
                value={formData.scheduled_time}
                onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ocena (1-5)
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Feedback
            </label>
            <textarea
              rows={4}
              value={formData.feedback}
              onChange={(e) => setFormData({ ...formData, feedback: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Napomene
            </label>
            <textarea
              rows={3}
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
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              {interview ? 'Sačuvaj izmene' : 'Kreiraj intervju'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

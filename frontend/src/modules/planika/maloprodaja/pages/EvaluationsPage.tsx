import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit, FiEye, FiUsers, FiArrowLeft, FiTrash2 } from 'react-icons/fi';
import { EmployeeEvaluation } from '@/types/planika-maloprodaja';
import EvaluationForm from '../components/EvaluationForm';
import { useAuthStore } from '@/stores/authStore';

export default function EvaluationsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [evaluations, setEvaluations] = useState<EmployeeEvaluation[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<EmployeeEvaluation | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Check if user is admin
  const isAdmin = user?.role?.toLowerCase() === 'admin' || 
                 user?.role?.toLowerCase() === 'super-admin' ||
                 (user as any)?.roles?.some((r: string) => r?.toLowerCase() === 'admin' || r?.toLowerCase() === 'super-admin');

  useEffect(() => {
    loadEvaluations();
  }, []);

  useEffect(() => {
    if (id && id !== 'create') {
      loadEvaluation(parseInt(id));
    } else if (id === 'create') {
      setShowForm(true);
      setSelectedEvaluation(null);
    }
  }, [id]);

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      const data = await apiService.get<EmployeeEvaluation[]>('/planika/maloprodaja/evaluations');
      setEvaluations(data);
    } catch (error) {
      console.error('Failed to load evaluations:', error);
      toast.error('Greška pri učitavanju ocjena');
    } finally {
      setLoading(false);
    }
  };

  const loadEvaluation = async (evaluationId: number) => {
    try {
      setLoading(true);
      const evaluation = await apiService.get<EmployeeEvaluation>(
        `/planika/maloprodaja/evaluations/${evaluationId}`
      );
      setSelectedEvaluation(evaluation);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to load evaluation:', error);
      toast.error('Greška pri učitavanju ocjene');
      navigate('/planika/retail/evaluations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (evaluationId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Da li ste sigurni da želite obrisati ovu evaluaciju? Ova akcija je nepovratna.')) {
      return;
    }

    try {
      setLoading(true);
      await apiService.delete(`/planika/maloprodaja/evaluations/${evaluationId}`);
      toast.success('Evaluacija je uspješno obrisana');
      loadEvaluations();
    } catch (error: any) {
      console.error('Failed to delete evaluation:', error);
      toast.error(error?.response?.data?.message || 'Greška pri brisanju evaluacije');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !selectedEvaluation && !showForm) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {id === 'create' ? 'Nova ocjena zaposlenika' : 'Uređivanje ocjene'}
          </h1>
          <button
            onClick={() => {
              setShowForm(false);
              navigate('/planika/retail/evaluations');
            }}
            className="btn-secondary"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Nazad
          </button>
        </div>
        <div className="card p-6">
          <EvaluationForm
            evaluationId={id && id !== 'create' ? parseInt(id) : undefined}
            onSuccess={() => {
              setShowForm(false);
              navigate('/planika/retail/evaluations');
              loadEvaluations();
            }}
            onCancel={() => {
              setShowForm(false);
              navigate('/planika/retail/evaluations');
            }}
          />
        </div>
      </div>
    );
  }

  if (selectedEvaluation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => {
                setSelectedEvaluation(null);
                navigate('/planika/retail/evaluations');
              }}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2 inline-block"
            >
              ← Nazad na listu
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Ocjena: {selectedEvaluation.employee?.name}
            </h1>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              navigate(`/planika/retail/evaluations/${selectedEvaluation.id}/edit`);
            }}
            className="btn-secondary"
          >
            <FiEdit className="w-4 h-4 mr-2" />
            Uredi
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              Zaposleni
            </h3>
            <div className="space-y-2">
              <p className="text-lg font-semibold">{selectedEvaluation.employee?.name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedEvaluation.employee?.position}
              </p>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              Rezultat
            </h3>
            <div className="space-y-2">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {selectedEvaluation.average_score.toFixed(2)}
              </p>
              <p className="text-sm font-medium text-blue-600">{selectedEvaluation.rating}</p>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              Period
            </h3>
            <div className="space-y-2">
              <p className="text-sm">
                {new Date(selectedEvaluation.period_start).toLocaleDateString('bs-BA')} -{' '}
                {new Date(selectedEvaluation.period_end).toLocaleDateString('bs-BA')}
              </p>
            </div>
          </div>
        </div>

        {selectedEvaluation.responses && selectedEvaluation.responses.length > 0 && (
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              Detaljne ocjene
            </h3>
            <div className="space-y-3">
              {selectedEvaluation.responses.map((response, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {response.criterion_name}
                    </p>
                    {response.comment && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {response.comment}
                      </p>
                    )}
                  </div>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {response.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedEvaluation.overall_comment && (
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              Opći komentar
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {selectedEvaluation.overall_comment}
            </p>
          </div>
        )}

        {selectedEvaluation.recommendations && selectedEvaluation.recommendations.length > 0 && (
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              Preporuke
            </h3>
            <ul className="space-y-2">
              {selectedEvaluation.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex-1 min-w-0">
          <button
            onClick={() => navigate('/planika/retail')}
            className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2 inline-block"
          >
            ← Maloprodaja
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Ocjene zaposlenika</h1>
        </div>
        <button
          onClick={() => navigate('/planika/retail/evaluations/create')}
          className="btn-primary w-full sm:w-auto text-sm sm:text-base"
        >
          <FiPlus className="w-4 h-4 mr-2" />
          Nova ocjena
        </button>
      </div>

      <div className="space-y-3">
        {evaluations.map((evaluation) => (
          <div
            key={evaluation.id}
            className="card p-5 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate(`/planika/retail/evaluations/${evaluation.id}`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {evaluation.employee?.name}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                  <span>{evaluation.store?.name}</span>
                  <span>•</span>
                  <span>
                    {new Date(evaluation.evaluation_date).toLocaleDateString('bs-BA')}
                  </span>
                  <span>•</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {evaluation.average_score.toFixed(2)} - {evaluation.rating}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/planika/retail/evaluations/${evaluation.id}`);
                  }}
                  className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                  title="Pregledaj evaluaciju"
                >
                  <FiEye className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => handleDelete(evaluation.id!, e)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  title="Obriši evaluaciju"
                  disabled={loading}
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {evaluations.length === 0 && !loading && (
        <div className="card p-12 text-center">
          <FiUsers className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nema ocjena zaposlenika</p>
        </div>
      )}
    </div>
  );
}


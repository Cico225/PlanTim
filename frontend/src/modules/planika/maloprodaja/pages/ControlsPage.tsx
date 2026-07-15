import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import {
  FiPlus,
  FiEdit,
  FiEye,
  FiCheckSquare,
  FiArrowLeft,
  FiFilter,
} from 'react-icons/fi';
import { StoreControl } from '@/types/planika-maloprodaja';
import ControlFormComponent from '../components/ControlForm';

export default function ControlsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const [loading, setLoading] = useState(true);
  const [controls, setControls] = useState<StoreControl[]>([]);
  const [selectedControl, setSelectedControl] = useState<StoreControl | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStore, setFilterStore] = useState<number>(0);

  useEffect(() => {
    loadControls();
  }, [filterStatus, filterStore]);

  useEffect(() => {
    if (id && id !== 'create') {
      loadControl(parseInt(id));
    } else if (id === 'create') {
      setShowForm(true);
      setSelectedControl(null);
    }
  }, [id]);

  const loadControls = async () => {
    try {
      setLoading(true);
      let url = '/planika/maloprodaja/controls';
      const params: any = {};
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      if (filterStore > 0) {
        params.store_id = filterStore;
      }
      const data = await apiService.get<StoreControl[]>(url, params);
      setControls(data);
    } catch (error) {
      console.error('Failed to load controls:', error);
      toast.error('Greška pri učitavanju kontrola');
    } finally {
      setLoading(false);
    }
  };

  const loadControl = async (controlId: number) => {
    try {
      setLoading(true);
      const control = await apiService.get<StoreControl>(`/planika/maloprodaja/controls/${controlId}`);
      setSelectedControl(control);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to load control:', error);
      toast.error('Greška pri učitavanju kontrole');
      navigate('/planika/retail/controls');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'reviewed':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading && !selectedControl && !showForm) {
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
            {id === 'create' ? 'Nova kontrola prodavnice' : 'Uređivanje kontrole'}
          </h1>
          <button
            onClick={() => {
              setShowForm(false);
              navigate('/planika/retail/controls');
            }}
            className="btn-secondary"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Nazad
          </button>
        </div>
        <div className="card p-6">
          <ControlFormComponent
            controlId={id && id !== 'create' ? parseInt(id) : undefined}
            onSuccess={() => {
              setShowForm(false);
              navigate('/planika/retail/controls');
              loadControls();
            }}
            onCancel={() => {
              setShowForm(false);
              navigate('/planika/retail/controls');
            }}
          />
        </div>
      </div>
    );
  }

  if (selectedControl) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => {
                setSelectedControl(null);
                navigate('/planika/retail/controls');
              }}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2 inline-block"
            >
              ← Nazad na listu
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Kontrola: {selectedControl.store?.name}
            </h1>
          </div>
          <button
            onClick={() => {
              setShowForm(true);
              navigate(`/planika/retail/controls/${selectedControl.id}/edit`);
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
              Osnovne informacije
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Prodavnica</p>
                <p className="mt-1 text-sm font-medium">{selectedControl.store?.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Datum</p>
                <p className="mt-1 text-sm font-medium">
                  {new Date(selectedControl.control_date).toLocaleDateString('bs-BA')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedControl.status)}`}>
                  {selectedControl.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Kontrolisao</p>
                <p className="mt-1 text-sm font-medium">{selectedControl.controller?.name}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              Rezultati
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Ukupna ocjena</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedControl.total_score.toFixed(1)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Postotak</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedControl.percentage_score.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {selectedControl.plan && (
            <div className="card p-6">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
                Plan aktivnosti
              </h3>
              <p className="text-sm font-medium">{selectedControl.plan.title}</p>
            </div>
          )}
        </div>

        {selectedControl.overall_comment && (
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              Opći komentar
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {selectedControl.overall_comment}
            </p>
          </div>
        )}

        {selectedControl.recommendations && selectedControl.recommendations.length > 0 && (
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              Preporuke
            </h3>
            <ul className="space-y-2">
              {selectedControl.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {selectedControl.corrective_measures && selectedControl.corrective_measures.length > 0 && (
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
              Korektivne mjere
            </h3>
            <ul className="space-y-2">
              {selectedControl.corrective_measures.map((measure, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-orange-600 mt-1">•</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{measure}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {selectedControl.responses && selectedControl.responses.length > 0 && (
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              Detaljni rezultati
            </h3>
            <div className="space-y-4">
              {Object.entries(selectedControl.scores).map(([sectionName, score]) => {
                const sectionResponses = selectedControl.responses?.filter(
                  (r) => r.section_name === sectionName
                ) || [];
                
                return (
                  <div key={sectionName} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900 dark:text-white">{sectionName}</h4>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {score} poena
                      </span>
                    </div>
                    <div className="space-y-2">
                      {sectionResponses.map((response, idx) => (
                        <div key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">{response.criterion_name}:</span>{' '}
                          {response.score !== null && response.score !== undefined && (
                            <span className="text-gray-900 dark:text-white">{response.score}</span>
                          )}
                          {response.response && <span> - {response.response}</span>}
                          {response.comment && (
                            <span className="block text-xs text-gray-500 mt-1">
                              {response.comment}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Kontrole prodavnica</h1>
        </div>
        <button
          onClick={() => navigate('/planika/retail/controls/create')}
          className="btn-primary w-full sm:w-auto text-sm sm:text-base"
        >
          <FiPlus className="w-4 h-4 mr-2" />
          Nova kontrola
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <FiFilter className="w-5 h-5 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input"
          >
            <option value="all">Svi statusi</option>
            <option value="draft">Nacrt</option>
            <option value="completed">Završeno</option>
            <option value="reviewed">Pregledano</option>
          </select>
        </div>
      </div>

      {/* Controls List */}
      <div className="space-y-3">
        {controls.map((control) => (
          <div
            key={control.id}
            className="card p-5 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate(`/planika/retail/controls/${control.id}`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {control.store?.name}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(control.status)}`}>
                    {control.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>
                    {new Date(control.control_date).toLocaleDateString('bs-BA')}
                  </span>
                  <span>•</span>
                  <span>{control.controller?.name}</span>
                  {control.percentage_score !== null && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {control.percentage_score.toFixed(1)}%
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/planika/retail/controls/${control.id}/edit`);
                  }}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Uredi"
                >
                  <FiEdit className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/planika/retail/controls/${control.id}`);
                  }}
                  className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                  title="Detalji"
                >
                  <FiEye className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {controls.length === 0 && !loading && (
        <div className="card p-12 text-center">
          <FiCheckSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nema kontrola prodavnica</p>
        </div>
      )}
    </div>
  );
}


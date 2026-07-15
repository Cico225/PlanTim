import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import {
  FiPlus,
  FiEdit,
  FiEye,
  FiCalendar,
  FiUsers,
  FiArrowLeft,
  FiFilter,
  FiX,
} from 'react-icons/fi';
import { ActivityPlan } from '@/types/planika-maloprodaja';
import PlanForm from '../components/PlanForm';

export default function PlansPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<ActivityPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<ActivityPlan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Extract path segments
  const { isCreate, isEdit, id } = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const planIndex = pathSegments.indexOf('plans');
    const segmentAfterPlans = planIndex >= 0 && pathSegments.length > planIndex + 1 ? pathSegments[planIndex + 1] : null;
    const segmentAfterId = planIndex >= 0 && pathSegments.length > planIndex + 2 ? pathSegments[planIndex + 2] : null;
    
    return {
      isCreate: segmentAfterPlans === 'create',
      isEdit: segmentAfterId === 'edit',
      id: segmentAfterPlans && segmentAfterPlans !== 'create' ? segmentAfterPlans : null
    };
  }, [location.pathname]);

  useEffect(() => {
    if (!isCreate) {
      loadPlans();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, isCreate]);

  useEffect(() => {
    if (isCreate) {
      setShowForm(true);
      setSelectedPlan(null);
      setLoading(false);
    } else if (id && isEdit) {
      loadPlan(parseInt(id));
      setShowForm(true);
    } else if (id) {
      loadPlan(parseInt(id));
      setShowForm(false);
    } else {
      setShowForm(false);
      setSelectedPlan(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, isCreate, isEdit, id]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      let url = '/planika/maloprodaja/plans';
      if (filterStatus !== 'all') {
        url += `?status=${filterStatus}`;
      }
      const data = await apiService.get<ActivityPlan[]>(url);
      setPlans(data);
    } catch (error) {
      console.error('Failed to load plans:', error);
      toast.error('Greška pri učitavanju planova');
    } finally {
      setLoading(false);
    }
  };

  const loadPlan = async (planId: number) => {
    try {
      setLoading(true);
      const plan = await apiService.get<ActivityPlan>(`/planika/maloprodaja/plans/${planId}`);
      setSelectedPlan(plan);
      setShowForm(false);
    } catch (error) {
      console.error('Failed to load plan:', error);
      toast.error('Greška pri učitavanju plana');
      navigate('/planika/retail/plans');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (planId: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj plan?')) {
      return;
    }

    try {
      await apiService.delete(`/planika/maloprodaja/plans/${planId}`);
      toast.success('Plan uspješno obrisan');
      loadPlans();
    } catch (error) {
      console.error('Failed to delete plan:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'completed':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'normal':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading && !selectedPlan && !showForm && !isCreate) {
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
            {isCreate ? 'Novi plan aktivnosti' : 'Uređivanje plana'}
          </h1>
          <button
            onClick={() => {
              setShowForm(false);
              navigate('/planika/retail/plans');
            }}
            className="btn-secondary"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Nazad
          </button>
        </div>
        <div className="card p-6">
          <PlanForm
            planId={id ? parseInt(id) : undefined}
            onSuccess={() => {
              setShowForm(false);
              navigate('/planika/retail/plans');
              loadPlans();
            }}
            onCancel={() => {
              setShowForm(false);
              navigate('/planika/retail/plans');
            }}
          />
        </div>
      </div>
    );
  }

  if (selectedPlan) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => {
                setSelectedPlan(null);
                navigate('/planika/retail/plans');
              }}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2 inline-block"
            >
              ← Nazad na listu
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedPlan.title}</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (!confirm('Da li želite generisati kalendar obilazaka za ovaj plan?')) {
                  return;
                }
                try {
                  await apiService.post(`/planika/maloprodaja/plans/${selectedPlan.id}/generate-schedule`);
                  toast.success('Kalendar obilazaka uspješno generisan');
                  navigate(`/planika/retail/calendar?plan_id=${selectedPlan.id}`);
                } catch (error) {
                  console.error('Failed to generate schedule:', error);
                  toast.error('Greška pri generisanju kalendara');
                }
              }}
              className="btn-secondary"
            >
              <FiCalendar className="w-4 h-4 mr-2" />
              Generiši kalendar
            </button>
            <button
              onClick={() => {
                navigate(`/planika/retail/calendar?plan_id=${selectedPlan.id}`);
              }}
              className="btn-secondary"
            >
              <FiEye className="w-4 h-4 mr-2" />
              Vidi kalendar
            </button>
            <button
              onClick={() => {
                setShowForm(true);
                navigate(`/planika/retail/plans/${selectedPlan.id}/edit`);
              }}
              className="btn-secondary"
            >
              <FiEdit className="w-4 h-4 mr-2" />
              Uredi
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              Osnovne informacije
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPlan.status)}`}>
                  {selectedPlan.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tip perioda</p>
                <p className="mt-1 text-sm font-medium">{selectedPlan.period_type}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Prioritet</p>
                <p className={`mt-1 text-sm font-medium ${getPriorityColor(selectedPlan.priority)}`}>
                  {selectedPlan.priority}
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              Period
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Početak</p>
                <p className="mt-1 text-sm font-medium">
                  {new Date(selectedPlan.start_date).toLocaleDateString('bs-BA')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Završetak</p>
                <p className="mt-1 text-sm font-medium">
                  {new Date(selectedPlan.end_date).toLocaleDateString('bs-BA')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Obavezne kontrole</p>
                <p className="mt-1 text-sm font-medium">
                  {selectedPlan.required_controls_per_month}x mjesečno
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              Opis
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {selectedPlan.description || 'Nema opisa'}
            </p>
          </div>
        </div>

        {selectedPlan.goals && Object.keys(selectedPlan.goals).length > 0 && (
          <div className="card p-6">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
              Ciljevi
            </h3>
            <pre className="text-sm bg-gray-50 dark:bg-gray-800 p-4 rounded-lg overflow-auto">
              {JSON.stringify(selectedPlan.goals, null, 2)}
            </pre>
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Planovi aktivnosti</h1>
        </div>
        <button
          onClick={() => navigate('/planika/retail/plans/create')}
          className="btn-primary w-full sm:w-auto text-sm sm:text-base"
        >
          <FiPlus className="w-4 h-4 mr-2" />
          Novi plan
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
            <option value="active">Aktivni</option>
            <option value="completed">Završeni</option>
            <option value="cancelled">Otkazani</option>
          </select>
        </div>
      </div>

      {/* Plans List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="card p-5 hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate(`/planika/retail/plans/${plan.id}`)}
          >
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex-1">
                {plan.title}
              </h3>
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(plan.status)}`}>
                {plan.status}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
              <div className="flex items-center gap-2">
                <FiCalendar className="w-4 h-4" />
                <span>
                  {new Date(plan.start_date).toLocaleDateString('bs-BA')} -{' '}
                  {new Date(plan.end_date).toLocaleDateString('bs-BA')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-medium ${getPriorityColor(plan.priority)}`}>
                  {plan.priority}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/planika/retail/plans/${plan.id}/edit`);
                }}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                title="Uredi"
              >
                <FiEdit className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/planika/retail/plans/${plan.id}`);
                }}
                className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                title="Detalji"
              >
                <FiEye className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {plans.length === 0 && !loading && (
        <div className="card p-12 text-center">
          <FiCalendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nema planova aktivnosti</p>
        </div>
      )}
    </div>
  );
}


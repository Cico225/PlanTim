import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '@/services/api';
import {
  FiShoppingBag,
  FiMapPin,
  FiCalendar,
  FiCheckSquare,
  FiUsers,
  FiTrendingUp,
  FiFileText,
  FiArrowRight,
  FiPlus,
  FiEdit,
  FiEye,
  FiList,
  FiSettings,
  FiBarChart2,
  FiClock,
  FiTarget,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { OverviewReport, Region, Store, ActivityPlan, StoreControl, EmployeeEvaluation } from '@/types/planika-maloprodaja';
import ManagerBenefits from '../components/ManagerBenefits';

export default function MaloprodajaOverview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<OverviewReport | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [activePlans, setActivePlans] = useState<ActivityPlan[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportRes, regionsRes, storesRes, plansRes] = await Promise.all([
        apiService.get<OverviewReport>('/planika/maloprodaja/reports?type=overview'),
        apiService.get<Region[]>('/planika/maloprodaja/regions'),
        apiService.get<Store[]>('/planika/maloprodaja/stores'),
        apiService.get<ActivityPlan[]>('/planika/maloprodaja/plans?status=active'),
      ]);

      setReport(reportRes);
      setRegions(regionsRes);
      setStores(storesRes);
      setActivePlans(plansRes);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Greška pri učitavanju podataka');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Regije',
      value: report?.total_regions || 0,
      icon: FiMapPin,
      color: 'bg-blue-500',
      link: '/planika/retail/regions',
    },
    {
      name: 'Prodavnice',
      value: report?.total_stores || 0,
      icon: FiShoppingBag,
      color: 'bg-green-500',
      link: '/planika/retail/stores',
    },
    {
      name: 'Aktivni planovi',
      value: report?.active_plans || 0,
      icon: FiCalendar,
      color: 'bg-purple-500',
      link: '/planika/retail/plans',
    },
    {
      name: 'Kontrole',
      value: report?.completed_controls || 0,
      icon: FiCheckSquare,
      color: 'bg-orange-500',
      link: '/planika/retail/controls',
    },
    {
      name: 'Ocjene',
      value: report?.total_evaluations || 0,
      icon: FiUsers,
      color: 'bg-pink-500',
      link: '/planika/retail/evaluations',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link
            to="/planika"
            className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2 inline-block"
          >
            ← Planika
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Maloprodaja
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            Upravljanje prodavnicama, kontrolama i ocjenjivanjem zaposlenika
          </p>
        </div>
      </div>

      {/* Manager Benefits Section - Prominent placement */}
      <ManagerBenefits />

      {/* Stats Grid - Mobile Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="card p-3 sm:p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(stat.link)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
                    {stat.name}
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-2 sm:p-3 rounded-lg text-white flex-shrink-0 ml-2`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Plans Section - Enhanced - Mobile Responsive */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Create New Plan */}
        <div className="card p-4 sm:p-6 border-2 border-dashed border-blue-300 dark:border-blue-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors bg-blue-50/50 dark:bg-blue-900/10">
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Kreiraj novi plan
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Definiši plan aktivnosti za regije ili prodavnice
              </p>
            </div>
            <div className="bg-blue-600 p-2 rounded-lg flex-shrink-0 ml-2">
              <FiPlus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          </div>
          <button
            onClick={() => navigate('/planika/retail/plans/create')}
            className="w-full btn-primary flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <FiPlus className="w-4 h-4" />
            Novi plan aktivnosti
          </button>
        </div>

        {/* View All Plans */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Pregled planova
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Upravljaj postojećim planovima aktivnosti
              </p>
            </div>
            <div className="bg-purple-600 p-2 rounded-lg flex-shrink-0 ml-2">
              <FiList className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          </div>
          <button
            onClick={() => navigate('/planika/retail/plans')}
            className="w-full btn-secondary flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <FiList className="w-4 h-4" />
            Vidi sve planove
          </button>
        </div>

        {/* Calendar View */}
        <div className="card p-4 sm:p-6">
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Kalendar obilazaka
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                Pregled rasporeda obilazaka prodavnica
              </p>
            </div>
            <div className="bg-green-600 p-2 rounded-lg flex-shrink-0 ml-2">
              <FiCalendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
          </div>
          <button
            onClick={() => navigate('/planika/retail/calendar')}
            className="w-full btn-secondary flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <FiCalendar className="w-4 h-4" />
            Otvori kalendar
          </button>
        </div>
      </div>

      {/* Quick Actions - Mobile Responsive */}
      <div className="card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            Brze akcije
          </h2>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <FiTarget className="w-4 h-4" />
            <span>Česti zadaci</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/planika/retail/controls/create')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all group"
          >
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
              <FiCheckSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Nova kontrola</span>
          </button>
          <button
            onClick={() => navigate('/planika/retail/evaluations/create')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group"
          >
            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
              <FiUsers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Nova ocjena</span>
          </button>
          <button
            onClick={() => navigate('/planika/retail/reports')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-orange-200 dark:border-orange-800 hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all group"
          >
            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
              <FiBarChart2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Izvještaji</span>
          </button>
          <button
            onClick={() => navigate('/planika/retail/controls')}
            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
          >
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg group-hover:bg-gray-200 dark:group-hover:bg-gray-600 transition-colors">
              <FiEye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Pregled kontrola</span>
          </button>
        </div>
      </div>

      {/* Advanced Options - Mobile Responsive */}
      <div className="card p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            Napredne opcije
          </h2>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <FiSettings className="w-4 h-4" />
            <span className="hidden sm:inline">Dodatne funkcionalnosti</span>
            <span className="sm:hidden">Dodatno</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/planika/retail/plans?type=regular')}
            className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group text-left"
          >
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors flex-shrink-0">
              <FiCalendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">Redovni planovi</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Mjesečni i kvartalni</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/planika/retail/plans?type=focused')}
            className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all group text-left"
          >
            <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors flex-shrink-0">
              <FiTarget className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">Fokusirani planovi</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Rješavanje problema</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/planika/retail/plans?type=emergency')}
            className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group text-left"
          >
            <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors flex-shrink-0">
              <FiClock className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">Vanredni planovi</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Hitne situacije</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/planika/retail/plans?type=seasonal')}
            className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all group text-left"
          >
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors flex-shrink-0">
              <FiTrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 dark:text-white text-sm mb-1">Sezonski planovi</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Zimski/ljetnji asortiman</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Controls */}
      {report?.recent_controls && report.recent_controls.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Nedavne kontrole
            </h2>
            <button
              onClick={() => navigate('/planika/retail/controls')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Vidi sve
              <FiArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {report.recent_controls.slice(0, 5).map((control) => (
              <div
                key={control.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                onClick={() => navigate(`/planika/retail/controls/${control.id}`)}
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {control.store?.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(control.control_date).toLocaleDateString('bs-BA')} • {control.controller?.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {control.percentage_score.toFixed(1)}%
                  </span>
                  <FiEye className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Plans - Enhanced */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Aktivni planovi
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Trenutno aktivni planovi aktivnosti
            </p>
          </div>
          <button
            onClick={() => navigate('/planika/retail/plans')}
            className="btn-secondary flex items-center gap-2"
          >
            <span>Vidi sve</span>
            <FiArrowRight className="w-4 h-4" />
          </button>
        </div>
        {activePlans.length > 0 ? (
          <div className="space-y-3">
            {activePlans.slice(0, 5).map((plan) => (
              <div
                key={plan.id}
                className="group flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all cursor-pointer"
                onClick={() => navigate(`/planika/retail/plans/${plan.id}`)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                    <FiCalendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {plan.title}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        plan.priority === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        plan.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                        plan.priority === 'normal' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {plan.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <FiCalendar className="w-3 h-3" />
                      {new Date(plan.start_date).toLocaleDateString('bs-BA')} - {new Date(plan.end_date).toLocaleDateString('bs-BA')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/planika/retail/plans/${plan.id}/edit`);
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    title="Uredi plan"
                  >
                    <FiEdit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/planika/retail/plans/${plan.id}`);
                    }}
                    className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                    title="Pregled plana"
                  >
                    <FiEye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FiCalendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">Trenutno nema aktivnih planova</p>
            <button
              onClick={() => navigate('/planika/retail/plans/create')}
              className="btn-primary inline-flex items-center gap-2"
            >
              <FiPlus className="w-4 h-4" />
              Kreiraj prvi plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


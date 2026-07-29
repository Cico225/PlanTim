import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Building2, 
  FileText, 
  Calendar, 
  Clock, 
  Award, 
  UserPlus, 
  UserMinus,
  BarChart3,
  Bell,
  Briefcase,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Upload,
  X,
  GraduationCap,
  Star,
  Edit2,
  Save,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Briefcase as BriefcaseIcon
} from 'lucide-react';
import { getHRDashboard, getEmployees, getAlerts, createEmployee, importEmployees, getDepartments, getEmployee, updateEmployee, deleteEmployee, getStores, getWorkPositions } from '../../../services/hrmService';
import toast from 'react-hot-toast';
import type { EmployeeStatus } from '../../../types/hrm';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ATSPositions from '../components/ATSPositions';
import ATSCandidates from '../components/ATSCandidates';
import ATSInterviews from '../components/ATSInterviews';
import ATSOffers from '../components/ATSOffers';
import OrganizationalStructure from '../components/OrganizationalStructure';
import Onboarding from '../components/Onboarding';
import EmploymentContracts from '../components/EmploymentContracts';

// Tab components - inline implementations
type TabKey = 'dashboard' | 'employees' | 'onboarding' | 'contracts' | 'decisions' | 
              'departments' | 'leaves' | 'attendance' | 'evaluations' | 'offboarding' | 'reports' |
              'education' | 'talent' | 'ats';

interface NavItem {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Pregled', icon: BarChart3, description: 'Statistike i pregled' },
  { key: 'employees', label: 'Zaposleni', icon: Users, description: 'Upravljanje zaposlenicima' },
  { key: 'departments', label: 'Odjeli', icon: Building2, description: 'Organizacijska struktura' },
  { key: 'ats', label: 'ATS', icon: Briefcase, description: 'Applicant Tracking System' },
  { key: 'onboarding', label: 'Onboarding', icon: UserPlus, description: 'Prijem novih zaposlenika' },
  { key: 'contracts', label: 'Ugovori', icon: FileText, description: 'Ugovori o radu' },
  { key: 'decisions', label: 'Rješenja i odluke', icon: ClipboardCheck, description: 'Rješenja i odluke' },
  { key: 'attendance', label: 'Evidencije rada', icon: Clock, description: 'Radno vrijeme' },
  { key: 'leaves', label: 'Odsustva', icon: Calendar, description: 'Godišnji i bolovanja' },
  { key: 'education', label: 'Edukacije', icon: GraduationCap, description: 'Obrazovanje i trening' },
  { key: 'talent', label: 'Talent Management', icon: Star, description: 'Upravljanje talentima' },
  { key: 'evaluations', label: 'Evaluacije', icon: Award, description: 'Ocjene i GO/NO-GO' },
  { key: 'offboarding', label: 'Offboarding', icon: UserMinus, description: 'Odlazak zaposlenika' },
  { key: 'reports', label: 'Izvještaji', icon: BarChart3, description: 'Analitika i izvještaji' },
];

// Status badge component
function StatusBadge({ status, type }: { status: string; type: 'employee' | 'leave' | 'process' }) {
  const getConfig = () => {
    if (type === 'employee') {
      switch (status) {
        case 'active': return { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', label: 'Aktivan' };
        case 'candidate': return { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', label: 'Kandidat' };
        case 'hiring': return { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', label: 'U procesu zapošljavanja' };
        case 'on_hold': return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Na čekanju' };
        case 'offboarding': return { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400', label: 'Offboarding' };
        case 'former': return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', label: 'Bivši zaposlenik' };
        default: return { color: 'bg-gray-100 text-gray-800', label: status };
      }
    }
    if (type === 'leave') {
      switch (status) {
        case 'approved': return { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', label: 'Odobreno' };
        case 'pending': return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Na čekanju' };
        case 'rejected': return { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', label: 'Odbijeno' };
        default: return { color: 'bg-gray-100 text-gray-800', label: status };
      }
    }
    // process type
    switch (status) {
      case 'completed': return { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', label: 'Završeno' };
      case 'in_progress': return { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', label: 'U toku' };
      case 'not_started': return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', label: 'Nije započeto' };
      default: return { color: 'bg-gray-100 text-gray-800', label: status };
    }
  };
  const config = getConfig();
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>{config.label}</span>;
}

// Dashboard Component
function HRDashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['hrm-dashboard'],
    queryFn: () => getHRDashboard(),
  });

  const { data: alertsData } = useQuery({
    queryKey: ['hrm-alerts'],
    queryFn: () => getAlerts('active'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const stats = dashboardData?.stats || {
    total_employees: 0,
    active_employees: 0,
    on_leave_today: 0,
    pending_leaves: 0,
    pending_evaluations: 0,
    expiring_contracts: 0,
    onboarding_in_progress: 0,
    offboarding_in_progress: 0,
    new_hires_this_month: 0,
    terminations_this_month: 0,
    upcoming_birthdays: 0,
    upcoming_anniversaries: 0,
  };

  const alerts = alertsData || dashboardData?.alerts || [];
  const recentActivities = dashboardData?.recent_activities || [];

  const formatShortDate = (value?: string) => {
    if (!value) return 'Bez datuma';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('bs-BA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const statCards = [
    { label: 'Ukupno zaposlenika', value: stats.total_employees, icon: Users, color: 'bg-blue-500' },
    { label: 'Aktivni', value: stats.active_employees, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'Na odsustvu danas', value: stats.on_leave_today, icon: Calendar, color: 'bg-yellow-500' },
    { label: 'Čeka odobrenje', value: stats.pending_leaves, icon: Clock, color: 'bg-orange-500' },
    { label: 'Onboarding', value: stats.onboarding_in_progress, icon: UserPlus, color: 'bg-purple-500' },
    { label: 'Offboarding', value: stats.offboarding_in_progress, icon: UserMinus, color: 'bg-red-500' },
    { label: 'Novi ovaj mjesec', value: stats.new_hires_this_month, icon: TrendingUp, color: 'bg-teal-500' },
    { label: 'Ugovori ističu', value: stats.expiring_contracts, icon: AlertTriangle, color: 'bg-amber-500' },
  ];

  const secondaryCards = [
    { label: 'Evaluacije u toku', value: stats.pending_evaluations, icon: Award, tone: 'text-violet-600 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-300' },
    { label: 'Prekidi ovog mjeseca', value: stats.terminations_this_month, icon: TrendingDown, tone: 'text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-300' },
    { label: 'Rođendani uskoro', value: stats.upcoming_birthdays, icon: Bell, tone: 'text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/20 dark:text-fuchsia-300' },
    { label: 'Godišnjice uskoro', value: stats.upcoming_anniversaries, icon: Building2, tone: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20 dark:text-cyan-300' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className={`${stat.color} p-2 rounded-lg`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {secondaryCards.map((stat, idx) => (
          <div key={idx} className="rounded-xl border border-gray-200 bg-white/80 p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800/80">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${stat.tone}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Nedavne HR aktivnosti</h3>
          </div>

          {recentActivities.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
              Trenutno nema evidentiranih HR aktivnosti za prikaz.
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity: any) => (
                <div
                  key={activity.id}
                  className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-700/30"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{activity.title}</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{activity.description}</p>
                  </div>
                  <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                    {formatShortDate(activity.date || activity.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center gap-2">
            <BriefcaseIcon className="h-5 w-5 text-sky-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sažetak procesa</h3>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Aktivni onboarding', value: stats.onboarding_in_progress, color: 'bg-purple-500' },
              { label: 'Aktivni offboarding', value: stats.offboarding_in_progress, color: 'bg-rose-500' },
              { label: 'Odobrenja odsustva na čekanju', value: stats.pending_leaves, color: 'bg-amber-500' },
              { label: 'Evaluacije za obradu', value: stats.pending_evaluations, color: 'bg-indigo-500' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-gray-100 p-3 dark:border-gray-700">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{item.label}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{item.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${Math.min(item.value * 12, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upozorenja</h3>
            <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-medium px-2 py-0.5 rounded-full">
              {alerts.length}
            </span>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-4 h-4 ${
                    alert.priority === 'urgent' ? 'text-red-500' : 
                    alert.priority === 'high' ? 'text-orange-500' : 'text-yellow-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{alert.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{alert.message}</p>
                  </div>
                </div>
                {alert.due_date && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">{formatShortDate(alert.due_date)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Employees List Component
function EmployeesList() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const queryClient = useQueryClient();
  
  const { data: employeesData, isLoading, error } = useQuery({
    queryKey: ['hrm-employees', statusFilter],
    queryFn: () => getEmployees({ status: (statusFilter || undefined) as EmployeeStatus | undefined }),
  });

  const employees = employeesData?.data || [];

  const createEmployeeMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-employees'] });
      setShowAddModal(false);
      // Reset form
    },
  });

  const importEmployeesMutation = useMutation({
    mutationFn: importEmployees,
    onSuccess: (data) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ['hrm-employees'] });
      if (data.success && data.errors === 0) {
        setTimeout(() => {
          setShowImportModal(false);
          setImportFile(null);
          setImportResult(null);
        }, 3000);
      }
    },
    onError: (error: any) => {
      // Error handling je već u api.ts interceptoru, ali možemo dodati dodatne informacije
      setImportResult({
        success: false,
        message: error.response?.data?.message || error.message || 'Greška pri importu',
        errors: error.response?.data?.errors || {},
      });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-employees'] });
      toast.success('Zaposlenik je uspješno obrisan');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Greška pri brisanju zaposlenika');
    },
  });

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Da li ste sigurni da želite obrisati zaposlenika "${name}"?`)) {
      deleteEmployeeMutation.mutate(id);
    }
  };

  const statusOptions = [
    { value: '', label: 'Svi statusi' },
    { value: 'candidate', label: 'Kandidat' },
    { value: 'hiring', label: 'U procesu zapošljavanja' },
    { value: 'active', label: 'Aktivan' },
    { value: 'on_hold', label: 'Na čekanju' },
    { value: 'offboarding', label: 'Offboarding' },
    { value: 'former', label: 'Bivši zaposlenik' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImportFile(e.target.files[0]);
    }
  };

  const handleImport = () => {
    if (importFile) {
      importEmployeesMutation.mutate(importFile);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">Import</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span className="text-sm font-medium">Dodaj zaposlenika</span>
          </button>
        </div>
      </div>

      {/* Employees Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nema zaposlenika za prikaz</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Zaposlenik</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Odjel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Pozicija</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Datum zaposlenja</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                          {emp.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{emp.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{emp.department_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{emp.position}</td>
                  <td className="px-4 py-3"><StatusBadge status={emp.status} type="employee" /></td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{emp.hire_date}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => {
                          setSelectedEmployeeId(emp.id);
                          setShowDetailModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        Detalji
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(emp.id, emp.name || 'Zaposlenik');
                        }}
                        disabled={deleteEmployeeMutation.isPending}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Obriši zaposlenika"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <AddEmployeeModal 
          onClose={() => setShowAddModal(false)}
          onSubmit={(data) => createEmployeeMutation.mutate(data)}
          isLoading={createEmployeeMutation.isPending}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportEmployeesModal 
          onClose={() => {
            setShowImportModal(false);
            setImportFile(null);
            setImportResult(null);
          }}
          onImport={handleImport}
          file={importFile}
          onFileChange={handleFileChange}
          result={importResult}
          isLoading={importEmployeesMutation.isPending}
        />
      )}

      {/* Employee Detail Modal */}
      {showDetailModal && selectedEmployeeId && (
        <EmployeeDetailModal
          employeeId={selectedEmployeeId}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedEmployeeId(null);
          }}
        />
      )}
    </div>
  );
}

// Add Employee Modal Component
function AddEmployeeModal({ onClose, onSubmit, isLoading }: { 
  onClose: () => void; 
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    employee_number: '',
    municipality_code: '',
    department_id: '',
    position: '',
    job_title: '',
    store: '',
    hire_date: '',
    gender: '',
    mobile_phone: '',
    private_address: '',
    date_of_birth: '',
    marital_status: '',
    children_count: 0,
    employment_type: 'full-time',
    status: 'active',
  });

  const { data: departments } = useQuery({
    queryKey: ['hrm-departments'],
    queryFn: () => getDepartments(),
  });

  const { data: stores } = useQuery({
    queryKey: ['hrm-stores'],
    queryFn: () => getStores({ is_active: true }),
  });

  const { data: workPositions } = useQuery({
    queryKey: ['hrm-work-positions'],
    queryFn: () => getWorkPositions({ is_active: true }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Dodaj zaposlenika</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Osnovni podaci */}
            <div className="md:col-span-2">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Osnovni podaci</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ime *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prezime *
              </label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Broj zaposlenog *
              </label>
              <input
                type="text"
                required
                value={formData.employee_number}
                onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Opcina
              </label>
              <input
                type="text"
                value={formData.municipality_code}
                onChange={(e) => setFormData({ ...formData, municipality_code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Datum početka *
              </label>
              <input
                type="date"
                required
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Poslovni podaci */}
            <div className="md:col-span-2 mt-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Poslovni podaci</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Odjel
              </label>
              <select
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Odaberi odjel</option>
                {departments && Array.isArray(departments) ? (
                  departments.map((dept: any) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))
                ) : null}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pozicija *
              </label>
              <input
                type="text"
                required
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Naziv radnog mjesta
              </label>
              <select
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Odaberi radno mjesto</option>
                {workPositions && Array.isArray(workPositions) ? (
                  workPositions.map((position: any) => (
                    <option key={position.id} value={position.name}>{position.name}</option>
                  ))
                ) : null}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prodavnica
              </label>
              <select
                value={formData.store}
                onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Odaberi prodavnicu</option>
                {stores && Array.isArray(stores) ? (
                  stores.map((store: any) => (
                    <option key={store.id} value={store.name || store.id}>{store.name}</option>
                  ))
                ) : null}
              </select>
            </div>

            {/* Lični podaci */}
            <div className="md:col-span-2 mt-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Lični podaci</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pol
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Odaberi</option>
                <option value="M">Muški</option>
                <option value="F">Ženski</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mobilni telefon
              </label>
              <input
                type="tel"
                value={formData.mobile_phone}
                onChange={(e) => setFormData({ ...formData, mobile_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ulica - privatno
              </label>
              <input
                type="text"
                value={formData.private_address}
                onChange={(e) => setFormData({ ...formData, private_address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Datum rođenja
              </label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bračno stanje
              </label>
              <select
                value={formData.marital_status}
                onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Odaberi</option>
                <option value="S">Neoženjen/Neudata</option>
                <option value="M">Oženjen/Udata</option>
                <option value="D">Razveden/a</option>
                <option value="W">Udovac/Udovica</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Broj djece
              </label>
              <input
                type="number"
                min="0"
                value={formData.children_count}
                onChange={(e) => setFormData({ ...formData, children_count: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Spremanje...' : 'Spremi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Import Employees Modal Component
function ImportEmployeesModal({ 
  onClose, 
  onImport, 
  file, 
  onFileChange, 
  result, 
  isLoading 
}: { 
  onClose: () => void;
  onImport: () => void;
  file: File | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  result: any;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Import zaposlenika</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Odaberi Excel/CSV fajl
            </label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onFileChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Odabran fajl: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
              <strong>Napomena:</strong> Fajl treba imati kolone sa tačnim nazivima (prvi red je header):
            </p>
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p><strong>Obavezno:</strong> Ime, Prezime, E-pošta, Broj zaposlenog, Datum početka, Naziv pozicije</p>
              <p><strong>Opciono:</strong> Opcina, Pol, Naziv radnog mjesta, Prodavnica, Mobilni telefon, Ulica - privatno, Datum rođenja, Bračno stanje, Broj djece, Slika, Naziv odjeljenja</p>
            </div>
          </div>

          {result && (
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
              <p className={`text-sm font-medium ${result.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                {result.message}
              </p>
              {result.success && (
                <>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                    Uspješno importovano: {result.imported} zaposlenika
                    {result.errors > 0 && `, grešaka: ${result.errors}`}
                  </p>
                  {result.errors > 0 && result.error_details && result.error_details.length > 0 && (
                    <details className="mt-3">
                      <summary className="text-sm text-green-700 dark:text-green-300 cursor-pointer hover:underline">
                        Prikaži detalje grešaka (prvih 10)
                      </summary>
                      <div className="mt-2 max-h-60 overflow-y-auto text-xs bg-white dark:bg-gray-800 p-3 rounded border border-green-200 dark:border-green-800">
                        {result.error_details.slice(0, 10).map((error: any, index: number) => (
                          <div key={index} className="mb-2 pb-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                            <p className="font-medium text-red-600 dark:text-red-400">
                              Red {error.row_number || index + 1}: {error.error}
                            </p>
                            {error.row && (
                              <p className="text-gray-600 dark:text-gray-400 mt-1">
                                Podaci: {JSON.stringify(error.row).substring(0, 200)}...
                              </p>
                            )}
                          </div>
                        ))}
                        {result.error_details.length > 10 && (
                          <p className="text-gray-500 dark:text-gray-400 text-xs mt-2">
                            ... i još {result.error_details.length - 10} grešaka. Provjerite Laravel logove za sve detalje.
                          </p>
                        )}
                      </div>
                    </details>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Zatvori
            </button>
            <button
              type="button"
              onClick={onImport}
              disabled={!file || isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Import...' : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Employee Detail Modal Component
function EmployeeDetailModal({ employeeId, onClose }: { employeeId: number; onClose: () => void }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const queryClient = useQueryClient();

  const { data: employee, isLoading } = useQuery({
    queryKey: ['hrm-employee', employeeId],
    queryFn: () => getEmployee(employeeId),
    enabled: !!employeeId,
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['hrm-departments'],
    queryFn: () => getDepartments(),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { apiService } = await import('../../../services/api');
      return apiService.get('/admin/users');
    },
  });

  const { data: workPositionsData } = useQuery({
    queryKey: ['hrm-work-positions-edit'],
    queryFn: () => getWorkPositions({ is_active: true }),
  });

  useEffect(() => {
    if (employee?.data || employee) {
      const emp = employee.data || employee;
      const nameParts = emp.name?.split(' ') || [];
      setFormData({
        first_name: nameParts[0] || '',
        last_name: nameParts.slice(1).join(' ') || '',
        email: emp.email || '',
        employee_number: emp.employee_id || emp.employee_number || '',
        personal_id_number: emp.personal_id_number || '',
        municipality_code: emp.municipality_code || '',
        department_id: emp.department_id || '',
        position: emp.position || '',
        job_title: emp.job_title || '',
        store: emp.store || '',
        hire_date: emp.hire_date || '',
        termination_date: emp.termination_date || '',
        gender: emp.gender || '',
        mobile_phone: emp.mobile_phone || emp.phone || '',
        private_address: emp.private_address || emp.address || '',
        date_of_birth: emp.date_of_birth || '',
        marital_status: emp.marital_status || '',
        children_count: emp.children_count || 0,
        employment_type: emp.employment_type || 'full-time',
        status: emp.status || 'active',
        salary: emp.salary || '',
        manager_id: emp.manager_id || '',
        mentor_id: emp.mentor_id || '',
        probation_end_date: emp.probation_end_date || '',
        notes: emp.notes || '',
      });
    }
  }, [employee]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateEmployee(employeeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-employee', employeeId] });
      queryClient.invalidateQueries({ queryKey: ['hrm-employees'] });
      toast.success('Zaposlenik je uspješno ažuriran');
      setIsEditMode(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Greška pri ažuriranju zaposlenika');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      department_id: formData.department_id ? Number(formData.department_id) : null,
      manager_id: formData.manager_id ? Number(formData.manager_id) : null,
      mentor_id: formData.mentor_id ? Number(formData.mentor_id) : null,
      salary: formData.salary ? Number(formData.salary) : null,
      children_count: formData.children_count ? Number(formData.children_count) : 0,
    };
    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  const emp = employee?.data || employee;
  if (!emp) return null;

  const departments = departmentsData?.data || departmentsData || [];
  const users = usersData?.data || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-5xl w-full max-h-[95vh] overflow-y-auto my-4">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                {emp.name?.charAt(0) || '?'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {isEditMode ? 'Izmjeni zaposlenika' : emp.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{emp.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditMode && (
              <button
                onClick={() => setIsEditMode(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Izmjeni
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isEditMode ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Osnovni podaci */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Osnovni podaci</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Ime *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prezime *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Broj zaposlenog *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employee_number}
                    onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    JMBG
                  </label>
                  <input
                    type="text"
                    value={formData.personal_id_number}
                    onChange={(e) => setFormData({ ...formData, personal_id_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Datum rođenja
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pol
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Izaberi</option>
                    <option value="M">Muški</option>
                    <option value="F">Ženski</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bračni status
                  </label>
                  <select
                    value={formData.marital_status}
                    onChange={(e) => setFormData({ ...formData, marital_status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Izaberi</option>
                    <option value="S">Samac/Samica</option>
                    <option value="M">U braku</option>
                    <option value="D">Razveden/a</option>
                    <option value="W">Udovac/Udovica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Broj djece
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.children_count}
                    onChange={(e) => setFormData({ ...formData, children_count: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Kontakt podaci */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Kontakt podaci</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mobilni telefon
                  </label>
                  <input
                    type="tel"
                    value={formData.mobile_phone}
                    onChange={(e) => setFormData({ ...formData, mobile_phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Adresa
                  </label>
                  <input
                    type="text"
                    value={formData.private_address}
                    onChange={(e) => setFormData({ ...formData, private_address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Općina
                  </label>
                  <input
                    type="text"
                    value={formData.municipality_code}
                    onChange={(e) => setFormData({ ...formData, municipality_code: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Poslovni podaci */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Poslovni podaci</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Odjel
                  </label>
                  <select
                    value={formData.department_id}
                    onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Izaberi odjel</option>
                    {departments.map((dept: any) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pozicija *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Radno mjesto
                  </label>
                  <select
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Odaberi radno mjesto</option>
                    {workPositionsData && Array.isArray(workPositionsData) ? (
                      workPositionsData.map((position: any) => (
                        <option key={position.id} value={position.name}>{position.name}</option>
                      ))
                    ) : null}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prodavnica
                  </label>
                  <input
                    type="text"
                    value={formData.store}
                    onChange={(e) => setFormData({ ...formData, store: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tip zaposlenja *
                  </label>
                  <select
                    required
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status *
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="candidate">Kandidat</option>
                    <option value="hiring">U procesu zapošljavanja</option>
                    <option value="active">Aktivan</option>
                    <option value="on_hold">Na čekanju</option>
                    <option value="offboarding">Offboarding</option>
                    <option value="former">Bivši zaposlenik</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Datum početka *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Datum završetka probnog roka
                  </label>
                  <input
                    type="date"
                    value={formData.probation_end_date}
                    onChange={(e) => setFormData({ ...formData, probation_end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Datum prestanka radnog odnosa
                  </label>
                  <input
                    type="date"
                    value={formData.termination_date}
                    onChange={(e) => setFormData({ ...formData, termination_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Plata (KM)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Menadžer
                  </label>
                  <select
                    value={formData.manager_id}
                    onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Nema menadžera</option>
                    {users.map((user: any) => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mentor
                  </label>
                  <select
                    value={formData.mentor_id}
                    onChange={(e) => setFormData({ ...formData, mentor_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Nema mentora</option>
                    {users.map((user: any) => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Napomene */}
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

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setIsEditMode(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Otkaži
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {updateMutation.isPending ? 'Spremanje...' : 'Sačuvaj Izmjene'}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-6 space-y-6">
            {/* Osnovni podaci */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Osnovni podaci</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ime i prezime</p>
                  <p className="text-base font-medium text-gray-900 dark:text-white">{emp.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Email</p>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <p className="text-base text-gray-900 dark:text-white">{emp.email}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Broj zaposlenog</p>
                  <p className="text-base text-gray-900 dark:text-white">{emp.employee_id || emp.employee_number || '-'}</p>
                </div>
                {emp.personal_id_number && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">JMBG</p>
                    <p className="text-base text-gray-900 dark:text-white">{emp.personal_id_number}</p>
                  </div>
                )}
                {emp.date_of_birth && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Datum rođenja</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="text-base text-gray-900 dark:text-white">{new Date(emp.date_of_birth).toLocaleDateString('sr-RS')}</p>
                    </div>
                  </div>
                )}
                {emp.gender && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Pol</p>
                    <p className="text-base text-gray-900 dark:text-white">{emp.gender === 'M' ? 'Muški' : 'Ženski'}</p>
                  </div>
                )}
                {emp.marital_status && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Bračni status</p>
                    <p className="text-base text-gray-900 dark:text-white">
                      {emp.marital_status === 'S' ? 'Samac/Samica' : 
                       emp.marital_status === 'M' ? 'U braku' :
                       emp.marital_status === 'D' ? 'Razveden/a' :
                       emp.marital_status === 'W' ? 'Udovac/Udovica' : emp.marital_status}
                    </p>
                  </div>
                )}
                {emp.children_count !== undefined && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Broj djece</p>
                    <p className="text-base text-gray-900 dark:text-white">{emp.children_count}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Kontakt podaci */}
            {(emp.mobile_phone || emp.phone || emp.private_address || emp.address || emp.municipality_code) && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Kontakt podaci</h3>
                <div className="grid grid-cols-2 gap-6">
                  {(emp.mobile_phone || emp.phone) && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Telefon</p>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <p className="text-base text-gray-900 dark:text-white">{emp.mobile_phone || emp.phone}</p>
                      </div>
                    </div>
                  )}
                  {(emp.private_address || emp.address) && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Adresa</p>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <p className="text-base text-gray-900 dark:text-white">{emp.private_address || emp.address}</p>
                      </div>
                    </div>
                  )}
                  {emp.municipality_code && (
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Općina</p>
                      <p className="text-base text-gray-900 dark:text-white">{emp.municipality_code}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Poslovni podaci */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Poslovni podaci</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Odjel</p>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <p className="text-base text-gray-900 dark:text-white">{emp.department_name || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Pozicija</p>
                  <div className="flex items-center gap-2">
                    <BriefcaseIcon className="w-4 h-4 text-gray-400" />
                    <p className="text-base text-gray-900 dark:text-white">{emp.position}</p>
                  </div>
                </div>
                {emp.job_title && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Radno mjesto</p>
                    <p className="text-base text-gray-900 dark:text-white">{emp.job_title}</p>
                  </div>
                )}
                {emp.store && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Prodavnica</p>
                    <p className="text-base text-gray-900 dark:text-white">{emp.store}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tip zaposlenja</p>
                  <p className="text-base text-gray-900 dark:text-white">
                    {emp.employment_type === 'full-time' ? 'Puno vrijeme' : 
                     emp.employment_type === 'part-time' ? 'Djelimično' :
                     emp.employment_type === 'contract' ? 'Ugovor' :
                     emp.employment_type === 'intern' ? 'Praksa' : emp.employment_type}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</p>
                  <StatusBadge status={emp.status} type="employee" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Datum početka</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <p className="text-base text-gray-900 dark:text-white">{new Date(emp.hire_date).toLocaleDateString('sr-RS')}</p>
                  </div>
                </div>
                {emp.probation_end_date && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Kraj probnog roka</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="text-base text-gray-900 dark:text-white">{new Date(emp.probation_end_date).toLocaleDateString('sr-RS')}</p>
                    </div>
                  </div>
                )}
                {emp.termination_date && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Datum prestanka</p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <p className="text-base text-gray-900 dark:text-white">{new Date(emp.termination_date).toLocaleDateString('sr-RS')}</p>
                    </div>
                  </div>
                )}
                {emp.salary && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Plata</p>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <p className="text-base text-gray-900 dark:text-white">{Number(emp.salary).toLocaleString('sr-RS')} KM</p>
                    </div>
                  </div>
                )}
                {emp.manager_name && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Menadžer</p>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <p className="text-base text-gray-900 dark:text-white">{emp.manager_name}</p>
                    </div>
                  </div>
                )}
                {emp.mentor_name && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Mentor</p>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <p className="text-base text-gray-900 dark:text-white">{emp.mentor_name}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Napomene */}
            {emp.notes && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Napomene</h3>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{emp.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionsList() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <ClipboardCheck className="w-6 h-6 text-indigo-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Odluke i rješenja</h3>
      </div>
      <p className="text-gray-500 dark:text-gray-400 mb-4">Administrativne odluke i rješenja za zaposlenike</p>
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <span className="text-sm text-gray-700 dark:text-gray-300">Rješenja o zapošljavanju</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <span className="text-sm text-gray-700 dark:text-gray-300">Rješenja o promjeni pozicije</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <span className="text-sm text-gray-700 dark:text-gray-300">Rješenja o promjeni plaće</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <span className="text-sm text-gray-700 dark:text-gray-300">Rješenja o neplaćenom odsustvu</span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  );
}


function LeavesList() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Odsustva</h3>
        </div>
        <button className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
          Zatraži odsustvo
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">0</p>
          <p className="text-sm text-yellow-600 dark:text-yellow-500">Na čekanju</p>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">0</p>
          <p className="text-sm text-green-600 dark:text-green-500">Odobreno</p>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">0</p>
          <p className="text-sm text-red-600 dark:text-red-500">Odbijeno</p>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">0</p>
          <p className="text-sm text-blue-600 dark:text-blue-500">Danas na odsustvu</p>
        </div>
      </div>
      <div className="text-center py-8">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Nema zahtjeva za odsustvo</p>
      </div>
    </div>
  );
}

function AttendanceList() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Clock className="w-6 h-6 text-orange-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Evidencija radnog vremena</h3>
      </div>
      <p className="text-gray-500 dark:text-gray-400 mb-4">Praćenje dolazaka, odlazaka i radnih sati</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Prijava dolaska/odlaska</h4>
          <div className="flex gap-2">
            <button className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
              Dolazak
            </button>
            <button className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
              Odlazak
            </button>
          </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Danas</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">Nema zabilježenih dolazaka</p>
        </div>
      </div>
    </div>
  );
}

function EvaluationsList() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Award className="w-6 h-6 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Evaluacije i GO/NO-GO odluke</h3>
        </div>
        <button className="px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700">
          Nova evaluacija
        </button>
      </div>
      <p className="text-gray-500 dark:text-gray-400 mb-4">Probni rad, godišnje evaluacije, GO/NO-GO odluke</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Probni rad</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Evaluacija nakon 3 ili 6 mjeseci</p>
        </div>
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">Godišnja evaluacija</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Redovna godišnja ocjena rada</p>
        </div>
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">GO / NO-GO</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Odluka o nastavku radnog odnosa</p>
        </div>
      </div>
    </div>
  );
}

function OffboardingList() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <UserMinus className="w-6 h-6 text-red-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Offboarding procesi</h3>
      </div>
      <p className="text-gray-500 dark:text-gray-400 mb-4">Upravljanje procesima odlaska zaposlenika</p>
      <div className="space-y-3">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">• Razlozi odlaska (otkaz, sporazumni raskid, istek ugovora)</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">• Checklista offboarding zadataka</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">• Exit intervju i završna dokumentacija</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-300">• Arhiviranje podataka zaposlenika</p>
        </div>
      </div>
    </div>
  );
}

function ATSList() {
  const [activePhase, setActivePhase] = useState<'overview' | 'positions' | 'candidates' | 'interviews' | 'offers'>('overview');

  if (activePhase === 'positions') {
    return (
      <div>
        <button
          onClick={() => setActivePhase('overview')}
          className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Nazad na pregled
        </button>
        <ATSPositions />
      </div>
    );
  }

  if (activePhase === 'candidates') {
    return (
      <div>
        <button
          onClick={() => setActivePhase('overview')}
          className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Nazad na pregled
        </button>
        <ATSCandidates />
      </div>
    );
  }

  if (activePhase === 'interviews') {
    return (
      <div>
        <button
          onClick={() => setActivePhase('overview')}
          className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Nazad na pregled
        </button>
        <ATSInterviews />
      </div>
    );
  }

  if (activePhase === 'offers') {
    return (
      <div>
        <button
          onClick={() => setActivePhase('overview')}
          className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          Nazad na pregled
        </button>
        <ATSOffers />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Briefcase className="w-6 h-6 text-indigo-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">ATS – Applicant Tracking System</h3>
      </div>
      <p className="text-gray-500 dark:text-gray-400 mb-4">Upravljanje procesom zapošljavanja i kandidatima</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button 
          onClick={() => setActivePhase('positions')}
          className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-gray-900 dark:text-white">Otvorene pozicije</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Aktuelni oglasi za posao i pozicije</p>
        </button>
        <button 
          onClick={() => setActivePhase('candidates')}
          className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-green-500" />
            <span className="font-medium text-gray-900 dark:text-white">Kandidati</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Baza kandidata i prijava</p>
        </button>
        <button 
          onClick={() => setActivePhase('interviews')}
          className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-2">
            <ClipboardCheck className="w-5 h-5 text-purple-500" />
            <span className="font-medium text-gray-900 dark:text-white">Intervjui</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Planiranje i praćenje intervjua</p>
        </button>
        <button 
          onClick={() => setActivePhase('offers')}
          className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-5 h-5 text-yellow-500" />
            <span className="font-medium text-gray-900 dark:text-white">Ponude</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Slanje i upravljanje ponudama</p>
        </button>
      </div>
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Applicant Tracking System (ATS) omogućava upravljanje cijelim procesom zapošljavanja - od otvaranja pozicije, 
          prijema prijava, planiranja intervjua, do slanja ponuda i prihvatanja kandidata.
        </p>
      </div>
    </div>
  );
}

function EducationList() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <GraduationCap className="w-6 h-6 text-purple-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edukacije</h3>
      </div>
      <p className="text-gray-500 dark:text-gray-400 mb-4">Upravljanje obrazovanjem, treningom i razvojem zaposlenika</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="w-5 h-5 text-purple-500" />
            <span className="font-medium text-gray-900 dark:text-white">Kursevi i trening programi</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pregled dostupnih kurseva i trening programa</p>
        </button>
        <button className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-gray-900 dark:text-white">Prijave na edukacije</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Pregled prijava zaposlenika na edukacije</p>
        </button>
        <button className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-5 h-5 text-yellow-500" />
            <span className="font-medium text-gray-900 dark:text-white">Certifikati</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Izdati certifikati i sertifikati</p>
        </button>
        <button className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="font-medium text-gray-900 dark:text-white">Plan razvoja</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Individualni planovi razvoja zaposlenika</p>
        </button>
      </div>
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Modul za upravljanje obrazovanjem i razvojem zaposlenika. Omogućava praćenje kurseva, treninga, sertifikata i individualnih planova razvoja.
        </p>
      </div>
    </div>
  );
}

function TalentManagementList() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Star className="w-6 h-6 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Talent Management</h3>
      </div>
      <p className="text-gray-500 dark:text-gray-400 mb-4">Upravljanje talentima, nasledstvom i karijernim putanjama</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div className="flex items-center gap-3 mb-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <span className="font-medium text-gray-900 dark:text-white">Talent Pool</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Baza talenata i identifikacija ključnih zaposlenika</p>
        </button>
        <button className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-gray-900 dark:text-white">Karijerne putanje</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Planiranje i praćenje karijernih putanja</p>
        </button>
        <button className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-purple-500" />
            <span className="font-medium text-gray-900 dark:text-white">Nasleđivanje pozicija</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Planiranje nasleđivanja ključnih pozicija</p>
        </button>
        <button className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5 text-green-500" />
            <span className="font-medium text-gray-900 dark:text-white">9-Box matrica</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Matrica performansi i potencijala</p>
        </button>
      </div>
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Modul za upravljanje talentima omogućava identifikaciju, razvoj i zadržavanje ključnih talenata u organizaciji.
        </p>
      </div>
    </div>
  );
}

function HRReports() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-4">
        <BarChart3 className="w-6 h-6 text-cyan-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">HR Izvještaji</h3>
      </div>
      <p className="text-gray-500 dark:text-gray-400 mb-4">Analitika i izvještaji ljudskih resursa</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-gray-900 dark:text-white">Headcount izvještaj</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Broj zaposlenika po odjelima i statusima</p>
        </button>
        <button className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            <span className="font-medium text-gray-900 dark:text-white">Turnover izvještaj</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Fluktuacija zaposlenika i razlozi odlaska</p>
        </button>
        <button className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-green-500" />
            <span className="font-medium text-gray-900 dark:text-white">Izvještaj odsustva</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Korištenje godišnjeg i bolovanja</p>
        </button>
        <button className="p-4 text-left border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-orange-500" />
            <span className="font-medium text-gray-900 dark:text-white">Izvještaj radnog vremena</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Radni sati i prekovremeni rad</p>
        </button>
      </div>
    </div>
  );
}

// Main Component
interface HRMOverviewProps {
  initialTab?: TabKey;
  hideNavigation?: boolean;
}

export default function HRMOverview({
  initialTab = 'dashboard',
  hideNavigation = false,
}: HRMOverviewProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <HRDashboard />;
      case 'employees': return <EmployeesList />;
      case 'departments': return <OrganizationalStructure />;
      case 'ats': return <ATSList />;
      case 'onboarding': return <Onboarding />;
      case 'contracts': return <EmploymentContracts />;
      case 'decisions': return <DecisionsList />;
      case 'attendance': return <AttendanceList />;
      case 'leaves': return <LeavesList />;
      case 'education': return <EducationList />;
      case 'talent': return <TalentManagementList />;
      case 'evaluations': return <EvaluationsList />;
      case 'offboarding': return <OffboardingList />;
      case 'reports': return <HRReports />;
      default: return <HRDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      {!hideNavigation && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('hrm.title')}
              </h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Upravljanje ljudskim resursima i životnim ciklusom zaposlenika
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/50 sm:p-4">
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 sm:gap-2 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-7">
              {navItems.map((item) => {
                const isActive = activeTab === item.key;
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveTab(item.key)}
                    className={`
                      flex min-h-[55px] w-full flex-col items-center justify-center rounded-lg p-1 transition-all sm:min-h-[58px] sm:p-1.5
                      ${
                        isActive
                          ? 'scale-[1.01] bg-blue-600 text-white shadow-md'
                          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      }
                    `}
                    title={item.description}
                  >
                    <Icon
                      className={`mb-1 h-[18px] w-[18px] flex-shrink-0 sm:h-5 sm:w-5 ${
                        isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    />
                    <span className="line-clamp-2 break-words px-0.5 text-center text-[10px] font-medium leading-tight sm:text-xs">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="min-h-[400px]">{renderContent()}</div>
    </div>
  );
}

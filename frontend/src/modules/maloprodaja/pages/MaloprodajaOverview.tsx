import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../../../store/authStore';

import { useLocation } from 'react-router-dom';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { 

  BarChart3,

  FileText,

  Calendar,

  ClipboardCheck,

  GraduationCap,

  TrendingUp,

  Award,

  Plus,

  Edit,

  Trash2,

  X,

  Download,

  Search,

  Filter,

  CheckCircle2,

  Clock,

  AlertCircle,

  Store,

  User,

  Users,

  Calendar as CalendarIcon,

  List,

  Grid,

  ChevronLeft,

  ChevronRight,

  Upload,

  Check,

  X as XIcon,

  Save,

  Lock,

  PenTool

} from 'lucide-react';

import { toast } from 'react-hot-toast';
import SignaturePad from '@/components/SignaturePad';

import { 

  getRetailReports,

  getControlPlans,

  getControlPlan,

  createControlPlan, 

  updateControlPlan, 

  deleteControlPlan,

  getPlanItems,

  createPlanItem,

  updatePlanItem,

  deletePlanItem,

  type ControlPlan,

  type ControlPlanItem,

  type ControlPlanType,

  type ControlPlanStatus,

  type RetailReportItem

} from '../../../services/retailControlPlansService';

import {

  getEducationPlans,

  getEducationPlan,

  createEducationPlan,

  updateEducationPlan,

  deleteEducationPlan,

  getEmployeesByStore,

  type EducationPlan,

  type EducationType,

  type EducationPlanStatus

} from '../../../services/retailEducationPlansService';

import { getStores, getEmployees, getDepartments } from '../../../services/hrmService';
import * as hrmService from '../../../services/hrmService';
import * as salesService from '../../../services/salesService';

import { apiService } from '../../../services/api';

import {
  SalesResultsUploadModal,
  SalesDashboardTab,
  SalesPlansUploadModal,
} from '../components/SalesComponents';

import ManagerEvaluationInfo from '../components/ManagerEvaluationInfo';
import ManagerBenefits from '../components/ManagerBenefits';
import SalespersonEvaluationInfo from '../components/SalespersonEvaluationInfo';
import SalespersonBenefits from '../components/SalespersonBenefits';

import {

  getControlRecords,

  getControlRecord,

  createControlRecord,

  updateControlRecord,

  deleteControlRecord,

  uploadAttachment,

  deleteAttachment,

  signControlRecord,

  finalizeControlRecord,

  lockControlRecord,
  downloadControlRecordPdf,
  type ControlRecord,

  type ControlParticipant,

  type PresentPerson,

  type InventoryItem,

  type ControlObservation,

  type ControlMeasure,

  type Attachment,

  type Signature,

} from '../../../services/retailControlRecordsService';

import {

  ControlRecordHeaderTab,

  ControlRecordInventoryTab,

  ControlRecordInspectionTab,

  ControlRecordAttachmentsTab,

} from '../components/ControlRecordTabs';


// Tab components - inline implementations

type TabKey = 'overview' | 'reports' | 'control-plans' | 'education-plans' | 'control-records' | 'evaluations' | 'results';


interface NavItem {

  key: TabKey;

  label: string;

  icon: React.ComponentType<{ className?: string }>;

  description: string;

}


const navItems: NavItem[] = [

  { key: 'overview', label: 'Kategorije i benefiti', icon: BarChart3, description: 'Statistike i pregled' },

  { key: 'reports', label: 'Izvještaji', icon: FileText, description: 'Analitika i izvještaji' },

  { key: 'control-plans', label: 'Plan kontrola i Obilazaka', icon: Calendar, description: 'Planovi kontrola i obilazaka' },

  { key: 'education-plans', label: 'Plan Edukacija', icon: GraduationCap, description: 'Planovi edukacija' },

  { key: 'control-records', label: 'Evidencija Kontrola i obilazaka', icon: ClipboardCheck, description: 'Evidencija izvršenih kontrola' },

  { key: 'evaluations', label: 'Evaluacije', icon: TrendingUp, description: 'Evaluacije zaposlenika' },

  { key: 'results', label: 'Ostvareni Rezultati', icon: Award, description: 'Ostvareni rezultati i postignuća' },

];


export default function MaloprodajaOverview() {

  const location = useLocation();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');


  useEffect(() => {

    const path = location.pathname;

    if (path === '/maloprodaja' || path === '/maloprodaja/') {

      setActiveTab('overview');

    } else if (path.includes('/maloprodaja/reports')) {

      setActiveTab('reports');

    } else if (path.includes('/maloprodaja/control-plans')) {

      setActiveTab('control-plans');

    } else if (path.includes('/maloprodaja/education-plans')) {

      setActiveTab('education-plans');

    } else if (path.includes('/maloprodaja/control-records')) {

      setActiveTab('control-records');

    } else if (path.includes('/maloprodaja/evaluations')) {

      setActiveTab('evaluations');

    } else if (path.includes('/maloprodaja/results')) {

      setActiveTab('results');

    }

  }, [location]);


  const renderContent = () => {

    switch (activeTab) {

      case 'overview':

        return <OverviewTab />;

      case 'reports':

        return <ReportsTab />;

      case 'control-plans':

        return <ControlPlansTab />;

      case 'education-plans':

        return <EducationPlansTab />;

      case 'control-records':

        return <ControlRecordsTab />;

      case 'evaluations':

        return <EvaluationsTab />;

      case 'results':

        return <ResultsTab />;

      default:

        return <OverviewTab />;

    }

  };


  return (

    <div className="h-full w-full max-w-full flex flex-col overflow-x-hidden">

      {/* Header - Mobile Responsive */}

      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-1.5 sm:px-2 lg:px-6 py-1 sm:py-1.5 lg:py-4">

        <div className="min-w-0">

          <h1 className="text-sm sm:text-base lg:text-2xl font-bold text-gray-900 dark:text-white break-words">Maloprodaja</h1>

          <p className="text-[8px] sm:text-[9px] lg:text-sm text-gray-500 dark:text-gray-400 mt-0.5 break-words">

            Upravljanje maloprodajom, kontrolama, edukacijama i evaluacijama

          </p>

        </div>

      </div>


      {/* Navigation Menu - Mobile Responsive */}

      <div className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 overflow-x-hidden">

        <div className="px-1 sm:px-1.5 lg:px-8 py-1 sm:py-1.5 lg:py-4">

          {/* Mobile: 3 columns grid layout (3+3+1 rows) */}
          <div className="lg:hidden">
            <div className="grid grid-cols-3 gap-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.key;
                
                // Short labels for mobile
                const shortLabels: Record<string, string> = {
                  'Kategorije i benefiti': 'Kategorije',
                  'Izvještaji': 'Izvještaji',
                  'Plan kontrola i Obilazaka': 'Kontrole',
                  'Plan Edukacija': 'Edukacije',
                  'Evidencija Kontrola i obilazaka': 'Evidencija',
                  'Evaluacije': 'Evaluacije',
                  'Ostvareni Rezultati': 'Rezultati',
                };

                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={`
                      flex flex-col items-center justify-center gap-0.5 p-0.5 rounded-lg border-2 transition-all min-h-[50px]
                      ${isActive
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 shadow-md'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                      }
                    `}
                    title={item.description}
                  >
                    <Icon
                      className={`
                        w-2.5 h-2.5 transition-colors flex-shrink-0
                        ${isActive
                          ? 'text-teal-600 dark:text-teal-400'
                          : 'text-gray-500 dark:text-gray-400'
                        }
                      `}
                    />
                    <span
                      className={`
                        text-[6px] font-medium text-center leading-tight px-0.5
                        ${isActive
                          ? 'text-teal-700 dark:text-teal-300'
                          : 'text-gray-700 dark:text-gray-300'
                        }
                      `}
                    >
                      {shortLabels[item.label] || item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop: Grid layout */}
          <div className="hidden lg:grid grid-cols-7 gap-2 sm:gap-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`
                    flex flex-col items-center gap-1.5 p-1.5 sm:p-2 rounded-lg border-2 transition-all
                    ${isActive
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 shadow-md scale-105'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                    }
                  `}
                  title={item.description}
                >
                  <Icon
                    className={`
                      w-5 h-5 sm:w-6 sm:h-6 transition-colors
                      ${isActive
                        ? 'text-teal-600 dark:text-teal-400'
                        : 'text-gray-500 dark:text-gray-400'
                      }
                    `}
                  />
                  <span
                    className={`
                      text-[10px] sm:text-xs font-medium text-center break-words leading-tight
                      ${isActive
                        ? 'text-teal-700 dark:text-teal-300'
                        : 'text-gray-700 dark:text-gray-300'
                      }
                    `}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

        </div>

      </div>


      {/* Content - Mobile Responsive */}

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 sm:p-1.5 lg:p-6 w-full max-w-full">

        <div className="w-full max-w-full">
          {renderContent()}
        </div>

      </div>

    </div>

  );

}


// Overview Tab - This will be implemented in next part due to file size

function OverviewTab() {
  return (
    <div className="space-y-1.5 sm:space-y-2 lg:space-y-6">
      <div>
        <h2 className="text-xs sm:text-sm lg:text-xl font-semibold text-gray-900 dark:text-white mb-1 sm:mb-1.5 lg:mb-4">Kategorije i benefiti</h2>
      </div>

      {/* Manager Evaluation Info Section */}
      <ManagerEvaluationInfo />

      {/* Manager Benefits Section */}
      <ManagerBenefits />

      {/* Salesperson Evaluation Info Section */}
      <SalespersonEvaluationInfo />

      {/* Salesperson Benefits Section */}
      <SalespersonBenefits />
    </div>
  );
}

// Reports Tab
function ReportsTab() {
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reportType, setReportType] = useState<'all' | 'plans' | 'activities' | 'educations'>('all');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  });

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['retail-reports', startDate, endDate, reportType],
    queryFn: () => getRetailReports({ start_date: startDate, end_date: endDate, type: reportType }),
  });

  const reports = reportsData?.reports || [];

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Date[] = [];

    // Add previous month's days
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonth.getDate() - i));
    }

    // Add current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    // Add next month's days to fill the grid (42 cells total)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const getReportsForDate = (date: Date): RetailReportItem[] => {
    const dateStr = date.toISOString().split('T')[0];
    return reports.filter(report => {
      if (report.date === dateStr) return true;
      if (report.end_date && dateStr >= report.date && dateStr <= report.end_date) return true;
      return false;
    });
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      inventory_required: 'Obavezna inventura',
      inventory_extraordinary: 'Vanredna inventura',
      store_visit: 'Obilazak prodavnice',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      overdue: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return badges[status] || badges.draft;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);

    // Update date filters
    const firstDay = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
    const lastDay = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  };

  const weekDays = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];
  const daysInView = getDaysInMonth(currentDate);
  const today = new Date();

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-xs sm:text-sm lg:text-xl font-semibold text-gray-900 dark:text-white mb-1 sm:mb-1.5 lg:mb-4">Izvještaji</h2>
          <p className="text-[8px] sm:text-[9px] lg:text-sm text-gray-500 dark:text-gray-400">
            Analitika i izvještaji za maloprodaju
          </p>
        </div>
      </div>

      {/* Filters and View Toggle - Mobile Responsive */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-2 sm:p-3 lg:p-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 lg:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5 lg:gap-2 w-full sm:w-auto">
            <label className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Tip:</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as 'all' | 'plans' | 'activities' | 'educations')}
              className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            >
              <option value="all">Sve</option>
              <option value="plans">Planovi</option>
              <option value="activities">Aktivnosti</option>
              <option value="educations">Edukacije</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <label className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Od:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <label className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Do:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            />
          </div>

          <div className="flex-1 hidden sm:block"></div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start">
            <button
              onClick={() => setViewMode('table')}
              className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs lg:text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <List className="w-4 h-4 inline mr-1" />
              Tabela
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs lg:text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-1" />
              Kalendar
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="ml-3 text-gray-500 dark:text-gray-400">Učitavanje izvještaja...</p>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View - Mobile Responsive */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto -mx-2 sm:-mx-3 lg:mx-0 px-2 sm:px-3 lg:px-0">
            <table className="w-full min-w-[280px] sm:min-w-[400px] lg:min-w-[800px]">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-0.5 sm:px-1 lg:px-6 py-0.5 sm:py-1 lg:py-3 text-left text-[7px] sm:text-[8px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Datum</th>
                  <th className="px-0.5 sm:px-1 lg:px-6 py-0.5 sm:py-1 lg:py-3 text-left text-[7px] sm:text-[8px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tip</th>
                  <th className="px-0.5 sm:px-1 lg:px-6 py-0.5 sm:py-1 lg:py-3 text-left text-[7px] sm:text-[8px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Naziv</th>
                  <th className="px-0.5 sm:px-1 lg:px-6 py-0.5 sm:py-1 lg:py-3 text-left text-[7px] sm:text-[8px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">Opis</th>
                  <th className="px-0.5 sm:px-1 lg:px-6 py-0.5 sm:py-1 lg:py-3 text-left text-[7px] sm:text-[8px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-0.5 sm:px-1 lg:px-6 py-0.5 sm:py-1 lg:py-3 text-left text-[7px] sm:text-[8px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Dodijeljeno</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-0.5 sm:px-1 lg:px-6 py-1.5 sm:py-2 lg:py-4 text-center text-[7px] sm:text-[8px] lg:text-sm text-gray-500 dark:text-gray-400">
                      Nema podataka za prikaz
                    </td>
                  </tr>
                ) : (
                  reports.map((report) => (
                    <tr key={`${report.type}-${report.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-0.5 sm:px-1 lg:px-6 py-1 sm:py-1.5 lg:py-4 whitespace-nowrap text-[7px] sm:text-[8px] lg:text-sm text-gray-900 dark:text-white">
                        {report.date ? new Date(report.date).toLocaleDateString('hr-HR') : '-'}
                      </td>
                      <td className="px-0.5 sm:px-1 lg:px-6 py-1 sm:py-1.5 lg:py-4 whitespace-nowrap">
                        <span className={`px-0.5 rounded-full text-[6px] sm:text-[7px] lg:text-xs font-medium ${
                          report.type === 'plan' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : report.type === 'activity'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {report.type === 'plan' ? 'Plan' : report.type === 'activity' ? 'Aktivnost' : 'Edukacija'}
                        </span>
                      </td>
                      <td className="px-0.5 sm:px-1 lg:px-6 py-1 sm:py-1.5 lg:py-4 text-[7px] sm:text-[8px] lg:text-sm text-gray-900 dark:text-white max-w-[70px] sm:max-w-[100px] lg:max-w-none truncate">
                        {report.title}
                      </td>
                      <td className="px-0.5 sm:px-1 lg:px-6 py-1 sm:py-1.5 lg:py-4 text-[7px] sm:text-[8px] lg:text-sm text-gray-600 dark:text-gray-400 hidden sm:table-cell">
                        {report.description || '-'}
                        {report.type === 'education' && report.employee_name && (
                          <div className="text-[6px] sm:text-[7px] lg:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Zaposleni: {report.employee_name}
                          </div>
                        )}
                      </td>
                      <td className="px-0.5 sm:px-1 lg:px-6 py-1 sm:py-1.5 lg:py-4 whitespace-nowrap">
                        <span className={`px-0.5 rounded-full text-[6px] sm:text-[7px] lg:text-xs font-medium ${getStatusBadge(report.status)}`}>
                          {report.status === 'draft' ? 'Nacrt' : 
                           report.status === 'active' ? 'Aktivan' :
                           report.status === 'completed' ? 'Završen' :
                           report.status === 'cancelled' ? 'Otkazan' :
                           report.status === 'planned' ? 'Planirano' :
                           report.status === 'pending' ? 'Na čekanju' :
                           report.status === 'in_progress' ? 'U toku' :
                           report.status === 'overdue' ? 'Prekoračeno' : report.status}
                        </span>
                      </td>
                      <td className="px-0.5 sm:px-1 lg:px-6 py-1 sm:py-1.5 lg:py-4 whitespace-nowrap text-[7px] sm:text-[8px] lg:text-sm text-gray-900 dark:text-white hidden md:table-cell">
                        {report.type === 'education' 
                          ? (report.employee_name || '-')
                          : (report.assigned_to || report.regional_manager || '-')
                        }
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Calendar View - Mobile Responsive */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-2 sm:p-3 lg:p-6">
          {/* Calendar Header - Mobile Responsive */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white text-center flex-1 px-2">
              {currentDate.toLocaleDateString('hr-HR', { month: 'long', year: 'numeric' })}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Calendar Grid - Mobile Responsive */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Week day headers */}
            {weekDays.map((day) => (
              <div
                key={day}
                className="p-1 sm:p-2 text-center text-[10px] sm:text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700"
              >
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {daysInView.map((day, index) => {
              const dayReports = getReportsForDate(day);
              const isToday = day.toDateString() === today.toDateString();
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();

              return (
                <div
                  key={index}
                  className={`min-h-[60px] sm:min-h-[100px] p-1 sm:p-2 border border-gray-200 dark:border-gray-700 rounded-lg ${
                    isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400' : ''
                  } ${!isCurrentMonth ? 'opacity-50' : ''}`}
                >
                  <div className={`text-[10px] sm:text-sm font-medium mb-0.5 sm:mb-1 ${
                    isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayReports.slice(0, 3).map((report) => (
                      <div
                        key={`${report.type}-${report.id}`}
                        className={`text-xs p-1 rounded truncate ${
                          report.type === 'plan'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                            : report.type === 'activity'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                        }`}
                        title={report.title}
                      >
                        {report.title}
                      </div>
                    ))}
                    {dayReports.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        +{dayReports.length - 3} više
                      </div>
                    )}
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
// Control Plans Tab - Implementation will be added in next steps due to file size
function ControlPlansTab() {
  const queryClient = useQueryClient();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<ControlPlan | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'calendar'>('grid');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState({
    type: 'all' as ControlPlanType | 'all',
    status: 'all' as ControlPlanStatus | 'all',
    year: new Date().getFullYear(),
    search: '',
  });

  const { data: plansData, isLoading } = useQuery({
    queryKey: ['retail-control-plans', filters],
    queryFn: () => getControlPlans(filters),
  });

  const plans = plansData?.data || [];

  const { data: stores } = useQuery({
    queryKey: ['hrm-stores'],
    queryFn: () => getStores({ is_active: true }),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiService.get<any[]>('/admin/users');
      return response.data || [];
    },
  });

  const { data: planItemsResponse } = useQuery({
    queryKey: ['retail-control-plan-items', selectedPlanId],
    queryFn: async () => {
      if (!selectedPlanId) return [];
      const response = await getPlanItems(selectedPlanId);
      return Array.isArray(response) ? response : (response?.data || []);
    },
    enabled: !!selectedPlanId,
  });

  // Load all plan items for calendar view
  const { data: allPlanItemsResponse } = useQuery({
    queryKey: ['retail-control-plan-items-all', plans.map(p => p.id)],
    queryFn: async () => {
      if (plans.length === 0) return [];
      const allItems: ControlPlanItem[] = [];
      for (const plan of plans) {
        try {
          const response = await getPlanItems(plan.id);
          const items = Array.isArray(response) ? response : (response?.data || []);
          allItems.push(...items);
        } catch (error) {
          console.error(`Error loading items for plan ${plan.id}:`, error);
        }
      }
      return allItems;
    },
    enabled: viewMode === 'calendar' && plans.length > 0,
  });

  const planItems = Array.isArray(planItemsResponse) ? planItemsResponse : [];
  const allPlanItems = Array.isArray(allPlanItemsResponse) ? allPlanItemsResponse : [];

  const createPlanMutation = useMutation({
    mutationFn: createControlPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-control-plans'] });
      setShowPlanModal(false);
      toast.success('Plan je uspješno kreiran');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Greška pri kreiranju plana');
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ControlPlan> }) => updateControlPlan(id, data),
    onSuccess: async (updatedPlan) => {
      queryClient.invalidateQueries({ queryKey: ['retail-control-plans'] });
      queryClient.invalidateQueries({ queryKey: ['retail-control-plan-items'] });
      queryClient.invalidateQueries({ queryKey: ['retail-control-plan-items', selectedPlanId] });
      queryClient.invalidateQueries({ queryKey: ['retail-control-plan', selectedPlanId] });
      setShowPlanModal(false);
      if (selectedPlan && selectedPlanId) {
        try {
          const refreshedPlan = await getControlPlan(selectedPlanId);
          setSelectedPlan(refreshedPlan);
        } catch (error) {
          // Plan refresh will happen through query invalidation
        }
      }
      toast.success('Plan je uspješno ažuriran');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Greška pri ažuriranju plana');
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: deleteControlPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-control-plans'] });
      toast.success('Plan je uspješno obrisan');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Greška pri brisanju plana');
    },
  });

  const createItemMutation = useMutation({
    mutationFn: ({ planId, data }: { planId: number; data: Partial<ControlPlanItem> }) => createPlanItem(planId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['retail-control-plan-items'] });
      await queryClient.invalidateQueries({ queryKey: ['retail-control-plans'] });
      if (selectedPlanId) {
        await queryClient.refetchQueries({ queryKey: ['retail-control-plan-items', selectedPlanId] });
      }
      setShowItemModal(false);
      toast.success('Aktivnost je uspješno dodata');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Greška pri dodavanju aktivnosti');
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ planId, itemId, data }: { planId: number; itemId: number; data: Partial<ControlPlanItem> }) => 
      updatePlanItem(planId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-control-plan-items'] });
      queryClient.invalidateQueries({ queryKey: ['retail-control-plans'] });
      toast.success('Aktivnost je uspješno ažurirana');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Greška pri ažuriranju aktivnosti');
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: ({ planId, itemId }: { planId: number; itemId: number }) => deletePlanItem(planId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-control-plan-items'] });
      queryClient.invalidateQueries({ queryKey: ['retail-control-plans'] });
      toast.success('Aktivnost je uspješno obrisana');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Greška pri brisanju aktivnosti');
    },
  });

  const handleCreatePlan = () => {
    setSelectedPlan(null);
    setShowPlanModal(true);
  };

  const handleEditPlan = (plan: ControlPlan) => {
    setShowPlanModal(true);
  };

  const handleViewPlan = (plan: ControlPlan) => {
    setSelectedPlan(plan);
    setSelectedPlanId(plan.id);
  };

  const handleClosePlan = () => {
    setSelectedPlan(null);
    setSelectedPlanId(null);
  };

  const getTypeLabel = (type: ControlPlanType) => {
    const labels = {
      inventory_required: 'Obavezna inventura',
      inventory_extraordinary: 'Vanredna inventura',
      store_visit: 'Obilazak prodavnice',
    };
    return labels[type];
  };

  const getStatusBadge = (status: ControlPlanStatus) => {
    const badges = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return badges[status];
  };

  const getItemStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      overdue: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    };
    return badges[status] || badges.pending;
  };

  if (selectedPlan) {
    return (
      <div className="space-y-3 sm:space-y-4 lg:space-y-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex-1 min-w-0">
            <button
              onClick={handleClosePlan}
              className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-2 sm:mb-4 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Nazad na listu
            </button>
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white break-words">{selectedPlan.title}</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              {getTypeLabel(selectedPlan.type)} • {selectedPlan.year}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowPlanModal(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Uredi plan
            </button>
            <button
              onClick={() => {
                setShowItemModal(true);
              }}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Dodaj aktivnost
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 lg:p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(selectedPlan.status)}`}>
                {selectedPlan.status === 'draft' ? 'Nacrt' : 
                 selectedPlan.status === 'active' ? 'Aktivan' :
                 selectedPlan.status === 'completed' ? 'Završen' : 'Otkazan'}
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{selectedPlan.description}</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <User className="w-4 h-4" />
                <span>Regionalni menadžer: {selectedPlan.regional_manager_name || 'Nije dodijeljen'}</span>
              </div>
              {selectedPlan.deadline && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <CalendarIcon className="w-4 h-4" />
                  <span>Rok: {new Date(selectedPlan.deadline).toLocaleDateString('hr-HR')}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Store className="w-4 h-4" />
                <span>Prodavnice: {selectedPlan.completed_stores}/{selectedPlan.total_stores}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-2 sm:p-3 lg:p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Aktivnosti</h3>
          </div>
          <div className="overflow-x-auto -mx-2 sm:-mx-3 lg:mx-0 px-2 sm:px-3 lg:px-0">
            <table className="w-full min-w-[250px] sm:min-w-[350px] lg:min-w-[600px]">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-0.5 sm:px-1 lg:px-6 py-0.5 sm:py-1 lg:py-3 text-left text-[7px] sm:text-[8px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prodavnica</th>
                  <th className="px-0.5 sm:px-1 lg:px-6 py-0.5 sm:py-1 lg:py-3 text-left text-[7px] sm:text-[8px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Planirani datum</th>
                  <th className="px-0.5 sm:px-1 lg:px-6 py-0.5 sm:py-1 lg:py-3 text-left text-[7px] sm:text-[8px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-0.5 sm:px-1 lg:px-6 py-0.5 sm:py-1 lg:py-3 text-left text-[7px] sm:text-[8px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">Dodijeljeno</th>
                  <th className="px-0.5 sm:px-1 lg:px-6 py-0.5 sm:py-1 lg:py-3 text-left text-[7px] sm:text-[8px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {planItems && planItems.length > 0 ? (
                  planItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap">
                        <div>
                          <div className="text-[8px] sm:text-[9px] lg:text-sm font-medium text-gray-900 dark:text-white">{item.store_name}</div>
                          {item.store_code && (
                            <div className="text-[7px] sm:text-[8px] lg:text-sm text-gray-500 dark:text-gray-400">{item.store_code}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap text-[8px] sm:text-[9px] lg:text-sm text-gray-900 dark:text-white">
                        {new Date(item.planned_date).toLocaleDateString('hr-HR')}
                      </td>
                      <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap">
                        <span className={`px-0.5 sm:px-1 lg:px-2 py-0.5 rounded-full text-[7px] sm:text-[8px] lg:text-xs font-medium ${getItemStatusBadge(item.status)}`}>
                          {item.status === 'pending' ? 'Na čekanju' :
                           item.status === 'in_progress' ? 'U toku' :
                           item.status === 'completed' ? 'Završeno' :
                           item.status === 'cancelled' ? 'Otkazano' : 'Prekoračeno'}
                        </span>
                      </td>
                      <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap text-[8px] sm:text-[9px] lg:text-sm text-gray-900 dark:text-white hidden sm:table-cell">
                        {item.assigned_to_name || 'Nije dodijeljeno'}
                      </td>
                      <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap text-[8px] sm:text-[9px] lg:text-sm font-medium">
                        <div className="flex gap-0.5 sm:gap-1">
                          <button
                            onClick={() => {
                              if (item.status === 'completed' && !item.completed_date) {
                                updateItemMutation.mutate({
                                  planId: selectedPlan.id,
                                  itemId: item.id,
                                  data: { status: 'completed', completed_date: new Date().toISOString().split('T')[0] }
                                });
                              } else if (item.status !== 'completed') {
                                updateItemMutation.mutate({
                                  planId: selectedPlan.id,
                                  itemId: item.id,
                                  data: { status: 'completed', completed_date: new Date().toISOString().split('T')[0] }
                                });
                              }
                            }}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title="Označi kao završeno"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Da li ste sigurni da želite obrisati ovu aktivnost?')) {
                                deleteItemMutation.mutate({ planId: selectedPlan.id, itemId: item.id });
                              }
                            }}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-1 sm:px-1.5 lg:px-6 py-2 sm:py-3 lg:py-4 text-center text-[8px] sm:text-[9px] lg:text-sm text-gray-500 dark:text-gray-400">
                      Nema aktivnosti. Kliknite "Dodaj aktivnost" da dodate novu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showItemModal && selectedPlan && (
          <PlanItemModal
            plan={selectedPlan}
            stores={stores || []}
            users={users || []}
            onClose={() => setShowItemModal(false)}
            onSubmit={(data) => {
              createItemMutation.mutate({ planId: selectedPlan.id, data });
            }}
            isLoading={createItemMutation.isPending}
          />
        )}

        {showPlanModal && (
          <PlanModal
            plan={selectedPlan}
            users={users || []}
            onClose={() => {
              setShowPlanModal(false);
            }}
            onSubmit={(data) => {
              if (selectedPlan) {
                updatePlanMutation.mutate({ id: selectedPlan.id, data });
              } else {
                createPlanMutation.mutate(data);
              }
            }}
            isLoading={createPlanMutation.isPending || updatePlanMutation.isPending}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 lg:gap-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-xs sm:text-sm lg:text-xl font-semibold text-gray-900 dark:text-white mb-1 sm:mb-1.5 lg:mb-4">Plan kontrola i Obilazaka</h2>
          <p className="text-[8px] sm:text-[9px] lg:text-sm text-gray-500 dark:text-gray-400">
            Planiranje inventura (obavezne, vanredne) i obilazaka poslovnica tokom godine
          </p>
        </div>
        <button
          onClick={handleCreatePlan}
          className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm lg:text-base w-full sm:w-auto"
        >
          <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Novi plan
        </button>
      </div>

      {/* View Mode Switcher */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'grid'
                ? 'bg-teal-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Grid prikaz"
          >
            <Grid className="w-4 h-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'table'
                ? 'bg-teal-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Tabelarni prikaz"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Tabela</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'calendar'
                ? 'bg-teal-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Kalendarski prikaz"
          >
            <CalendarIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Kalendar</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-2 sm:p-3 lg:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Tip</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value as ControlPlanType | 'all' })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            >
              <option value="all">Svi tipovi</option>
              <option value="inventory_required">Obavezna inventura</option>
              <option value="inventory_extraordinary">Vanredna inventura</option>
              <option value="store_visit">Obilazak prodavnice</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as ControlPlanStatus | 'all' })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            >
              <option value="all">Svi statusi</option>
              <option value="draft">Nacrt</option>
              <option value="active">Aktivan</option>
              <option value="completed">Završen</option>
              <option value="cancelled">Otkazan</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Godina</label>
            <input
              type="number"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
              min="2020"
              max="2100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pretraga</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Pretraži planove..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Plans List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Učitavanje planova...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nema planova. Kliknite "Novi plan" da kreirate prvi plan.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
          {plans.map((plan: ControlPlan) => (
            <div
              key={plan.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 lg:p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewPlan(plan)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{getTypeLabel(plan.type)}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(plan.status)}`}>
                  {plan.status === 'draft' ? 'Nacrt' : 
                   plan.status === 'active' ? 'Aktivan' :
                   plan.status === 'completed' ? 'Završen' : 'Otkazan'}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{plan.description}</p>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  <span>Godina: {plan.year}</span>
                </div>
                {plan.regional_manager_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{plan.regional_manager_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  <span>Prodavnice: {plan.completed_stores}/{plan.total_stores}</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlan(plan);
                    setShowPlanModal(true);
                  }}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Uredi
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Da li ste sigurni da želite obrisati ovaj plan?')) {
                      deletePlanMutation.mutate(plan.id);
                    }
                  }}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto -mx-2 sm:-mx-3 lg:mx-0 px-2 sm:px-3 lg:px-0">
            <table className="w-full min-w-[350px] sm:min-w-[450px] lg:min-w-[600px]">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-1 sm:px-1.5 lg:px-6 py-1 sm:py-1.5 lg:py-3 text-left text-[8px] sm:text-[9px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Naziv plana</th>
                  <th className="px-1 sm:px-1.5 lg:px-6 py-1 sm:py-1.5 lg:py-3 text-left text-[8px] sm:text-[9px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tip</th>
                  <th className="px-1 sm:px-1.5 lg:px-6 py-1 sm:py-1.5 lg:py-3 text-left text-[8px] sm:text-[9px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">Godina</th>
                  <th className="px-1 sm:px-1.5 lg:px-6 py-1 sm:py-1.5 lg:py-3 text-left text-[8px] sm:text-[9px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-1 sm:px-1.5 lg:px-6 py-1 sm:py-1.5 lg:py-3 text-left text-[8px] sm:text-[9px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Regionalni menadžer</th>
                  <th className="px-1 sm:px-1.5 lg:px-6 py-1 sm:py-1.5 lg:py-3 text-left text-[8px] sm:text-[9px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">Prodavnice</th>
                  <th className="px-1 sm:px-1.5 lg:px-6 py-1 sm:py-1.5 lg:py-3 text-left text-[8px] sm:text-[9px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {plans.map((plan: ControlPlan) => (
                  <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => handleViewPlan(plan)}>
                    <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4">
                      <div>
                        <div className="text-[8px] sm:text-[9px] lg:text-sm font-medium text-gray-900 dark:text-white">{plan.title}</div>
                        {plan.description && (
                          <div className="text-[7px] sm:text-[8px] lg:text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{plan.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap">
                      <span className="text-[8px] sm:text-[9px] lg:text-sm text-gray-900 dark:text-white">{getTypeLabel(plan.type)}</span>
                    </td>
                    <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap text-[8px] sm:text-[9px] lg:text-sm text-gray-900 dark:text-white hidden sm:table-cell">
                      {plan.year}
                    </td>
                    <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap">
                      <span className={`px-0.5 sm:px-1 lg:px-2 py-0.5 rounded-full text-[7px] sm:text-[8px] lg:text-xs font-medium ${getStatusBadge(plan.status)}`}>
                        {plan.status === 'draft' ? 'Nacrt' : 
                         plan.status === 'active' ? 'Aktivan' :
                         plan.status === 'completed' ? 'Završen' : 'Otkazan'}
                      </span>
                    </td>
                    <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap text-[8px] sm:text-[9px] lg:text-sm text-gray-900 dark:text-white hidden md:table-cell">
                      {plan.regional_manager_name || '-'}
                    </td>
                    <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap text-[8px] sm:text-[9px] lg:text-sm text-gray-900 dark:text-white hidden sm:table-cell">
                      {plan.completed_stores}/{plan.total_stores}
                    </td>
                    <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap text-[8px] sm:text-[9px] lg:text-sm font-medium">
                      <div className="flex gap-0.5 sm:gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlan(plan);
                            setShowPlanModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Uredi"
                        >
                          <Edit className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Da li ste sigurni da želite obrisati ovaj plan?')) {
                              deletePlanMutation.mutate(plan.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Obriši"
                        >
                          <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <CalendarView
          plans={plans}
          planItems={allPlanItems}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          onPlanClick={handleViewPlan}
          getTypeLabel={getTypeLabel}
          getStatusBadge={getStatusBadge}
          getItemStatusBadge={getItemStatusBadge}
        />
      )}

      {showPlanModal && (
        <PlanModal
          plan={selectedPlan}
          users={users || []}
          onClose={() => {
            setShowPlanModal(false);
            if (!selectedPlan) {
              setSelectedPlan(null);
            }
          }}
          onSubmit={(data) => {
            if (selectedPlan) {
              updatePlanMutation.mutate({ id: selectedPlan.id, data });
            } else {
              createPlanMutation.mutate(data);
            }
          }}
          isLoading={createPlanMutation.isPending || updatePlanMutation.isPending}
        />
      )}
    </div>
  );
}

// Calendar View Component
function CalendarView({
  plans,
  planItems,
  currentDate,
  setCurrentDate,
  onPlanClick,
  getTypeLabel,
  getStatusBadge,
  getItemStatusBadge,
}: {
  plans: ControlPlan[];
  planItems: ControlPlanItem[];
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  onPlanClick: (plan: ControlPlan) => void;
  getTypeLabel: (type: ControlPlanType) => string;
  getStatusBadge: (status: ControlPlanStatus) => string;
  getItemStatusBadge: (status: string) => string;
}) {
  const weekDays = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];
  const monthNames = [
    'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
    'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
  ];

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getPlansForDate = (date: Date | null) => {
    if (!date) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    return plans.filter(plan => {
      // Check if plan has items on this date
      const hasItemOnDate = planItems.some(item => {
        const itemDate = new Date(item.planned_date).toISOString().split('T')[0];
        return itemDate === dateStr && item.plan_id === plan.id;
      });
      return hasItemOnDate;
    });
  };

  const getItemsForDate = (date: Date | null) => {
    if (!date) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    return planItems.filter(item => {
      const itemDate = new Date(item.planned_date).toISOString().split('T')[0];
      return itemDate === dateStr;
    });
  };

  const isDeadlineDate = (date: Date | null) => {
    if (!date) return false;
    const dateStr = date.toISOString().split('T')[0];
    return plans.some(plan => {
      if (!plan.deadline) return false;
      const deadlineStr = new Date(plan.deadline).toISOString().split('T')[0];
      return deadlineStr === dateStr;
    });
  };

  const isPlannedDate = (date: Date | null) => {
    if (!date) return false;
    const dateStr = date.toISOString().split('T')[0];
    return planItems.some(item => {
      if (!item.planned_date) return false;
      const plannedStr = new Date(item.planned_date).toISOString().split('T')[0];
      return plannedStr === dateStr;
    });
  };

  const getDeadlinePlans = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return plans.filter(plan => {
      if (!plan.deadline) return false;
      const deadlineStr = new Date(plan.deadline).toISOString().split('T')[0];
      return deadlineStr === dateStr;
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const days = getDaysInMonth();
  const today = new Date();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Calendar Header */}
      <div className="p-2 sm:p-3 lg:p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
          >
            Danas
          </button>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-red-500 bg-red-50 dark:bg-red-900/20 rounded"></div>
            <span className="text-gray-700 dark:text-gray-300">Rok kontrole/plana</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-teal-400 bg-teal-50 dark:bg-teal-900/20 rounded"></div>
            <span className="text-gray-700 dark:text-gray-300">Planirani datum aktivnosti</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border border-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded"></div>
            <span className="text-gray-700 dark:text-gray-300">Današnji dan</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-2 sm:p-3 lg:p-4">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            const isToday = day && day.toDateString() === today.toDateString();
            const isCurrentMonth = day && day.getMonth() === currentDate.getMonth();
            const dayPlans = getPlansForDate(day);
            const dayItems = getItemsForDate(day);
            const hasDeadline = isDeadlineDate(day);
            const hasPlannedDate = isPlannedDate(day);
            const deadlinePlans = getDeadlinePlans(day);

            // Determine border style based on priority: deadline > planned date > today
            let borderClass = 'border-gray-200 dark:border-gray-700';
            if (hasDeadline) {
              borderClass = 'border-red-500 dark:border-red-400 border-2';
            } else if (hasPlannedDate && !isToday) {
              borderClass = 'border-teal-400 dark:border-teal-500 border-2';
            } else if (isToday) {
              borderClass = 'border-blue-400 dark:border-blue-500';
            }

            return (
              <div
                key={index}
                className={`min-h-[100px] p-2 border rounded-lg relative ${
                  isToday && !hasDeadline && !hasPlannedDate ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                } ${hasDeadline ? 'bg-red-50 dark:bg-red-900/20' : ''} ${
                  hasPlannedDate && !hasDeadline && !isToday ? 'bg-teal-50 dark:bg-teal-900/20' : ''
                } ${!isCurrentMonth ? 'opacity-40' : ''} ${day ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''} ${borderClass}`}
              >
                {day && (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <div className={`text-sm font-medium ${isToday ? 'text-blue-600 dark:text-blue-400' : hasDeadline ? 'text-red-600 dark:text-red-400 font-bold' : hasPlannedDate ? 'text-teal-600 dark:text-teal-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                        {day.getDate()}
                      </div>
                      {hasDeadline && (
                        <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-semibold" title="Rok kontrole/plana">
                          R
                        </span>
                      )}
                      {hasPlannedDate && !hasDeadline && (
                        <span className="text-xs bg-teal-500 text-white rounded-full px-1.5 py-0.5 font-semibold" title="Planirani datum">
                          P
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {deadlinePlans.map((plan) => (
                        <div
                          key={`deadline-${plan.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlanClick(plan);
                          }}
                          className="text-xs p-1 bg-red-200 dark:bg-red-900/40 text-red-900 dark:text-red-200 rounded truncate hover:bg-red-300 dark:hover:bg-red-900/60 font-semibold border border-red-400"
                          title={`Rok: ${plan.title}`}
                        >
                          ⏰ {plan.title}
                        </div>
                      ))}
                      {dayPlans.filter(p => !deadlinePlans.some(dp => dp.id === p.id)).map((plan) => (
                        <div
                          key={plan.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlanClick(plan);
                          }}
                          className="text-xs p-1 bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 rounded truncate hover:bg-teal-200 dark:hover:bg-teal-900/50"
                          title={plan.title}
                        >
                          {plan.title}
                        </div>
                      ))}
                      {dayItems.slice(0, 2).map((item) => (
                        <div
                          key={item.id}
                          className="text-xs p-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded truncate"
                          title={`${item.store_name} - ${new Date(item.planned_date).toLocaleDateString('hr-HR')}`}
                        >
                          {item.store_name}
                        </div>
                      ))}
                      {dayItems.length > 2 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          +{dayItems.length - 2} više
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Education Plans Tab - Implementation will be added next
function EducationPlansTab() {
  const queryClient = useQueryClient();
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<EducationPlan | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'calendar'>('grid');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState({
    store_id: undefined as number | undefined,
    status: 'all' as EducationPlanStatus | 'all',
    education_type: 'all' as EducationType | 'all',
    search: '',
  });

  const { data: plansData, isLoading, error: plansError } = useQuery({
    queryKey: ['retail-education-plans', filters],
    queryFn: () => getEducationPlans(filters),
    retry: 1,
  });

  const plans = plansData?.data || [];

  const { data: storesResponse } = useQuery({
    queryKey: ['hrm-stores-education'],
    queryFn: async () => {
      // Don't filter by is_active - get all stores from HRM
      const response = await getStores();
      // Handle both direct array and paginated response
      return Array.isArray(response) ? response : (response?.data || []);
    },
  });

  const stores = Array.isArray(storesResponse) ? storesResponse : (storesResponse?.data || []);

  const { data: allEmployeesData } = useQuery({
    queryKey: ['hrm-employees-all-education'],
    queryFn: async () => {
      // Get all employees - fetch all pages if paginated
      let allEmployees: any[] = [];
      let page = 1;
      let hasMore = true;
      
      while (hasMore) {
        const response = await getEmployees({ per_page: 100, page });
        const employees = Array.isArray(response) ? response : (response?.data || []);
        allEmployees = [...allEmployees, ...employees];
        
        // Check if there are more pages
        if (Array.isArray(response)) {
          hasMore = false; // If it's an array, we got all
        } else if (response?.data) {
          // Check pagination info
          const total = response?.total || 0;
          const perPage = response?.per_page || 20;
          const lastPage = Math.ceil(total / perPage);
          hasMore = page < lastPage;
          page++;
        } else {
          hasMore = false;
        }
      }
      
      return allEmployees;
    },
  });

  const allEmployees = Array.isArray(allEmployeesData) ? allEmployeesData : (allEmployeesData?.data || []);

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiService.get<any[]>('/admin/users');
      return response.data || [];
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: createEducationPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-education-plans'] });
      setShowPlanModal(false);
      setSelectedStoreId(null);
      toast.success('Plan edukacije je uspješno kreiran');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Greška pri kreiranju plana edukacije');
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EducationPlan> }) => updateEducationPlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-education-plans'] });
      setShowPlanModal(false);
      setSelectedPlan(null);
      toast.success('Plan edukacije je uspješno ažuriran');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Greška pri ažuriranju plana edukacije');
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: deleteEducationPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-education-plans'] });
      toast.success('Plan edukacije je uspješno obrisan');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Greška pri brisanju plana edukacije');
    },
  });

  const handleCreatePlan = () => {
    setSelectedPlan(null);
    setSelectedStoreId(null);
    setShowPlanModal(true);
  };

  const handleEditPlan = (plan: EducationPlan) => {
    setSelectedPlan(plan);
    setSelectedStoreId(plan.store_id);
    setShowPlanModal(true);
  };

  const getTypeLabel = (type: EducationType) => {
    const labels = {
      internal: 'Interna',
      external: 'Externa',
      online: 'Online',
      workshop: 'Radionica',
    };
    return labels[type];
  };

  const getStatusBadge = (status: EducationPlanStatus) => {
    const badges = {
      planned: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return badges[status];
  };

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2 sm:mb-4">Plan Edukacija</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Planiranje edukacija za zaposlene u maloprodaji
          </p>
        </div>
        <button
          onClick={handleCreatePlan}
          className="px-3 sm:px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center justify-center gap-2 text-sm sm:text-base w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          Novi plan
        </button>
      </div>

      {/* View Mode Switcher */}
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'grid'
                ? 'bg-teal-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Grid prikaz"
          >
            <Grid className="w-4 h-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'table'
                ? 'bg-teal-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Tabelarni prikaz"
          >
            <List className="w-4 h-4" />
            <span className="hidden sm:inline">Tabela</span>
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'calendar'
                ? 'bg-teal-600 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            title="Kalendarski prikaz"
          >
            <CalendarIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Kalendar</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-2 sm:p-3 lg:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prodavnica</label>
            <select
              value={filters.store_id || ''}
              onChange={(e) => setFilters({ ...filters, store_id: e.target.value ? parseInt(e.target.value) : undefined })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            >
              <option value="">Sve prodavnice</option>
              {stores?.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} {store.code ? `(${store.code})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as EducationPlanStatus | 'all' })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            >
              <option value="all">Svi statusi</option>
              <option value="planned">Planirano</option>
              <option value="in_progress">U toku</option>
              <option value="completed">Završeno</option>
              <option value="cancelled">Otkazano</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tip edukacije</label>
            <select
              value={filters.education_type}
              onChange={(e) => setFilters({ ...filters, education_type: e.target.value as EducationType | 'all' })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            >
              <option value="all">Svi tipovi</option>
              <option value="internal">Interna</option>
              <option value="external">Externa</option>
              <option value="online">Online</option>
              <option value="workshop">Radionica</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pretraga</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Pretraži planove..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Plans List */}
      {plansError ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 sm:p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
          <p className="text-red-600 dark:text-red-400 font-medium mb-1">Greška pri učitavanju planova</p>
          <p className="text-sm text-red-500 dark:text-red-400">
            {plansError instanceof Error ? plansError.message : 'Nepoznata greška'}
          </p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Učitavanje planova...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nema planova edukacija. Kliknite "Novi plan" da kreirate prvi plan.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {plans.map((plan: EducationPlan) => (
            <div
              key={plan.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{plan.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{getTypeLabel(plan.education_type)}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(plan.status)}`}>
                  {plan.status === 'planned' ? 'Planirano' : 
                   plan.status === 'in_progress' ? 'U toku' :
                   plan.status === 'completed' ? 'Završeno' : 'Otkazano'}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{plan.description || plan.topic}</p>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  <span>{plan.store_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{plan.employee_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  <span>{new Date(plan.education_date).toLocaleDateString('hr-HR')}</span>
                  {plan.start_time && (
                    <span className="text-xs">({plan.start_time} - {plan.end_time || 'TBA'})</span>
                  )}
                </div>
                {plan.instructor_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Instruktor: {plan.instructor_name}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditPlan(plan)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Uredi
                </button>
                <button
                  onClick={() => {
                    if (confirm('Da li ste sigurni da želite obrisati ovaj plan edukacije?')) {
                      deletePlanMutation.mutate(plan.id);
                    }
                  }}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto -mx-2 sm:-mx-3 lg:mx-0 px-2 sm:px-3 lg:px-0">
            <table className="w-full min-w-[350px] sm:min-w-[450px] lg:min-w-[600px]">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-1 sm:px-1.5 lg:px-6 py-1 sm:py-1.5 lg:py-3 text-left text-[8px] sm:text-[9px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Naziv edukacije</th>
                  <th className="px-1 sm:px-1.5 lg:px-6 py-1 sm:py-1.5 lg:py-3 text-left text-[8px] sm:text-[9px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden sm:table-cell">Tip</th>
                  <th className="px-1 sm:px-1.5 lg:px-6 py-1 sm:py-1.5 lg:py-3 text-left text-[8px] sm:text-[9px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prodavnica</th>
                  <th className="px-1 sm:px-1.5 lg:px-6 py-1 sm:py-1.5 lg:py-3 text-left text-[8px] sm:text-[9px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Zaposleni</th>
                  <th className="px-1 sm:px-1.5 lg:px-6 py-1 sm:py-1.5 lg:py-3 text-left text-[8px] sm:text-[9px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Datum</th>
                  <th className="px-1 sm:px-1.5 lg:px-6 py-1 sm:py-1.5 lg:py-3 text-left text-[8px] sm:text-[9px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-1 sm:px-1.5 lg:px-6 py-1 sm:py-1.5 lg:py-3 text-left text-[8px] sm:text-[9px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {plans.map((plan: EducationPlan) => (
                  <tr key={plan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4">
                      <div>
                        <div className="text-[8px] sm:text-[9px] lg:text-sm font-medium text-gray-900 dark:text-white">{plan.title}</div>
                        {(plan.description || plan.topic) && (
                          <div className="text-[7px] sm:text-[8px] lg:text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{plan.description || plan.topic}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap hidden sm:table-cell">
                      <span className="text-[8px] sm:text-[9px] lg:text-sm text-gray-900 dark:text-white">{getTypeLabel(plan.education_type)}</span>
                    </td>
                    <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap text-[8px] sm:text-[9px] lg:text-sm text-gray-900 dark:text-white">
                      {plan.store_name || '-'}
                    </td>
                    <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap text-[8px] sm:text-[9px] lg:text-sm text-gray-900 dark:text-white hidden md:table-cell">
                      {plan.employee_name || '-'}
                    </td>
                    <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap text-[8px] sm:text-[9px] lg:text-sm text-gray-900 dark:text-white">
                      {new Date(plan.education_date).toLocaleDateString('hr-HR')}
                      {plan.start_time && (
                        <div className="text-[7px] sm:text-[8px] lg:text-xs text-gray-500 dark:text-gray-400">
                          {plan.start_time} - {plan.end_time || 'TBA'}
                        </div>
                      )}
                    </td>
                    <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap">
                      <span className={`px-0.5 sm:px-1 lg:px-2 py-0.5 rounded-full text-[7px] sm:text-[8px] lg:text-xs font-medium ${getStatusBadge(plan.status)}`}>
                        {plan.status === 'planned' ? 'Planirano' : 
                         plan.status === 'in_progress' ? 'U toku' :
                         plan.status === 'completed' ? 'Završeno' : 'Otkazano'}
                      </span>
                    </td>
                    <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap text-[8px] sm:text-[9px] lg:text-sm font-medium">
                      <div className="flex gap-0.5 sm:gap-1">
                        <button
                          onClick={() => handleEditPlan(plan)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Uredi"
                        >
                          <Edit className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Da li ste sigurni da želite obrisati ovaj plan edukacije?')) {
                              deletePlanMutation.mutate(plan.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          title="Obriši"
                        >
                          <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EducationCalendarView
          plans={plans}
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          onPlanClick={handleEditPlan}
          getTypeLabel={getTypeLabel}
          getStatusBadge={getStatusBadge}
        />
      )}

      {showPlanModal && (
        <EducationPlanModal
          plan={selectedPlan}
          stores={stores || []}
          allEmployees={allEmployees}
          users={users || []}
          selectedStoreId={selectedStoreId}
          onStoreChange={(storeId) => {
            setSelectedStoreId(storeId);
          }}
          onClose={() => {
            setShowPlanModal(false);
            setSelectedPlan(null);
            setSelectedStoreId(null);
          }}
          onSubmit={(data) => {
            if (selectedPlan) {
              updatePlanMutation.mutate({ id: selectedPlan.id, data });
            } else {
              createPlanMutation.mutate(data);
            }
          }}
          isLoading={createPlanMutation.isPending || updatePlanMutation.isPending}
        />
      )}
    </div>
  );
}

// Education Calendar View Component
function EducationCalendarView({
  plans,
  currentDate,
  setCurrentDate,
  onPlanClick,
  getTypeLabel,
  getStatusBadge,
}: {
  plans: EducationPlan[];
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  onPlanClick: (plan: EducationPlan) => void;
  getTypeLabel: (type: EducationType) => string;
  getStatusBadge: (status: EducationPlanStatus) => string;
}) {
  const weekDays = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned'];
  const monthNames = [
    'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
    'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
  ];

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getPlansForDate = (date: Date | null) => {
    if (!date) return [];
    
    const dateStr = date.toISOString().split('T')[0];
    return plans.filter(plan => {
      if (!plan.education_date) return false;
      const planDate = new Date(plan.education_date).toISOString().split('T')[0];
      return planDate === dateStr;
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const days = getDaysInMonth();
  const today = new Date();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Calendar Header */}
      <div className="p-2 sm:p-3 lg:p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
          >
            Danas
          </button>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-teal-400 bg-teal-50 dark:bg-teal-900/20 rounded"></div>
            <span className="text-gray-700 dark:text-gray-300">Planirana edukacija</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border border-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded"></div>
            <span className="text-gray-700 dark:text-gray-300">Današnji dan</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-2 sm:p-3 lg:p-4">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            const isToday = day && day.toDateString() === today.toDateString();
            const isCurrentMonth = day && day.getMonth() === currentDate.getMonth();
            const dayPlans = getPlansForDate(day);

            // Determine border style
            let borderClass = 'border-gray-200 dark:border-gray-700';
            if (dayPlans.length > 0 && !isToday) {
              borderClass = 'border-teal-400 dark:border-teal-500 border-2';
            } else if (isToday) {
              borderClass = 'border-blue-400 dark:border-blue-500';
            }

            return (
              <div
                key={index}
                className={`min-h-[100px] p-2 border rounded-lg relative ${
                  isToday && dayPlans.length === 0 ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                } ${dayPlans.length > 0 && !isToday ? 'bg-teal-50 dark:bg-teal-900/20' : ''} ${
                  !isCurrentMonth ? 'opacity-40' : ''
                } ${day ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''} ${borderClass}`}
              >
                {day && (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <div className={`text-sm font-medium ${isToday ? 'text-blue-600 dark:text-blue-400' : dayPlans.length > 0 ? 'text-teal-600 dark:text-teal-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                        {day.getDate()}
                      </div>
                      {dayPlans.length > 0 && (
                        <span className="text-xs bg-teal-500 text-white rounded-full px-1.5 py-0.5 font-semibold" title="Planirana edukacija">
                          {dayPlans.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayPlans.slice(0, 2).map((plan) => (
                        <div
                          key={plan.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlanClick(plan);
                          }}
                          className="text-xs p-1 bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300 rounded truncate hover:bg-teal-200 dark:hover:bg-teal-900/50 cursor-pointer"
                          title={`${plan.title} - ${plan.employee_name}`}
                        >
                          {plan.title}
                        </div>
                      ))}
                      {dayPlans.length > 2 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          +{dayPlans.length - 2} više
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Control Records Tab
function ControlRecordsTab() {
  const queryClient = useQueryClient();
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ControlRecord | null>(null);
  const [filters, setFilters] = useState({
    store_id: undefined as number | undefined,
    control_type: 'all' as 'all' | 'inventory' | 'inspection',
    status: 'all' as 'all' | 'draft' | 'finalized' | 'locked',
    search: '',
  });

  const { data: recordsData, isLoading } = useQuery({
    queryKey: ['retail-control-records', filters],
    queryFn: () => getControlRecords(filters),
  });

  const records = recordsData?.data || [];

  const { data: stores } = useQuery({
    queryKey: ['hrm-stores'],
    queryFn: () => getStores({ is_active: true }),
  });

  const createRecordMutation = useMutation({
    mutationFn: createControlRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-control-records'] });
      setShowRecordModal(false);
      toast.success('Evidencija je uspješno kreirana');
    },
    onError: (error: any) => {
      console.error('Error creating control record:', error);
      console.error('Error response:', error?.response?.data);
      const errorMessage = error?.response?.data?.errors 
        ? Object.values(error.response.data.errors).flat().join(', ')
        : error?.response?.data?.message || 'Greška pri kreiranju evidencije';
      toast.error(errorMessage);
    },
  });

  const updateRecordMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ControlRecord> }) => updateControlRecord(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-control-records'] });
      toast.success('Evidencija je uspješno ažurirana');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Greška pri ažuriranju evidencije');
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: deleteControlRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['retail-control-records'] });
      toast.success('Evidencija je uspješno obrisana');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Greška pri brisanju evidencije');
    },
  });

  const handleCreateRecord = () => {
    setSelectedRecord(null);
    setShowRecordModal(true);
  };

  const handleEditRecord = async (recordId: number) => {
    try {
      const record = await getControlRecord(recordId);
      setSelectedRecord(record);
      setShowRecordModal(true);
    } catch (error) {
      toast.error('Greška pri učitavanju evidencije');
    }
  };

  const handleDeleteRecord = (recordId: number) => {
    if (confirm('Da li ste sigurni da želite obrisati ovu evidenciju?')) {
      deleteRecordMutation.mutate(recordId);
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      inventory: 'Totalna inventura',
      inspection: 'Obilazak i kontrola',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      finalized: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      locked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return badges[status] || badges.draft;
  };

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xs sm:text-sm lg:text-xl font-semibold text-gray-900 dark:text-white mb-1 sm:mb-1.5 lg:mb-4">Evidencija Kontrola i obilazaka</h2>
          <p className="text-[8px] sm:text-[9px] lg:text-sm text-gray-500 dark:text-gray-400">
            Evidencija izvršenih kontrola i obilazaka prodavnica
          </p>
        </div>
        <button
          onClick={handleCreateRecord}
          className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center justify-center gap-2 font-medium text-sm sm:text-base shadow-md"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Kreiraj evidenciju</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-2 sm:p-3 lg:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prodavnica</label>
            <select
              value={filters.store_id || ''}
              onChange={(e) => setFilters({ ...filters, store_id: e.target.value ? parseInt(e.target.value) : undefined })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            >
              <option value="">Sve prodavnice</option>
              {stores?.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} {store.code ? `(${store.code})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tip kontrole</label>
            <select
              value={filters.control_type}
              onChange={(e) => setFilters({ ...filters, control_type: e.target.value as 'all' | 'inventory' | 'inspection' })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            >
              <option value="all">Svi tipovi</option>
              <option value="inventory">Totalna inventura</option>
              <option value="inspection">Obilazak i kontrola</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as 'all' | 'draft' | 'finalized' | 'locked' })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            >
              <option value="all">Svi statusi</option>
              <option value="draft">Nacrt</option>
              <option value="finalized">Finalizovano</option>
              <option value="locked">Zaključano</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pretraga</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Pretraži evidencije..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Records List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Učitavanje evidencija...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <ClipboardCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nema evidencija. Kliknite "Kreiraj evidenciju" da kreirate prvu evidenciju.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto -mx-2 sm:-mx-3 lg:mx-0 px-2 sm:px-3 lg:px-0">
              <table className="w-full min-w-[350px] sm:min-w-[450px]">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-1 sm:px-1.5 lg:px-6 py-1 sm:py-1.5 lg:py-3 text-left text-[8px] sm:text-[9px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prodavnica</th>
                    <th className="px-1 sm:px-1.5 lg:px-6 py-1 sm:py-1.5 lg:py-3 text-left text-[8px] sm:text-[9px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tip kontrole</th>
                    <th className="px-1 sm:px-1.5 lg:px-6 py-1 sm:py-1.5 lg:py-3 text-left text-[8px] sm:text-[9px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Datum kontrole</th>
                    <th className="px-1 sm:px-1.5 lg:px-6 py-1 sm:py-1.5 lg:py-3 text-left text-[8px] sm:text-[9px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-1 sm:px-1.5 lg:px-6 py-1 sm:py-1.5 lg:py-3 text-left text-[8px] sm:text-[9px] lg:text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap">
                        <div>
                          <div className="text-[8px] sm:text-[9px] lg:text-sm font-medium text-gray-900 dark:text-white">{record.store_name}</div>
                          {record.store_code && (
                            <div className="text-[7px] sm:text-[8px] lg:text-sm text-gray-500 dark:text-gray-400">{record.store_code}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap">
                        <span className="px-0.5 sm:px-1 lg:px-2 py-0.5 rounded-full text-[7px] sm:text-[8px] lg:text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {getTypeLabel(record.control_type)}
                        </span>
                      </td>
                      <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap text-[8px] sm:text-[9px] lg:text-sm text-gray-900 dark:text-white">
                        {new Date(record.control_date_from).toLocaleDateString('hr-HR')}
                        {record.control_date_to && record.control_date_to !== record.control_date_from && (
                          <span> - {new Date(record.control_date_to).toLocaleDateString('hr-HR')}</span>
                        )}
                      </td>
                      <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap">
                        <span className={`px-0.5 sm:px-1 lg:px-2 py-0.5 rounded-full text-[7px] sm:text-[8px] lg:text-xs font-medium ${getStatusBadge(record.status)}`}>
                          {record.status === 'draft' ? 'Nacrt' : 
                           record.status === 'finalized' ? 'Finalizovano' : 'Zaključano'}
                        </span>
                      </td>
                      <td className="px-1 sm:px-1.5 lg:px-6 py-1.5 sm:py-2 lg:py-4 whitespace-nowrap text-[8px] sm:text-[9px] lg:text-sm font-medium">
                        <div className="flex gap-0.5 sm:gap-1">
                          <button
                            onClick={() => handleEditRecord(record.id)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Uredi"
                          >
                            <Edit className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Obriši"
                          >
                            <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {records.map((record) => (
              <div
                key={record.id}
                onClick={() => handleEditRecord(record.id)}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 active:bg-gray-50 dark:active:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mb-1 break-words">
                      {record.store_name}
                    </h3>
                    {record.store_code && (
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-1 sm:mb-2">{record.store_code}</p>
                    )}
                    <span className="inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 mb-1 sm:mb-2">
                      {getTypeLabel(record.control_type)}
                    </span>
                  </div>
                  <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium flex-shrink-0 ${getStatusBadge(record.status)}`}>
                    {record.status === 'draft' ? 'Nacrt' : 
                     record.status === 'finalized' ? 'Finalizovano' : 'Zaključano'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0 pt-2 sm:pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="break-words">
                      {new Date(record.control_date_from).toLocaleDateString('hr-HR')}
                      {record.control_date_to && record.control_date_to !== record.control_date_from && (
                        <span> - {new Date(record.control_date_to).toLocaleDateString('hr-HR')}</span>
                      )}
                    </span>
                  </div>
                  <div className="flex gap-2 sm:gap-3 justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditRecord(record.id);
                      }}
                      className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg flex-shrink-0"
                      title="Uredi"
                    >
                      <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRecord(record.id);
                      }}
                      className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex-shrink-0"
                      title="Obriši"
                    >
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showRecordModal && (
        <ControlRecordModal
          record={selectedRecord}
          stores={stores || []}
          onClose={() => {
            setShowRecordModal(false);
            setSelectedRecord(null);
          }}
          onSave={(data) => {
            if (selectedRecord) {
              updateRecordMutation.mutate({ id: selectedRecord.id, data });
            } else {
              createRecordMutation.mutate(data);
            }
          }}
          isLoading={createRecordMutation.isPending || updateRecordMutation.isPending}
        />
      )}
    </div>
  );
}
function EvaluationsTab() {
  const [activeSubTab, setActiveSubTab] = useState<'managers' | 'sales-staff' | 'career' | 'rewards'>('managers');
  
  const subTabs = [
    { id: 'managers', label: 'Menadžeri prodavnica', icon: User },
    { id: 'sales-staff', label: 'Prodajno osoblje', icon: Users },
    { id: 'career', label: 'Praćenje karijere', icon: TrendingUp },
    { id: 'rewards', label: 'Nagrađivanje i bonusi', icon: Award },
  ] as const;

  return (
    <div className="space-y-1 sm:space-y-1.5 lg:space-y-6">
      {/* Tabs - Mobile Responsive */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        {/* Mobile: Horizontal scrollable tabs */}
        <div className="md:hidden overflow-x-auto scrollbar-hide -mx-1.5 sm:-mx-2 px-1.5 sm:px-2">
          <nav className="flex gap-1 min-w-max" aria-label="Tabs">
            {subTabs.map((tab) => {
              const Icon = tab.icon;
              const shortLabels: Record<string, string> = {
                'Menadžeri prodavnica': 'Menadžeri',
                'Prodajno osoblje': 'Prodaja',
                'Praćenje karijere': 'Karijera',
                'Nagrađivanje i bonusi': 'Bonusi',
              };
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`
                    flex items-center gap-0.5 border-b-2 py-1.5 px-1.5 text-[8px] font-medium transition-colors whitespace-nowrap
                    ${
                      activeSubTab === tab.id
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }
                  `}
                >
                  <Icon size={12} />
                  <span>{shortLabels[tab.label] || tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        
        {/* Desktop: Normal tabs */}
        <nav className="hidden md:flex space-x-8" aria-label="Tabs">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`
                  flex items-center gap-2 border-b-2 py-4 px-1 text-sm font-medium transition-colors
                  ${
                    activeSubTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-1 sm:mt-2 lg:mt-6">
        {activeSubTab === 'managers' && <ManagerEvaluationsTab />}
        {activeSubTab === 'sales-staff' && <SalesStaffEvaluationsTab />}
        {activeSubTab === 'career' && <CareerDevelopmentTab />}
        {activeSubTab === 'rewards' && <RewardsAndBonusesTab />}
      </div>
    </div>
  );
}

// Manager Evaluations Tab
function ManagerEvaluationsTab() {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);
  const { user } = useAuthStore();

  // Check if user is admin
  const isAdmin = user?.role?.toLowerCase() === 'admin' || 
                 user?.role?.toLowerCase() === 'super-admin' ||
                 (user as any)?.roles?.some((r: string) => r?.toLowerCase() === 'admin' || r?.toLowerCase() === 'super-admin');

  useEffect(() => {
    loadEvaluations();
  }, []);

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      const data = await apiService.get('/planika/maloprodaja/evaluations/managers');
      setEvaluations(data || []);
    } catch (error) {
      console.error('Failed to load manager evaluations:', error);
      toast.error('Greška pri učitavanju evaluacija menadžera');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (evaluationId: number, e: React.MouseEvent<HTMLButtonElement>) => {
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

  const managerCriteria = [
    { name: 'Ostvarenje plana prodaje prodavnice', maxPoints: 45 },
    { name: 'KPI indeksi vezane prodaje prodavnice i učinkovitost prodavnice (UPT, PAR/KOM i stopa realizacije)', maxPoints: 10 },
    { name: 'Upravljanje zalihama (obrt) i smanjenje reklamacija', maxPoints: 10 },
    { name: 'Implementacija 7 koraka na timskom nivou', maxPoints: 10 },
    { name: 'Organizacija tima i fluktuacija kadrova', maxPoints: 10 },
    { name: 'Sprovođenje operativnih procedura', maxPoints: 10 },
    { name: 'Inicijativa i doprinos radu firme', maxPoints: 5 },
  ];

  const getCategory = (totalScore: number) => {
    if (totalScore >= 90) return { category: 'A', label: 'Kategorija A - Izvanredni rezultati', color: 'text-green-600 dark:text-green-400' };
    if (totalScore >= 80) return { category: 'B', label: 'Kategorija B - Zadovoljavajući rezultat', color: 'text-blue-600 dark:text-blue-400' };
    return { category: 'C', label: 'Kategorija C - Potrebno poboljšanje', color: 'text-orange-600 dark:text-orange-400' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 sm:h-48 lg:h-64">
        <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 sm:space-y-2 lg:space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-2 lg:gap-0">
        <div className="min-w-0 flex-1">
          <h2 className="text-[9px] sm:text-[10px] lg:text-xl font-semibold text-gray-900 dark:text-white mb-0.5 sm:mb-1 lg:mb-4 break-words">Evaluacija menadžera prodavnica</h2>
          <p className="text-[7px] sm:text-[8px] lg:text-sm text-gray-500 dark:text-gray-400 leading-tight">
            Evaluacija se sprovodi dva puta godišnje, nakon proteka 6 mjeseci
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedEvaluation(null);
            setShowForm(true);
          }}
          className="btn-primary text-[8px] sm:text-[9px] lg:text-base px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 flex items-center gap-1 sm:gap-1.5 lg:gap-2 whitespace-nowrap flex-shrink-0"
        >
          <Plus size={12} className="sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
          <span className="hidden sm:inline">Nova evaluacija</span>
          <span className="sm:hidden">Nova</span>
        </button>
      </div>

      {showForm && (
        <ManagerEvaluationForm
          evaluation={selectedEvaluation}
          criteria={managerCriteria}
          onSuccess={() => {
            setShowForm(false);
            setSelectedEvaluation(null);
            loadEvaluations();
          }}
          onCancel={() => {
            setShowForm(false);
            setSelectedEvaluation(null);
          }}
        />
      )}

      {!showForm && evaluations.length > 0 && (
        <div className="space-y-1.5 sm:space-y-2 lg:space-y-4">
          {evaluations.map((evaluation) => {
            const category = getCategory(evaluation.total_score || 0);
            return (
              <div key={evaluation.id} className="card p-2 sm:p-3 lg:p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-2 lg:gap-0">
                  <div 
                    className="flex-1 cursor-pointer min-w-0" 
                    onClick={() => {
                      setSelectedEvaluation(evaluation);
                      setShowForm(true);
                    }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 lg:gap-4 mb-1 sm:mb-1.5 lg:mb-2">
                      <h3 className="text-[9px] sm:text-[10px] lg:text-lg font-semibold text-gray-900 dark:text-white break-words">
                        {evaluation.manager_name || 'Menadžer'}
                      </h3>
                      <span className={`px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 rounded-full text-[7px] sm:text-[8px] lg:text-sm font-medium ${category.color} bg-opacity-10 whitespace-nowrap flex-shrink-0`}>
                        {category.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1 sm:gap-2 lg:gap-4 text-[7px] sm:text-[8px] lg:text-sm text-gray-600 dark:text-gray-400">
                      <span className="break-words">{evaluation.store_name}</span>
                      <span>•</span>
                      <span className="whitespace-nowrap">
                        {new Date(evaluation.period_start).toLocaleDateString('bs-BA')} - {new Date(evaluation.period_end).toLocaleDateString('bs-BA')}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                        {evaluation.total_score} / 100 bodova
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvaluation(evaluation);
                        setShowForm(true);
                      }}
                      className="p-1 sm:p-1.5 lg:p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Uredi evaluaciju"
                    >
                      <Edit size={12} className="sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={(e) => handleDelete(evaluation.id, e)}
                        className="p-1 sm:p-1.5 lg:p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Obriši evaluaciju"
                        disabled={loading}
                      >
                        <Trash2 size={12} className="sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!showForm && evaluations.length === 0 && (
        <div className="card p-4 sm:p-6 lg:p-12 text-center">
          <User size={24} className="sm:w-12 sm:h-12 lg:w-12 lg:h-12 mx-auto text-gray-400 mb-2 sm:mb-3 lg:mb-4" />
          <p className="text-[8px] sm:text-[9px] lg:text-base text-gray-500 dark:text-gray-400">Nema evaluacija menadžera</p>
        </div>
      )}
    </div>
  );
}

// Manager Evaluation Form Component (Prilog A)
function ManagerEvaluationForm({ evaluation, criteria, onSuccess, onCancel }: any) {
  const { user } = useAuthStore();
  
  const [formData, setFormData] = useState({
    manager_id: evaluation?.manager_id || 0,
    store_id: evaluation?.store_id || 0,
    evaluator_name: evaluation?.evaluator_name || user?.name || '',
    evaluation_date: evaluation?.evaluation_date || new Date().toISOString().split('T')[0],
    period_start: evaluation?.period_start || '',
    period_end: evaluation?.period_end || '',
    scores: evaluation?.scores || {},
    comments: evaluation?.comments || {},
    recommendations: evaluation?.recommendations || '',
    manager_signature: evaluation?.manager_signature || false,
    evaluator_signature: evaluation?.evaluator_signature || false,
  });

  const [stores, setStores] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [evaluationData, setEvaluationData] = useState<any>(evaluation);
  const [signatures, setSignatures] = useState<any[]>([]);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  useEffect(() => {
    loadInitialData();
    // Automatski popuni ime ocjenjivača sa imenom logovanog korisnika ako nije već postavljeno
    if (!evaluation?.evaluator_name && user?.name) {
      setFormData(prev => ({ ...prev, evaluator_name: user.name }));
    }
  }, [user]);
  
  // Separate effect for evaluation ID to avoid resetting signatures after signing
  useEffect(() => {
    if (evaluation?.id && evaluationData?.id !== evaluation.id) {
      // Only load if we don't already have evaluation data for this ID
      loadEvaluation();
    }
  }, [evaluation?.id]);

  const loadInitialData = async () => {
    try {
      // Load stores from both sources
      // Backend will automatically create store in planika_maloprodaja_stores if it exists in hrm_stores with maloprodaja department
      const [planikaStoresRes, hrmStoresRes, managersRes, departmentsRes] = await Promise.all([
        apiService.get('/planika/maloprodaja/stores').catch(() => []),
        getStores().catch(() => []), // Load from hrm_stores
        apiService.get('/hrm/employees?position=Menadžer prodavnice&status=active'),
        apiService.get('/hrm/departments').catch(() => []), // Get departments to find maloprodaja department
      ]);
      
      // Find maloprodaja department
      const departments = Array.isArray(departmentsRes) ? departmentsRes : (departmentsRes?.data || []);
      const maloprodajaDept = departments.find((d: any) => 
        d.name?.toLowerCase().includes('maloprodaja') || 
        d.name?.toLowerCase().includes('retail')
      );
      
      // Get stores from planika_maloprodaja_stores
      const planikaStores = Array.isArray(planikaStoresRes) ? planikaStoresRes : [];
      
      // Get stores from hrm_stores that belong to maloprodaja department
      const hrmStores = Array.isArray(hrmStoresRes) ? hrmStoresRes : (hrmStoresRes?.data || []);
      const maloprodajaHrmStores = maloprodajaDept 
        ? hrmStores.filter((s: any) => s.department_id === maloprodajaDept.id)
        : [];
      
      // Combine stores - prioritize planika stores, add hrm stores that don't exist in planika
      const planikaStoreIds = new Set(planikaStores.map((s: any) => s.id));
      const planikaStoreNames = new Set(planikaStores.map((s: any) => s.name?.toLowerCase()));
      
      // Add hrm stores that don't exist in planika (by ID or name)
      const additionalStores = maloprodajaHrmStores.filter((s: any) => 
        !planikaStoreIds.has(s.id) && 
        !planikaStoreNames.has(s.name?.toLowerCase())
      );
      
      // Combine all stores - backend will handle creation in planika_maloprodaja_stores if needed
      setStores([...planikaStores, ...additionalStores]);
      
      // Get managers from HRM employees with position "Menadžer prodavnice"
      // API returns paginated response, so we need to handle both formats
      let managersList: any[] = [];
      
      if (Array.isArray(managersRes)) {
        managersList = managersRes;
      } else if (managersRes?.data) {
        // Paginated response
        if (Array.isArray(managersRes.data)) {
          managersList = managersRes.data;
        } else if (managersRes.data?.data) {
          managersList = managersRes.data.data;
        }
      }
      
      // Map employees to manager format
      // Use hrm_employees.id (not user_id) because backend expects manager_id to exist in hrm_employees table
      const managers = managersList
        .filter((emp: any) => emp.id && emp.name)
        .map((emp: any) => ({
          id: emp.id, // hrm_employees.id
          name: emp.name,
        }));
      
      setManagers(managers);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const loadEvaluation = async () => {
    if (!evaluation?.id) return;
    try {
      const data = await apiService.get(`/planika/maloprodaja/evaluations/${evaluation.id}`);
      console.log('loadEvaluation - data:', data);
      console.log('loadEvaluation - signature_status:', data.signature_status);
      console.log('loadEvaluation - status:', data.status);
      console.log('loadEvaluation - signatures:', data.signatures);
      setEvaluationData(data);
      // Only update signatures if we have new ones, don't reset to empty array
      if (data.signatures && data.signatures.length > 0) {
        setSignatures(data.signatures);
      } else {
        // Keep existing signatures if backend doesn't return any
        setSignatures((prevSignatures) => {
          if (prevSignatures && prevSignatures.length > 0) {
            console.log('Keeping existing signatures:', prevSignatures);
            return prevSignatures;
          }
          return [];
        });
      }
    } catch (error) {
      console.error('Failed to load evaluation:', error);
    }
  };

  const handleScoreChange = (criterionName: string, score: number) => {
    setFormData(prev => ({
      ...prev,
      scores: { ...prev.scores, [criterionName]: score },
    }));
  };

  const handleCommentChange = (criterionName: string, comment: string) => {
    setFormData(prev => ({
      ...prev,
      comments: { ...prev.comments, [criterionName]: comment },
    }));
  };

  const calculateTotal = () => {
    return Object.values(formData.scores).reduce((sum: number, score: any) => sum + (Number(score) || 0), 0);
  };

  const getCategory = () => {
    const total = calculateTotal();
    if (total >= 90) return 'A';
    if (total >= 80) return 'B';
    return 'C';
  };

  const handleSubmit = async () => {
    try {
      // Validate required fields
      if (!formData.manager_id || formData.manager_id === 0) {
        toast.error('Molimo odaberite menadžera');
        return;
      }
      if (!formData.store_id || formData.store_id === 0) {
        toast.error('Molimo odaberite prodavnicu');
        return;
      }
      if (!formData.period_start || !formData.period_end) {
        toast.error('Molimo unesite period evaluacije');
        return;
      }

      setSaving(true);
      const totalScore = calculateTotal();
      const category = getCategory();
      
      // Ensure scores is not empty
      if (!formData.scores || Object.keys(formData.scores).length === 0) {
        toast.error('Molimo unesite ocjene za sve kriterije');
        setSaving(false);
        return;
      }
      
      // Ensure IDs are integers
      const payload = {
        manager_id: parseInt(String(formData.manager_id), 10),
        store_id: parseInt(String(formData.store_id), 10),
        evaluator_name: formData.evaluator_name,
        evaluation_date: formData.evaluation_date,
        period_start: formData.period_start,
        period_end: formData.period_end,
        scores: formData.scores,
        comments: formData.comments || {},
        recommendations: formData.recommendations || '',
      };

      let savedEvaluation;
      if (evaluation?.id) {
        savedEvaluation = await apiService.put(`/planika/maloprodaja/evaluations/managers/${evaluation.id}`, payload);
        toast.success('Evaluacija uspješno ažurirana');
      } else {
        savedEvaluation = await apiService.post('/planika/maloprodaja/evaluations/managers', payload);
        toast.success('Evaluacija uspješno kreirana');
        // Update evaluation ID for signature functionality
        if (savedEvaluation?.id) {
          setEvaluationData({ ...evaluation, id: savedEvaluation.id });
          // Update evaluation object with new ID
          evaluation = { ...evaluation, id: savedEvaluation.id };
        }
      }
      
      // Reload evaluation to get updated data including signatures
      if (evaluation?.id || savedEvaluation?.id) {
        const evalId = evaluation?.id || savedEvaluation?.id;
        const fullEvaluation = await apiService.get(`/planika/maloprodaja/evaluations/${evalId}`);
        setEvaluationData(fullEvaluation);
        // Merge signatures instead of replacing - preserve existing signature_data
        setSignatures((prevSignatures) => {
          const newSignatures = fullEvaluation.signatures || [];
          if (newSignatures.length > 0) {
            // Merge with existing signatures, keeping signature_data if it exists
            return newSignatures.map((newSig: any) => {
              const existing = prevSignatures.find((prev: any) => 
                prev.id === newSig.id || 
                (prev.signature_type === newSig.signature_type && prev.user_id === newSig.user_id)
              );
              if (existing && existing.signature_data && !newSig.signature_data) {
                return { ...newSig, signature_data: existing.signature_data };
              }
              return newSig;
            });
          }
          // Keep existing signatures if backend doesn't return any
          return prevSignatures && prevSignatures.length > 0 ? prevSignatures : [];
        });
      }
      
      // Don't close form, allow signing
      // onSuccess();
    } catch (error: any) {
      console.error('Failed to save evaluation:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error response errors:', error.response?.data?.errors);
      console.error('Form data:', formData);
      
      // Better error messages
      let errorMessage = 'Greška pri čuvanju evaluacije';
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        if (errors.store_id) {
          errorMessage = 'Odabrana prodavnica ne postoji u sistemu. Molimo odaberite prodavnicu iz liste koja postoji u planika_maloprodaja_stores tabeli.';
        } else if (errors.manager_id) {
          errorMessage = 'Odabrani menadžer ne postoji u sistemu. Molimo odaberite menadžera iz liste.';
        } else {
          errorMessage = Object.values(errors).flat().join(', ');
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async (signatureData: string) => {
    if (!evaluationData?.id) {
      toast.error('Sačuvajte evaluaciju prije potpisivanja');
      return;
    }

    try {
      setIsSigning(true);
      const signatureResponse = await apiService.post(`/planika/maloprodaja/evaluations/${evaluationData.id}/sign`, {
        signature_type: 'evaluator',
        signature_data: signatureData,
      });
      
      console.log('Signature response:', signatureResponse);
      
      toast.success('Evaluacija je uspješno potpisana');
      setShowSignaturePad(false);
      
      // Wait a bit for backend to process
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Reload evaluation to get updated data including signatures
      const updatedEvaluation = await apiService.get(`/planika/maloprodaja/evaluations/${evaluationData.id}`);
      console.log('Updated evaluation after signing:', updatedEvaluation);
      console.log('Signatures from API:', updatedEvaluation.signatures);
      console.log('Signature status:', updatedEvaluation.signature_status);
      if (updatedEvaluation.signatures && updatedEvaluation.signatures.length > 0) {
        console.log('First signature details:', {
          id: updatedEvaluation.signatures[0].id,
          signature_type: updatedEvaluation.signatures[0].signature_type,
          hasSignatureData: !!updatedEvaluation.signatures[0].signature_data,
          signatureDataLength: updatedEvaluation.signatures[0].signature_data?.length,
          hasSignedAt: !!updatedEvaluation.signatures[0].signed_at,
          signedAt: updatedEvaluation.signatures[0].signed_at,
          hasCreatedAt: !!updatedEvaluation.signatures[0].created_at,
          createdAt: updatedEvaluation.signatures[0].created_at
        });
      }
      
      // Update state with fresh data - ensure signature_status is set
      const finalEvaluation = {
        ...updatedEvaluation,
        signature_status: updatedEvaluation.signature_status || 'evaluator_signed'
      };
      
      setEvaluationData(finalEvaluation);
      
      // Update signatures array
      let newSignatures = updatedEvaluation.signatures || [];
      
      // Always ensure signature_data is included from signatureData parameter
      if (signatureResponse) {
        // Create signature object with all necessary data
        const signatureWithData = {
          ...signatureResponse,
          signature_data: signatureResponse.signature_data || signatureData,
          signed_at: signatureResponse.signed_at || signatureResponse.created_at || new Date().toISOString(),
          user_name: signatureResponse.user_name || formData.evaluator_name || user?.name || 'Nepoznato'
        };
        
        if (newSignatures.length === 0) {
          newSignatures = [signatureWithData];
        } else {
          // Check if signature already exists
          const existingIndex = newSignatures.findIndex((s: any) => 
            s.id === signatureResponse.id || 
            (s.signature_type === 'evaluator' && s.user_id === signatureResponse.user_id)
          );
          
          if (existingIndex >= 0) {
            // Update existing signature
            newSignatures[existingIndex] = {
              ...newSignatures[existingIndex],
              ...signatureWithData,
              signature_data: signatureWithData.signature_data || newSignatures[existingIndex].signature_data,
              signed_at: signatureWithData.signed_at || newSignatures[existingIndex].signed_at
            };
          } else {
            // Add new signature
            newSignatures.push(signatureWithData);
          }
        }
      } else if (finalEvaluation.signature_status === 'evaluator_signed' || finalEvaluation.signature_status === 'completed') {
        // Create a mock signature object if table doesn't exist but status is set
        if (newSignatures.length === 0) {
          newSignatures = [{
            id: null,
            signature_type: 'evaluator',
            user_name: formData.evaluator_name || user?.name || 'Nepoznato',
            user_id: user?.id,
            signed_at: new Date().toISOString(),
            signature_data: signatureData
          }];
        } else {
          // Ensure signature_data is added to existing signatures
          newSignatures = newSignatures.map((sig: any) => {
            if (sig.signature_type === 'evaluator' && !sig.signature_data) {
              return { ...sig, signature_data: signatureData };
            }
            return sig;
          });
        }
      }
      
      // Final check: ensure all evaluator signatures have signature_data and signed_at
      if (signatureData) {
        newSignatures = newSignatures.map((sig: any) => {
          if (sig.signature_type === 'evaluator') {
            return {
              ...sig,
              signature_data: sig.signature_data || signatureData,
              signed_at: sig.signed_at || sig.created_at || new Date().toISOString()
            };
          }
          return sig;
        });
      }
      
      console.log('Setting signatures:', newSignatures);
      console.log('Signature data present:', newSignatures.some((s: any) => s.signature_data));
      console.log('Signed at present:', newSignatures.some((s: any) => s.signed_at));
      console.log('First signature details:', newSignatures[0] ? {
        hasSignatureData: !!newSignatures[0].signature_data,
        signatureDataLength: newSignatures[0].signature_data?.length,
        hasSignedAt: !!newSignatures[0].signed_at,
        signedAt: newSignatures[0].signed_at
      } : 'No signatures');
      setSignatures(newSignatures);
      
      // Don't refresh from API - keep the signatures we just set
      // The signatures state is already updated with all necessary data
    } catch (error: any) {
      console.error('Failed to sign evaluation:', error);
      toast.error(error?.response?.data?.error || 'Greška pri potpisivanju evaluacije');
    } finally {
      setIsSigning(false);
    }
  };

  const handleLock = async () => {
    if (!evaluationData?.id) return;

    try {
      setIsLocking(true);
      // Lock evaluation by updating status to completed
      // Use the same route as update (managers route for manager evaluations)
      const isManagerEvaluation = evaluation?.id && evaluation.id === evaluationData.id;
      const updateRoute = isManagerEvaluation 
        ? `/planika/maloprodaja/evaluations/managers/${evaluationData.id}`
        : `/planika/maloprodaja/evaluations/${evaluationData.id}`;
      
      await apiService.put(updateRoute, {
        status: 'completed',
        signature_status: 'completed',
      });
      toast.success('Evaluacija je zaključana');
      
      // Reload evaluation to get updated data
      const updatedEvaluation = await apiService.get(`/planika/maloprodaja/evaluations/${evaluationData.id}`);
      console.log('Updated evaluation after locking:', updatedEvaluation);
      console.log('Signature status after locking:', updatedEvaluation.signature_status);
      setEvaluationData({
        ...updatedEvaluation,
        signature_status: 'completed',
        status: 'completed'
      });
      setSignatures(updatedEvaluation.signatures || []);
    } catch (error: any) {
      console.error('Failed to lock evaluation:', error);
      console.error('Error response:', error?.response?.data);
      toast.error(error?.response?.data?.message || error?.response?.data?.error || 'Greška pri zaključavanju evaluacije');
    } finally {
      setIsLocking(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!evaluationData?.id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}/api/planika/maloprodaja/evaluations/${evaluationData.id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('PDF download failed:', response.status, errorData);
        throw new Error(errorData.error || `Failed to download PDF: ${response.status} ${response.statusText}`);
      }

      // Check if response is actually PDF
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        const errorText = await response.text();
        console.error('Response is not PDF:', contentType, errorText);
        throw new Error('Server did not return a PDF file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluation_${evaluationData.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF je uspješno preuzet');
    } catch (error: any) {
      console.error('Failed to download PDF:', error);
      toast.error(error?.message || 'Greška pri preuzimanju PDF-a');
    }
  };

  const isLocked = evaluationData?.signature_status === 'completed';

  return (
    <div className="card p-4 sm:p-6 space-y-4 sm:space-y-6">
      {isLocked && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            <AlertCircle className="inline w-4 h-4 mr-2" />
            Evaluacija je zaključana i ne može se mijenjati.
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Ime i prezime menadžera prodavnice *
          </label>
          <select
            value={formData.manager_id}
            onChange={(e) => setFormData({ ...formData, manager_id: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
            disabled={isLocked}
          >
            <option value={0}>Odaberite menadžera</option>
            {managers.map((m: any) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Maloprodajni objekat *
          </label>
          <select
            value={formData.store_id}
            onChange={(e) => setFormData({ ...formData, store_id: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value={0}>Odaberite prodavnicu</option>
            {stores.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Period ocjenjivanja (od) *
          </label>
          <input
            type="date"
            value={formData.period_start}
            onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
            disabled={isLocked}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Period ocjenjivanja (do) *
          </label>
          <input
            type="date"
            value={formData.period_end}
            onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Ime i prezime ocjenjivača *
          </label>
          <input
            type="text"
            value={formData.evaluator_name}
            onChange={(e) => setFormData({ ...formData, evaluator_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white cursor-not-allowed"
            required
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Datum ocjenjivanja *
          </label>
          <input
            type="date"
            value={formData.evaluation_date}
            onChange={(e) => setFormData({ ...formData, evaluation_date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          I. KRITERIJ OCJENJIVANJA
        </h3>
        <div className="space-y-4">
          {criteria.map((criterion: any, index: number) => (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {criterion.name}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Maksimalno: {criterion.maxPoints} bodova
                  </p>
                </div>
                <div className="ml-4">
                  <input
                    type="number"
                    min={0}
                    max={criterion.maxPoints}
                    value={formData.scores[criterion.name] || 0}
                    onChange={(e) => handleScoreChange(criterion.name, parseInt(e.target.value) || 0)}
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                    disabled={isLocked}
                  />
                </div>
              </div>
              <textarea
                placeholder="Komentar ocjenjivača..."
                value={formData.comments[criterion.name] || ''}
                onChange={(e) => handleCommentChange(criterion.name, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                rows={2}
                disabled={isLocked}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">UKUPNO:</span>
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {calculateTotal()} / 100 bodova
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          II. OCJENA I KATEGORIZACIJA
        </h3>
        <div className="space-y-2">
          {[
            { range: '90+', category: 'Kategorija A', checked: getCategory() === 'A' },
            { range: '80-89', category: 'Kategorija B', checked: getCategory() === 'B' },
            { range: '0-79', category: 'Kategorija C', checked: getCategory() === 'C' },
          ].map((item) => (
            <label key={item.range} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={item.checked}
                readOnly
                className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {item.range} - {item.category}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          III. PREPORUKE I KOMENTAR
        </h3>
        <textarea
          value={formData.recommendations}
          onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          rows={4}
          placeholder="Unesite preporuke i komentar..."
          disabled={isLocked}
        />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Potpis ocjenjivača
          </label>
          {(() => {
            const hasEvaluatorSignature = signatures && Array.isArray(signatures) && signatures.length > 0 && signatures.some((s: any) => s.signature_type === 'evaluator' && (s.id || s.signature_data || s.signed_at || s.user_id));
            const isSigned = evaluationData?.signature_status === 'evaluator_signed' || evaluationData?.signature_status === 'completed';
            const shouldShowSignature = hasEvaluatorSignature || isSigned;
            
            console.log('Signature check:', { 
              hasEvaluatorSignature, 
              isSigned, 
              shouldShowSignature, 
              signaturesCount: signatures?.length, 
              signatures, 
              signatureStatus: evaluationData?.signature_status,
              evaluationId: evaluationData?.id
            });
            
            if (shouldShowSignature) {
              const evaluatorSignatures = signatures.filter((s: any) => s.signature_type === 'evaluator');
              
              return (
                <div className="space-y-2">
                  {evaluatorSignatures.length > 0 ? (
                    evaluatorSignatures.map((signature: any, index: number) => (
                      <div key={signature.id || `sig-${index}`} className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {signature.user_name || formData.evaluator_name || user?.name || 'Nepoznato'}
                              </p>
                              {signature.signed_at ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Potpisano: {(() => {
                                    try {
                                      const date = new Date(signature.signed_at);
                                      return date.toLocaleString('bs-BA', { 
                                        year: 'numeric', 
                                        month: '2-digit', 
                                        day: '2-digit', 
                                        hour: '2-digit', 
                                        minute: '2-digit',
                                        second: '2-digit'
                                      });
                                    } catch (e) {
                                      return signature.signed_at;
                                    }
                                  })()}
                                </p>
                              ) : signature.created_at ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Potpisano: {(() => {
                                    try {
                                      const date = new Date(signature.created_at);
                                      return date.toLocaleString('bs-BA', { 
                                        year: 'numeric', 
                                        month: '2-digit', 
                                        day: '2-digit', 
                                        hour: '2-digit', 
                                        minute: '2-digit',
                                        second: '2-digit'
                                      });
                                    } catch (e) {
                                      return signature.created_at;
                                    }
                                  })()}
                                </p>
                              ) : (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Potpisano
                                </p>
                              )}
                            </div>
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 ml-3" />
                          </div>
                          {signature.signature_data && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Digitalni potpis:</p>
                              <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 p-2 flex items-center justify-center min-h-[80px]">
                                <img 
                                  src={signature.signature_data} 
                                  alt="Digitalni potpis" 
                                  className="max-w-full h-auto max-h-32 object-contain"
                                  onError={(e) => {
                                    console.error('Failed to load signature image. Data length:', signature.signature_data?.length);
                                    console.error('Signature data preview:', signature.signature_data?.substring(0, 100));
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                  onLoad={() => {
                                    console.log('Signature image loaded successfully');
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {formData.evaluator_name || user?.name || 'Nepoznato'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Potpisano
                          </p>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 ml-3" />
                      </div>
                    </div>
                  )}
                </div>
              );
            }
            
            return (
              <div className="space-y-3">
                <div className="h-16 border-b-2 border-gray-300 dark:border-gray-600 flex items-end">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {formData.evaluator_name || user?.name || 'Nepoznato'}
                  </span>
                </div>
                {evaluationData?.id && !hasEvaluatorSignature && !isSigned && !isSigning && (
                  <button
                    onClick={() => setShowSignaturePad(true)}
                    disabled={isSigning}
                    className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <PenTool size={18} />
                    Digitalni potpis
                  </button>
                )}
                {isSigning && (
                  <div className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg flex items-center justify-center gap-2">
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    Potpisivanje...
                  </div>
                )}
                {!evaluationData?.id && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    Sačuvajte evaluaciju prije potpisivanja
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Lock and PDF buttons */}
      {evaluationData?.id && (signatures.some((s: any) => s.signature_type === 'evaluator' && (s.id || s.signature_data || s.signed_at)) || evaluationData?.signature_status === 'evaluator_signed' || evaluationData?.signature_status === 'completed') && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
            {evaluationData?.signature_status !== 'completed' && (
              <button
                onClick={handleLock}
                disabled={isLocking || saving}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Lock size={18} />
                {isLocking ? 'Zaključavanje...' : 'Zaključaj evaluaciju'}
              </button>
            )}
            {evaluationData?.signature_status === 'completed' && (
              <button
                onClick={handleDownloadPdf}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Download size={18} />
                Preuzmi PDF
              </button>
            )}
            {evaluationData?.signature_status === 'completed' && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Zaključano
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
        <button onClick={onCancel} className="btn-secondary" disabled={saving}>
          Otkaži
        </button>
        <button 
          onClick={handleSubmit} 
          className="btn-primary" 
          disabled={saving || (evaluationData?.signature_status === 'completed')}
        >
          {saving ? 'Čuvanje...' : evaluation ? 'Ažuriraj' : 'Sačuvaj'}
        </button>
      </div>

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <SignaturePad
          title="Digitalni potpis ocjenjivača"
          onSave={handleSign}
          onCancel={() => setShowSignaturePad(false)}
        />
      )}
    </div>
  );
}

// Sales Staff Evaluations Tab
function SalesStaffEvaluationsTab() {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);

  useEffect(() => {
    loadEvaluations();
  }, []);

  const loadEvaluations = async () => {
    try {
      setLoading(true);
      const data = await apiService.get('/planika/maloprodaja/evaluations/sales-staff');
      setEvaluations(data || []);
    } catch (error) {
      console.error('Failed to load sales staff evaluations:', error);
      toast.error('Greška pri učitavanju evaluacija prodajnog osoblja');
    } finally {
      setLoading(false);
    }
  };

  const salesStaffCriteria = [
    { name: 'Prodajni rezultati – finansijski i parski plan', maxPoints: 30 },
    { name: 'Plan prodavnice', maxPoints: 20 },
    { name: 'KPI i Planika Club učešće', maxPoints: 10 },
    { name: 'Kvalitet usluge (7 koraka)', maxPoints: 20 },
    { name: 'Poznavanje proizvoda', maxPoints: 10 },
    { name: 'Radna disciplina i timski rad', maxPoints: 10 },
  ];

  const getCategory = (totalScore: number) => {
    if (totalScore >= 90) return { category: 'A', label: 'Prodavač – kategorija A', color: 'text-green-600 dark:text-green-400' };
    if (totalScore >= 80) return { category: 'B', label: 'Prodavač – kategorija B', color: 'text-blue-600 dark:text-blue-400' };
    return { category: 'C', label: 'Prodavač – kategorija C', color: 'text-orange-600 dark:text-orange-400' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h2 className="text-sm sm:text-base lg:text-xl font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2">Evaluacija prodajnog osoblja</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ocjenjivanje se sprovodi svakih 6 mjeseci. Svi novi zaposleni kreću od kategorije C.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedEvaluation(null);
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <Plus size={18} className="mr-2" />
          Nova evaluacija
        </button>
      </div>

      {showForm && (
        <SalesStaffEvaluationForm
          evaluation={selectedEvaluation}
          criteria={salesStaffCriteria}
          onSuccess={() => {
            setShowForm(false);
            setSelectedEvaluation(null);
            loadEvaluations();
          }}
          onCancel={() => {
            setShowForm(false);
            setSelectedEvaluation(null);
          }}
        />
      )}

      {!showForm && evaluations.length > 0 && (
        <div className="space-y-4">
          {evaluations.map((evaluation) => {
            const category = getCategory(evaluation.total_score || 0);
            return (
              <div key={evaluation.id} className="card p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
                setSelectedEvaluation(evaluation);
                setShowForm(true);
              }}>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                        {evaluation.employee_name || 'Zaposleni'}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${category.color} bg-opacity-10`}>
                        {category.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <span>{evaluation.store_name}</span>
                      <span>•</span>
                      <span>
                        {new Date(evaluation.period_start).toLocaleDateString('bs-BA')} - {new Date(evaluation.period_end).toLocaleDateString('bs-BA')}
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {evaluation.total_score} / 100 bodova
                      </span>
                    </div>
                  </div>
                  <Edit size={18} className="text-gray-400" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!showForm && evaluations.length === 0 && (
        <div className="card p-12 text-center">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nema evaluacija prodajnog osoblja</p>
        </div>
      )}
    </div>
  );
}

// Sales Staff Evaluation Form Component (Prilog B)
function SalesStaffEvaluationForm({ evaluation, criteria, onSuccess, onCancel }: any) {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    employee_id: evaluation?.employee_id || 0,
    store_id: evaluation?.store_id || 0,
    position: evaluation?.position || '',
    evaluator_name: evaluation?.evaluator_name || '',
    evaluation_date: evaluation?.evaluation_date || new Date().toISOString().split('T')[0],
    period_start: evaluation?.period_start || '',
    period_end: evaluation?.period_end || '',
    scores: evaluation?.scores || {},
    comments: evaluation?.comments || {},
    recommendations: evaluation?.recommendations || '',
  });

  const [stores, setStores] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [evaluationData, setEvaluationData] = useState<any>(evaluation || null);
  const [signatures, setSignatures] = useState<any[]>([]);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  useEffect(() => {
    console.log('SalesStaffEvaluationForm useEffect - loading initial data');
    let isMounted = true;
    
    const loadData = async () => {
      await loadInitialData();
      if (evaluation?.id) {
        await loadEvaluation();
      } else {
        if (isMounted) {
          setEvaluationData(null);
          setSignatures([]);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Removed useEffect for loadStoreEmployees - we now load all employees with position "Prodavač" in loadInitialData
  // No need to reload employees when store changes since we show all employees with position "Prodavač"

  useEffect(() => {
    if (evaluation?.id) {
      loadEvaluation();
    }
  }, [evaluation?.id]);

  const loadInitialData = async () => {
    try {
      console.log('Loading initial data for SalesStaffEvaluationForm...');
      const [storesRes, employeesRes] = await Promise.all([
        getStores({ is_active: true }),
        apiService.get('/hrm/employees?position=Prodavač'),
      ]);
      
      console.log('Raw API responses:', {
        stores: storesRes,
        employees: employeesRes
      });
      
      // Handle stores - getStores returns array directly
      const storesList = storesRes || [];
      console.log(`Parsed ${storesList.length} stores:`, storesList);
      setStores(storesList);
      
      // Handle employees - API returns array directly when filtering by position
      const employeesList = Array.isArray(employeesRes) 
        ? employeesRes 
        : (employeesRes?.data || []);
      console.log(`Parsed ${employeesList.length} employees with position "Prodavač":`, employeesList);
      setEmployees(employeesList);
      
      if (storesList.length === 0) {
        console.warn('⚠️ No stores found');
        console.warn('Stores response:', storesRes);
      }
      if (employeesList.length === 0) {
        console.warn('⚠️ No employees found with position "Prodavač"');
        console.warn('Employee response:', employeesRes);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      toast.error('Greška pri učitavanju podataka');
    }
  };

  const loadStoreEmployees = async (storeId: number) => {
    // Load all employees with position "Prodavač" regardless of store
    // This matches the requirement to show all employees with position "Prodavač"
    try {
      const employeesRes = await apiService.get('/hrm/employees?position=Prodavač');
      const employeesList = Array.isArray(employeesRes) 
        ? employeesRes 
        : (employeesRes?.data || []);
      setEmployees(employeesList);
      console.log(`Loaded ${employeesList.length} employees with position "Prodavač"`);
    } catch (error) {
      console.error('Failed to load employees:', error);
      toast.error('Greška pri učitavanju zaposlenih');
    }
  };

  const loadEvaluation = async () => {
    if (!evaluation?.id) return;
    try {
      const data = await apiService.get(`/planika/maloprodaja/evaluations/${evaluation.id}`);
      setEvaluationData(data);
      setSignatures(data.signatures || []);
    } catch (error) {
      console.error('Failed to load evaluation:', error);
    }
  };

  const handleScoreChange = (criterionName: string, score: number) => {
    setFormData(prev => ({
      ...prev,
      scores: { ...prev.scores, [criterionName]: score },
    }));
  };

  const handleCommentChange = (criterionName: string, comment: string) => {
    setFormData(prev => ({
      ...prev,
      comments: { ...prev.comments, [criterionName]: comment },
    }));
  };

  const calculateTotal = () => {
    return Object.values(formData.scores).reduce((sum: number, score: any) => sum + (Number(score) || 0), 0);
  };

  const getCategory = () => {
    const total = calculateTotal();
    if (total >= 90) return 'A';
    if (total >= 80) return 'B';
    return 'C';
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const totalScore = calculateTotal();
      const category = getCategory();
      
      const payload = {
        ...formData,
        total_score: totalScore,
        category,
        type: 'sales_staff',
      };

      let savedEvaluation;
      if (evaluation?.id) {
        savedEvaluation = await apiService.put(`/planika/maloprodaja/evaluations/sales-staff/${evaluation.id}`, payload);
        toast.success('Evaluacija uspješno ažurirana');
      } else {
        savedEvaluation = await apiService.post('/planika/maloprodaja/evaluations/sales-staff', payload);
        toast.success('Evaluacija uspješno kreirana');
        if (savedEvaluation?.id) {
          setEvaluationData({ ...evaluation, id: savedEvaluation.id });
        }
      }
      
      // Reload evaluation to get updated data including signatures
      if (evaluation?.id || savedEvaluation?.id) {
        const evalId = evaluation?.id || savedEvaluation?.id;
        const fullEvaluation = await apiService.get(`/planika/maloprodaja/evaluations/${evalId}`);
        setEvaluationData(fullEvaluation);
        setSignatures(fullEvaluation.signatures || []);
      }
      
      // Don't close form, allow signing
    } catch (error: any) {
      console.error('Failed to save evaluation:', error);
      toast.error(error.response?.data?.message || 'Greška pri čuvanju evaluacije');
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async (signatureData: string) => {
    if (!evaluationData?.id) {
      toast.error('Molimo prvo sačuvajte evaluaciju');
      return;
    }

    try {
      setIsSigning(true);
      const signatureResponse = await apiService.post(`/planika/maloprodaja/evaluations/${evaluationData.id}/sign`, {
        signature_type: 'evaluator',
        signature_data: signatureData,
      });

      toast.success('Evaluacija uspješno potpisana');
      setShowSignaturePad(false);

      // Reload evaluation to get updated data including signatures
      const updatedEvaluation = await apiService.get(`/planika/maloprodaja/evaluations/${evaluationData.id}`);
      setEvaluationData({
        ...updatedEvaluation,
        signature_status: updatedEvaluation.signature_status || 'evaluator_signed'
      });
      
      // Update signatures array
      let newSignatures = updatedEvaluation.signatures || [];
      if (signatureResponse) {
        const signatureWithData = {
          ...signatureResponse,
          signature_data: signatureResponse.signature_data || signatureData,
          signed_at: signatureResponse.signed_at || signatureResponse.created_at || new Date().toISOString(),
          user_name: signatureResponse.user_name || formData.evaluator_name || user?.name || 'Nepoznato'
        };
        
        if (newSignatures.length === 0) {
          newSignatures = [signatureWithData];
        } else {
          const existingIndex = newSignatures.findIndex((s: any) => 
            s.id === signatureResponse.id || 
            (s.signature_type === 'evaluator' && s.user_id === signatureResponse.user_id)
          );
          
          if (existingIndex >= 0) {
            newSignatures[existingIndex] = {
              ...newSignatures[existingIndex],
              ...signatureWithData,
              signature_data: signatureWithData.signature_data || newSignatures[existingIndex].signature_data,
              signed_at: signatureWithData.signed_at || newSignatures[existingIndex].signed_at
            };
          } else {
            newSignatures.push(signatureWithData);
          }
        }
      } else if (updatedEvaluation.signature_status === 'evaluator_signed' || updatedEvaluation.signature_status === 'completed') {
        if (newSignatures.length === 0) {
          newSignatures = [{
            id: null,
            signature_type: 'evaluator',
            user_name: formData.evaluator_name || user?.name || 'Nepoznato',
            user_id: user?.id,
            signed_at: new Date().toISOString(),
            signature_data: signatureData
          }];
        }
      }
      
      if (signatureData) {
        newSignatures = newSignatures.map((sig: any) => {
          if (sig.signature_type === 'evaluator') {
            return {
              ...sig,
              signature_data: sig.signature_data || signatureData,
              signed_at: sig.signed_at || sig.created_at || new Date().toISOString()
            };
          }
          return sig;
        });
      }
      
      setSignatures(newSignatures);
    } catch (error: any) {
      console.error('Failed to sign evaluation:', error);
      toast.error(error?.response?.data?.error || 'Greška pri potpisivanju evaluacije');
    } finally {
      setIsSigning(false);
    }
  };

  const handleLock = async () => {
    if (!evaluationData?.id) return;

    try {
      setIsLocking(true);
      await apiService.put(`/planika/maloprodaja/evaluations/sales-staff/${evaluationData.id}`, {
        status: 'completed',
        signature_status: 'completed',
      });
      toast.success('Evaluacija je zaključana');
      
      // Reload evaluation to get updated data
      const updatedEvaluation = await apiService.get(`/planika/maloprodaja/evaluations/${evaluationData.id}`);
      setEvaluationData({
        ...updatedEvaluation,
        signature_status: 'completed',
        status: 'completed'
      });
      setSignatures(updatedEvaluation.signatures || []);
    } catch (error: any) {
      console.error('Failed to lock evaluation:', error);
      toast.error(error?.response?.data?.message || error?.response?.data?.error || 'Greška pri zaključavanju evaluacije');
    } finally {
      setIsLocking(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!evaluationData?.id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}/api/planika/maloprodaja/evaluations/${evaluationData.id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to download PDF: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        const errorText = await response.text();
        throw new Error('Server did not return a PDF file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluation_${evaluationData.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF je uspješno preuzet');
    } catch (error: any) {
      console.error('Failed to download PDF:', error);
      toast.error(error?.message || 'Greška pri preuzimanju PDF-a');
    }
  };

  const isLocked = evaluationData?.signature_status === 'completed';

  // Debug: log stores and employees state
  console.log('SalesStaffEvaluationForm render - stores:', stores, 'stores.length:', stores?.length, 'employees:', employees, 'employees.length:', employees?.length);

  return (
    <div className="card p-4 sm:p-6 space-y-4 sm:space-y-6">
      {isLocked && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            <AlertCircle className="inline w-4 h-4 mr-2" />
            Evaluacija je zaključana i ne može se mijenjati.
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Ime i prezime zaposlenog *
          </label>
          <select
            value={formData.employee_id}
            onChange={(e) => setFormData({ ...formData, employee_id: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
            disabled={isLocked}
          >
            <option value={0}>Odaberite zaposlenog</option>
            {!employees || employees.length === 0 ? (
              <option disabled>
                {!employees ? 'Učitavanje...' : 'Nema dostupnih zaposlenih sa pozicijom "Prodavač"'}
              </option>
            ) : (
              employees.map((emp: any) => {
                // API returns users.name (full name) or first_name + last_name from hrm_employees
                const displayName = emp.name 
                  || (emp.first_name && emp.last_name ? `${emp.first_name} ${emp.last_name}`.trim() : '')
                  || 'Nepoznat zaposleni';
                return (
                  <option key={emp.id} value={emp.id}>
                    {displayName}
                  </option>
                );
              })
            )}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Radno mjesto *
          </label>
          <input
            type="text"
            value={formData.position}
            onChange={(e) => setFormData({ ...formData, position: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
            disabled={isLocked}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Maloprodajni objekat *
          </label>
          <select
            value={formData.store_id}
            onChange={(e) => setFormData({ ...formData, store_id: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
            disabled={isLocked}
          >
            <option value={0}>Odaberite prodavnicu</option>
            {!stores || stores.length === 0 ? (
              <option disabled>
                {!stores ? 'Učitavanje...' : 'Nema dostupnih prodavnica'}
              </option>
            ) : (
              stores.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Period ocjenjivanja (od) *
          </label>
          <input
            type="date"
            value={formData.period_start}
            onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
            disabled={isLocked}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Period ocjenjivanja (do) *
          </label>
          <input
            type="date"
            value={formData.period_end}
            onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
            disabled={isLocked}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Ime i prezime ocjenjivača *
          </label>
          <input
            type="text"
            value={formData.evaluator_name}
            onChange={(e) => setFormData({ ...formData, evaluator_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
            disabled={isLocked}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Datum ocjenjivanja *
          </label>
          <input
            type="date"
            value={formData.evaluation_date}
            onChange={(e) => setFormData({ ...formData, evaluation_date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
            disabled={isLocked}
          />
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          I. KRITERIJ OCJENJIVANJA
        </h3>
        <div className="space-y-4">
          {criteria.map((criterion: any, index: number) => (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {criterion.name}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Maksimalno: {criterion.maxPoints} bodova
                  </p>
                </div>
                <div className="ml-4">
                  <input
                    type="number"
                    min={0}
                    max={criterion.maxPoints}
                    value={formData.scores[criterion.name] || 0}
                    onChange={(e) => handleScoreChange(criterion.name, parseInt(e.target.value) || 0)}
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center"
                    disabled={isLocked}
                  />
                </div>
              </div>
              <textarea
                placeholder="Komentar ocjenjivača..."
                value={formData.comments[criterion.name] || ''}
                onChange={(e) => handleCommentChange(criterion.name, e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                rows={2}
                disabled={isLocked}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">UKUPNO:</span>
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">
              {calculateTotal()} / 100 bodova
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          II. OCJENA I KATEGORIZACIJA
        </h3>
        <div className="space-y-2">
          {[
            { range: '90 – 100', category: 'Prodavač – kategorija A', checked: getCategory() === 'A' },
            { range: '80 – 89', category: 'Prodavač – kategorija B', checked: getCategory() === 'B' },
            { range: 'Ispod 80', category: 'Prodavač – kategorija C', checked: getCategory() === 'C' },
          ].map((item) => (
            <label key={item.range} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={item.checked}
                readOnly
                className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {item.range} - {item.category}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
          III. PREPORUKE I KOMENTAR ZA DALJI RAZVOJ
        </h3>
        <textarea
          value={formData.recommendations}
          onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          rows={4}
          placeholder="Unesite preporuke i komentar za dalji razvoj..."
          disabled={isLocked}
        />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Potpis ocjenjivača
          </label>
          {(() => {
            const hasEvaluatorSignature = signatures && Array.isArray(signatures) && signatures.length > 0 && signatures.some((s: any) => s.signature_type === 'evaluator' && (s.id || s.signature_data || s.signed_at || s.user_id));
            const isSigned = evaluationData?.signature_status === 'evaluator_signed' || evaluationData?.signature_status === 'completed';
            const shouldShowSignature = hasEvaluatorSignature || isSigned;
            
            if (shouldShowSignature) {
              const evaluatorSignatures = signatures.filter((s: any) => s.signature_type === 'evaluator');
              
              return (
                <div className="space-y-2">
                  {evaluatorSignatures.length > 0 ? (
                    evaluatorSignatures.map((signature: any, index: number) => (
                      <div key={signature.id || `sig-${index}`} className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {signature.user_name || formData.evaluator_name || user?.name || 'Nepoznato'}
                              </p>
                              {signature.signed_at ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Potpisano: {(() => {
                                    try {
                                      const date = new Date(signature.signed_at);
                                      return date.toLocaleString('bs-BA', { 
                                        year: 'numeric', 
                                        month: '2-digit', 
                                        day: '2-digit', 
                                        hour: '2-digit', 
                                        minute: '2-digit',
                                        second: '2-digit'
                                      });
                                    } catch (e) {
                                      return signature.signed_at;
                                    }
                                  })()}
                                </p>
                              ) : signature.created_at ? (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Potpisano: {(() => {
                                    try {
                                      const date = new Date(signature.created_at);
                                      return date.toLocaleString('bs-BA', { 
                                        year: 'numeric', 
                                        month: '2-digit', 
                                        day: '2-digit', 
                                        hour: '2-digit', 
                                        minute: '2-digit',
                                        second: '2-digit'
                                      });
                                    } catch (e) {
                                      return signature.created_at;
                                    }
                                  })()}
                                </p>
                              ) : (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Potpisano
                                </p>
                              )}
                            </div>
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 ml-3" />
                          </div>
                          {signature.signature_data && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Digitalni potpis:</p>
                              <div className="bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 p-2 flex items-center justify-center min-h-[80px]">
                                <img 
                                  src={signature.signature_data} 
                                  alt="Digitalni potpis" 
                                  className="max-w-full h-auto max-h-32 object-contain"
                                  onError={(e) => {
                                    console.error('Failed to load signature image');
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {formData.evaluator_name || user?.name || 'Nepoznato'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Potpisano</p>
                    </div>
                  )}
                </div>
              );
            }
            
            return (
              <div>
                {evaluationData?.id && !showSignaturePad && (
                  <button
                    onClick={() => setShowSignaturePad(true)}
                    className="btn-secondary"
                    disabled={isSigning || evaluationData?.signature_status === 'completed'}
                  >
                    Digitalni potpis
                  </button>
                )}
                {showSignaturePad && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
                    <SignaturePad
                      onSave={handleSign}
                      onCancel={() => setShowSignaturePad(false)}
                      isLoading={isSigning}
                    />
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {evaluationData?.signature_status === 'completed' && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-sm font-medium">
                Zaključano
              </span>
            </div>
            <button
              onClick={handleDownloadPdf}
              className="btn-primary flex items-center gap-2"
            >
              <Download size={18} />
              Preuzmi PDF
            </button>
          </div>
        </div>
      )}

      {evaluationData?.signature_status === 'evaluator_signed' && evaluationData?.signature_status !== 'completed' && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex items-center justify-end">
            <button
              onClick={handleLock}
              className="btn-primary"
              disabled={isLocking}
            >
              {isLocking ? 'Zaključavanje...' : 'Zaključaj evaluaciju'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
        <button onClick={onCancel} className="btn-secondary" disabled={saving || (evaluationData?.signature_status === 'completed')}>
          Otkaži
        </button>
        <button 
          onClick={handleSubmit} 
          className="btn-primary" 
          disabled={saving || (evaluationData?.signature_status === 'completed')}
        >
          {saving ? 'Čuvanje...' : evaluation ? 'Ažuriraj' : 'Sačuvaj'}
        </button>
      </div>
    </div>
  );
}

function CareerDevelopmentTab() {
  const [talents, setTalents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [showDevelopmentPlan, setShowDevelopmentPlan] = useState(false);
  const [matrixView, setMatrixView] = useState<'9box' | 'list'>('9box');

  useEffect(() => {
    loadTalents();
  }, []);

  const loadTalents = async () => {
    try {
      setLoading(true);
      const data = await apiService.get('/planika/maloprodaja/talents');
      setTalents(data || []);
    } catch (error) {
      console.error('Failed to load talents:', error);
      toast.error('Greška pri učitavanju talenata');
    } finally {
      setLoading(false);
    }
  };

  const getMatrixPosition = (performance: string, potential: string) => {
    const perfMap: Record<string, number> = { low: 0, medium: 1, high: 2 };
    const potMap: Record<string, number> = { low: 0, medium: 1, high: 2 };
    return {
      row: 2 - (perfMap[performance.toLowerCase()] ?? 1),
      col: potMap[potential.toLowerCase()] ?? 1,
    };
  };

  const matrixLabels = [
    ['Star Performers\n(Ključni talenti)', 'Core Players\n(Stabilni performeri)', 'Rising Stars\n(Rastući talenti)'],
    ['Solid Performers\n(Solidni performeri)', 'Average Performers\n(Prosječni performeri)', 'High Potentials\n(Visoki potencijal)'],
    ['Under Performers\n(Nizak učinak)', 'Development Needed\n(Potrebno razvoja)', 'On the Move\n(U razvoju)'],
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const matrix: any[][] = [[[], [], []], [[], [], []], [[], [], []]];
  talents.forEach((talent: any) => {
    const pos = getMatrixPosition(talent.performance_level || 'medium', talent.potential_level || 'medium');
    matrix[pos.row][pos.col].push(talent);
  });

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h2 className="text-sm sm:text-base lg:text-xl font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2">Praćenje razvoja karijere</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Identifikacija talenata i praćenje njihovog profesionalnog razvoja
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMatrixView(matrixView === '9box' ? 'list' : '9box')}
            className="btn-secondary"
          >
            {matrixView === '9box' ? 'Lista' : '9-Box matrica'}
          </button>
          <button
            onClick={() => {
              setSelectedEmployee(null);
              setShowDevelopmentPlan(true);
            }}
            className="btn-primary"
          >
            <Plus size={18} className="mr-2" />
            Dodaj talent
          </button>
        </div>
      </div>

      {showDevelopmentPlan && (
        <DevelopmentPlanForm
          employee={selectedEmployee}
          onSuccess={() => {
            setShowDevelopmentPlan(false);
            setSelectedEmployee(null);
            loadTalents();
          }}
          onCancel={() => {
            setShowDevelopmentPlan(false);
            setSelectedEmployee(null);
          }}
        />
      )}

      {!showDevelopmentPlan && matrixView === '9box' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">9-Box Talent Matrix</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
            <div></div>
            <div className="text-center text-sm font-medium text-gray-700 dark:text-gray-300 py-2 bg-gray-100 dark:bg-gray-800 rounded">
              Nizak potencijal
            </div>
            <div className="text-center text-sm font-medium text-gray-700 dark:text-gray-300 py-2 bg-gray-100 dark:bg-gray-800 rounded">
              Srednji potencijal
            </div>
            <div className="text-center text-sm font-medium text-gray-700 dark:text-gray-300 py-2 bg-gray-100 dark:bg-gray-800 rounded">
              Visok potencijal
            </div>
            {matrix.map((row, rowIdx) => (
              <React.Fragment key={`row-${rowIdx}`}>
                <div className="text-center text-sm font-medium text-gray-700 dark:text-gray-300 py-4 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded">
                  {rowIdx === 0 ? 'Visok učinak' : rowIdx === 1 ? 'Srednji učinak' : 'Nizak učinak'}
                </div>
                {row.map((cell, colIdx) => (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    className="min-h-[120px] p-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-primary-400 transition-colors"
                    onClick={() => {
                      if (cell.length > 0) {
                        setSelectedEmployee(cell[0]);
                        setShowDevelopmentPlan(true);
                      }
                    }}
                  >
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 whitespace-pre-line text-center">
                      {matrixLabels[rowIdx][colIdx]}
                    </div>
                    <div className="space-y-1">
                      {cell.map((talent: any, talentIdx: number) => (
                        <div
                          key={talent.id || `talent-${rowIdx}-${colIdx}-${talentIdx}`}
                          className="text-xs p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-center hover:bg-blue-200 dark:hover:bg-blue-900/50"
                        >
                          {talent.employee_name || 'N/A'}
                        </div>
                      ))}
                    </div>
                    {cell.length === 0 && (
                      <div className="text-xs text-gray-400 dark:text-gray-600 text-center mt-2">
                        Prazno
                      </div>
                    )}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {!showDevelopmentPlan && matrixView === 'list' && (
        <div className="space-y-4">
          {talents.map((talent) => (
            <div
              key={talent.id}
              className="card p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedEmployee(talent);
                setShowDevelopmentPlan(true);
              }}
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {talent.employee_name}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>{talent.position}</span>
                    <span>•</span>
                    <span>{talent.store_name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                      Učinak: {talent.performance_level === 'high' ? 'Visok' : talent.performance_level === 'medium' ? 'Srednji' : 'Nizak'}
                    </span>
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                      Potencijal: {talent.potential_level === 'high' ? 'Visok' : talent.potential_level === 'medium' ? 'Srednji' : 'Nizak'}
                    </span>
                  </div>
                </div>
                <Edit size={18} className="text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!showDevelopmentPlan && talents.length === 0 && (
        <div className="card p-12 text-center">
          <TrendingUp size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nema identifikovanih talenata</p>
        </div>
      )}
    </div>
  );
}

function DevelopmentPlanForm({ employee, onSuccess, onCancel }: any) {
  const [formData, setFormData] = useState({
    employee_id: employee?.employee_id || 0,
    performance_level: employee?.performance_level || 'medium',
    potential_level: employee?.potential_level || 'medium',
    development_activities: employee?.development_activities || [],
    goals: employee?.goals || '',
    target_completion: employee?.target_completion || '',
    current_activity: '',
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const employeesRes = await apiService.get('/hrm/employees');
      setEmployees(employeesRes?.data || employeesRes || []);
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const handleAddActivity = () => {
    if (formData.current_activity.trim()) {
      setFormData({
        ...formData,
        development_activities: [...formData.development_activities, formData.current_activity],
        current_activity: '',
      });
    }
  };

  const handleRemoveActivity = (index: number) => {
    setFormData({
      ...formData,
      development_activities: formData.development_activities.filter((_: any, i: number) => i !== index),
    });
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const payload = {
        ...formData,
        type: 'career_development',
      };

      if (employee?.id) {
        await apiService.put(`/planika/maloprodaja/talents/${employee.id}`, payload);
        toast.success('Razvojni plan uspješno ažuriran');
      } else {
        await apiService.post('/planika/maloprodaja/talents', payload);
        toast.success('Razvojni plan uspješno kreiran');
      }
      
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save development plan:', error);
      toast.error(error.response?.data?.message || 'Greška pri čuvanju razvojnog plana');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-4 sm:p-6 space-y-4 sm:space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {employee ? 'Uredi razvojni plan' : 'Novi razvojni plan'}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Zaposleni *
          </label>
          <select
            value={formData.employee_id}
            onChange={(e) => setFormData({ ...formData, employee_id: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
            disabled={!!employee}
          >
            <option value={0}>Odaberite zaposlenog</option>
            {employees.map((emp: any) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nivo učinka *
          </label>
          <select
            value={formData.performance_level}
            onChange={(e) => setFormData({ ...formData, performance_level: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="high">Visok</option>
            <option value="medium">Srednji</option>
            <option value="low">Nizak</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nivo potencijala *
          </label>
          <select
            value={formData.potential_level}
            onChange={(e) => setFormData({ ...formData, potential_level: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="high">Visok</option>
            <option value="medium">Srednji</option>
            <option value="low">Nizak</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Ciljni datum završetka
          </label>
          <input
            type="date"
            value={formData.target_completion}
            onChange={(e) => setFormData({ ...formData, target_completion: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Ciljevi i merljivi indikatori napretka
        </label>
        <textarea
          value={formData.goals}
          onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          rows={4}
          placeholder="Unesite ciljeve i merljive indikatore..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Razvojne aktivnosti (obuke, mentorstvo, rotacije)
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={formData.current_activity}
            onChange={(e) => setFormData({ ...formData, current_activity: e.target.value })}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Unesite aktivnost..."
            onKeyPress={(e) => e.key === 'Enter' && handleAddActivity()}
          />
          <button onClick={handleAddActivity} className="btn-secondary">Dodaj</button>
        </div>
        <div className="space-y-2">
          {formData.development_activities.map((activity: string, index: number) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <span className="text-sm text-gray-700 dark:text-gray-300">{activity}</span>
              <button onClick={() => handleRemoveActivity(index)} className="text-red-600 hover:text-red-800">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
        <button onClick={onCancel} className="btn-secondary" disabled={saving}>Otkaži</button>
        <button onClick={handleSubmit} className="btn-primary" disabled={saving}>
          {saving ? 'Čuvanje...' : employee ? 'Ažuriraj' : 'Sačuvaj'}
        </button>
      </div>
    </div>
  );
}

function RewardsAndBonusesTab() {
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedReward, setSelectedReward] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'financial' | 'non_financial'>('all');

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      setLoading(true);
      const data = await apiService.get('/planika/maloprodaja/rewards');
      setRewards(data || []);
    } catch (error) {
      console.error('Failed to load rewards:', error);
      toast.error('Greška pri učitavanju nagrada');
    } finally {
      setLoading(false);
    }
  };

  const filteredRewards = rewards.filter(r => filter === 'all' || r.type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h2 className="text-sm sm:text-base lg:text-xl font-semibold text-gray-900 dark:text-white mb-1.5 sm:mb-2">Nagrađivanje i bonusi</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Finansijske i nefinansijske nagrade i bonusi za zaposlene
          </p>
        </div>
        <button onClick={() => { setSelectedReward(null); setShowForm(true); }} className="btn-primary">
          <Plus size={18} className="mr-2" />
          Nova nagrada
        </button>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all' ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          Sve
        </button>
        <button
          onClick={() => setFilter('financial')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'financial' ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          Finansijske
        </button>
        <button
          onClick={() => setFilter('non_financial')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'non_financial' ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
          }`}
        >
          Nefinansijske
        </button>
      </div>
      {showForm && (
        <RewardForm
          reward={selectedReward}
          onSuccess={() => { setShowForm(false); setSelectedReward(null); loadRewards(); }}
          onCancel={() => { setShowForm(false); setSelectedReward(null); }}
        />
      )}
      {!showForm && filteredRewards.length > 0 && (
        <div className="space-y-4">
          {filteredRewards.map((reward) => (
            <div key={reward.id} className="card p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => {
              setSelectedReward(reward);
              setShowForm(true);
            }}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{reward.employee_name}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      reward.type === 'financial' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                    }`}>
                      {reward.type === 'financial' ? 'Finansijska' : 'Nefinansijska'}
                    </span>
                    {reward.status === 'approved' && (
                      <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">Odobreno</span>
                    )}
                    {reward.status === 'pending' && (
                      <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-sm font-medium">Na čekanju</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span>{reward.reward_type}</span>
                    {reward.amount && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{reward.amount} {reward.currency || 'BAM'}</span>
                      </>
                    )}
                    {reward.date && (
                      <>
                        <span>•</span>
                        <span>{new Date(reward.date).toLocaleDateString('bs-BA')}</span>
                      </>
                    )}
                  </div>
                  {reward.reason && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{reward.reason}</p>
                  )}
                </div>
                <Edit size={18} className="text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}
      {!showForm && filteredRewards.length === 0 && (
        <div className="card p-12 text-center">
          <Award size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {filter === 'all' ? 'Nema nagrada' : `Nema ${filter === 'financial' ? 'finansijskih' : 'nefinansijskih'} nagrada`}
          </p>
        </div>
      )}
    </div>
  );
}

function RewardForm({ reward, onSuccess, onCancel }: any) {
  const [formData, setFormData] = useState({
    employee_id: reward?.employee_id || 0,
    type: reward?.type || 'financial',
    reward_type: reward?.reward_type || '',
    amount: reward?.amount || '',
    currency: reward?.currency || 'BAM',
    reason: reward?.reason || '',
    date: reward?.date || new Date().toISOString().split('T')[0],
    status: reward?.status || 'pending',
  });
  const [employees, setEmployees] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const employeesRes = await apiService.get('/hrm/employees');
      setEmployees(employeesRes?.data || employeesRes || []);
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      const payload = {
        ...formData,
        amount: formData.type === 'financial' ? parseFloat(formData.amount as string) : null,
      };

      if (reward?.id) {
        await apiService.put(`/planika/maloprodaja/rewards/${reward.id}`, payload);
        toast.success('Nagrada uspješno ažurirana');
      } else {
        await apiService.post('/planika/maloprodaja/rewards', payload);
        toast.success('Nagrada uspješno kreirana');
      }
      
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save reward:', error);
      toast.error(error.response?.data?.message || 'Greška pri čuvanju nagrade');
    } finally {
      setSaving(false);
    }
  };

  const rewardTypes = {
    financial: ['Godišnji bonus', 'Posebni bonus', 'Menadžerski bonus'],
    non_financial: ['Pohvalnica', 'Javna zahvalnost', 'Dodatni dani odmora', 'Edukacija'],
  };

  return (
    <div className="card p-4 sm:p-6 space-y-4 sm:space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {reward ? 'Uredi nagradu' : 'Nova nagrada'}
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Zaposleni *</label>
          <select
            value={formData.employee_id}
            onChange={(e) => setFormData({ ...formData, employee_id: parseInt(e.target.value) })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value={0}>Odaberite zaposlenog</option>
            {employees.map((emp: any) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tip nagrade *</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value, reward_type: '', amount: '' })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="financial">Finansijska</option>
            <option value="non_financial">Nefinansijska</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vrsta nagrade *</label>
          <select
            value={formData.reward_type}
            onChange={(e) => setFormData({ ...formData, reward_type: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          >
            <option value="">Odaberite vrstu</option>
            {rewardTypes[formData.type as keyof typeof rewardTypes].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        {formData.type === 'financial' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Iznos *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valuta</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="BAM">BAM</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Datum *</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>
        <div>
            <label className="block text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700 dark:text-gray-300 mb-0.5 sm:mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="pending">Na čekanju</option>
            <option value="approved">Odobreno</option>
            <option value="paid">Isplaćeno</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Razlog / Obrazloženje *</label>
        <textarea
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          rows={4}
          placeholder="Obrazložite razlog dodjele nagrade..."
          required
        />
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
        <button onClick={onCancel} className="btn-secondary" disabled={saving}>Otkaži</button>
        <button onClick={handleSubmit} className="btn-primary" disabled={saving}>
          {saving ? 'Čuvanje...' : reward ? 'Ažuriraj' : 'Sačuvaj'}
        </button>
      </div>
    </div>
  );
}
// Plan Modal Component
function PlanModal({
  plan,
  users,
  onClose,
  onSubmit,
  isLoading,
}: {
  plan: ControlPlan | null;
  users: any[];
  onClose: () => void;
  onSubmit: (data: Partial<ControlPlan>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    type: (plan?.type || 'inventory_required') as ControlPlanType,
    title: plan?.title || '',
    description: plan?.description || '',
    year: plan?.year || new Date().getFullYear(),
    regional_manager_id: plan?.regional_manager_id || undefined,
    status: (plan?.status || 'draft') as ControlPlanStatus,
    start_date: plan?.start_date || '',
    end_date: plan?.end_date || '',
    deadline: plan?.deadline || '',
    notes: plan?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {plan ? 'Uredi plan' : 'Novi plan'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tip plana *
            </label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as ControlPlanType })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            >
              <option value="inventory_required">Obavezna inventura</option>
              <option value="inventory_extraordinary">Vanredna inventura</option>
              <option value="store_visit">Obilazak prodavnice</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Naziv *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Opis
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Godina *
              </label>
              <input
                type="number"
                required
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                min="2020"
                max="2100"
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as ControlPlanStatus })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
              >
                <option value="draft">Nacrt</option>
                <option value="active">Aktivan</option>
                <option value="completed">Završen</option>
                <option value="cancelled">Otkazan</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Regionalni menadžer
            </label>
            <select
              value={formData.regional_manager_id || ''}
              onChange={(e) => setFormData({ ...formData, regional_manager_id: e.target.value ? parseInt(e.target.value) : undefined })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            >
              <option value="">Odaberi menadžera</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Datum početka
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Datum završetka
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Rok
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Napomene
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {isLoading ? 'Čuvanje...' : plan ? 'Ažuriraj' : 'Kreiraj'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Plan Item Modal Component
function PlanItemModal({
  plan,
  stores,
  users,
  onClose,
  onSubmit,
  isLoading,
}: {
  plan: ControlPlan;
  stores: any[];
  users: any[];
  onClose: () => void;
  onSubmit: (data: Partial<ControlPlanItem>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    store_id: '',
    planned_date: '',
    assigned_to: '',
    priority: '0',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      store_id: parseInt(formData.store_id),
      planned_date: formData.planned_date,
      assigned_to: formData.assigned_to ? parseInt(formData.assigned_to) : undefined,
      priority: parseInt(formData.priority),
      notes: formData.notes,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Dodaj aktivnost</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prodavnica *
            </label>
            <select
              required
              value={formData.store_id}
              onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            >
              <option value="">Odaberi prodavnicu</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} {store.code ? `(${store.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Planirani datum *
            </label>
            <input
              type="date"
              required
              value={formData.planned_date}
              onChange={(e) => setFormData({ ...formData, planned_date: e.target.value })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Dodijeljeno
            </label>
            <select
              value={formData.assigned_to}
              onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            >
              <option value="">Odaberi korisnika</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prioritet
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            >
              <option value="0">Normalan</option>
              <option value="1">Visok</option>
              <option value="2">Kritičan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Napomene
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {isLoading ? 'Dodavanje...' : 'Dodaj'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Education Plan Modal Component
function EducationPlanModal({
  plan,
  stores,
  allEmployees,
  users,
  selectedStoreId,
  onStoreChange,
  onClose,
  onSubmit,
  isLoading,
}: {
  plan: EducationPlan | null;
  stores: any[];
  allEmployees: any[];
  users: any[];
  selectedStoreId: number | null;
  onStoreChange: (storeId: number | null) => void;
  onClose: () => void;
  onSubmit: (data: Partial<EducationPlan>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    store_id: (plan?.store_id || selectedStoreId || '') as number | string,
    employee_id: (plan?.employee_id || '') as number | string,
    title: plan?.title || '',
    description: plan?.description || '',
    education_date: plan?.education_date || '',
    start_time: plan?.start_time || '',
    end_time: plan?.end_time || '',
    education_type: (plan?.education_type || 'internal') as EducationType,
    topic: plan?.topic || '',
    content: plan?.content || '',
    instructor_id: (plan?.instructor_id || '') as number | string,
    location: plan?.location || '',
    status: (plan?.status || 'planned') as EducationPlanStatus,
    notes: plan?.notes || '',
  });

  const [employeeSearch, setEmployeeSearch] = useState('');
  const [showEmployeeList, setShowEmployeeList] = useState(false);
  const employeeListRef = useRef<HTMLDivElement | null>(null);

  const filteredEmployees = allEmployees.filter((emp: any) => {
    if (!formData.store_id) return false;
    if (typeof formData.store_id === 'string') return false;
    const storeId = parseInt(formData.store_id.toString());
    
    // Find the selected store to get its name
    const selectedStore = stores.find((s: any) => s.id === storeId);
    if (!selectedStore) return false;
    
    const storeName = selectedStore.name || selectedStore.location || '';
    
    // Check multiple ways employees might be linked to stores:
    // 1. store_id (foreign key) - check by ID
    // 2. storeId (alternative property name) - check by ID
    // 3. store (string field with store name) - check by name match
    // 4. store?.id (nested object) - check by ID
    const empStoreId = emp.store_id || emp.storeId || emp.store?.id;
    const empStoreName = (emp.store || emp.store_name || '').toString().trim();
    
    // Match by ID if available
    if (empStoreId) {
      if (empStoreId !== storeId) return false;
    } 
    // Match by name if ID is not available (for employees with store as string field)
    else if (empStoreName) {
      // Compare store names (case insensitive, partial match)
      const storeNameLower = storeName.toLowerCase().trim();
      const empStoreNameLower = empStoreName.toLowerCase().trim();
      if (storeNameLower !== empStoreNameLower && 
          !storeNameLower.includes(empStoreNameLower) && 
          !empStoreNameLower.includes(storeNameLower)) {
        return false;
      }
    } 
    // If employee has neither store_id nor store name, skip
    else {
      return false;
    }
    
    if (!employeeSearch) return true;
    const search = employeeSearch.toLowerCase();
    return (
      (emp.first_name && emp.first_name.toLowerCase().includes(search)) ||
      (emp.last_name && emp.last_name.toLowerCase().includes(search)) ||
      (emp.name && emp.name.toLowerCase().includes(search)) ||
      (emp.email && emp.email.toLowerCase().includes(search)) ||
      (emp.employee_number && emp.employee_number.toLowerCase().includes(search))
    );
  });

  const selectedEmployee = allEmployees.find((emp: any) => emp.id === formData.employee_id);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (employeeListRef.current && !employeeListRef.current.contains(event.target as Node)) {
        setShowEmployeeList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      store_id: typeof formData.store_id === 'string' ? parseInt(formData.store_id) : formData.store_id,
      employee_id: typeof formData.employee_id === 'string' ? parseInt(formData.employee_id) : formData.employee_id,
      instructor_id: formData.instructor_id ? (typeof formData.instructor_id === 'string' ? parseInt(formData.instructor_id) : formData.instructor_id) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {plan ? 'Uredi plan edukacije' : 'Novi plan edukacije'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prodavnica *
            </label>
            <select
              required
              value={formData.store_id}
              onChange={(e) => {
                const storeId = e.target.value ? parseInt(e.target.value) : null;
                setFormData({ ...formData, store_id: storeId || '', employee_id: '' });
                onStoreChange(storeId);
              }}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            >
              <option value="">Odaberi prodavnicu</option>
              {stores && stores.length > 0 ? (
                stores.map((store: any) => (
                  <option key={store.id} value={store.id}>
                    {store.name || store.location || `Prodavnica ${store.id}`} {store.code ? `(${store.code})` : ''}
                  </option>
                ))
              ) : (
                <option disabled>Nema dostupnih prodavnica</option>
              )}
            </select>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Zaposleni *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                readOnly
                value={selectedEmployee ? (selectedEmployee.name || `${selectedEmployee.first_name || ''} ${selectedEmployee.last_name || ''}`.trim() || `Zaposlenik #${selectedEmployee.id}`) : ''}
                onClick={() => {
                  if (formData.store_id) {
                    setShowEmployeeList(!showEmployeeList);
                  } else {
                    toast.error('Prvo odaberite prodavnicu');
                  }
                }}
                placeholder="Kliknite da odaberete zaposlenog"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white cursor-pointer"
              />
              {selectedEmployee && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFormData({ ...formData, employee_id: '' });
                    setEmployeeSearch('');
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {showEmployeeList && formData.store_id && (
              <div
                ref={employeeListRef}
                className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
              >
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <input
                    type="text"
                    value={employeeSearch}
                    onChange={(e) => setEmployeeSearch(e.target.value)}
                    placeholder="Pretraži zaposlene..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                      {formData.store_id ? 'Nema zaposlenih u ovoj prodavnici' : 'Odaberite prodavnicu prvo'}
                    </div>
                  ) : (
                    filteredEmployees.map((employee: any) => {
                      const employeeName = employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || `Zaposlenik #${employee.id}`;
                      return (
                        <button
                          key={employee.id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, employee_id: employee.id });
                            setShowEmployeeList(false);
                            setEmployeeSearch('');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {employeeName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {employee.email || ''} {employee.employee_number ? `• ${employee.employee_number}` : ''}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Naziv edukacije *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Opis
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Datum edukacije *
              </label>
              <input
                type="date"
                required
                value={formData.education_date}
                onChange={(e) => setFormData({ ...formData, education_date: e.target.value })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tip edukacije *
              </label>
              <select
                required
                value={formData.education_type}
                onChange={(e) => setFormData({ ...formData, education_type: e.target.value as EducationType })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
              >
                <option value="internal">Interna</option>
                <option value="external">Externa</option>
                <option value="online">Online</option>
                <option value="workshop">Radionica</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vrijeme početka
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Vrijeme završetka
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tema
            </label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Sadržaj
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={3}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Instruktor
              </label>
              <select
                value={formData.instructor_id || ''}
                onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value ? parseInt(e.target.value) : '' })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
              >
                <option value="">Odaberi instruktora</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Lokacija
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as EducationPlanStatus })}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            >
              <option value="planned">Planirano</option>
              <option value="in_progress">U toku</option>
              <option value="completed">Završeno</option>
              <option value="cancelled">Otkazano</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Napomene
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs sm:text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {isLoading ? 'Čuvanje...' : plan ? 'Ažuriraj' : 'Kreiraj'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Control Record Modal Component
function ControlRecordModal({
  record,
  stores,
  onClose,
  onSave,
  isLoading,
}: {
  record: ControlRecord | null;
  stores: any[];
  onClose: () => void;
  onSave: (data: Partial<ControlRecord>) => void;
  isLoading: boolean;
}) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'header' | 'inventory' | 'inspection' | 'attachments' | 'signing'>('header');
  const [formData, setFormData] = useState<Partial<ControlRecord>>({
    store_id: record?.store_id || undefined,
    control_type: record?.control_type || 'total_inventory',
    control_date_from: record?.control_date_from || new Date().toISOString().split('T')[0],
    control_date_to: record?.control_date_to || undefined,
    start_time: record?.start_time || undefined,
    end_time: record?.end_time || undefined,
    status: record?.status || 'draft',
    participants: record?.participants || [],
    present_persons: record?.present_persons || [],
    inventory_items: record?.inventory_items || [],
    observations: record?.observations || [],
    measures: record?.measures || [],
    attachments: record?.attachments || [],
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiService.get<any[]>('/admin/users');
      return response.data || [];
    },
  });

  const { data: allEmployeesData } = useQuery({
    queryKey: ['hrm-employees-all'],
    queryFn: () => getEmployees({ status: 'active' }),
    enabled: !!formData.store_id,
  });

  const allEmployees = allEmployeesData?.data || [];
  const selectedStore = stores.find(s => s.id === formData.store_id);

  const handleStoreChange = (storeId: string) => {
    const storeIdNum = storeId ? parseInt(storeId) : undefined;
    setFormData(prev => ({ ...prev, store_id: storeIdNum }));
  };

  const isLocked = formData.status === 'locked';

  const handleSave = () => {
    // Validate required fields
    if (!formData.store_id) {
      toast.error('Molimo odaberite prodavnicu');
      return;
    }
    if (!formData.control_type) {
      toast.error('Molimo odaberite tip kontrole');
      return;
    }
    if (!formData.control_date_from) {
      toast.error('Molimo unesite datum kontrole');
      return;
    }

    // Clean up data before sending - remove empty strings and convert to proper format
    const dataToSend: Partial<ControlRecord> = {
      ...formData,
      store_id: formData.store_id,
      control_type: formData.control_type,
      control_date_from: formData.control_date_from,
      control_date_to: formData.control_date_to || null,
      start_time: formData.start_time && formData.start_time.trim() !== '' ? formData.start_time : null,
      end_time: formData.end_time && formData.end_time.trim() !== '' ? formData.end_time : null,
    };

    // Remove undefined values
    Object.keys(dataToSend).forEach(key => {
      if (dataToSend[key as keyof ControlRecord] === undefined) {
        delete dataToSend[key as keyof ControlRecord];
      }
    });

    // Ensure present_persons have function field (default to empty string if missing)
    if (dataToSend.present_persons && Array.isArray(dataToSend.present_persons)) {
      dataToSend.present_persons = dataToSend.present_persons.map((person: any) => ({
        ...person,
        function: person.function || '',
      }));
    }

    onSave(dataToSend);
  };

  // Wrapper funkcija za setFormData koja koristi callback da izbegne stale closures
  // Podržava i direktan objekat i callback funkciju
  const handleFormDataChange = useCallback((newData: Partial<ControlRecord> | ((prev: Partial<ControlRecord>) => Partial<ControlRecord>)) => {
    if (typeof newData === 'function') {
      setFormData(newData);
    } else {
      // Merge-ujemo sa trenutnim state-om da izbegnemo stale closures
      setFormData(prev => ({ ...prev, ...newData }));
    }
  }, []);

  // Refetch record when attachments might have changed
  const { data: refetchedRecord } = useQuery({
    queryKey: ['retail-control-record', record?.id],
    queryFn: () => record?.id ? getControlRecord(record.id) : null,
    enabled: !!record?.id,
    refetchInterval: false,
  });

  useEffect(() => {
    if (record) {
      setFormData({
        store_id: record.store_id,
        control_type: record.control_type,
        control_date_from: record.control_date_from,
        control_date_to: record.control_date_to,
        start_time: record.start_time || '',
        end_time: record.end_time || '',
        status: record.status,
        participants: record.participants || [],
        present_persons: record.present_persons || [],
        inventory_items: record.inventory_items || [],
        observations: record.observations || [],
        measures: record.measures || [],
        attachments: record.attachments || [],
        signatures: record.signatures || [],
      });
    }
  }, [record]);

  // Update attachments when record is refetched
  useEffect(() => {
    if (refetchedRecord && refetchedRecord.attachments) {
      setFormData(prev => ({
        ...prev,
        attachments: refetchedRecord.attachments || prev.attachments || [],
      }));
    }
  }, [refetchedRecord]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-xl shadow-xl max-w-6xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-20 flex-shrink-0 shadow-sm">
          <h2 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-white pr-2 truncate">
            {record ? 'Uredi evidenciju kontrole' : 'Nova evidencija kontrole'}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-2 -mr-2 flex-shrink-0"
            aria-label="Zatvori"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Tabs - Mobile optimized */}
        <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto flex-shrink-0" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="flex gap-1 sm:gap-4 min-w-max px-2 sm:px-6">
            {[
              { key: 'header', label: 'Osnovni podaci', shortLabel: 'Osnovno' },
              { key: 'inventory', label: 'Totalna inventura', shortLabel: 'Inventura' },
              { key: 'inspection', label: 'Obilazak i zapažanja', shortLabel: 'Obilazak' },
              { key: 'attachments', label: 'Prilozi', shortLabel: 'Prilozi' },
              { key: 'signing', label: 'Potpisivanje', shortLabel: 'Potpis' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-3 sm:px-4 py-2.5 sm:py-3 border-b-2 transition-colors whitespace-nowrap text-xs sm:text-base font-medium flex-shrink-0 ${
                  activeTab === tab.key
                    ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', minHeight: 0 }}>
          {activeTab === 'header' && (
            <ControlRecordHeaderTab
              formData={formData}
              setFormData={handleFormDataChange}
              stores={stores}
              users={users || []}
              employees={allEmployees}
              selectedStore={selectedStore}
              onStoreChange={handleStoreChange}
              isLocked={isLocked}
            />
          )}
          {activeTab === 'inventory' && (
            <ControlRecordInventoryTab
              formData={formData}
              setFormData={handleFormDataChange}
              isLocked={isLocked}
            />
          )}
          {activeTab === 'inspection' && (
            <ControlRecordInspectionTab
              formData={formData}
              setFormData={handleFormDataChange}
              users={users || []}
              isLocked={isLocked}
            />
          )}
          {activeTab === 'attachments' && (
            <ControlRecordAttachmentsTab
              recordId={record?.id}
              attachments={formData.attachments || []}
              isLocked={isLocked}
              onAttachmentsChange={(attachments) => setFormData({ ...formData, attachments })}
            />
          )}
          {activeTab === 'signing' && (
            <ControlRecordSigningTab
              recordId={record?.id}
              recordStatus={formData.status}
              signatures={formData.signatures || []}
              participants={formData.participants || []}
              onSignSuccess={async () => {
                // Refetch record to get updated signatures
                if (record?.id) {
                  queryClient.invalidateQueries({ queryKey: ['retail-control-record', record.id] });
                  queryClient.invalidateQueries({ queryKey: ['retail-control-records'] });
                  // Refetch the record to update formData
                  try {
                    const updatedRecord = await getControlRecord(record.id);
                    setFormData(prev => ({
                      ...prev,
                      signatures: updatedRecord.signatures || [],
                      status: updatedRecord.status,
                    }));
                  } catch (error) {
                    console.error('Error refetching record:', error);
                  }
                }
              }}
              onStatusChange={async (newStatus) => {
                setFormData(prev => ({ ...prev, status: newStatus }));
                if (record?.id) {
                  queryClient.invalidateQueries({ queryKey: ['retail-control-record', record.id] });
                  queryClient.invalidateQueries({ queryKey: ['retail-control-records'] });
                  // Refetch the record to update formData
                  try {
                    const updatedRecord = await getControlRecord(record.id);
                    setFormData(prev => ({
                      ...prev,
                      signatures: updatedRecord.signatures || [],
                      status: updatedRecord.status,
                    }));
                  } catch (error) {
                    console.error('Error refetching record:', error);
                  }
                }
              }}
            />
          )}
        </div>

        {/* Footer - Mobile optimized */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-3 sm:py-4 flex gap-3 flex-shrink-0 shadow-lg sm:shadow-none">
          <button
            onClick={onClose}
            className="flex-1 sm:flex-none px-4 py-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium text-sm sm:text-base"
          >
            Otkaži
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium text-sm sm:text-base shadow-md"
          >
            {isLoading ? 'Čuvanje...' : record ? 'Ažuriraj' : 'Kreiraj'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Control Record Signing Tab Component
function ControlRecordSigningTab({
  recordId,
  recordStatus,
  signatures,
  participants,
  onSignSuccess,
  onStatusChange,
}: {
  recordId?: number;
  recordStatus?: string;
  signatures?: Signature[];
  participants?: ControlParticipant[];
  onSignSuccess?: () => void;
  onStatusChange?: (status: 'draft' | 'finalized' | 'locked') => void;
}) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isSigning, setIsSigning] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  const signMutation = useMutation({
    mutationFn: ({ signatureType }: { signatureType: 'controller' | 'store_manager' }) => {
      if (!recordId) throw new Error('Record ID is required');
      return signControlRecord(recordId, signatureType);
    },
    onSuccess: () => {
      toast.success('Evidencija je uspješno potpisana');
      if (recordId) {
        queryClient.invalidateQueries({ queryKey: ['retail-control-record', recordId] });
        queryClient.invalidateQueries({ queryKey: ['retail-control-records'] });
      }
      onSignSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Greška pri potpisivanju evidencije');
    },
    onSettled: () => {
      setIsSigning(false);
    },
  });

  const finalizeMutation = useMutation({
    mutationFn: () => {
      if (!recordId) throw new Error('Record ID is required');
      return finalizeControlRecord(recordId);
    },
    onSuccess: () => {
      toast.success('Evidencija je uspješno finalizovana');
      onStatusChange?.('finalized');
      if (recordId) {
        queryClient.invalidateQueries({ queryKey: ['retail-control-record', recordId] });
        queryClient.invalidateQueries({ queryKey: ['retail-control-records'] });
      }
      onSignSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Greška pri finalizovanju evidencije');
    },
    onSettled: () => {
      setIsFinalizing(false);
    },
  });

  const lockMutation = useMutation({
    mutationFn: () => {
      if (!recordId) throw new Error('Record ID is required');
      return lockControlRecord(recordId);
    },
    onSuccess: () => {
      toast.success('Evidencija je uspješno zaključana');
      onStatusChange?.('locked');
      if (recordId) {
        queryClient.invalidateQueries({ queryKey: ['retail-control-record', recordId] });
        queryClient.invalidateQueries({ queryKey: ['retail-control-records'] });
      }
      onSignSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Greška pri zaključavanju evidencije');
    },
    onSettled: () => {
      setIsLocking(false);
    },
  });

  const hasControllerSignature = signatures?.some(s => s.signature_type === 'controller');
  const hasStoreManagerSignature = signatures?.some(s => s.signature_type === 'store_manager');
  const userSignatureController = signatures?.find(s => s.user_id === user?.id && s.signature_type === 'controller');
  const userSignatureStoreManager = signatures?.find(s => s.user_id === user?.id && s.signature_type === 'store_manager');
  const isParticipant = participants?.some(p => p.user_id === user?.id);

  const handleSign = async (signatureType: 'controller' | 'store_manager') => {
    if (!recordId) {
      toast.error('ID evidencije nije dostupan');
      return;
    }

    if (confirm(`Da li ste sigurni da želite potpisati evidenciju kao ${signatureType === 'controller' ? 'kontrolor' : 'poslovođa prodavnice'}?`)) {
      setIsSigning(true);
      signMutation.mutate({ signatureType });
    }
  };

  const handleFinalize = () => {
    if (!recordId) {
      toast.error('ID evidencije nije dostupan');
      return;
    }

    if (!hasControllerSignature) {
      toast.error('Evidencija mora imati potpis kontrolora pre finalizovanja');
      return;
    }

    if (!participants || participants.length === 0) {
      toast.error('Evidencija mora imati barem jednog učesnika (participanta) pre finalizovanja. Molimo dodajte učesnike u tabu "Osnovni podaci".');
      return;
    }

    if (confirm('Da li ste sigurni da želite finalizovati evidenciju? Nakon finalizovanja, biće moguće samo zaključavanje.')) {
      setIsFinalizing(true);
      finalizeMutation.mutate();
    }
  };

  const handleLock = () => {
    if (!recordId) {
      toast.error('ID evidencije nije dostupan');
      return;
    }

    if (recordStatus !== 'finalized') {
      toast.error('Evidencija mora biti finalizovana pre zaključavanja');
      return;
    }

    if (confirm('Da li ste sigurni da želite zaključati evidenciju? Nakon zaključavanja, nije moguće vršiti izmjene.')) {
      setIsLocking(true);
      lockMutation.mutate();
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">Digitalni potpisi</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Potpisivanje evidencije kontrole je obavezno kako bi se dokazala autentičnost dokumenta.
        </p>
      </div>

      {/* Signatures Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Controller Signature */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white">Potpis kontrolora</h4>
            {hasControllerSignature ? (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Potpisano
              </span>
            ) : (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                Nije potpisano
              </span>
            )}
          </div>
          {hasControllerSignature ? (
            <div className="space-y-2">
              {signatures?.filter(s => s.signature_type === 'controller').map((signature) => (
                <div key={signature.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{signature.user_name || 'Nepoznato'}</p>
                      {signature.signed_at && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(signature.signed_at).toLocaleString('hr-HR')}
                        </p>
                      )}
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Kontrolor mora potpisati evidenciju pre finalizovanja.
              </p>
              <button
                onClick={() => handleSign('controller')}
                disabled={isSigning || !!userSignatureController || recordStatus === 'locked' || !user}
                className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSigning ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Potpisivanje...
                  </>
                ) : (
                  <>
                    <PenTool className="w-4 h-4" />
                    Potpiši kao kontrolor
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Store Manager Signature */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900 dark:text-white">Potpis poslovođe prodavnice</h4>
            {hasStoreManagerSignature ? (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Potpisano
              </span>
            ) : (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                Nije potpisano
              </span>
            )}
          </div>
          {hasStoreManagerSignature ? (
            <div className="space-y-2">
              {signatures?.filter(s => s.signature_type === 'store_manager').map((signature) => (
                <div key={signature.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{signature.user_name || 'Nepoznato'}</p>
                      {signature.signed_at && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(signature.signed_at).toLocaleString('hr-HR')}
                        </p>
                      )}
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Poslovođa prodavnice može potpisati evidenciju.
              </p>
              <button
                onClick={() => handleSign('store_manager')}
                disabled={isSigning || !!userSignatureStoreManager || recordStatus === 'locked'}
                className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSigning ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Potpisivanje...
                  </>
                ) : (
                  <>
                    <PenTool className="w-4 h-4" />
                    Potpiši kao poslovođa
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Akcije</h4>
        <div className="flex gap-3 flex-wrap">
          {(recordStatus === 'finalized' || recordStatus === 'locked') && (
            <button
              onClick={async () => {
                if (!recordId) {
                  toast.error('ID evidencije nije dostupan');
                  return;
                }
                try {
                  await downloadControlRecordPdf(recordId);
                  toast.success('PDF je uspješno preuzet');
                } catch (error: any) {
                  console.error('PDF download error:', error);
                  const errorMessage = error?.response?.data?.error || 
                                     error?.response?.data?.message || 
                                     error?.message || 
                                     'Greška pri preuzimanju PDF-a';
                  toast.error(errorMessage);
                }
              }}
              disabled={!recordId}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Preuzmi PDF
            </button>
          )}
          {recordStatus !== 'locked' && (
            <>
              {recordStatus === 'draft' && (
                <button
                  onClick={handleFinalize}
                  disabled={isFinalizing || !hasControllerSignature || !recordId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isFinalizing ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Finalizovanje...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Finalizuj evidenciju
                    </>
                  )}
                </button>
              )}
              {recordStatus === 'finalized' && (
                <button
                  onClick={handleLock}
                  disabled={isLocking || !recordId}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLocking ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Zaključavanje...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Zaključaj evidenciju
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
          {recordStatus === 'draft' && !hasControllerSignature && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-3">
              ⚠️ Kontrolor mora potpisati evidenciju pre finalizovanja.
            </p>
          )}
          {recordStatus === 'draft' && (!participants || participants.length === 0) && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-3">
              ⚠️ Evidencija mora imati barem jednog učesnika (participanta) pre finalizovanja. Molimo dodajte učesnike u tabu "Osnovni podaci".
            </p>
          )}
        </div>

      {recordStatus === 'locked' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              Evidencija je zaključana i ne može se mijenjati.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsTab() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeSubTab, setActiveSubTab] = useState<'dashboard'>('dashboard');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | undefined>();
  const [showUploadPlansModal, setShowUploadPlansModal] = useState(false);
  const [showUploadResultsModal, setShowUploadResultsModal] = useState(false);

  // Check if user is admin
  const userRoleString = user?.role?.toLowerCase() || '';
  const userRolesArray = (user as any)?.roles || [];
  const isAdmin = userRoleString === 'admin' || 
                  userRoleString === 'super-admin' ||
                  userRolesArray.some((r: string) => r?.toLowerCase() === 'admin' || r?.toLowerCase() === 'super-admin');

  // Fetch stores and employees
  const { data: storesData } = useQuery({
    queryKey: ['hrm-stores'],
    queryFn: () => hrmService.getStores({ is_active: true }),
  });

  const stores = storesData?.data || storesData || [];

  const { data: employeesData } = useQuery({
    queryKey: ['hrm-employees-all'],
    queryFn: () => hrmService.getEmployees({ status: 'active', per_page: 1000 }),
  });

  const employees = employeesData?.data || employeesData || [];

  // Fetch plans, results, performance
  const { data: plansData } = useQuery({
    queryKey: ['sales-plans', selectedYear, selectedMonth, selectedStoreId, selectedEmployeeId],
    queryFn: async () => {
      const response = await salesService.getSalesPlans({
        year: selectedYear,
        month: selectedMonth,
        store_id: selectedStoreId,
        employee_id: selectedEmployeeId,
      });
      return response.data || response || [];
    },
  });

  const plans = plansData || [];

  const { data: resultsData } = useQuery({
    queryKey: ['sales-results', selectedYear, selectedMonth, selectedStoreId, selectedEmployeeId],
    queryFn: async () => {
      const response = await salesService.getSalesResults({
        year: selectedYear,
        month: selectedMonth,
        store_id: selectedStoreId,
        employee_id: selectedEmployeeId,
      });
      return response.data || response || [];
    },
  });

  const results = resultsData || [];

  const { data: performanceData } = useQuery({
    queryKey: ['sales-performance', selectedYear, selectedMonth, selectedStoreId, selectedEmployeeId],
    queryFn: async () => {
      const response = await salesService.getSalesPerformance({
        year: selectedYear,
        month: selectedMonth,
        store_id: selectedStoreId,
        employee_id: selectedEmployeeId,
      });
      return response.data || response || [];
    },
  });

  const performance = performanceData || [];

  // Note: Plan mutations are no longer used since plans are uploaded via Excel
  // Keeping them for potential future use, but they're not referenced in the UI

  const uploadPlansMutation = useMutation({
    mutationFn: ({ file, overwrite }: { file: File; overwrite?: boolean }) =>
      salesService.uploadSalesPlans(file, overwrite),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales-plans'] });
      queryClient.invalidateQueries({ queryKey: ['sales-performance'] });
      if (data.error_count > 0) {
        toast.error(`Upload završen sa greškama. Uspješno: ${data.success_count}, Greške: ${data.error_count}`);
      } else {
        toast.success(`Uspješno učitano ${data.success_count} planova`);
      }
      setShowUploadPlansModal(false);
    },
    onError: (error: any) => {
      console.error('Upload plans error:', error);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.error || 
                          error?.message || 
                          'Greška pri učitavanju planova';
      toast.error(errorMessage);
    },
  });

  const uploadResultsMutation = useMutation({
    mutationFn: ({ file, storeId, overwrite }: { file: File; storeId?: number; overwrite?: boolean }) =>
      salesService.uploadSalesResults(file, storeId, overwrite),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sales-results'] });
      queryClient.invalidateQueries({ queryKey: ['sales-performance'] });
      if (data.error_count > 0) {
        toast.error(`Upload završen sa greškama. Uspješno: ${data.success_count}, Greške: ${data.error_count}`);
      } else {
        toast.success(`Uspješno učitano ${data.success_count} rezultata`);
      }
      setShowUploadResultsModal(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Greška pri učitavanju rezultata');
    },
  });

  const months = [
    'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
    'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
  ];

  return (
    <div className="space-y-2 sm:space-y-3 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
        <h2 className="text-xs sm:text-sm lg:text-xl font-semibold text-gray-900 dark:text-white break-words">
          Ostvareni Rezultati
        </h2>
        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowUploadPlansModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Učitaj Planove
            </button>
            <button
              onClick={() => setShowUploadResultsModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Učitaj Rezultate
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Godina
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mjesec
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {months.map((month, index) => (
              <option key={index + 1} value={index + 1}>{month}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Prodavnica
          </label>
          <select
            value={selectedStoreId || ''}
            onChange={(e) => setSelectedStoreId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Sve prodavnice</option>
            {stores?.map((store: any) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Zaposlenik
          </label>
          <select
            value={selectedEmployeeId || ''}
            onChange={(e) => setSelectedEmployeeId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Svi zaposlenici</option>
            {employees.map((emp: any) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Dashboard Content */}
      <SalesDashboardTab
        plans={plans || []}
        results={results || []}
        performance={performance || []}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
      />

      {/* Upload Plans Modal */}
      {showUploadPlansModal && (
        <SalesPlansUploadModal
          onClose={() => setShowUploadPlansModal(false)}
          onUpload={(file, overwrite) => {
            uploadPlansMutation.mutate({ file, overwrite });
          }}
          isLoading={uploadPlansMutation.isPending}
          uploadResult={uploadPlansMutation.data}
        />
      )}

      {/* Upload Results Modal */}
      {showUploadResultsModal && (
        <SalesResultsUploadModal
          stores={stores || []}
          onClose={() => setShowUploadResultsModal(false)}
          onUpload={(file, storeId, overwrite) => {
            uploadResultsMutation.mutate({ file, storeId, overwrite });
          }}
          isLoading={uploadResultsMutation.isPending}
          uploadResult={uploadResultsMutation.data}
        />
      )}
    </div>
  );
}
 


import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award,
  GraduationCap,
  Loader2,
  Plus,
  Search,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createDevelopmentPlan,
  createEducationCertificate,
  createEducationEnrollment,
  createEducationProgram,
  deleteDevelopmentPlan,
  deleteEducationCertificate,
  deleteEducationProgram,
  getDevelopmentPlans,
  getEducationCertificates,
  getEducationEnrollments,
  getEducationPrograms,
  getEducationSummary,
  getEmployees,
  updateEducationEnrollment,
  updateEducationProgram,
} from '../../../services/hrmService';
import type {
  DevelopmentPlan,
  EducationCertificate,
  EducationEnrollment,
  EducationProgram,
  EducationType,
} from '../../../types/hrm';

type TabKey = 'programs' | 'enrollments' | 'certificates' | 'plans';

const TYPE_LABELS: Record<EducationType, string> = {
  internal: 'Interna',
  external: 'Eksterna',
  online: 'Online',
  workshop: 'Radionica',
};

const PROGRAM_STATUS: Record<string, string> = {
  draft: 'Nacrt',
  open: 'Otvoren',
  in_progress: 'U toku',
  completed: 'Završen',
  cancelled: 'Otkazan',
};

const ENROLLMENT_STATUS: Record<string, string> = {
  planned: 'Planirano',
  in_progress: 'U toku',
  completed: 'Završeno',
  cancelled: 'Otkazano',
  no_show: 'Nije došao/la',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('bs-BA');
}

export default function Education() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('programs');
  const [search, setSearch] = useState('');
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const [programForm, setProgramForm] = useState({
    title: '',
    description: '',
    education_type: 'internal' as EducationType,
    topic: '',
    provider: '',
    location: '',
    duration_hours: '',
    start_date: '',
    end_date: '',
    max_participants: '',
    status: 'open',
    issues_certificate: true,
  });

  const [enrollmentForm, setEnrollmentForm] = useState({
    program_id: '',
    employee_id: '',
    status: 'planned',
    enrolled_at: new Date().toISOString().slice(0, 10),
  });

  const [certificateForm, setCertificateForm] = useState({
    employee_id: '',
    title: '',
    issuer: '',
    certificate_number: '',
    issued_at: new Date().toISOString().slice(0, 10),
    expires_at: '',
  });

  const [planForm, setPlanForm] = useState({
    employee_id: '',
    title: '',
    goals: '',
    activities: '',
    start_date: new Date().toISOString().slice(0, 10),
    target_date: '',
    progress_percent: '0',
  });

  const filters = useMemo(() => ({ search: search || undefined, per_page: 50 }), [search]);

  const { data: summary } = useQuery({
    queryKey: ['hrm-education-summary'],
    queryFn: getEducationSummary,
  });

  const { data: programsData, isLoading: loadingPrograms } = useQuery({
    queryKey: ['hrm-education-programs', filters],
    queryFn: () => getEducationPrograms(filters),
  });

  const { data: enrollmentsData, isLoading: loadingEnrollments } = useQuery({
    queryKey: ['hrm-education-enrollments', filters],
    queryFn: () => getEducationEnrollments(filters),
    enabled: tab === 'enrollments',
  });

  const { data: certificatesData, isLoading: loadingCertificates } = useQuery({
    queryKey: ['hrm-education-certificates', filters],
    queryFn: () => getEducationCertificates(filters),
    enabled: tab === 'certificates',
  });

  const { data: plansData, isLoading: loadingPlans } = useQuery({
    queryKey: ['hrm-development-plans'],
    queryFn: () => getDevelopmentPlans({ per_page: 50 }),
    enabled: tab === 'plans',
  });

  const { data: employeesData } = useQuery({
    queryKey: ['hrm-employees-education-select'],
    queryFn: () => getEmployees({ per_page: 200 }),
    enabled: showEnrollmentModal || showCertificateModal || showPlanModal,
  });

  const programs = programsData?.data || [];
  const enrollments = enrollmentsData?.data || [];
  const certificates = certificatesData?.data || [];
  const plans = plansData?.data || [];
  const employees = employeesData?.data || [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['hrm-education-summary'] });
    queryClient.invalidateQueries({ queryKey: ['hrm-education-programs'] });
    queryClient.invalidateQueries({ queryKey: ['hrm-education-enrollments'] });
    queryClient.invalidateQueries({ queryKey: ['hrm-education-certificates'] });
    queryClient.invalidateQueries({ queryKey: ['hrm-development-plans'] });
  };

  const createProgramMutation = useMutation({
    mutationFn: createEducationProgram,
    onSuccess: () => {
      toast.success('Program kreiran');
      setShowProgramModal(false);
      invalidateAll();
    },
    onError: () => toast.error('Greška pri kreiranju programa'),
  });

  const createEnrollmentMutation = useMutation({
    mutationFn: createEducationEnrollment,
    onSuccess: () => {
      toast.success('Prijava kreirana');
      setShowEnrollmentModal(false);
      invalidateAll();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message || 'Greška pri prijavi'),
  });

  const updateEnrollmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      updateEducationEnrollment(id, data),
    onSuccess: () => {
      toast.success('Prijava ažurirana');
      invalidateAll();
    },
    onError: () => toast.error('Greška pri ažuriranju'),
  });

  const createCertificateMutation = useMutation({
    mutationFn: createEducationCertificate,
    onSuccess: () => {
      toast.success('Certifikat dodan');
      setShowCertificateModal(false);
      invalidateAll();
    },
    onError: () => toast.error('Greška pri dodavanju certifikata'),
  });

  const createPlanMutation = useMutation({
    mutationFn: createDevelopmentPlan,
    onSuccess: () => {
      toast.success('Plan razvoja kreiran');
      setShowPlanModal(false);
      invalidateAll();
    },
    onError: () => toast.error('Greška pri kreiranju plana'),
  });

  const tabs: { key: TabKey; label: string; icon: typeof GraduationCap }[] = [
    { key: 'programs', label: 'Kursevi i programi', icon: GraduationCap },
    { key: 'enrollments', label: 'Prijave', icon: Users },
    { key: 'certificates', label: 'Certifikati', icon: Award },
    { key: 'plans', label: 'Plan razvoja', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edukacije</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Programi, prijave, certifikati i individualni planovi razvoja
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (tab === 'programs') setShowProgramModal(true);
            if (tab === 'enrollments') setShowEnrollmentModal(true);
            if (tab === 'certificates') setShowCertificateModal(true);
            if (tab === 'plans') setShowPlanModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Dodaj
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Programi', value: summary?.programs ?? 0 },
          { label: 'Otvoreni', value: summary?.open_programs ?? 0 },
          { label: 'Prijave', value: summary?.enrollments ?? 0 },
          { label: 'Završene', value: summary?.completed_enrollments ?? 0 },
          { label: 'Certifikati', value: summary?.certificates ?? 0 },
          { label: 'Planovi', value: summary?.development_plans ?? 0 },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="text-2xl font-semibold text-gray-900 dark:text-white">{card.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
              tab === key
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300'
            } border border-gray-200 dark:border-gray-700`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pretraži..."
          className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {tab === 'programs' && (
          <ProgramsTable
            loading={loadingPrograms}
            programs={programs}
            onStatusChange={(id, status) =>
              updateEducationProgram(id, { status }).then(() => {
                toast.success('Status ažuriran');
                invalidateAll();
              })
            }
            onDelete={(id) =>
              deleteEducationProgram(id).then(() => {
                toast.success('Program obrisan');
                invalidateAll();
              })
            }
          />
        )}
        {tab === 'enrollments' && (
          <EnrollmentsTable
            loading={loadingEnrollments}
            enrollments={enrollments}
            onComplete={(id) => updateEnrollmentMutation.mutate({ id, data: { status: 'completed' } })}
          />
        )}
        {tab === 'certificates' && (
          <CertificatesTable
            loading={loadingCertificates}
            certificates={certificates}
            onDelete={(id) =>
              deleteEducationCertificate(id).then(() => {
                toast.success('Certifikat obrisan');
                invalidateAll();
              })
            }
          />
        )}
        {tab === 'plans' && (
          <PlansTable
            loading={loadingPlans}
            plans={plans}
            onDelete={(id) =>
              deleteDevelopmentPlan(id).then(() => {
                toast.success('Plan obrisan');
                invalidateAll();
              })
            }
          />
        )}
      </div>

      {showProgramModal && (
        <Modal title="Novi edukacijski program" onClose={() => setShowProgramModal(false)}>
          <div className="grid gap-3">
            <Field label="Naziv">
              <input
                className="input"
                value={programForm.title}
                onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tip">
                <select
                  className="input"
                  value={programForm.education_type}
                  onChange={(e) =>
                    setProgramForm({ ...programForm, education_type: e.target.value as EducationType })
                  }
                >
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  className="input"
                  value={programForm.status}
                  onChange={(e) => setProgramForm({ ...programForm, status: e.target.value })}
                >
                  {Object.entries(PROGRAM_STATUS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Tema">
              <input
                className="input"
                value={programForm.topic}
                onChange={(e) => setProgramForm({ ...programForm, topic: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Organizator">
                <input
                  className="input"
                  value={programForm.provider}
                  onChange={(e) => setProgramForm({ ...programForm, provider: e.target.value })}
                />
              </Field>
              <Field label="Lokacija">
                <input
                  className="input"
                  value={programForm.location}
                  onChange={(e) => setProgramForm({ ...programForm, location: e.target.value })}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Početak">
                <input
                  type="date"
                  className="input"
                  value={programForm.start_date}
                  onChange={(e) => setProgramForm({ ...programForm, start_date: e.target.value })}
                />
              </Field>
              <Field label="Kraj">
                <input
                  type="date"
                  className="input"
                  value={programForm.end_date}
                  onChange={(e) => setProgramForm({ ...programForm, end_date: e.target.value })}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={programForm.issues_certificate}
                onChange={(e) => setProgramForm({ ...programForm, issues_certificate: e.target.checked })}
              />
              Izdaje certifikat po završetku
            </label>
            <Field label="Opis">
              <textarea
                className="input min-h-[80px]"
                value={programForm.description}
                onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
              />
            </Field>
            <button
              type="button"
              disabled={!programForm.title || createProgramMutation.isPending}
              onClick={() =>
                createProgramMutation.mutate({
                  ...programForm,
                  duration_hours: programForm.duration_hours ? Number(programForm.duration_hours) : null,
                  max_participants: programForm.max_participants
                    ? Number(programForm.max_participants)
                    : null,
                })
              }
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Sačuvaj program
            </button>
          </div>
        </Modal>
      )}

      {showEnrollmentModal && (
        <Modal title="Nova prijava" onClose={() => setShowEnrollmentModal(false)}>
          <div className="grid gap-3">
            <Field label="Program">
              <select
                className="input"
                value={enrollmentForm.program_id}
                onChange={(e) => setEnrollmentForm({ ...enrollmentForm, program_id: e.target.value })}
              >
                <option value="">Odaberi program</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Zaposlenik">
              <select
                className="input"
                value={enrollmentForm.employee_id}
                onChange={(e) => setEnrollmentForm({ ...enrollmentForm, employee_id: e.target.value })}
              >
                <option value="">Odaberi zaposlenika</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Datum prijave">
              <input
                type="date"
                className="input"
                value={enrollmentForm.enrolled_at}
                onChange={(e) => setEnrollmentForm({ ...enrollmentForm, enrolled_at: e.target.value })}
              />
            </Field>
            <button
              type="button"
              disabled={
                !enrollmentForm.program_id ||
                !enrollmentForm.employee_id ||
                createEnrollmentMutation.isPending
              }
              onClick={() =>
                createEnrollmentMutation.mutate({
                  program_id: Number(enrollmentForm.program_id),
                  employee_id: Number(enrollmentForm.employee_id),
                  status: enrollmentForm.status,
                  enrolled_at: enrollmentForm.enrolled_at,
                })
              }
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Prijavi
            </button>
          </div>
        </Modal>
      )}

      {showCertificateModal && (
        <Modal title="Novi certifikat" onClose={() => setShowCertificateModal(false)}>
          <div className="grid gap-3">
            <Field label="Zaposlenik">
              <select
                className="input"
                value={certificateForm.employee_id}
                onChange={(e) => setCertificateForm({ ...certificateForm, employee_id: e.target.value })}
              >
                <option value="">Odaberi zaposlenika</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Naziv">
              <input
                className="input"
                value={certificateForm.title}
                onChange={(e) => setCertificateForm({ ...certificateForm, title: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Izdavač">
                <input
                  className="input"
                  value={certificateForm.issuer}
                  onChange={(e) => setCertificateForm({ ...certificateForm, issuer: e.target.value })}
                />
              </Field>
              <Field label="Broj">
                <input
                  className="input"
                  value={certificateForm.certificate_number}
                  onChange={(e) =>
                    setCertificateForm({ ...certificateForm, certificate_number: e.target.value })
                  }
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Izdato">
                <input
                  type="date"
                  className="input"
                  value={certificateForm.issued_at}
                  onChange={(e) => setCertificateForm({ ...certificateForm, issued_at: e.target.value })}
                />
              </Field>
              <Field label="Ističe">
                <input
                  type="date"
                  className="input"
                  value={certificateForm.expires_at}
                  onChange={(e) => setCertificateForm({ ...certificateForm, expires_at: e.target.value })}
                />
              </Field>
            </div>
            <button
              type="button"
              disabled={
                !certificateForm.employee_id ||
                !certificateForm.title ||
                createCertificateMutation.isPending
              }
              onClick={() =>
                createCertificateMutation.mutate({
                  ...certificateForm,
                  employee_id: Number(certificateForm.employee_id),
                  expires_at: certificateForm.expires_at || null,
                })
              }
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Sačuvaj certifikat
            </button>
          </div>
        </Modal>
      )}

      {showPlanModal && (
        <Modal title="Novi plan razvoja" onClose={() => setShowPlanModal(false)}>
          <div className="grid gap-3">
            <Field label="Zaposlenik">
              <select
                className="input"
                value={planForm.employee_id}
                onChange={(e) => setPlanForm({ ...planForm, employee_id: e.target.value })}
              >
                <option value="">Odaberi zaposlenika</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Naziv plana">
              <input
                className="input"
                value={planForm.title}
                onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
              />
            </Field>
            <Field label="Ciljevi">
              <textarea
                className="input min-h-[70px]"
                value={planForm.goals}
                onChange={(e) => setPlanForm({ ...planForm, goals: e.target.value })}
              />
            </Field>
            <Field label="Aktivnosti (jedna po liniji)">
              <textarea
                className="input min-h-[70px]"
                value={planForm.activities}
                onChange={(e) => setPlanForm({ ...planForm, activities: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Početak">
                <input
                  type="date"
                  className="input"
                  value={planForm.start_date}
                  onChange={(e) => setPlanForm({ ...planForm, start_date: e.target.value })}
                />
              </Field>
              <Field label="Ciljni datum">
                <input
                  type="date"
                  className="input"
                  value={planForm.target_date}
                  onChange={(e) => setPlanForm({ ...planForm, target_date: e.target.value })}
                />
              </Field>
            </div>
            <button
              type="button"
              disabled={!planForm.employee_id || !planForm.title || createPlanMutation.isPending}
              onClick={() =>
                createPlanMutation.mutate({
                  employee_id: Number(planForm.employee_id),
                  title: planForm.title,
                  goals: planForm.goals || null,
                  activities: planForm.activities
                    ? planForm.activities.split('\n').map((s) => s.trim()).filter(Boolean)
                    : [],
                  start_date: planForm.start_date || null,
                  target_date: planForm.target_date || null,
                  progress_percent: Number(planForm.progress_percent) || 0,
                  status: 'active',
                })
              }
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Sačuvaj plan
            </button>
          </div>
        </Modal>
      )}

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(229 231 235);
          background: white;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .dark .input {
          border-color: rgb(55 65 81);
          background: rgb(31 41 55);
          color: white;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-gray-600 dark:text-gray-300">{label}</span>
      {children}
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-sm text-gray-500">
      <Loader2 className="h-4 w-4 animate-spin" /> Učitavanje...
    </div>
  );
}

function ProgramsTable({
  loading,
  programs,
  onStatusChange,
  onDelete,
}: {
  loading: boolean;
  programs: EducationProgram[];
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
}) {
  if (loading) return <LoadingRow />;
  if (!programs.length) {
    return <div className="p-8 text-center text-sm text-gray-500">Nema programa.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left dark:bg-gray-900/40">
          <tr>
            <th className="px-4 py-3">Program</th>
            <th className="px-4 py-3">Tip</th>
            <th className="px-4 py-3">Period</th>
            <th className="px-4 py-3">Prijave</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {programs.map((p) => (
            <tr key={p.id} className="border-t border-gray-100 dark:border-gray-700">
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900 dark:text-white">{p.title}</div>
                <div className="text-xs text-gray-500">{p.topic || p.provider || '—'}</div>
              </td>
              <td className="px-4 py-3">{TYPE_LABELS[p.education_type]}</td>
              <td className="px-4 py-3">
                {formatDate(p.start_date)} – {formatDate(p.end_date)}
              </td>
              <td className="px-4 py-3">{p.enrollments_count ?? 0}</td>
              <td className="px-4 py-3">
                <select
                  className="rounded border border-gray-200 bg-transparent px-2 py-1 dark:border-gray-600"
                  value={p.status}
                  onChange={(e) => onStatusChange(p.id, e.target.value)}
                >
                  {Object.entries(PROGRAM_STATUS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  onClick={() => onDelete(p.id)}
                  className="text-red-600 hover:underline"
                >
                  Obriši
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EnrollmentsTable({
  loading,
  enrollments,
  onComplete,
}: {
  loading: boolean;
  enrollments: EducationEnrollment[];
  onComplete: (id: number) => void;
}) {
  if (loading) return <LoadingRow />;
  if (!enrollments.length) {
    return <div className="p-8 text-center text-sm text-gray-500">Nema prijava.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left dark:bg-gray-900/40">
          <tr>
            <th className="px-4 py-3">Zaposlenik</th>
            <th className="px-4 py-3">Program</th>
            <th className="px-4 py-3">Prijava</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {enrollments.map((e) => (
            <tr key={e.id} className="border-t border-gray-100 dark:border-gray-700">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                {e.employee_name || `#${e.employee_id}`}
              </td>
              <td className="px-4 py-3">{e.program_title}</td>
              <td className="px-4 py-3">{formatDate(e.enrolled_at)}</td>
              <td className="px-4 py-3">{ENROLLMENT_STATUS[e.status] || e.status}</td>
              <td className="px-4 py-3 text-right">
                {e.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={() => onComplete(e.id)}
                    className="text-indigo-600 hover:underline"
                  >
                    Označi završeno
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CertificatesTable({
  loading,
  certificates,
  onDelete,
}: {
  loading: boolean;
  certificates: EducationCertificate[];
  onDelete: (id: number) => void;
}) {
  if (loading) return <LoadingRow />;
  if (!certificates.length) {
    return <div className="p-8 text-center text-sm text-gray-500">Nema certifikata.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left dark:bg-gray-900/40">
          <tr>
            <th className="px-4 py-3">Zaposlenik</th>
            <th className="px-4 py-3">Certifikat</th>
            <th className="px-4 py-3">Izdavač</th>
            <th className="px-4 py-3">Izdato</th>
            <th className="px-4 py-3">Ističe</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {certificates.map((c) => (
            <tr key={c.id} className="border-t border-gray-100 dark:border-gray-700">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                {c.employee_name || `#${c.employee_id}`}
              </td>
              <td className="px-4 py-3">{c.title}</td>
              <td className="px-4 py-3">{c.issuer || '—'}</td>
              <td className="px-4 py-3">{formatDate(c.issued_at)}</td>
              <td className="px-4 py-3">{formatDate(c.expires_at)}</td>
              <td className="px-4 py-3 text-right">
                <button type="button" onClick={() => onDelete(c.id)} className="text-red-600 hover:underline">
                  Obriši
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlansTable({
  loading,
  plans,
  onDelete,
}: {
  loading: boolean;
  plans: DevelopmentPlan[];
  onDelete: (id: number) => void;
}) {
  if (loading) return <LoadingRow />;
  if (!plans.length) {
    return <div className="p-8 text-center text-sm text-gray-500">Nema planova razvoja.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left dark:bg-gray-900/40">
          <tr>
            <th className="px-4 py-3">Zaposlenik</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Ciljni datum</th>
            <th className="px-4 py-3">Napredak</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id} className="border-t border-gray-100 dark:border-gray-700">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                {p.employee_name || `#${p.employee_id}`}
              </td>
              <td className="px-4 py-3">
                <div>{p.title}</div>
                <div className="text-xs text-gray-500 line-clamp-1">{p.goals || '—'}</div>
              </td>
              <td className="px-4 py-3">{formatDate(p.target_date)}</td>
              <td className="px-4 py-3">{p.progress_percent}%</td>
              <td className="px-4 py-3">{p.status}</td>
              <td className="px-4 py-3 text-right">
                <button type="button" onClick={() => onDelete(p.id)} className="text-red-600 hover:underline">
                  Obriši
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

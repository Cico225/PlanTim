import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Loader2,
  Plus,
  Search,
  Star,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createCareerPath,
  createSuccessionPlan,
  createTalentProfile,
  deleteCareerPath,
  deleteSuccessionPlan,
  deleteTalentProfile,
  getCareerPaths,
  getEmployees,
  getSuccessionPlans,
  getTalentProfiles,
  getTalentSummary,
  updateTalentProfile,
} from '../../../services/hrmService';
import type {
  CareerPath,
  SuccessionPlan,
  TalentLevel,
  TalentProfile,
  TalentReadiness,
} from '../../../types/hrm';

type TabKey = 'pool' | 'paths' | 'succession' | 'ninebox';

const LEVEL_LABELS: Record<TalentLevel, string> = {
  low: 'Nisko',
  medium: 'Srednje',
  high: 'Visoko',
};

const READINESS_LABELS: Record<TalentReadiness, string> = {
  ready_now: 'Spremno sada',
  '1_2_years': '1–2 godine',
  '3_plus_years': '3+ godine',
};

const LEVELS: TalentLevel[] = ['high', 'medium', 'low'];

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('bs-BA');
}

export default function TalentManagement() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>('pool');
  const [search, setSearch] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPathModal, setShowPathModal] = useState(false);
  const [showSuccessionModal, setShowSuccessionModal] = useState(false);

  const [profileForm, setProfileForm] = useState({
    employee_id: '',
    performance_level: 'medium' as TalentLevel,
    potential_level: 'medium' as TalentLevel,
    in_talent_pool: true,
    readiness: '1_2_years' as TalentReadiness,
    strengths: '',
    development_areas: '',
    goals: '',
    competencies: '',
  });

  const [pathForm, setPathForm] = useState({
    employee_id: '',
    current_position: '',
    target_position: '',
    horizon: 'medium',
    target_date: '',
    notes: '',
  });

  const [successionForm, setSuccessionForm] = useState({
    position_title: '',
    incumbent_employee_id: '',
    successor_employee_id: '',
    readiness: '1_2_years' as TalentReadiness,
    priority: '2',
    development_actions: '',
  });

  const filters = useMemo(
    () => ({ search: search || undefined, per_page: 100, in_talent_pool: tab === 'pool' ? 1 : undefined }),
    [search, tab]
  );

  const { data: summary } = useQuery({
    queryKey: ['hrm-talent-summary'],
    queryFn: getTalentSummary,
  });

  const { data: profilesData, isLoading: loadingProfiles } = useQuery({
    queryKey: ['hrm-talent-profiles', filters],
    queryFn: () => getTalentProfiles(filters),
  });

  const { data: pathsData, isLoading: loadingPaths } = useQuery({
    queryKey: ['hrm-career-paths'],
    queryFn: () => getCareerPaths({ per_page: 50 }),
    enabled: tab === 'paths',
  });

  const { data: successionData, isLoading: loadingSuccession } = useQuery({
    queryKey: ['hrm-succession-plans'],
    queryFn: () => getSuccessionPlans({ per_page: 50 }),
    enabled: tab === 'succession',
  });

  const { data: employeesData } = useQuery({
    queryKey: ['hrm-employees-talent-select'],
    queryFn: () => getEmployees({ per_page: 200 }),
    enabled: showProfileModal || showPathModal || showSuccessionModal,
  });

  const profiles = profilesData?.data || [];
  const paths = pathsData?.data || [];
  const succession = successionData?.data || [];
  const employees = employeesData?.data || [];

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['hrm-talent-summary'] });
    queryClient.invalidateQueries({ queryKey: ['hrm-talent-profiles'] });
    queryClient.invalidateQueries({ queryKey: ['hrm-career-paths'] });
    queryClient.invalidateQueries({ queryKey: ['hrm-succession-plans'] });
  };

  const createProfileMutation = useMutation({
    mutationFn: createTalentProfile,
    onSuccess: () => {
      toast.success('Profil talenta kreiran');
      setShowProfileModal(false);
      invalidateAll();
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message || 'Greška pri kreiranju profila'),
  });

  const createPathMutation = useMutation({
    mutationFn: createCareerPath,
    onSuccess: () => {
      toast.success('Karijerna putanja kreirana');
      setShowPathModal(false);
      invalidateAll();
    },
    onError: () => toast.error('Greška pri kreiranju putanje'),
  });

  const createSuccessionMutation = useMutation({
    mutationFn: createSuccessionPlan,
    onSuccess: () => {
      toast.success('Plan nasljeđivanja kreiran');
      setShowSuccessionModal(false);
      invalidateAll();
    },
    onError: () => toast.error('Greška pri kreiranju plana'),
  });

  const nineBoxCount = (perf: TalentLevel, pot: TalentLevel) => {
    const fromSummary = summary?.nine_box?.find(
      (c) => c.performance_level === perf && c.potential_level === pot
    );
    if (fromSummary) return Number(fromSummary.total);
    return profiles.filter((p) => p.performance_level === perf && p.potential_level === pot).length;
  };

  const tabs: { key: TabKey; label: string; icon: typeof Star }[] = [
    { key: 'pool', label: 'Talent Pool', icon: Star },
    { key: 'paths', label: 'Karijerne putanje', icon: TrendingUp },
    { key: 'succession', label: 'Nasljeđivanje', icon: Users },
    { key: 'ninebox', label: '9-Box matrica', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Talent Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Talent pool, karijerne putanje, nasljeđivanje i 9-box matrica
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (tab === 'pool' || tab === 'ninebox') setShowProfileModal(true);
            if (tab === 'paths') setShowPathModal(true);
            if (tab === 'succession') setShowSuccessionModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          <Plus className="h-4 w-4" />
          Dodaj
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Talent pool', value: summary?.talent_pool ?? 0 },
          { label: 'Visoki potencijal', value: summary?.high_potential ?? 0 },
          { label: 'Karijerne putanje', value: summary?.career_paths ?? 0 },
          { label: 'Nasljeđivanje', value: summary?.succession_plans ?? 0 },
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
                ? 'bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300'
            } border border-gray-200 dark:border-gray-700`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab !== 'ninebox' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pretraži..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        {(tab === 'pool' || tab === 'ninebox') && tab === 'pool' && (
          <ProfilesTable
            loading={loadingProfiles}
            profiles={profiles}
            onTogglePool={(id, inPool) =>
              updateTalentProfile(id, { in_talent_pool: inPool }).then(() => {
                toast.success('Ažurirano');
                invalidateAll();
              })
            }
            onDelete={(id) =>
              deleteTalentProfile(id).then(() => {
                toast.success('Profil obrisan');
                invalidateAll();
              })
            }
          />
        )}

        {tab === 'ninebox' && (
          <div className="p-6">
            <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              Performanse → | Potencijal ↓
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div />
              {LEVELS.map((perf) => (
                <div key={perf} className="text-center text-xs font-medium text-gray-500">
                  Perf. {LEVEL_LABELS[perf]}
                </div>
              ))}
              {LEVELS.map((pot) => (
                <div key={`row-${pot}`} className="contents">
                  <div className="flex items-center text-xs font-medium text-gray-500">
                    Pot. {LEVEL_LABELS[pot]}
                  </div>
                  {LEVELS.map((perf) => {
                    const count = nineBoxCount(perf, pot);
                    const isStar = perf === 'high' && pot === 'high';
                    return (
                      <div
                        key={`${perf}-${pot}`}
                        className={`flex min-h-[90px] flex-col items-center justify-center rounded-lg border p-3 ${
                          isStar
                            ? 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20'
                            : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/30'
                        }`}
                      >
                        <div className="text-2xl font-semibold text-gray-900 dark:text-white">{count}</div>
                        <div className="mt-1 text-[11px] text-gray-500">
                          {profiles
                            .filter((p) => p.performance_level === perf && p.potential_level === pot)
                            .slice(0, 2)
                            .map((p) => p.employee_name)
                            .filter(Boolean)
                            .join(', ') || '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            {loadingProfiles && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Učitavanje...
              </div>
            )}
          </div>
        )}

        {tab === 'paths' && (
          <PathsTable
            loading={loadingPaths}
            paths={paths}
            onDelete={(id) =>
              deleteCareerPath(id).then(() => {
                toast.success('Putanja obrisana');
                invalidateAll();
              })
            }
          />
        )}

        {tab === 'succession' && (
          <SuccessionTable
            loading={loadingSuccession}
            plans={succession}
            onDelete={(id) =>
              deleteSuccessionPlan(id).then(() => {
                toast.success('Plan obrisan');
                invalidateAll();
              })
            }
          />
        )}
      </div>

      {showProfileModal && (
        <Modal title="Novi talent profil" onClose={() => setShowProfileModal(false)}>
          <div className="grid gap-3">
            <Field label="Zaposlenik">
              <select
                className="input"
                value={profileForm.employee_id}
                onChange={(e) => setProfileForm({ ...profileForm, employee_id: e.target.value })}
              >
                <option value="">Odaberi zaposlenika</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Performanse">
                <select
                  className="input"
                  value={profileForm.performance_level}
                  onChange={(e) =>
                    setProfileForm({
                      ...profileForm,
                      performance_level: e.target.value as TalentLevel,
                    })
                  }
                >
                  {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Potencijal">
                <select
                  className="input"
                  value={profileForm.potential_level}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, potential_level: e.target.value as TalentLevel })
                  }
                >
                  {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Spremnost">
              <select
                className="input"
                value={profileForm.readiness}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, readiness: e.target.value as TalentReadiness })
                }
              >
                {Object.entries(READINESS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Snage">
              <textarea
                className="input min-h-[60px]"
                value={profileForm.strengths}
                onChange={(e) => setProfileForm({ ...profileForm, strengths: e.target.value })}
              />
            </Field>
            <Field label="Područja razvoja">
              <textarea
                className="input min-h-[60px]"
                value={profileForm.development_areas}
                onChange={(e) => setProfileForm({ ...profileForm, development_areas: e.target.value })}
              />
            </Field>
            <Field label="Kompetencije (zarezom)">
              <input
                className="input"
                value={profileForm.competencies}
                onChange={(e) => setProfileForm({ ...profileForm, competencies: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={profileForm.in_talent_pool}
                onChange={(e) => setProfileForm({ ...profileForm, in_talent_pool: e.target.checked })}
              />
              U talent poolu
            </label>
            <button
              type="button"
              disabled={!profileForm.employee_id || createProfileMutation.isPending}
              onClick={() =>
                createProfileMutation.mutate({
                  employee_id: Number(profileForm.employee_id),
                  performance_level: profileForm.performance_level,
                  potential_level: profileForm.potential_level,
                  readiness: profileForm.readiness,
                  in_talent_pool: profileForm.in_talent_pool,
                  strengths: profileForm.strengths || null,
                  development_areas: profileForm.development_areas || null,
                  goals: profileForm.goals || null,
                  competencies: profileForm.competencies
                    ? profileForm.competencies.split(',').map((s) => s.trim()).filter(Boolean)
                    : [],
                })
              }
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Sačuvaj profil
            </button>
          </div>
        </Modal>
      )}

      {showPathModal && (
        <Modal title="Nova karijerna putanja" onClose={() => setShowPathModal(false)}>
          <div className="grid gap-3">
            <Field label="Zaposlenik">
              <select
                className="input"
                value={pathForm.employee_id}
                onChange={(e) => setPathForm({ ...pathForm, employee_id: e.target.value })}
              >
                <option value="">Odaberi zaposlenika</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Trenutna pozicija">
              <input
                className="input"
                value={pathForm.current_position}
                onChange={(e) => setPathForm({ ...pathForm, current_position: e.target.value })}
              />
            </Field>
            <Field label="Ciljna pozicija">
              <input
                className="input"
                value={pathForm.target_position}
                onChange={(e) => setPathForm({ ...pathForm, target_position: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Horizont">
                <select
                  className="input"
                  value={pathForm.horizon}
                  onChange={(e) => setPathForm({ ...pathForm, horizon: e.target.value })}
                >
                  <option value="short">Kratki</option>
                  <option value="medium">Srednji</option>
                  <option value="long">Dugi</option>
                </select>
              </Field>
              <Field label="Ciljni datum">
                <input
                  type="date"
                  className="input"
                  value={pathForm.target_date}
                  onChange={(e) => setPathForm({ ...pathForm, target_date: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Napomene">
              <textarea
                className="input min-h-[60px]"
                value={pathForm.notes}
                onChange={(e) => setPathForm({ ...pathForm, notes: e.target.value })}
              />
            </Field>
            <button
              type="button"
              disabled={!pathForm.employee_id || createPathMutation.isPending}
              onClick={() =>
                createPathMutation.mutate({
                  employee_id: Number(pathForm.employee_id),
                  current_position: pathForm.current_position || null,
                  target_position: pathForm.target_position || null,
                  horizon: pathForm.horizon,
                  target_date: pathForm.target_date || null,
                  notes: pathForm.notes || null,
                  status: 'active',
                })
              }
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              Sačuvaj putanju
            </button>
          </div>
        </Modal>
      )}

      {showSuccessionModal && (
        <Modal title="Novi plan nasljeđivanja" onClose={() => setShowSuccessionModal(false)}>
          <div className="grid gap-3">
            <Field label="Pozicija">
              <input
                className="input"
                value={successionForm.position_title}
                onChange={(e) => setSuccessionForm({ ...successionForm, position_title: e.target.value })}
              />
            </Field>
            <Field label="Trenutni nosilac">
              <select
                className="input"
                value={successionForm.incumbent_employee_id}
                onChange={(e) =>
                  setSuccessionForm({ ...successionForm, incumbent_employee_id: e.target.value })
                }
              >
                <option value="">Opcionalno</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nasljednik">
              <select
                className="input"
                value={successionForm.successor_employee_id}
                onChange={(e) =>
                  setSuccessionForm({ ...successionForm, successor_employee_id: e.target.value })
                }
              >
                <option value="">Odaberi nasljednika</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Spremnost">
                <select
                  className="input"
                  value={successionForm.readiness}
                  onChange={(e) =>
                    setSuccessionForm({
                      ...successionForm,
                      readiness: e.target.value as TalentReadiness,
                    })
                  }
                >
                  {Object.entries(READINESS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Prioritet">
                <select
                  className="input"
                  value={successionForm.priority}
                  onChange={(e) => setSuccessionForm({ ...successionForm, priority: e.target.value })}
                >
                  <option value="1">Visok</option>
                  <option value="2">Srednji</option>
                  <option value="3">Nizak</option>
                </select>
              </Field>
            </div>
            <Field label="Aktivnosti razvoja">
              <textarea
                className="input min-h-[60px]"
                value={successionForm.development_actions}
                onChange={(e) =>
                  setSuccessionForm({ ...successionForm, development_actions: e.target.value })
                }
              />
            </Field>
            <button
              type="button"
              disabled={
                !successionForm.position_title ||
                !successionForm.successor_employee_id ||
                createSuccessionMutation.isPending
              }
              onClick={() =>
                createSuccessionMutation.mutate({
                  position_title: successionForm.position_title,
                  incumbent_employee_id: successionForm.incumbent_employee_id
                    ? Number(successionForm.incumbent_employee_id)
                    : null,
                  successor_employee_id: Number(successionForm.successor_employee_id),
                  readiness: successionForm.readiness,
                  priority: Number(successionForm.priority),
                  development_actions: successionForm.development_actions || null,
                  status: 'active',
                })
              }
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
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

function ProfilesTable({
  loading,
  profiles,
  onTogglePool,
  onDelete,
}: {
  loading: boolean;
  profiles: TalentProfile[];
  onTogglePool: (id: number, inPool: boolean) => void;
  onDelete: (id: number) => void;
}) {
  if (loading) return <LoadingRow />;
  if (!profiles.length) {
    return <div className="p-8 text-center text-sm text-gray-500">Talent pool je prazan.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left dark:bg-gray-900/40">
          <tr>
            <th className="px-4 py-3">Zaposlenik</th>
            <th className="px-4 py-3">Performanse</th>
            <th className="px-4 py-3">Potencijal</th>
            <th className="px-4 py-3">Spremnost</th>
            <th className="px-4 py-3">Pool</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {profiles.map((p) => (
            <tr key={p.id} className="border-t border-gray-100 dark:border-gray-700">
              <td className="px-4 py-3">
                <div className="font-medium text-gray-900 dark:text-white">
                  {p.employee_name || `#${p.employee_id}`}
                </div>
                <div className="text-xs text-gray-500">
                  {p.employee_position || p.department_name || '—'}
                </div>
              </td>
              <td className="px-4 py-3">{LEVEL_LABELS[p.performance_level]}</td>
              <td className="px-4 py-3">{LEVEL_LABELS[p.potential_level]}</td>
              <td className="px-4 py-3">
                {p.readiness ? READINESS_LABELS[p.readiness] : '—'}
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onTogglePool(p.id, !p.in_talent_pool)}
                  className="text-amber-700 hover:underline dark:text-amber-300"
                >
                  {p.in_talent_pool ? 'U poolu' : 'Van poola'}
                </button>
              </td>
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

function PathsTable({
  loading,
  paths,
  onDelete,
}: {
  loading: boolean;
  paths: CareerPath[];
  onDelete: (id: number) => void;
}) {
  if (loading) return <LoadingRow />;
  if (!paths.length) {
    return <div className="p-8 text-center text-sm text-gray-500">Nema karijernih putanja.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left dark:bg-gray-900/40">
          <tr>
            <th className="px-4 py-3">Zaposlenik</th>
            <th className="px-4 py-3">Od → Do</th>
            <th className="px-4 py-3">Horizont</th>
            <th className="px-4 py-3">Cilj</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {paths.map((p) => (
            <tr key={p.id} className="border-t border-gray-100 dark:border-gray-700">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                {p.employee_name || `#${p.employee_id}`}
              </td>
              <td className="px-4 py-3">
                {p.current_position || '—'} → {p.target_position || p.target_work_position_name || '—'}
              </td>
              <td className="px-4 py-3">{p.horizon || '—'}</td>
              <td className="px-4 py-3">{formatDate(p.target_date)}</td>
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

function SuccessionTable({
  loading,
  plans,
  onDelete,
}: {
  loading: boolean;
  plans: SuccessionPlan[];
  onDelete: (id: number) => void;
}) {
  if (loading) return <LoadingRow />;
  if (!plans.length) {
    return <div className="p-8 text-center text-sm text-gray-500">Nema planova nasljeđivanja.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left dark:bg-gray-900/40">
          <tr>
            <th className="px-4 py-3">Pozicija</th>
            <th className="px-4 py-3">Nosilac</th>
            <th className="px-4 py-3">Nasljednik</th>
            <th className="px-4 py-3">Spremnost</th>
            <th className="px-4 py-3">Prioritet</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id} className="border-t border-gray-100 dark:border-gray-700">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                {p.position_title}
              </td>
              <td className="px-4 py-3">{p.incumbent_name || '—'}</td>
              <td className="px-4 py-3">{p.successor_name || `#${p.successor_employee_id}`}</td>
              <td className="px-4 py-3">{READINESS_LABELS[p.readiness]}</td>
              <td className="px-4 py-3">{p.priority === 1 ? 'Visok' : p.priority === 3 ? 'Nizak' : 'Srednji'}</td>
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

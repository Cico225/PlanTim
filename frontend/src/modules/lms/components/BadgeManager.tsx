import { useEffect, useState } from 'react';
import { FiAward, FiEdit, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { lmsService, Badge } from '@/services/lmsService';
import { useIsLmsAdmin } from '../pages/LMSMaloprodajaLandingPage';

const BADGE_TYPES = [
  { value: 'course_completion', label: 'Završetak kurseva' },
  { value: 'points', label: 'Bodovi' },
  { value: 'streak', label: 'Streak (dani)' },
  { value: 'quiz_master', label: 'Savršeni kvizovi' },
  { value: 'special', label: 'Specijalni' },
];

const ICON_OPTIONS = ['FiAward', 'FiStar', 'FiBook', 'FiCheckCircle', 'FiZap', 'FiGift'];

type BadgeForm = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  type: string;
  requirement_value: string;
  points_reward: string;
  is_active: boolean;
};

const emptyForm = (): BadgeForm => ({
  name: '',
  slug: '',
  description: '',
  icon: 'FiAward',
  color: '#f97316',
  type: 'course_completion',
  requirement_value: '1',
  points_reward: '10',
  is_active: true,
});

export default function BadgeManager() {
  const isAdmin = useIsLmsAdmin();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Badge | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BadgeForm>(emptyForm());

  useEffect(() => {
    if (isAdmin) loadBadges();
  }, [isAdmin]);

  const loadBadges = async () => {
    try {
      setLoading(true);
      const data = await lmsService.adminListBadges();
      setBadges(data.badges || []);
    } catch {
      toast.error('Neuspješno učitavanje bedževa');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (badge: Badge) => {
    setEditing(badge);
    setForm({
      name: badge.name || '',
      slug: badge.slug || '',
      description: badge.description || '',
      icon: badge.icon || 'FiAward',
      color: badge.color || '#f97316',
      type: badge.type || 'course_completion',
      requirement_value: badge.requirement_value?.toString() || '',
      points_reward: badge.points_reward?.toString() || '10',
      is_active: badge.is_active !== false,
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Naziv bedža je obavezan');
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || undefined,
      icon: form.icon,
      color: form.color,
      type: form.type,
      requirement_value: form.requirement_value ? parseInt(form.requirement_value, 10) : null,
      points_reward: parseInt(form.points_reward || '10', 10),
      is_active: form.is_active,
    };

    try {
      setSaving(true);
      if (editing) {
        await lmsService.updateBadge(editing.id, payload);
        toast.success('Bedž je ažuriran');
      } else {
        await lmsService.createBadge(payload);
        toast.success('Bedž je kreiran');
      }
      setShowForm(false);
      setEditing(null);
      await loadBadges();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Neuspješno čuvanje bedža');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (badge: Badge) => {
    if (!confirm(`Obrisati bedž „${badge.name}"?`)) return;
    try {
      await lmsService.deleteBadge(badge.id);
      setBadges((prev) => prev.filter((b) => b.id !== badge.id));
      toast.success('Bedž je obrisan');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Neuspješno brisanje bedža');
    }
  };

  if (!isAdmin) {
    return (
      <div className="card p-12 text-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Nemate pristup</h3>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-orange-200 border-t-orange-600" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Upravljanje bedževima
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Kreirajte i uređujte bedževe koje korisnici mogu osvojiti
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
          <FiPlus className="h-4 w-4" />
          Novi bedž
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`rounded-2xl border bg-white p-5 shadow-sm dark:bg-dark-800 ${
              badge.is_active === false
                ? 'border-gray-200 opacity-60 dark:border-dark-600'
                : 'border-orange-100 dark:border-orange-900/40'
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow"
                style={{ backgroundColor: badge.color || '#f97316' }}
              >
                <FiAward className="h-5 w-5" />
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  badge.is_active === false
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {badge.is_active === false ? 'Neaktivan' : 'Aktivan'}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{badge.name}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-gray-500">{badge.description || 'Bez opisa'}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-gray-500">
              <span className="rounded-full bg-orange-50 px-2 py-0.5 dark:bg-orange-950/30">
                {BADGE_TYPES.find((t) => t.value === badge.type)?.label || badge.type}
              </span>
              <span>+{badge.points_reward} bodova</span>
              {badge.requirement_value != null && <span>Cilj: {badge.requirement_value}</span>}
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-dark-600">
              <button
                type="button"
                onClick={() => openEdit(badge)}
                className="rounded-lg p-2 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400"
                title="Uredi"
              >
                <FiEdit className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(badge)}
                className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:text-rose-400"
                title="Obriši"
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {badges.length === 0 && (
        <div className="rounded-2xl border border-dashed border-orange-200 px-6 py-16 text-center dark:border-orange-900/40">
          <FiAward className="mx-auto mb-3 h-12 w-12 text-orange-400 opacity-70" />
          <p className="text-gray-600 dark:text-gray-400">Još nema bedževa. Kreirajte prvi.</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-dark-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing ? 'Uredi bedž' : 'Novi bedž'}
              </h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="label">Naziv *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Slug (opcionalno)</label>
                <input
                  className="input"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="automatski iz naziva"
                />
              </div>
              <div>
                <label className="label">Opis</label>
                <textarea
                  className="input"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Tip *</label>
                  <select
                    className="input"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {BADGE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Ikona</label>
                  <select
                    className="input"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  >
                    {ICON_OPTIONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Boja</label>
                  <input
                    type="color"
                    className="input h-10 p-1"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Cilj</label>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={form.requirement_value}
                    onChange={(e) => setForm({ ...form, requirement_value: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Bodovi</label>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={form.points_reward}
                    onChange={(e) => setForm({ ...form, points_reward: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Aktivan bedž
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                  Otkaži
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Čuvanje...' : 'Sačuvaj'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

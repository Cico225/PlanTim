import { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiSave } from 'react-icons/fi';
import { lmsService, CourseSurpriseSettings, SurpriseReward } from '@/services/lmsService';
import toast from 'react-hot-toast';

interface CourseSurprisesTabProps {
  courseId: number;
}

export default function CourseSurprisesTab({ courseId }: CourseSurprisesTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CourseSurpriseSettings>({
    course_id: courseId,
    scratch_card_enabled: false,
    scratch_card_after_quiz: true,
    scratch_card_cooldown_hours: 24,
    spin_wheel_enabled: false,
    spin_wheel_after_quiz: true,
    spin_wheel_cooldown_hours: 24,
    spin_wheel_segments: 8,
  });
  const [rewards, setRewards] = useState<SurpriseReward[]>([]);
  const [editingReward, setEditingReward] = useState<SurpriseReward | null>(null);

  useEffect(() => {
    loadSurprises();
  }, [courseId]);

  const loadSurprises = async () => {
    try {
      setLoading(true);
      const data = await lmsService.getCourseSurprises(courseId);
      if (data.settings) {
        setSettings(data.settings);
      }
      setRewards(data.rewards || []);
    } catch (error: any) {
      console.error('Failed to load surprises:', error);
      toast.error('Neuspješno učitavanje iznenađenja');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      await lmsService.updateCourseSurprises(courseId, settings);
      toast.success('Postavke iznenađenja sačuvane');
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error('Neuspješno čuvanje postavki');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReward = async (reward: Partial<SurpriseReward>) => {
    try {
      setSaving(true);
      await lmsService.saveSurpriseReward(courseId, reward);
      toast.success('Nagrada sačuvana');
      await loadSurprises();
      setEditingReward(null);
    } catch (error: any) {
      console.error('Failed to save reward:', error);
      toast.error('Neuspješno čuvanje nagrade');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReward = async (rewardId: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovu nagradu?')) {
      return;
    }

    try {
      setSaving(true);
      await lmsService.deleteSurpriseReward(courseId, rewardId);
      toast.success('Nagrada obrisana');
      await loadSurprises();
    } catch (error: any) {
      console.error('Failed to delete reward:', error);
      toast.error('Neuspješno brisanje nagrade');
    } finally {
      setSaving(false);
    }
  };

  const rewardTypeLabels: Record<string, string> = {
    bonus_points: 'Dodatni bodovi',
    extra_luck: 'Više sreće',
    second_chance: 'Drugi pit',
    nice_gift: 'Lijep poklon',
    wish_success: 'Želja za uspješan dan',
    motivational_message: 'Motivirajuća poruka',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Postavke iznenađenja
        </h3>

        {/* Scratch Card Settings */}
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-white">Grebalice</h4>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.scratch_card_enabled}
                onChange={(e) => setSettings({ ...settings, scratch_card_enabled: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Omogući grebalice</span>
            </label>
          </div>

          {settings.scratch_card_enabled && (
            <div className="space-y-3 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.scratch_card_after_quiz}
                  onChange={(e) => setSettings({ ...settings, scratch_card_after_quiz: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Aktiviraj nakon polaganja kviza</span>
              </label>

              <div>
                <label className="label text-sm">Cooldown (sati)</label>
                <input
                  type="number"
                  value={settings.scratch_card_cooldown_hours}
                  onChange={(e) => setSettings({ ...settings, scratch_card_cooldown_hours: parseInt(e.target.value) || 24 })}
                  className="input"
                  min="0"
                />
              </div>
            </div>
          )}
        </div>

        {/* Spin Wheel Settings */}
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900 dark:text-white">Spin the Wheel</h4>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.spin_wheel_enabled}
                onChange={(e) => setSettings({ ...settings, spin_wheel_enabled: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Omogući spin the wheel</span>
            </label>
          </div>

          {settings.spin_wheel_enabled && (
            <div className="space-y-3 pl-4 border-l-2 border-blue-200 dark:border-blue-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.spin_wheel_after_quiz}
                  onChange={(e) => setSettings({ ...settings, spin_wheel_after_quiz: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Aktiviraj nakon polaganja kviza</span>
              </label>

              <div>
                <label className="label text-sm">Cooldown (sati)</label>
                <input
                  type="number"
                  value={settings.spin_wheel_cooldown_hours}
                  onChange={(e) => setSettings({ ...settings, spin_wheel_cooldown_hours: parseInt(e.target.value) || 24 })}
                  className="input"
                  min="0"
                />
              </div>

              <div>
                <label className="label text-sm">Broj polja na točku</label>
                <input
                  type="number"
                  value={settings.spin_wheel_segments || 8}
                  onChange={(e) => setSettings({ ...settings, spin_wheel_segments: parseInt(e.target.value) || 8 })}
                  className="input"
                  min="2"
                  max="20"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Broj polja koja će biti prikazana na točku (2-20)
                </p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          <FiSave className="w-4 h-4" />
          {saving ? 'Čuvanje...' : 'Sačuvaj postavke'}
        </button>
      </div>

      {/* Rewards */}
      <div className="space-y-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Nagrade
          </h3>
          <button
            onClick={() => setEditingReward({
              course_id: courseId,
              type: 'scratch_card',
              reward_type: 'bonus_points',
              title: '',
              probability: 10,
              order: 0,
              is_active: true,
            })}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <FiPlus className="w-4 h-4" />
            Dodaj nagradu
          </button>
        </div>

        {/* Reward Form */}
        {editingReward && (
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4 bg-gray-50 dark:bg-gray-800">
            <h4 className="font-medium text-gray-900 dark:text-white">
              {editingReward.id ? 'Uredi nagradu' : 'Nova nagrada'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Tip iznenađenja *</label>
                <select
                  value={editingReward.type}
                  onChange={(e) => setEditingReward({ ...editingReward, type: e.target.value as any })}
                  className="input"
                  required
                >
                  <option value="scratch_card">Grebalica</option>
                  <option value="spin_wheel">Spin the Wheel</option>
                </select>
              </div>

              <div>
                <label className="label">Tip nagrade *</label>
                <select
                  value={editingReward.reward_type}
                  onChange={(e) => setEditingReward({ ...editingReward, reward_type: e.target.value as any })}
                  className="input"
                  required
                >
                  {Object.entries(rewardTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Naslov *</label>
              <input
                type="text"
                value={editingReward.title}
                onChange={(e) => setEditingReward({ ...editingReward, title: e.target.value })}
                className="input"
                required
                placeholder="Npr. 50 bonus bodova"
              />
            </div>

            <div>
              <label className="label">Opis</label>
              <textarea
                value={editingReward.description || ''}
                onChange={(e) => setEditingReward({ ...editingReward, description: e.target.value })}
                className="input"
                rows={2}
                placeholder="Opis nagrade"
              />
            </div>

            <div>
              <label className="label">Poruka</label>
              <textarea
                value={editingReward.message || ''}
                onChange={(e) => setEditingReward({ ...editingReward, message: e.target.value })}
                className="input"
                rows={2}
                placeholder="Poruka koja se prikazuje korisniku"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {editingReward.reward_type === 'bonus_points' && (
                <div>
                  <label className="label">Vrijednost bodova</label>
                  <input
                    type="number"
                    value={editingReward.points_value || ''}
                    onChange={(e) => setEditingReward({ ...editingReward, points_value: parseInt(e.target.value) || undefined })}
                    className="input"
                    min="0"
                    placeholder="Npr. 50"
                  />
                </div>
              )}

              <div>
                <label className="label">Vjerovatnoća (%) *</label>
                <input
                  type="number"
                  value={editingReward.probability}
                  onChange={(e) => setEditingReward({ ...editingReward, probability: parseFloat(e.target.value) || 0 })}
                  className="input"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="label">Redoslijed</label>
                <input
                  type="number"
                  value={editingReward.order}
                  onChange={(e) => setEditingReward({ ...editingReward, order: parseInt(e.target.value) || 0 })}
                  className="input"
                  min="0"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingReward.is_active}
                  onChange={(e) => setEditingReward({ ...editingReward, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Aktivna</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleSaveReward(editingReward)}
                disabled={saving || !editingReward.title}
                className="btn-primary flex items-center gap-2"
              >
                <FiSave className="w-4 h-4" />
                Sačuvaj
              </button>
              <button
                onClick={() => setEditingReward(null)}
                className="btn-secondary"
              >
                Otkaži
              </button>
            </div>
          </div>
        )}

        {/* Rewards List */}
        <div className="space-y-2">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">{reward.title}</span>
                  <span className={`px-2 py-1 text-xs rounded ${
                    reward.is_active
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {reward.is_active ? 'Aktivna' : 'Neaktivna'}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {rewardTypeLabels[reward.reward_type]} • {reward.probability}% • {reward.type === 'scratch_card' ? 'Grebalica' : 'Spin Wheel'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingReward(reward)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
                  title="Uredi"
                >
                  <FiSave className="w-4 h-4" />
                </button>
                <button
                  onClick={() => reward.id && handleDeleteReward(reward.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                  title="Obriši"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {rewards.length === 0 && !editingReward && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>Nema nagrada. Kliknite "Dodaj nagradu" da dodate prvu nagradu.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



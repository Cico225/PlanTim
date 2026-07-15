import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import {
  ActivityPlan,
  CreateActivityPlanData,
  Region,
  Store,
  PeriodType,
  PlanPriority,
} from '@/types/planika-maloprodaja';
import { HRDepartment } from '@/types/hrm';
import { getDepartments } from '@/services/hrmService';

interface PlanFormProps {
  planId?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PlanForm({ planId, onSuccess, onCancel }: PlanFormProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<HRDepartment[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [formData, setFormData] = useState<CreateActivityPlanData>({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    period_type: 'monthly',
    target_regions: [],
    target_stores: [],
    goals: {},
    required_controls_per_month: 1,
    deadlines: {},
    priority: 'normal',
  });

  useEffect(() => {
    loadDepartments();
    if (planId) {
      loadPlan();
    }
  }, [planId]);

  useEffect(() => {
    if (selectedDepartmentId) {
      loadRegionsAndStores();
    } else {
      setRegions([]);
      setStores([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepartmentId]);

  const loadDepartments = async () => {
    try {
      const deps = await getDepartments();
      setDepartments(deps);
    } catch (error) {
      console.error('Failed to load departments:', error);
      toast.error('Greška pri učitavanju odjela');
    }
  };

  const loadRegionsAndStores = async () => {
    try {
      const [regionsRes, storesRes] = await Promise.all([
        apiService.get<Region[]>(`/planika/maloprodaja/regions?is_active=true&department_id=${selectedDepartmentId}`),
        apiService.get<Store[]>(`/planika/maloprodaja/stores?is_active=true&department_id=${selectedDepartmentId}`),
      ]);
      setRegions(regionsRes);
      setStores(storesRes);
    } catch (error) {
      console.error('Failed to load regions/stores:', error);
      toast.error('Greška pri učitavanju regija/prodavnica');
    }
  };

  const loadPlan = async () => {
    try {
      setLoading(true);
      const plan = await apiService.get<ActivityPlan>(`/planika/maloprodaja/plans/${planId}`);
      
      // Try to find department_id from first selected region or store
      let deptId: number | null = null;
      if (plan.target_regions && plan.target_regions.length > 0) {
        try {
          const firstRegion = await apiService.get<Region>(`/planika/maloprodaja/regions/${plan.target_regions[0]}`);
          if (firstRegion.department_id) {
            deptId = firstRegion.department_id;
          }
        } catch {
          // Region not found or no department
        }
      }
      if (!deptId && plan.target_stores && plan.target_stores.length > 0) {
        try {
          const firstStore = await apiService.get<Store>(`/planika/maloprodaja/stores/${plan.target_stores[0]}`);
          if (firstStore.department_id) {
            deptId = firstStore.department_id;
          }
        } catch {
          // Store not found or no department
        }
      }
      
      if (deptId) {
        setSelectedDepartmentId(deptId);
      }
      
      setFormData({
        title: plan.title,
        description: plan.description || '',
        start_date: plan.start_date,
        end_date: plan.end_date,
        period_type: plan.period_type,
        target_regions: plan.target_regions || [],
        target_stores: plan.target_stores || [],
        goals: plan.goals || {},
        required_controls_per_month: plan.required_controls_per_month,
        deadlines: plan.deadlines || {},
        priority: plan.priority,
      });
    } catch (error) {
      console.error('Failed to load plan:', error);
      toast.error('Greška pri učitavanju plana');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (planId) {
        await apiService.put(`/planika/maloprodaja/plans/${planId}`, formData);
        toast.success('Plan uspješno ažuriran');
      } else {
        await apiService.post('/planika/maloprodaja/plans', formData);
        toast.success('Plan uspješno kreiran');
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRegion = (regionId: number) => {
    setFormData((prev) => ({
      ...prev,
      target_regions: prev.target_regions?.includes(regionId)
        ? prev.target_regions.filter((id) => id !== regionId)
        : [...(prev.target_regions || []), regionId],
    }));
  };

  const toggleStore = (storeId: number) => {
    setFormData((prev) => ({
      ...prev,
      target_stores: prev.target_stores?.includes(storeId)
        ? prev.target_stores.filter((id) => id !== storeId)
        : [...(prev.target_stores || []), storeId],
    }));
  };

  if (loading && planId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Title */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Naslov *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full input"
            placeholder="Npr. Mjesečni plan kontrole - Januar 2025"
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Opis
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full input"
            rows={3}
            placeholder="Detaljni opis plana aktivnosti..."
          />
        </div>

        {/* Period Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tip perioda *
          </label>
          <select
            required
            value={formData.period_type}
            onChange={(e) => setFormData({ ...formData, period_type: e.target.value as PeriodType })}
            className="w-full input"
          >
            <option value="monthly">Mjesečni</option>
            <option value="quarterly">Kvartalni</option>
            <option value="yearly">Godišnji</option>
          </select>
        </div>

        {/* Required Controls */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Obavezne kontrole mjesečno *
          </label>
          <input
            type="number"
            required
            min="1"
            value={formData.required_controls_per_month}
            onChange={(e) =>
              setFormData({ ...formData, required_controls_per_month: parseInt(e.target.value) })
            }
            className="w-full input"
          />
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Datum početka *
          </label>
          <input
            type="date"
            required
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            className="w-full input"
          />
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Datum završetka *
          </label>
          <input
            type="date"
            required
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            className="w-full input"
          />
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Prioritet *
          </label>
          <select
            required
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as PlanPriority })}
            className="w-full input"
          >
            <option value="low">Nizak</option>
            <option value="normal">Normalan</option>
            <option value="high">Visok</option>
            <option value="urgent">Hitno</option>
          </select>
        </div>
      </div>

      {/* Department Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Odjel (Ljudski resursi) *
        </label>
        <select
          required
          value={selectedDepartmentId || ''}
          onChange={(e) => {
            const deptId = e.target.value ? parseInt(e.target.value) : null;
            setSelectedDepartmentId(deptId);
            // Reset selections when department changes
            setFormData({
              ...formData,
              target_regions: [],
              target_stores: [],
            });
          }}
          className="w-full input"
        >
          <option value="">-- Odaberi odjel --</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Odaberi odjel iz HRM modula. Regije i prodavnice će biti filtrirane prema odabranom odjelu.
        </p>
      </div>

      {/* Target Regions */}
      {selectedDepartmentId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ciljane regije
            {regions.length === 0 && selectedDepartmentId && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                (Nema regija za odabrani odjel)
              </span>
            )}
          </label>
          {regions.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
              {regions.map((region) => (
            <label
              key={region.id}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={formData.target_regions?.includes(region.id)}
                onChange={() => toggleRegion(region.id)}
                className="rounded"
              />
              <span className="text-sm">{region.name}</span>
            </label>
              ))}
            </div>
          ) : (
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-center text-gray-500 dark:text-gray-400">
              Nema regija za odabrani odjel
            </div>
          )}
        </div>
      )}

      {/* Target Stores */}
      {selectedDepartmentId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ciljane prodavnice
            {stores.length === 0 && selectedDepartmentId && (
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                (Nema prodavnica za odabrani odjel)
              </span>
            )}
          </label>
          {stores.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border border-gray-200 dark:border-gray-700 rounded-lg">
              {stores.map((store) => (
            <label
              key={store.id}
              className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={formData.target_stores?.includes(store.id)}
                onChange={() => toggleStore(store.id)}
                className="rounded"
              />
              <span className="text-sm">{store.name}</span>
            </label>
              ))}
            </div>
          ) : (
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-center text-gray-500 dark:text-gray-400">
              Nema prodavnica za odabrani odjel
            </div>
          )}
        </div>
      )}

      {/* Goals */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Ciljevi (JSON format)
        </label>
        <textarea
          value={JSON.stringify(formData.goals || {}, null, 2)}
          onChange={(e) => {
            try {
              const goals = JSON.parse(e.target.value);
              setFormData({ ...formData, goals });
            } catch {
              // Invalid JSON, ignore
            }
          }}
          className="w-full input font-mono text-sm"
          rows={4}
          placeholder='{"kvalitet_usluge": "Cilj 95%", "izgled_prodavnice": "Cilj 90%"}'
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
          disabled={loading}
        >
          Otkaži
        </button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Spremanje...' : planId ? 'Ažuriraj' : 'Kreiraj'}
        </button>
      </div>
    </form>
  );
}


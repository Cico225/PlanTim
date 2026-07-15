import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import {
  StoreControl,
  CreateStoreControlData,
  ControlForm,
  Store,
  ActivityPlan,
  ControlFormSection,
} from '@/types/planika-maloprodaja';

interface ControlFormProps {
  controlId?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ControlFormComponent({ controlId, onSuccess, onCancel }: ControlFormProps) {
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [plans, setPlans] = useState<ActivityPlan[]>([]);
  const [controlForms, setControlForms] = useState<ControlForm[]>([]);
  const [selectedForm, setSelectedForm] = useState<ControlForm | null>(null);
  const [formData, setFormData] = useState<CreateStoreControlData>({
    store_id: 0,
    plan_id: undefined,
    control_form_id: 0,
    control_date: new Date().toISOString().split('T')[0],
    scores: {},
    responses: [],
    overall_comment: '',
    recommendations: [],
    corrective_measures: [],
  });
  const [currentRecommendation, setCurrentRecommendation] = useState('');
  const [currentMeasure, setCurrentMeasure] = useState('');

  useEffect(() => {
    loadInitialData();
    if (controlId) {
      loadControl();
    }
  }, [controlId]);

  useEffect(() => {
    if (formData.control_form_id) {
      loadControlForm(formData.control_form_id);
    }
  }, [formData.control_form_id]);

  const loadInitialData = async () => {
    try {
      const [storesRes, plansRes, formsRes] = await Promise.all([
        apiService.get<Store[]>('/planika/maloprodaja/stores?is_active=true'),
        apiService.get<ActivityPlan[]>('/planika/maloprodaja/plans?status=active'),
        apiService.get<ControlForm[]>('/planika/maloprodaja/control-forms?is_active=true'),
      ]);
      setStores(storesRes);
      setPlans(plansRes);
      setControlForms(formsRes);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadControlForm = async (formId: number) => {
    try {
      const form = await apiService.get<ControlForm>(`/planika/maloprodaja/control-forms/${formId}`);
      setSelectedForm(form);
      
      // Initialize responses based on form structure
      if (!controlId && form.sections) {
        const initialResponses: CreateStoreControlData['responses'] = [];
        const initialScores: Record<string, number> = {};
        
        form.sections.forEach((section: ControlFormSection) => {
          initialScores[section.name] = 0;
          section.criteria.forEach((criterion) => {
            initialResponses.push({
              section_name: section.name,
              criterion_name: criterion.name,
              score: 0,
              response: '',
              comment: '',
            });
          });
        });
        
        setFormData((prev) => ({
          ...prev,
          responses: initialResponses,
          scores: initialScores,
        }));
      }
    } catch (error) {
      console.error('Failed to load control form:', error);
    }
  };

  const loadControl = async () => {
    try {
      setLoading(true);
      const control = await apiService.get<StoreControl>(`/planika/maloprodaja/controls/${controlId}`);
      setFormData({
        store_id: control.store_id,
        plan_id: control.plan_id || undefined,
        control_form_id: control.control_form_id,
        control_date: control.control_date,
        scores: control.scores,
        responses: control.responses?.map((r) => ({
          section_name: r.section_name,
          criterion_name: r.criterion_name,
          score: r.score,
          response: r.response || '',
          comment: r.comment || '',
        })) || [],
        overall_comment: control.overall_comment || '',
        recommendations: control.recommendations || [],
        corrective_measures: control.corrective_measures || [],
      });
      
      // Load the control form
      await loadControlForm(control.control_form_id);
    } catch (error) {
      console.error('Failed to load control:', error);
      toast.error('Greška pri učitavanju kontrole');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Calculate section scores
      const scores: Record<string, number> = {};
      selectedForm?.sections.forEach((section) => {
        const sectionResponses = formData.responses.filter(
          (r) => r.section_name === section.name
        );
        scores[section.name] = sectionResponses.reduce(
          (sum, r) => sum + (r.score || 0),
          0
        );
      });

      const submitData = {
        ...formData,
        scores,
      };

      if (controlId) {
        await apiService.put(`/planika/maloprodaja/controls/${controlId}`, submitData);
        toast.success('Kontrola uspješno ažurirana');
      } else {
        await apiService.post('/planika/maloprodaja/controls', submitData);
        toast.success('Kontrola uspješno kreirana');
      }
      onSuccess();
    } catch (error) {
      console.error('Failed to save control:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateResponse = (sectionName: string, criterionName: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      responses: prev.responses.map((r) =>
        r.section_name === sectionName && r.criterion_name === criterionName
          ? { ...r, [field]: value }
          : r
      ),
    }));
  };

  const addRecommendation = () => {
    if (currentRecommendation.trim()) {
      setFormData((prev) => ({
        ...prev,
        recommendations: [...(prev.recommendations || []), currentRecommendation],
      }));
      setCurrentRecommendation('');
    }
  };

  const removeRecommendation = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      recommendations: prev.recommendations?.filter((_, i) => i !== index) || [],
    }));
  };

  const addMeasure = () => {
    if (currentMeasure.trim()) {
      setFormData((prev) => ({
        ...prev,
        corrective_measures: [...(prev.corrective_measures || []), currentMeasure],
      }));
      setCurrentMeasure('');
    }
  };

  const removeMeasure = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      corrective_measures: prev.corrective_measures?.filter((_, i) => i !== index) || [],
    }));
  };

  if (loading && controlId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Store Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Prodavnica *
          </label>
          <select
            required
            value={formData.store_id}
            onChange={(e) => setFormData({ ...formData, store_id: parseInt(e.target.value) })}
            className="w-full input"
          >
            <option value={0}>Odaberite prodavnicu</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name} ({store.region?.name})
              </option>
            ))}
          </select>
        </div>

        {/* Plan Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Plan aktivnosti (opciono)
          </label>
          <select
            value={formData.plan_id || ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                plan_id: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            className="w-full input"
          >
            <option value="">Nema plana</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.title}
              </option>
            ))}
          </select>
        </div>

        {/* Control Form Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Obrazac kontrole *
          </label>
          <select
            required
            value={formData.control_form_id}
            onChange={(e) => setFormData({ ...formData, control_form_id: parseInt(e.target.value) })}
            className="w-full input"
          >
            <option value={0}>Odaberite obrazac</option>
            {controlForms.map((form) => (
              <option key={form.id} value={form.id}>
                {form.name}
              </option>
            ))}
          </select>
        </div>

        {/* Control Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Datum kontrole *
          </label>
          <input
            type="date"
            required
            value={formData.control_date}
            onChange={(e) => setFormData({ ...formData, control_date: e.target.value })}
            className="w-full input"
          />
        </div>
      </div>

      {/* Form Sections and Criteria */}
      {selectedForm && selectedForm.sections && (
        <div className="space-y-6">
          {selectedForm.sections.map((section: ControlFormSection, sectionIndex: number) => (
            <div key={sectionIndex} className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {section.name}
              </h3>
              
              <div className="space-y-4">
                {section.criteria.map((criterion, criterionIndex) => {
                  const response = formData.responses.find(
                    (r) => r.section_name === section.name && r.criterion_name === criterion.name
                  );

                  return (
                    <div
                      key={criterionIndex}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {criterion.name}
                          </h4>
                          {criterion.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {criterion.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                        {selectedForm.scoring_type === 'numeric' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Ocjena (0-{selectedForm.max_score})
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={selectedForm.max_score}
                              value={response?.score || 0}
                              onChange={(e) =>
                                updateResponse(section.name, criterion.name, 'score', parseFloat(e.target.value) || 0)
                              }
                              className="w-full input"
                            />
                          </div>
                        )}

                        {selectedForm.scoring_type === 'yes_no' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Odgovor
                            </label>
                            <select
                              value={response?.response || ''}
                              onChange={(e) =>
                                updateResponse(section.name, criterion.name, 'response', e.target.value)
                              }
                              className="w-full input"
                            >
                              <option value="">Odaberite</option>
                              <option value="yes">Da</option>
                              <option value="no">Ne</option>
                            </select>
                          </div>
                        )}

                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Komentar
                          </label>
                          <textarea
                            value={response?.comment || ''}
                            onChange={(e) =>
                              updateResponse(section.name, criterion.name, 'comment', e.target.value)
                            }
                            className="w-full input"
                            rows={2}
                            placeholder="Dodajte komentar..."
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Section Score Summary */}
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ukupna ocjena sekcije:
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {formData.scores[section.name] || 0} / {selectedForm.max_score}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Overall Comment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Opći komentar
        </label>
        <textarea
          value={formData.overall_comment}
          onChange={(e) => setFormData({ ...formData, overall_comment: e.target.value })}
          className="w-full input"
          rows={4}
          placeholder="Dodajte opći komentar o kontroli..."
        />
      </div>

      {/* Recommendations */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Preporuke
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={currentRecommendation}
            onChange={(e) => setCurrentRecommendation(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addRecommendation();
              }
            }}
            className="flex-1 input"
            placeholder="Dodajte preporuku..."
          />
          <button
            type="button"
            onClick={addRecommendation}
            className="btn-secondary"
          >
            Dodaj
          </button>
        </div>
        <div className="space-y-1">
          {formData.recommendations?.map((rec, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
            >
              <span className="text-sm">{rec}</span>
              <button
                type="button"
                onClick={() => removeRecommendation(index)}
                className="text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Corrective Measures */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Korektivne mjere
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={currentMeasure}
            onChange={(e) => setCurrentMeasure(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addMeasure();
              }
            }}
            className="flex-1 input"
            placeholder="Dodajte korektivnu mjeru..."
          />
          <button
            type="button"
            onClick={addMeasure}
            className="btn-secondary"
          >
            Dodaj
          </button>
        </div>
        <div className="space-y-1">
          {formData.corrective_measures?.map((measure, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded"
            >
              <span className="text-sm">{measure}</span>
              <button
                type="button"
                onClick={() => removeMeasure(index)}
                className="text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          ))}
        </div>
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
          {loading ? 'Spremanje...' : controlId ? 'Ažuriraj' : 'Kreiraj'}
        </button>
      </div>
    </form>
  );
}


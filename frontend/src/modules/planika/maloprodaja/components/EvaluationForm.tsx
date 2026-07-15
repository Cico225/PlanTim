import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { CheckCircle2, PenTool, Download, Lock, Trash2 } from 'lucide-react';
import SignaturePad from '@/components/SignaturePad';
import {
  EmployeeEvaluation,
  CreateEmployeeEvaluationData,
  EvaluationCriteria,
  Store,
} from '@/types/planika-maloprodaja';

interface EvaluationFormProps {
  evaluationId?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function EvaluationForm({ evaluationId, onSuccess, onCancel }: EvaluationFormProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [criteriaList, setCriteriaList] = useState<EvaluationCriteria[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedCriteria, setSelectedCriteria] = useState<EvaluationCriteria | null>(null);
  const [evaluation, setEvaluation] = useState<EmployeeEvaluation | null>(null);
  const [signatures, setSignatures] = useState<any[]>([]);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureType, setSignatureType] = useState<'evaluator' | 'employee' | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [formData, setFormData] = useState<CreateEmployeeEvaluationData>({
    employee_id: 0,
    store_id: 0,
    evaluation_criteria_id: 0,
    evaluation_date: new Date().toISOString().split('T')[0],
    period_start: '',
    period_end: '',
    scores: {},
    responses: [],
    overall_comment: '',
    recommendations: [],
  });
  const [currentRecommendation, setCurrentRecommendation] = useState('');

  useEffect(() => {
    // Load data when component mounts
    console.log('EvaluationForm mounted, loading initial data...');
    loadInitialData();
    if (evaluationId) {
      loadEvaluation();
    } else {
      // Reset signatures when creating new evaluation
      setSignatures([]);
      setEvaluation(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluationId]);

  useEffect(() => {
    if (formData.evaluation_criteria_id) {
      loadCriteria(formData.evaluation_criteria_id);
    }
  }, [formData.evaluation_criteria_id]);

  useEffect(() => {
    if (formData.store_id) {
      loadStoreEmployees(formData.store_id);
    }
  }, [formData.store_id]);

  const loadInitialData = async () => {
    try {
      console.log('Loading initial data...');
      
      const [storesRes, criteriaRes, employeesRes] = await Promise.all([
        apiService.get<Store[]>('/planika/maloprodaja/stores?is_active=true'),
        apiService.get<EvaluationCriteria[]>('/planika/maloprodaja/evaluation-criteria?is_active=true'),
        apiService.get('/hrm/employees?position=Prodavač'),
      ]);
      
      console.log('Raw API responses:', {
        stores: storesRes,
        criteria: criteriaRes,
        employees: employeesRes
      });
      
      // Handle stores - API returns array directly
      const storesList = Array.isArray(storesRes) ? storesRes : (storesRes?.data || []);
      console.log(`Parsed ${storesList.length} stores:`, storesList);
      setStores(storesList);
      
      // Handle criteria - API returns array directly
      const criteriaList = Array.isArray(criteriaRes) ? criteriaRes : (criteriaRes?.data || []);
      console.log(`Parsed ${criteriaList.length} evaluation criteria`);
      setCriteriaList(criteriaList);
      
      // Handle employees - API returns array directly when filtering by position
      const employeesList = Array.isArray(employeesRes) 
        ? employeesRes 
        : (employeesRes?.data || []);
      
      console.log(`Parsed ${employeesList.length} employees with position "Prodavač":`, employeesList);
      setEmployees(employeesList);
      
      if (employeesList.length === 0) {
        console.warn('⚠️ No employees found with position "Prodavač"');
        console.warn('Employee response:', employeesRes);
      }
      if (storesList.length === 0) {
        console.warn('⚠️ No stores found');
        console.warn('Stores response:', storesRes);
      }
    } catch (error: any) {
      console.error('❌ Failed to load data:', error);
      console.error('Error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
      const errorMessage = error?.response?.data?.message || error?.message || 'Greška pri učitavanju podataka';
      toast.error(errorMessage);
    }
  };

  const loadStoreEmployees = async (storeId: number) => {
    try {
      // Load employees from HRM with position "Prodavač"
      const employeesData = await apiService.get('/hrm/employees?position=Prodavač');
      // API returns array directly when filtering by position
      const employeesList = Array.isArray(employeesData) 
        ? employeesData 
        : (employeesData?.data || []);
      setEmployees(employeesList);
    } catch (error) {
      console.error('Failed to load employees:', error);
      toast.error('Greška pri učitavanju zaposlenih');
    }
  };

  const loadCriteria = async (criteriaId: number) => {
    try {
      const criteria = await apiService.get<EvaluationCriteria>(
        `/planika/maloprodaja/evaluation-criteria/${criteriaId}`
      );
      setSelectedCriteria(criteria);

      if (!evaluationId && criteria.criteria) {
        const initialResponses: CreateEmployeeEvaluationData['responses'] = [];
        const initialScores: Record<string, number> = {};

        criteria.criteria.forEach((criterion: any) => {
          initialScores[criterion.name] = 0;
          initialResponses.push({
            criterion_name: criterion.name,
            score: 0,
            comment: '',
          });
        });

        setFormData((prev) => ({
          ...prev,
          responses: initialResponses,
          scores: initialScores,
        }));
      }
    } catch (error) {
      console.error('Failed to load criteria:', error);
    }
  };

  const loadEvaluation = async () => {
    try {
      setLoading(true);
      const evaluationData = await apiService.get<EmployeeEvaluation>(
        `/planika/maloprodaja/evaluations/${evaluationId}`
      );
      setEvaluation(evaluationData);
      // Only set signatures if they exist and are actual signature records
      setSignatures((evaluationData.signatures || []).filter((s: any) => s.id && s.signature_data));
      setFormData({
        employee_id: evaluationData.employee_id,
        store_id: evaluationData.store_id,
        evaluation_criteria_id: evaluationData.evaluation_criteria_id,
        evaluation_date: evaluationData.evaluation_date,
        period_start: evaluationData.period_start,
        period_end: evaluationData.period_end,
        scores: evaluationData.scores,
        responses: evaluationData.responses?.map((r) => ({
          criterion_name: r.criterion_name,
          score: r.score,
          comment: r.comment || '',
        })) || [],
        overall_comment: evaluationData.overall_comment || '',
        recommendations: evaluationData.recommendations || [],
      });

      await loadCriteria(evaluationData.evaluation_criteria_id);
      await loadStoreEmployees(evaluationData.store_id);
    } catch (error) {
      console.error('Failed to load evaluation:', error);
      toast.error('Greška pri učitavanju ocjene');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if evaluation is locked
    if (evaluation?.signature_status === 'evaluator_signed' || evaluation?.signature_status === 'completed') {
      toast.error('Evaluacija je potpisana od strane ocjenjivača i ne može se mijenjati');
      return;
    }

    try {
      setLoading(true);

      // Calculate scores
      const scores: Record<string, number> = {};
      formData.responses.forEach((response) => {
        scores[response.criterion_name] = response.score;
      });

      const submitData = {
        ...formData,
        scores,
      };

      if (evaluationId) {
        await apiService.put(`/planika/maloprodaja/evaluations/${evaluationId}`, submitData);
        toast.success('Ocjena uspješno ažurirana');
      } else {
        await apiService.post('/planika/maloprodaja/evaluations', submitData);
        toast.success('Ocjena uspješno kreirana');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save evaluation:', error);
      toast.error(error?.response?.data?.message || 'Greška pri spremanju ocjene');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (signatureData: string) => {
    if (!evaluationId || !signatureType) return;

    try {
      setIsSigning(true);
      await apiService.post(`/planika/maloprodaja/evaluations/${evaluationId}/sign`, {
        signature_type: signatureType,
        signature_data: signatureData,
      });
      toast.success('Evaluacija je uspješno potpisana');
      setShowSignaturePad(false);
      setSignatureType(null);
      if (evaluationId) {
        await loadEvaluation();
        queryClient.invalidateQueries({ queryKey: ['evaluation', evaluationId] });
      }
    } catch (error: any) {
      console.error('Failed to sign evaluation:', error);
      toast.error(error?.response?.data?.error || 'Greška pri potpisivanju evaluacije');
    } finally {
      setIsSigning(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!evaluationId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${window.location.origin}/api/planika/maloprodaja/evaluations/${evaluationId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `evaluation_${evaluationId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF je uspješno preuzet');
    } catch (error: any) {
      console.error('PDF download error:', error);
      toast.error(error?.message || 'Greška pri preuzimanju PDF-a');
    }
  };

  const handleDelete = async () => {
    if (!evaluationId) return;

    if (!confirm('Da li ste sigurni da želite obrisati ovu evaluaciju? Ova akcija je nepovratna.')) {
      return;
    }

    try {
      setLoading(true);
      await apiService.delete(`/planika/maloprodaja/evaluations/${evaluationId}`);
      toast.success('Evaluacija je uspješno obrisana');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to delete evaluation:', error);
      toast.error(error?.response?.data?.message || 'Greška pri brisanju evaluacije');
    } finally {
      setLoading(false);
    }
  };

  // Check if user is admin
  const isAdmin = user?.role?.toLowerCase() === 'admin' || 
                 user?.role?.toLowerCase() === 'super-admin' ||
                 (user as any)?.roles?.some((r: string) => r?.toLowerCase() === 'admin' || r?.toLowerCase() === 'super-admin');

  const updateResponse = (criterionName: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      responses: prev.responses.map((r) =>
        r.criterion_name === criterionName ? { ...r, [field]: value } : r
      ),
      scores: {
        ...prev.scores,
        [criterionName]: field === 'score' ? value : prev.scores[criterionName] || 0,
      },
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

  const calculateAverage = () => {
    const scores = Object.values(formData.scores);
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  };

  const getRating = (average: number) => {
    if (average >= 4.5) return 'odličan';
    if (average >= 3.5) return 'dobar';
    if (average >= 2.5) return 'zadovoljavajući';
    return 'treba poboljšanje';
  };

  if (loading && evaluationId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Employee Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Zaposleni *
          </label>
          <select
            required
            value={formData.employee_id}
            onChange={(e) => setFormData({ ...formData, employee_id: parseInt(e.target.value) })}
            className="w-full input"
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
            {!stores || stores.length === 0 ? (
              <option disabled>
                {!stores ? 'Učitavanje...' : 'Nema dostupnih prodavnica'}
              </option>
            ) : (
              stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Criteria Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Kriteriji ocjenjivanja *
          </label>
          <select
            required
            value={formData.evaluation_criteria_id}
            onChange={(e) =>
              setFormData({ ...formData, evaluation_criteria_id: parseInt(e.target.value) })
            }
            className="w-full input"
          >
            <option value={0}>Odaberite kriterije</option>
            {criteriaList.map((criteria) => (
              <option key={criteria.id} value={criteria.id}>
                {criteria.name}
              </option>
            ))}
          </select>
        </div>

        {/* Evaluation Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Datum ocjenjivanja *
          </label>
          <input
            type="date"
            required
            value={formData.evaluation_date}
            onChange={(e) => setFormData({ ...formData, evaluation_date: e.target.value })}
            className="w-full input"
          />
        </div>

        {/* Period Start */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Početak perioda *
          </label>
          <input
            type="date"
            required
            value={formData.period_start}
            onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
            className="w-full input"
          />
        </div>

        {/* Period End */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Kraj perioda *
          </label>
          <input
            type="date"
            required
            value={formData.period_end}
            onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
            className="w-full input"
          />
        </div>
      </div>

      {/* Criteria Evaluation */}
      {selectedCriteria && selectedCriteria.criteria && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Kriteriji ocjenjivanja
            </h3>
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400">Prosječna ocjena</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {calculateAverage().toFixed(2)} / {selectedCriteria.max_rating}
              </p>
              <p className="text-sm font-medium text-blue-600">
                {getRating(calculateAverage())}
              </p>
            </div>
          </div>

          {selectedCriteria.criteria.map((criterion: any, index: number) => {
            const response = formData.responses.find((r) => r.criterion_name === criterion.name);

            return (
              <div
                key={index}
                className="card p-5 border border-gray-200 dark:border-gray-700"
              >
                <div className="mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {criterion.name}
                  </h4>
                  {criterion.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {criterion.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Ocjena (1-{selectedCriteria.max_rating})
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedCriteria.max_rating}
                      required
                      value={response?.score || 0}
                      onChange={(e) =>
                        updateResponse(criterion.name, 'score', parseFloat(e.target.value) || 0)
                      }
                      className="w-full input"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Komentar
                    </label>
                    <textarea
                      value={response?.comment || ''}
                      onChange={(e) =>
                        updateResponse(criterion.name, 'comment', e.target.value)
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
          placeholder="Dodajte opći komentar o ocjeni..."
          disabled={evaluation?.signature_status === 'evaluator_signed' || evaluation?.signature_status === 'completed'}
        />
      </div>

      {/* Recommendations */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Preporuke za poboljšanje
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
          <button type="button" onClick={addRecommendation} className="btn-secondary">
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

      {/* Digital Signatures Section - Show for all evaluations */}
      <div className="space-y-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Digitalni potpisi</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Potpisivanje evaluacije je obavezno kako bi se dokazala autentičnost dokumenta.
          </p>
        </div>

        {/* Signatures Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Evaluator Signature */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white">Potpis ocjenjivača</h4>
              {signatures.some((s: any) => s.signature_type === 'evaluator' && s.id && s.signature_data) ? (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Potpisano
                </span>
              ) : (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                  Nije potpisano
                </span>
              )}
            </div>
            {signatures.some((s: any) => s.signature_type === 'evaluator' && s.id && s.signature_data) ? (
              <div className="space-y-2">
                {signatures.filter((s: any) => s.signature_type === 'evaluator' && s.id && s.signature_data).map((signature: any) => (
                  <div key={signature.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center justify-between">
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
                  Ocjenjivač mora potpisati evaluaciju.
                </p>
                <button
                  onClick={() => {
                    setSignatureType('evaluator');
                    setShowSignaturePad(true);
                  }}
                  disabled={isSigning || !evaluationId || evaluation?.signature_status === 'evaluator_signed' || evaluation?.signature_status === 'completed' || !user}
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
                      Digitalni potpis
                    </>
                  )}
                </button>
                {!evaluationId && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    Sačuvajte evaluaciju prije potpisivanja
                  </p>
                )}
                {evaluationId && (evaluation?.signature_status === 'evaluator_signed' || evaluation?.signature_status === 'completed') && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                    Evaluacija je već potpisana
                  </p>
                )}
              </div>
            )}
          </div>

            {/* Employee Signature */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white">Potpis zaposlenog</h4>
                {signatures.some((s: any) => s.signature_type === 'employee') ? (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    Potpisano
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                    Nije potpisano
                  </span>
                )}
              </div>
              {signatures.some((s: any) => s.signature_type === 'employee') ? (
                <div className="space-y-2">
                  {signatures.filter((s: any) => s.signature_type === 'employee').map((signature: any) => (
                    <div key={signature.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center justify-between">
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
                    Zaposleni može potpisati evaluaciju.
                  </p>
                  <button
                    onClick={() => {
                      setSignatureType('employee');
                      setShowSignaturePad(true);
                    }}
                    disabled={isSigning || signatures.some((s: any) => s.signature_type === 'employee' && s.user_id === user?.id) || !user}
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
                        Potpiši kao zaposleni
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* PDF Download and Delete - Show if evaluation exists */}
          {evaluationId && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Akcije</h4>
              <div className="flex gap-3">
                <button
                  onClick={handleDownloadPdf}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Preuzmi PDF izvještaj
                </button>
                {isAdmin && (
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Obriši evaluaciju
                  </button>
                )}
              </div>
            </div>
          )}

          {evaluationId && evaluation?.signature_status === 'evaluator_signed' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  ⚠️ Evaluacija je potpisana od strane ocjenjivača i ne može se više mijenjati.
                </p>
              </div>
            </div>
          )}
        </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button type="button" onClick={onCancel} className="btn-secondary" disabled={loading}>
          Otkaži
        </button>
        <button 
          type="submit" 
          className="btn-primary" 
          disabled={loading || (evaluation?.signature_status === 'evaluator_signed' || evaluation?.signature_status === 'completed')}
        >
          {loading ? 'Spremanje...' : evaluationId ? 'Ažuriraj' : 'Kreiraj'}
        </button>
      </div>

      {/* Signature Pad Modal */}
      {showSignaturePad && signatureType && (
        <SignaturePad
          title={`Digitalni potpis - ${signatureType === 'evaluator' ? 'Ocjenjivač' : 'Zaposleni'}`}
          onSave={handleSign}
          onCancel={() => {
            setShowSignaturePad(false);
            setSignatureType(null);
          }}
        />
      )}
    </form>
  );
}


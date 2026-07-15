import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiSave, FiX, FiDollarSign, FiCalendar } from 'react-icons/fi';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

interface DealFormData {
  title: string;
  company_id?: number;
  contact_id?: number;
  value: string;
  currency: string;
  stage: string;
  probability: number;
  expected_close_date?: string;
  description?: string;
  source: 'web' | 'referral' | 'campaign' | 'manual' | 'cold_call';
  owner_id?: number;
}

export default function DealForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [formData, setFormData] = useState<DealFormData>({
    title: '',
    company_id: undefined,
    contact_id: undefined,
    value: '0',
    currency: 'BAM',
    stage: 'lead',
    probability: 0,
    expected_close_date: '',
    description: '',
    source: 'manual',
    owner_id: undefined,
  });

  const [deal, setDeal] = useState<any>(null);

  useEffect(() => {
    loadInitialData();
    if (isEdit && id) {
      loadDeal();
    }
  }, [id, isEdit]);

  const loadInitialData = async () => {
    try {
      const [companiesRes, usersRes] = await Promise.all([
        apiService.get('/crm/companies?per_page=1000'),
        apiService.get('/admin/users'),
      ]);
      setCompanies(companiesRes.data || []);
      setUsers(usersRes.data || []);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    }
  };

  const loadDeal = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/crm/deals/${id}`);
      
      // Handle response - could be direct data or wrapped in data property
      const dealData = response?.data || response;
      
      setDeal(dealData);
      setFormData({
        title: dealData.title || '',
        company_id: dealData.company_id || undefined,
        contact_id: dealData.contact_id || undefined,
        value: dealData.value?.toString() || '0',
        currency: dealData.currency || 'BAM',
        stage: dealData.stage || 'lead',
        probability: dealData.probability || 0,
        expected_close_date: dealData.expected_close_date || '',
        description: dealData.description || '',
        source: dealData.source || 'manual',
        owner_id: dealData.owner_id || undefined,
      });

      // Load contacts for selected company
      if (dealData.company_id) {
        loadContactsForCompany(dealData.company_id);
      }
    } catch (error: any) {
      console.error('Failed to load deal:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Greška pri učitavanju deal-a';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadContactsForCompany = async (companyId: number) => {
    try {
      const response = await apiService.get(`/crm/contacts?company_id=${companyId}`);
      setContacts(response.data || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const handleCompanyChange = (companyId: number | undefined) => {
    setFormData({ ...formData, company_id: companyId, contact_id: undefined });
    if (companyId) {
      loadContactsForCompany(companyId);
    } else {
      setContacts([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Naziv deal-a je obavezan');
      return;
    }

    try {
      setLoading(true);
      const submitData: any = {
        ...formData,
        value: parseFloat(formData.value) || 0,
        probability: parseInt(formData.probability.toString()) || 0,
      };

      // Remove empty strings
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '' || submitData[key] === null || submitData[key] === undefined) {
          delete submitData[key];
        }
      });

      if (isEdit && id) {
        await apiService.put(`/crm/deals/${id}`, submitData);
        toast.success('Deal uspješno ažuriran');
      } else {
        await apiService.post('/crm/deals', submitData);
        toast.success('Deal uspješno kreiran');
      }

      navigate('/crm/deals');
    } catch (error: any) {
      console.error('Failed to save deal:', error);
      
      // Handle validation errors
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0];
        toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
        return;
      }
      
      // Handle other errors
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Greška pri čuvanju deal-a';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const dealStages = [
    { value: 'lead', label: 'Lead' },
    { value: 'qualified', label: 'Kvalificiran' },
    { value: 'proposal', label: 'Ponuda' },
    { value: 'negotiation', label: 'Pregovori' },
    { value: 'closed-won', label: 'Dobiven' },
    { value: 'closed-lost', label: 'Izgubljen' },
  ];

  const estimatedRevenue = parseFloat(formData.value) * (formData.probability / 100);

  if (loading && isEdit) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="card">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEdit ? 'Uredi Deal' : 'Novi Deal'}
            </h1>
            <button
              onClick={() => navigate('/crm/deals')}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FiX size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Osnovni Podaci */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FiDollarSign />
                Osnovni Podaci
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Naziv Deal-a *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kompanija
                  </label>
                  <select
                    value={formData.company_id || ''}
                    onChange={(e) => handleCompanyChange(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Nije odabrano</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Kontakt
                  </label>
                  <select
                    value={formData.contact_id || ''}
                    onChange={(e) => setFormData({ ...formData, contact_id: e.target.value ? parseInt(e.target.value) : undefined })}
                    disabled={!formData.company_id}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                  >
                    <option value="">Nije odabrano</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Faza
                  </label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {dealStages.map((stage) => (
                      <option key={stage.value} value={stage.value}>
                        {stage.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Vrijednost (BAM) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Vjerojatnost (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Procijenjeni Prihod
                  </label>
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
                    <span className="text-gray-900 dark:text-white font-medium">
                      {estimatedRevenue.toFixed(2)} BAM
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Očekivani Datum Zatvaranja
                  </label>
                  <input
                    type="date"
                    value={formData.expected_close_date}
                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Izvor
                  </label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="manual">Ručni unos</option>
                    <option value="web">Web</option>
                    <option value="referral">Preporuka</option>
                    <option value="campaign">Kampanja</option>
                    <option value="cold_call">Cold Call</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Vlasnik
                  </label>
                  <select
                    value={formData.owner_id || ''}
                    onChange={(e) => setFormData({ ...formData, owner_id: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Nije odabrano</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Opis
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate('/crm/deals')}
                className="btn-secondary"
              >
                Odustani
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center gap-2"
              >
                <FiSave />
                {loading ? 'Čuvanje...' : isEdit ? 'Ažuriraj' : 'Kreiraj'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


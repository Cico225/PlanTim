import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FiSave, FiX, FiCalendar, FiClock, FiMapPin, FiUsers } from 'react-icons/fi';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

interface ActivityFormData {
  type: 'call' | 'meeting' | 'email' | 'task' | 'note';
  subject: string;
  description?: string;
  company_id?: number;
  contact_id?: number;
  deal_id?: number;
  scheduled_at?: string;
  duration?: number;
  location?: string;
  owner_id?: number;
}

export default function ActivityForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const [formData, setFormData] = useState<ActivityFormData>({
    type: 'call',
    subject: '',
    description: '',
    company_id: undefined,
    contact_id: undefined,
    deal_id: undefined,
    scheduled_at: '',
    duration: 30,
    location: '',
    owner_id: undefined,
  });

  useEffect(() => {
    loadInitialData();
    const companyId = searchParams.get('company_id');
    const contactId = searchParams.get('contact_id');
    const dealId = searchParams.get('deal_id');

    if (companyId) {
      setFormData(prev => ({ ...prev, company_id: parseInt(companyId) }));
      loadContactsForCompany(parseInt(companyId));
    }
    if (contactId) {
      setFormData(prev => ({ ...prev, contact_id: parseInt(contactId) }));
    }
    if (dealId) {
      setFormData(prev => ({ ...prev, deal_id: parseInt(dealId) }));
    }

    if (isEdit && id) {
      loadActivity();
    }
  }, [id, isEdit, searchParams]);

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

  const loadContactsForCompany = async (companyId: number) => {
    try {
      const response = await apiService.get(`/crm/contacts?company_id=${companyId}`);
      setContacts(response.data || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const loadDealsForCompany = async (companyId: number) => {
    try {
      const response = await apiService.get(`/crm/deals?company_id=${companyId}`);
      setDeals(response.data || []);
    } catch (error) {
      console.error('Failed to load deals:', error);
    }
  };

  const loadActivity = async () => {
    try {
      setLoading(true);
      const activity = await apiService.get(`/crm/activities/${id}`);
      setFormData({
        type: activity.type || 'call',
        subject: activity.subject || '',
        description: activity.description || '',
        company_id: activity.company_id || undefined,
        contact_id: activity.contact_id || undefined,
        deal_id: activity.deal_id || undefined,
        scheduled_at: activity.scheduled_at ? new Date(activity.scheduled_at).toISOString().slice(0, 16) : '',
        duration: activity.duration || 30,
        location: activity.location || '',
        owner_id: activity.owner_id || undefined,
      });

      if (activity.company_id) {
        loadContactsForCompany(activity.company_id);
        loadDealsForCompany(activity.company_id);
      }
    } catch (error) {
      console.error('Failed to load activity:', error);
      toast.error('Greška pri učitavanju aktivnosti');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (companyId: number | undefined) => {
    setFormData({ ...formData, company_id: companyId, contact_id: undefined, deal_id: undefined });
    if (companyId) {
      loadContactsForCompany(companyId);
      loadDealsForCompany(companyId);
    } else {
      setContacts([]);
      setDeals([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject.trim()) {
      toast.error('Predmet je obavezan');
      return;
    }

    try {
      setLoading(true);
      const submitData: any = { ...formData };

      // Remove empty strings
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '' || submitData[key] === null || submitData[key] === undefined) {
          delete submitData[key];
        }
      });

      if (isEdit && id) {
        await apiService.put(`/crm/activities/${id}`, submitData);
        toast.success('Aktivnost uspješno ažurirana');
      } else {
        await apiService.post('/crm/activities', submitData);
        toast.success('Aktivnost uspješno kreirana');
      }

      navigate('/crm/activities');
    } catch (error: any) {
      console.error('Failed to save activity:', error);
      
      // Handle validation errors
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0];
        toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
        return;
      }
      
      // Handle other errors
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Greška pri čuvanju aktivnosti';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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
              {isEdit ? 'Uredi Aktivnost' : 'Nova Aktivnost'}
            </h1>
            <button
              onClick={() => navigate('/crm/activities')}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FiX size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tip Aktivnosti *
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="call">📞 Poziv</option>
                  <option value="meeting">🤝 Sastanak</option>
                  <option value="email">✉️ Email</option>
                  <option value="task">✓ Zadatak</option>
                  <option value="note">📝 Napomena</option>
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

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Predmet *
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
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
                  Deal
                </label>
                <select
                  value={formData.deal_id || ''}
                  onChange={(e) => setFormData({ ...formData, deal_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  disabled={!formData.company_id}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                >
                  <option value="">Nije odabrano</option>
                  {deals.map((deal) => (
                    <option key={deal.id} value={deal.id}>
                      {deal.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Datum i Vrijeme
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_at}
                  onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Trajanje (minute)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 30 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {(formData.type === 'meeting' || formData.type === 'call') && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Lokacija
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}

              <div className="md:col-span-2">
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

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => navigate('/crm/activities')}
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



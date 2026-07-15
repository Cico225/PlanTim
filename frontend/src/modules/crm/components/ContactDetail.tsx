import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiEdit, FiArrowLeft, FiDollarSign, FiActivity, FiFile, FiTag, FiMail, FiPhone, FiMapPin, FiUser } from 'react-icons/fi';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import Timeline from './Timeline';
import DocumentList from './DocumentList';
import TagManager from './TagManager';

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'deals' | 'activities' | 'documents' | 'timeline'>('overview');

  useEffect(() => {
    if (id) {
      loadContact();
    }
  }, [id]);

  const loadContact = async () => {
    try {
      setLoading(true);
      const contactData = await apiService.get(`/crm/contacts/${id}`);
      
      // Handle response - could be direct data or wrapped in data property
      const contact = contactData?.data || contactData;
      
      setContact(contact);
      setDeals(contact?.deals || []);
      setActivities(contact?.activities || []);
    } catch (error: any) {
      console.error('Failed to load contact:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Greška pri učitavanju kontakta';
      toast.error(errorMessage);
      navigate('/crm/contacts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!contact) {
    return null;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/crm/contacts')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <FiArrowLeft />
          Nazad na listu
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl">
              {contact.first_name.charAt(0)}{contact.last_name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {contact.first_name} {contact.last_name}
              </h1>
              {contact.position && (
                <p className="text-gray-600 dark:text-gray-400">{contact.position}</p>
              )}
              {contact.company_name && (
                <Link to={`/crm/accounts/${contact.company_id}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                  {contact.company_name}
                </Link>
              )}
            </div>
          </div>
          <Link
            to={`/crm/contacts/${id}/edit`}
            className="btn-primary flex items-center gap-2"
          >
            <FiEdit />
            Uredi
          </Link>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          {[
            { key: 'overview', label: 'Pregled' },
            { key: 'deals', label: 'Deal-ovi', count: deals.length },
            { key: 'activities', label: 'Aktivnosti', count: activities.length },
            { key: 'documents', label: 'Dokumenti' },
            { key: 'timeline', label: 'Timeline' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kontakt Informacije</h2>
                <div className="space-y-3">
                  {contact.email && (
                    <div className="flex items-center gap-3">
                      <FiMail className="text-gray-400" />
                      <a href={`mailto:${contact.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {contact.email}
                      </a>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-3">
                      <FiPhone className="text-gray-400" />
                      <a href={`tel:${contact.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {contact.phone}
                      </a>
                    </div>
                  )}
                  {contact.mobile && (
                    <div className="flex items-center gap-3">
                      <FiPhone className="text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{contact.mobile}</span>
                    </div>
                  )}
                  {contact.linkedin && (
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400">💼</span>
                      <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                        LinkedIn Profil
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {contact.notes && (
                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Napomene</h2>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{contact.notes}</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tagovi</h2>
                <TagManager entityType="contact" entityId={parseInt(id!)} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deals' && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Deal-ovi</h2>
            {deals.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Nema deal-ova</p>
            ) : (
              <div className="space-y-3">
                {deals.map((deal: any) => (
                  <Link
                    key={deal.id}
                    to={`/crm/deals/${deal.id}`}
                    className="block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{deal.title}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{deal.stage}</div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'activities' && (
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Aktivnosti</h2>
            {activities.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Nema aktivnosti</p>
            ) : (
              <div className="space-y-3">
                {activities.map((activity: any) => (
                  <div key={activity.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="font-medium text-gray-900 dark:text-white">{activity.subject}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{activity.type}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentList entityType="contact" entityId={parseInt(id!)} />
        )}

        {activeTab === 'timeline' && (
          <Timeline entityType="contact" entityId={parseInt(id!)} />
        )}
      </div>
    </div>
  );
}



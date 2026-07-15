import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiEdit, FiArrowLeft, FiUsers, FiDollarSign, FiActivity, FiFile, FiTag, FiMail, FiPhone, FiMapPin, FiGlobe, FiBriefcase } from 'react-icons/fi';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import Timeline from './Timeline';
import DocumentList from './DocumentList';
import TagManager from './TagManager';

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts' | 'deals' | 'activities' | 'documents' | 'timeline'>('overview');

  useEffect(() => {
    if (id) {
      loadAccount();
    }
  }, [id]);

  const loadAccount = async () => {
    try {
      setLoading(true);
      const accountData = await apiService.get(`/crm/companies/${id}`);
      setAccount(accountData);
      setContacts(accountData.contacts || []);
      setDeals(accountData.deals || []);
      setActivities(accountData.activities || []);
    } catch (error) {
      console.error('Failed to load account:', error);
      toast.error('Greška pri učitavanju kompanije');
      navigate('/crm/accounts');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('bs-BA', {
      style: 'currency',
      currency: 'BAM',
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!account) {
    return null;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/crm/accounts')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <FiArrowLeft />
          Nazad na listu
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center text-white font-bold text-2xl">
              {account.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{account.name}</h1>
              {account.legal_name && (
                <p className="text-gray-600 dark:text-gray-400">{account.legal_name}</p>
              )}
            </div>
          </div>
          <Link
            to={`/crm/accounts/${id}/edit`}
            className="btn-primary flex items-center gap-2"
          >
            <FiEdit />
            Uredi
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          {[
            { key: 'overview', label: 'Pregled' },
            { key: 'contacts', label: 'Kontakti', count: contacts.length },
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

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Osnovni Podaci */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Osnovni Podaci</h2>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <FiBriefcase className="text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Tip</p>
                      <p className="text-gray-900 dark:text-white">{account.type || 'client'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-gray-400 mt-1">📊</span>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        account.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {account.status || 'active'}
                      </span>
                    </div>
                  </div>
                  {account.industry && (
                    <div className="flex items-start gap-3">
                      <span className="text-gray-400 mt-1">🏭</span>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Industrija</p>
                        <p className="text-gray-900 dark:text-white">{account.industry}</p>
                      </div>
                    </div>
                  )}
                  {account.rating && (
                    <div className="flex items-start gap-3">
                      <span className="text-gray-400 mt-1">⭐</span>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Ocjena</p>
                        <p className="text-gray-900 dark:text-white">{account.rating}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Kontakt Informacije */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kontakt Informacije</h2>
                <div className="space-y-3">
                  {account.email && (
                    <div className="flex items-center gap-3">
                      <FiMail className="text-gray-400" />
                      <a href={`mailto:${account.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {account.email}
                      </a>
                    </div>
                  )}
                  {account.phone && (
                    <div className="flex items-center gap-3">
                      <FiPhone className="text-gray-400" />
                      <a href={`tel:${account.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {account.phone}
                      </a>
                    </div>
                  )}
                  {account.website && (
                    <div className="flex items-center gap-3">
                      <FiGlobe className="text-gray-400" />
                      <a href={account.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                        {account.website}
                      </a>
                    </div>
                  )}
                  {(account.street || account.city || account.country) && (
                    <div className="flex items-start gap-3">
                      <FiMapPin className="text-gray-400 mt-1" />
                      <div className="text-gray-900 dark:text-white">
                        {account.street && <div>{account.street}</div>}
                        {account.city && <div>{account.city}</div>}
                        {account.postal_code && <div>{account.postal_code}</div>}
                        {account.country && <div>{account.country}</div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Napomene */}
              {account.notes && (
                <div className="card p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Napomene</h2>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{account.notes}</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Statistike */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statistike</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FiUsers className="text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Kontakti</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {contacts.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FiDollarSign className="text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Deal-ovi</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {deals.length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FiDollarSign className="text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Ukupna Vrijednost</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(deals.reduce((sum, deal) => sum + (deal.value || 0), 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FiActivity className="text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Aktivnosti</span>
                    </div>
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {activities.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tagovi */}
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Tagovi</h2>
                <TagManager entityType="account" entityId={parseInt(id!)} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Kontakti</h2>
              <Link to={`/crm/contacts/new?company_id=${id}`} className="btn-primary flex items-center gap-2">
                <FiUsers />
                Dodaj Kontakt
              </Link>
            </div>
            {contacts.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Nema kontakata</p>
            ) : (
              <div className="space-y-3">
                {contacts.map((contact: any) => (
                  <Link
                    key={contact.id}
                    to={`/crm/contacts/${contact.id}`}
                    className="block p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {contact.first_name} {contact.last_name}
                    </div>
                    {contact.position && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">{contact.position}</div>
                    )}
                    {contact.email && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">{contact.email}</div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'deals' && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Deal-ovi</h2>
              <Link to={`/crm/deals/new?company_id=${id}`} className="btn-primary flex items-center gap-2">
                <FiDollarSign />
                Novi Deal
              </Link>
            </div>
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
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{deal.title}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatCurrency(deal.value, deal.currency)} • {deal.stage}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {deal.probability}%
                        </div>
                      </div>
                    </div>
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
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {activity.type} • {activity.owner_name}
                    </div>
                    {activity.scheduled_at && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(activity.scheduled_at).toLocaleString('bs-BA')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <DocumentList entityType="account" entityId={parseInt(id!)} />
        )}

        {activeTab === 'timeline' && (
          <Timeline entityType="account" entityId={parseInt(id!)} />
        )}
      </div>
    </div>
  );
}


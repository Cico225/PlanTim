import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  FiShield,
  FiLock,
  FiAlertTriangle,
  FiCheckCircle,
  FiX,
  FiRefreshCw,
  FiSave,
  FiUser,
  FiGlobe,
  FiDatabase,
  FiFileText,
  FiTrash2,
  FiDownload,
  FiClock,
  FiEye,
  FiEyeOff,
  FiSettings,
} from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { apiService } from '@/services/api';

interface SecuritySetting {
  value: any;
  type: string;
  description: string;
}

interface SecurityStats {
  failed_login_attempts_24h: number;
  blocked_ips: number;
  blocked_emails: number;
  active_sessions: number;
  total_sessions: number;
}

interface FailedLogin {
  id: number;
  email: string;
  ip_address: string;
  user_agent: string;
  blocked: boolean;
  blocked_until: string | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
}

interface ActiveSession {
  id: number;
  name: string;
  tokenable_id: number;
  last_used_at: string | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
}

interface GDPRConsent {
  id: number;
  user_id: number;
  type: string;
  description: string;
  accepted: boolean;
  accepted_at: string | null;
  revoked_at: string | null;
  ip_address: string | null;
  created_at: string;
  user_name: string;
  user_email: string;
}

interface GDPRDataRequest {
  id: number;
  user_id: number;
  type: string;
  status: string;
  processed_by: number | null;
  processed_at: string | null;
  file_path: string | null;
  expires_at: string | null;
  created_at: string;
  user_name: string;
  user_email: string;
  processed_by_name: string | null;
}

interface GDPRStats {
  total_consents: number;
  active_consents: number;
  revoked_consents: number;
  pending_exports: number;
  pending_deletions: number;
  completed_exports: number;
  completed_deletions: number;
}

function SecurityManagementContent() {
  console.log('🔒 SecurityManagementContent component INITIALIZED');
  
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>('security');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('🔒 SecurityManagementContent component rendered, activeTab:', activeTab, 'loading:', loading);

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState<Record<string, SecuritySetting>>({});
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [failedLogins, setFailedLogins] = useState<FailedLogin[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);

  // GDPR
  const [gdprStats, setGdprStats] = useState<GDPRStats | null>(null);
  const [gdprConsents, setGdprConsents] = useState<GDPRConsent[]>([]);
  const [gdprExports, setGdprExports] = useState<GDPRDataRequest[]>([]);
  const [gdprDeletions, setGdprDeletions] = useState<GDPRDataRequest[]>([]);

  // Security Settings
  const fetchSecuritySettings = async () => {
    try {
      setError(null);
      const data = await apiService.get<Record<string, SecuritySetting>>('/admin/security/settings');
      setSecuritySettings(data || {});
    } catch (error: any) {
      console.error('Error fetching security settings:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Greška pri učitavanju sigurnosnih postavki';
      // Don't show toast on initial load, just set error state
      if (loading) {
        setSecuritySettings({});
        // Don't set error on initial load, just use empty settings
      } else {
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSecurityStats = async () => {
    try {
      console.log('🔒 Fetching security stats...');
      const data = await apiService.get<SecurityStats>('/admin/security/stats');
      console.log('🔒 Security stats received:', data);
      setSecurityStats(data || {
        failed_login_attempts_24h: 0,
        blocked_ips: 0,
        blocked_emails: 0,
        active_sessions: 0,
        total_sessions: 0,
      });
    } catch (error: any) {
      console.error('Error fetching security stats:', error);
      // Set default stats on error
      setSecurityStats({
        failed_login_attempts_24h: 0,
        blocked_ips: 0,
        blocked_emails: 0,
        active_sessions: 0,
        total_sessions: 0,
      });
    }
  };

  const fetchFailedLogins = async () => {
    try {
      const response = await apiService.get<{ data: FailedLogin[]; current_page?: number }>('/admin/security/failed-logins');
      // Handle both paginated and non-paginated responses
      if (Array.isArray(response)) {
        setFailedLogins(response);
      } else if (response.data) {
        setFailedLogins(response.data);
      } else {
        setFailedLogins([]);
      }
    } catch (error: any) {
      console.error('Error fetching failed logins:', error);
      setFailedLogins([]);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      const response = await apiService.get<{ data: ActiveSession[]; current_page?: number }>('/admin/security/sessions');
      // Handle both paginated and non-paginated responses
      if (Array.isArray(response)) {
        setActiveSessions(response);
      } else if (response.data) {
        setActiveSessions(response.data);
      } else {
        setActiveSessions([]);
      }
    } catch (error: any) {
      console.error('Error fetching active sessions:', error);
      setActiveSessions([]);
    }
  };

  const handleSaveSecuritySettings = async () => {
    setSaving(true);
    try {
      const settingsToSave: Record<string, any> = {};
      Object.keys(securitySettings).forEach((key) => {
        settingsToSave[key] = securitySettings[key].value;
      });

      await apiService.put('/admin/security/settings', settingsToSave);
      toast.success('Sigurnosne postavke su uspješno sačuvane');
    } catch (error: any) {
      console.error('Error saving security settings:', error);
      toast.error('Greška pri čuvanju sigurnosnih postavki');
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (type: 'ip' | 'email', value: string) => {
    try {
      await apiService.post('/admin/security/unblock', { type, value });
      toast.success(`${type === 'ip' ? 'IP adresa' : 'Email'} je uspješno odblokiran`);
      await fetchFailedLogins();
      await fetchSecurityStats();
    } catch (error: any) {
      console.error('Error unblocking:', error);
      toast.error('Greška pri odblokiranju');
    }
  };

  const handleRevokeSession = async (tokenId: number) => {
    try {
      await apiService.delete(`/admin/security/sessions/${tokenId}`);
      toast.success('Sesija je uspješno ukinuta');
      await fetchActiveSessions();
      await fetchSecurityStats();
    } catch (error: any) {
      console.error('Error revoking session:', error);
      toast.error('Greška pri ukidanju sesije');
    }
  };

  // GDPR
  const fetchGDPRStats = async () => {
    try {
      const data = await apiService.get<GDPRStats>('/admin/gdpr/stats');
      setGdprStats(data);
    } catch (error: any) {
      console.error('Error fetching GDPR stats:', error);
      // Set default stats on error
      setGdprStats({
        total_consents: 0,
        active_consents: 0,
        revoked_consents: 0,
        pending_exports: 0,
        pending_deletions: 0,
        completed_exports: 0,
        completed_deletions: 0,
      });
    }
  };

  const fetchGDPRConsents = async () => {
    try {
      const response = await apiService.get<{ data: GDPRConsent[]; current_page?: number }>('/admin/gdpr/all-consents');
      // Handle both paginated and non-paginated responses
      if (Array.isArray(response)) {
        setGdprConsents(response);
      } else if (response.data) {
        setGdprConsents(response.data);
      } else {
        setGdprConsents([]);
      }
    } catch (error: any) {
      console.error('Error fetching GDPR consents:', error);
      setGdprConsents([]);
    }
  };

  const fetchGDPRExports = async () => {
    try {
      const response = await apiService.get<{ data: GDPRDataRequest[]; current_page?: number }>('/admin/gdpr/all-exports');
      // Handle both paginated and non-paginated responses
      if (Array.isArray(response)) {
        setGdprExports(response);
      } else if (response.data) {
        setGdprExports(response.data);
      } else {
        setGdprExports([]);
      }
    } catch (error: any) {
      console.error('Error fetching GDPR exports:', error);
      setGdprExports([]);
    }
  };

  const fetchGDPRDeletions = async () => {
    try {
      const response = await apiService.get<{ data: GDPRDataRequest[]; current_page?: number }>('/admin/gdpr/all-deletions');
      // Handle both paginated and non-paginated responses
      if (Array.isArray(response)) {
        setGdprDeletions(response);
      } else if (response.data) {
        setGdprDeletions(response.data);
      } else {
        setGdprDeletions([]);
      }
    } catch (error: any) {
      console.error('Error fetching GDPR deletions:', error);
      setGdprDeletions([]);
    }
  };

  useEffect(() => {
    console.log('🔒 SecurityManagement useEffect triggered, activeTab:', activeTab);
    setLoading(true);
    setError(null);
    
    try {
      if (activeTab === 'security') {
        fetchSecuritySettings();
        fetchSecurityStats();
        fetchFailedLogins();
        fetchActiveSessions();
      } else if (activeTab === 'gdpr') {
        setLoading(false); // GDPR doesn't have a main loading state
        fetchGDPRStats();
        fetchGDPRConsents();
        fetchGDPRExports();
        fetchGDPRDeletions();
      }
    } catch (err: any) {
      console.error('Error in SecurityManagement useEffect:', err);
      setError(err.message || 'Greška pri učitavanju podataka');
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleProcessExport = async (id: number, status: string) => {
    try {
      await apiService.put(`/admin/gdpr/exports/${id}/process`, { status });
      toast.success('Export zahtev je uspješno obrađen');
      await fetchGDPRExports();
      await fetchGDPRStats();
    } catch (error: any) {
      console.error('Error processing export:', error);
      toast.error('Greška pri obradi export zahteva');
    }
  };

  const handleProcessDeletion = async (id: number, status: string) => {
    try {
      await apiService.put(`/admin/gdpr/deletions/${id}/process`, { status });
      toast.success('Zahtev za brisanje je uspješno obrađen');
      await fetchGDPRDeletions();
      await fetchGDPRStats();
    } catch (error: any) {
      console.error('Error processing deletion:', error);
      toast.error('Greška pri obradi zahteva za brisanje');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'dd.MM.yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'text-yellow-600 dark:text-yellow-400',
      processing: 'text-blue-600 dark:text-blue-400',
      completed: 'text-green-600 dark:text-green-400',
      rejected: 'text-red-600 dark:text-red-400',
      approved: 'text-green-600 dark:text-green-400',
    };
    return colors[status] || 'text-gray-600 dark:text-gray-400';
  };

  // Show error if component fails to load
  if (error) {
    return (
      <div className="space-y-6">
        <div className="card p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <FiAlertTriangle className="text-red-600 dark:text-red-400 mt-0.5" size={20} />
            <div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Greška</h3>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  if (activeTab === 'security') {
                    fetchSecuritySettings();
                  } else {
                    fetchGDPRStats();
                  }
                }}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Pokušaj ponovo
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('🔒 SecurityManagement render check - loading:', loading, 'error:', error, 'activeTab:', activeTab);

  // Always show header first
  const headerContent = (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
        <FiShield className="text-primary-600 dark:text-primary-400" />
        Sigurnost i GDPR
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mt-2">
        Upravljanje sigurnosnim postavkama i GDPR usklađenošću
      </p>
    </div>
  );

  // Show loading state
  if (loading && activeTab === 'security' && Object.keys(securitySettings).length === 0 && !error) {
    console.log('🔒 Showing loading state');
    return (
      <div className="space-y-6">
        {headerContent}
        <div className="card p-12 text-center">
          <FiRefreshCw className="animate-spin mx-auto text-primary-600 dark:text-primary-400 mb-4" size={48} />
          <p className="text-gray-600 dark:text-gray-400">Učitavanje sigurnosnih postavki...</p>
        </div>
      </div>
    );
  }

  console.log('🔒 Rendering main SecurityManagement content');
  return (
    <div className="space-y-6">
      {/* Header */}
      {headerContent}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('security')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'security'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FiLock className="inline mr-2" />
            Sigurnost
          </button>
          <button
            onClick={() => setActiveTab('gdpr')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'gdpr'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FiShield className="inline mr-2" />
            GDPR
          </button>
        </nav>
      </div>

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Security Stats */}
          {securityStats && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="card p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Neuspešni pokušaji (24h)</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {securityStats.failed_login_attempts_24h}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Blokirane IP adrese</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {securityStats.blocked_ips}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Blokirani emailovi</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {securityStats.blocked_emails}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Aktivne sesije</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {securityStats.active_sessions}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Ukupno sesija</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {securityStats.total_sessions}
                </p>
              </div>
            </div>
          )}

          {/* Security Settings */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiSettings />
              Sigurnosne Postavke
            </h2>

            {loading ? (
              <div className="text-center py-8">
                <FiRefreshCw className="animate-spin mx-auto text-primary-600 dark:text-primary-400" size={32} />
                <p className="text-gray-600 dark:text-gray-400 mt-2">Učitavanje...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Password Settings */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Politika Lozinki</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Minimalna dužina lozinke
                      </label>
                      <input
                        type="number"
                        value={securitySettings.password_min_length?.value || 8}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            password_min_length: {
                              ...securitySettings.password_min_length,
                              value: parseInt(e.target.value),
                            },
                          })
                        }
                        className="input"
                        min="6"
                        max="32"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Period isteka lozinke (dani)
                      </label>
                      <input
                        type="number"
                        value={securitySettings.password_expiration_days?.value || 0}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            password_expiration_days: {
                              ...securitySettings.password_expiration_days,
                              value: parseInt(e.target.value),
                            },
                          })
                        }
                        className="input"
                        min="0"
                        max="365"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    {['uppercase', 'lowercase', 'numbers', 'symbols'].map((req) => (
                      <label key={req} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={securitySettings[`password_require_${req}`]?.value || false}
                          onChange={(e) =>
                            setSecuritySettings({
                              ...securitySettings,
                              [`password_require_${req}`]: {
                                ...securitySettings[`password_require_${req}`],
                                value: e.target.checked,
                              },
                            })
                          }
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Zahtevaj {req === 'uppercase' ? 'velika slova' : req === 'lowercase' ? 'mala slova' : req === 'numbers' ? 'brojeve' : 'simbole'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Session Settings */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Upravljanje Sesijama</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Trajanje sesije (minuti)
                      </label>
                      <input
                        type="number"
                        value={securitySettings.session_lifetime?.value || 120}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            session_lifetime: {
                              ...securitySettings.session_lifetime,
                              value: parseInt(e.target.value),
                            },
                          })
                        }
                        className="input"
                        min="5"
                        max="1440"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Automatski logout nakon neaktivnosti (minuti)
                      </label>
                      <input
                        type="number"
                        value={securitySettings.auto_logout_timeout?.value || 0}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            auto_logout_timeout: {
                              ...securitySettings.auto_logout_timeout,
                              value: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="input"
                        min="0"
                        max="1440"
                        placeholder="0 = isključeno"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Postavite na 0 da isključite automatski logout. Korisnik će biti automatski odjavljen nakon određenog vremena neaktivnosti.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Login Protection */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Zaštita od Napada</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Maksimalan broj pokušaja prijave
                      </label>
                      <input
                        type="number"
                        value={securitySettings.max_login_attempts?.value || 5}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            max_login_attempts: {
                              ...securitySettings.max_login_attempts,
                              value: parseInt(e.target.value),
                            },
                          })
                        }
                        className="input"
                        min="1"
                        max="10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Trajanje blokade (minuti)
                      </label>
                      <input
                        type="number"
                        value={securitySettings.lockout_duration?.value || 15}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            lockout_duration: {
                              ...securitySettings.lockout_duration,
                              value: parseInt(e.target.value),
                            },
                          })
                        }
                        className="input"
                        min="1"
                        max="1440"
                      />
                    </div>
                  </div>
                </div>

                {/* Additional Settings */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Dodatne Postavke</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={securitySettings.require_2fa?.value || false}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            require_2fa: {
                              ...securitySettings.require_2fa,
                              value: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Zahtevaj dvofaktorsku autentifikaciju (2FA)
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={securitySettings.audit_log_enabled?.value || false}
                        onChange={(e) =>
                          setSecuritySettings({
                            ...securitySettings,
                            audit_log_enabled: {
                              ...securitySettings.audit_log_enabled,
                              value: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Omogući audit log</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveSecuritySettings}
                    disabled={saving}
                    className="btn-primary flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <FiRefreshCw className="animate-spin" />
                        Čuvanje...
                      </>
                    ) : (
                      <>
                        <FiSave />
                        Sačuvaj Postavke
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Failed Login Attempts */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiAlertTriangle />
              Neuspešni Pokušaji Prijave
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      IP Adresa
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Datum
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Akcije
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {failedLogins.slice(0, 20).map((attempt) => (
                    <tr
                      key={attempt.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">{attempt.email}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{attempt.ip_address}</td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(attempt.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        {attempt.blocked ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                            Blokiran
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                            Aktivno
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {attempt.blocked && (
                            <button
                              onClick={() => handleUnblock('email', attempt.email)}
                              className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                              title="Odblokiraj"
                            >
                              <FiCheckCircle size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => handleUnblock('ip', attempt.ip_address)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Odblokiraj IP"
                          >
                            <FiGlobe size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Sessions */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiUser />
              Aktivne Sesije
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Korisnik
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Poslednja Aktivnost
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Kreirano
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Akcije
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeSessions.slice(0, 20).map((session) => (
                    <tr
                      key={session.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {session.user_name || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">{session.user_email || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {session.last_used_at ? formatDate(session.last_used_at) : 'Nikad'}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(session.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => handleRevokeSession(session.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Ukini sesiju"
                          >
                            <FiX size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* GDPR Tab */}
      {activeTab === 'gdpr' && (
        <div className="space-y-6">
          {/* GDPR Stats */}
          {gdprStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="card p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Ukupno Consent-a</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{gdprStats.total_consents}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Aktivnih: {gdprStats.active_consents}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Zahtevi za Export</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                  {gdprStats.pending_exports}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Završeno: {gdprStats.completed_exports}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Zahtevi za Brisanje</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {gdprStats.pending_deletions}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Završeno: {gdprStats.completed_deletions}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Opozvano Consent-a</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {gdprStats.revoked_consents}
                </p>
              </div>
            </div>
          )}

          {/* GDPR Consents */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiFileText />
              Consent-i Korisnika
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Korisnik
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Tip
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Datum
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {gdprConsents.slice(0, 20).map((consent) => (
                    <tr
                      key={consent.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{consent.user_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">{consent.user_email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{consent.type}</td>
                      <td className="py-3 px-4">
                        {consent.accepted ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                            Prihvaćen
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                            Opozvan
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(consent.accepted_at || consent.revoked_at || consent.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data Export Requests */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiDownload />
              Zahtevi za Export Podataka
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Korisnik
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Datum
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Akcije
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {gdprExports.map((exportReq) => (
                    <tr
                      key={exportReq.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{exportReq.user_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">{exportReq.user_email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(exportReq.status)}`}>
                          {exportReq.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(exportReq.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {exportReq.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleProcessExport(exportReq.id, 'processing')}
                                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Obradi
                              </button>
                              <button
                                onClick={() => handleProcessExport(exportReq.id, 'rejected')}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Odbij
                              </button>
                            </>
                          )}
                          {exportReq.status === 'processing' && (
                            <button
                              onClick={() => handleProcessExport(exportReq.id, 'completed')}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Završi
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data Deletion Requests */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiTrash2 />
              Zahtevi za Brisanje Podataka
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Korisnik
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Datum
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Akcije
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {gdprDeletions.map((deletionReq) => (
                    <tr
                      key={deletionReq.id}
                      className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {deletionReq.user_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">{deletionReq.user_email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(deletionReq.status)}`}>
                          {deletionReq.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(deletionReq.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {deletionReq.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleProcessDeletion(deletionReq.id, 'approved')}
                                className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Odobri
                              </button>
                              <button
                                onClick={() => handleProcessDeletion(deletionReq.id, 'rejected')}
                                className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Odbij
                              </button>
                            </>
                          )}
                          {deletionReq.status === 'approved' && (
                            <button
                              onClick={() => handleProcessDeletion(deletionReq.id, 'completed')}
                              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Završi Brisanje
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper component with error boundary
export default function SecurityManagement() {
  try {
    return <SecurityManagementContent />;
  } catch (error: any) {
    console.error('🔒 Error in SecurityManagement:', error);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FiShield className="text-primary-600 dark:text-primary-400" />
            Sigurnost i GDPR
          </h1>
        </div>
        <div className="card p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-3">
            <FiAlertTriangle className="text-red-600 dark:text-red-400 mt-0.5" size={20} />
            <div>
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Greška</h3>
              <p className="text-sm text-red-700 dark:text-red-300">
                Došlo je do greške pri učitavanju modula sigurnosti. Molimo osvežite stranicu.
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">{error?.message || 'Nepoznata greška'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
}


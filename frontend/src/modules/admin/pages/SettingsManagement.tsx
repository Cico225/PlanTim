import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  FiSettings,
  FiSave,
  FiRefreshCw,
  FiMail,
  FiShield,
  FiGlobe,
  FiLock,
  FiDatabase,
  FiBell,
  FiUser,
} from 'react-icons/fi';
import { apiService } from '@/services/api';

interface Setting {
  id?: number;
  key: string;
  value: string;
  type?: string;
  description?: string;
  group?: string;
  created_at?: string;
  updated_at?: string;
}

interface SettingsGroup {
  name: string;
  icon: any;
  color: string;
  settings: Setting[];
}

export default function SettingsManagement() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [originalSettings, setOriginalSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await apiService.get<Setting[]>('/admin/settings');
      
      // If no settings exist, initialize with default settings
      if (!data || data.length === 0) {
        const defaultSettings = getDefaultSettings();
        console.log('📝 No settings in DB, using defaults:', defaultSettings.length);
        setSettings(defaultSettings);
        setOriginalSettings(JSON.parse(JSON.stringify(defaultSettings)));
        
        // Set active tab to first group
        const initialGroups = groupedSettingsFromList(defaultSettings);
        if (initialGroups.length > 0) {
          const groupKeyMap: Record<string, string> = {
            'Opšte': 'general',
            'Email': 'email',
            'Sigurnost': 'security',
            'Izgled': 'appearance',
            'Obavještenja': 'notifications',
          };
          const firstGroupKey = groupKeyMap[initialGroups[0].name] || initialGroups[0].name.toLowerCase();
          setActiveTab(firstGroupKey);
        }
      } else {
        // Merge database settings with default settings to ensure all fields are present
        const defaultSettings = getDefaultSettings();
        const settingsMap = new Map<string, Setting>();
        
        // First, add all default settings
        defaultSettings.forEach(setting => {
          settingsMap.set(setting.key, setting);
        });
        
        // Then, override with database settings (preserving type, description, group if available)
        data.forEach((dbSetting: any) => {
          const existing = settingsMap.get(dbSetting.key);
          if (existing) {
            // Merge: use DB value, but keep default type, description, group if not in DB
            settingsMap.set(dbSetting.key, {
              ...existing,
              id: dbSetting.id,
              value: dbSetting.value !== null && dbSetting.value !== undefined ? String(dbSetting.value) : existing.value,
              type: dbSetting.type || existing.type || 'string',
              description: dbSetting.description || existing.description || dbSetting.key,
              group: (dbSetting.group && dbSetting.group.trim()) || existing.group || 'general',
              created_at: dbSetting.created_at,
              updated_at: dbSetting.updated_at,
            });
          } else {
            // Add new setting from database
            settingsMap.set(dbSetting.key, {
              key: dbSetting.key,
              value: dbSetting.value !== null && dbSetting.value !== undefined ? String(dbSetting.value) : '',
              type: dbSetting.type || 'string',
              description: dbSetting.description || dbSetting.key,
              group: (dbSetting.group && dbSetting.group.trim()) || 'general',
              id: dbSetting.id,
              created_at: dbSetting.created_at,
              updated_at: dbSetting.updated_at,
            });
          }
        });
        
        const mergedSettings = Array.from(settingsMap.values());
        console.log('✅ Merged settings:', mergedSettings);
        setSettings(mergedSettings);
        setOriginalSettings(JSON.parse(JSON.stringify(mergedSettings)));
        
        // Set active tab to first group
        const allGroups = groupedSettingsFromList(mergedSettings);
        if (allGroups.length > 0 && !allGroups.some(g => g.name.toLowerCase() === activeTab)) {
          setActiveTab(allGroups[0].name.toLowerCase());
        }
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      toast.error('Greška pri učitavanju postavki');
      // Initialize with defaults on error
      const defaultSettings = getDefaultSettings();
      setSettings(defaultSettings);
      setOriginalSettings(JSON.parse(JSON.stringify(defaultSettings)));
    } finally {
      setLoading(false);
    }
  };

  const getDefaultSettings = (): Setting[] => {
    return [
      // General Settings
      { key: 'app_name', value: 'PlanTim', type: 'string', description: 'Naziv aplikacije', group: 'general' },
      { key: 'app_url', value: 'http://localhost:5173', type: 'string', description: 'URL aplikacije', group: 'general' },
      { key: 'timezone', value: 'Europe/Sarajevo', type: 'string', description: 'Vremenska zona', group: 'general' },
      { key: 'locale', value: 'bs', type: 'string', description: 'Podrazumevani jezik', group: 'general' },
      { key: 'date_format', value: 'd.m.Y', type: 'string', description: 'Format datuma', group: 'general' },
      { key: 'time_format', value: 'H:i', type: 'string', description: 'Format vrijemena', group: 'general' },
      
      // Email Settings
      { key: 'mail_from_address', value: 'noreply@plantim.local', type: 'string', description: 'Email adresa pošiljatelja', group: 'email' },
      { key: 'mail_from_name', value: 'PlanTim', type: 'string', description: 'Ime pošiljatelja', group: 'email' },
      { key: 'mail_driver', value: 'smtp', type: 'string', description: 'Email driver', group: 'email' },
      { key: 'mail_host', value: 'smtp.mailtrap.io', type: 'string', description: 'SMTP server', group: 'email' },
      { key: 'mail_port', value: '2525', type: 'integer', description: 'SMTP port', group: 'email' },
      { key: 'mail_username', value: '', type: 'string', description: 'SMTP korisničko ime', group: 'email' },
      { key: 'mail_password', value: '', type: 'string', description: 'SMTP lozinka', group: 'email' },
      { key: 'mail_encryption', value: 'tls', type: 'string', description: 'SMTP enkripcija', group: 'email' },
      
      // Security Settings
      { key: 'password_min_length', value: '8', type: 'integer', description: 'Minimalna dužina lozinke', group: 'security' },
      { key: 'password_require_uppercase', value: 'true', type: 'boolean', description: 'Zahtevaj velika slova', group: 'security' },
      { key: 'password_require_lowercase', value: 'true', type: 'boolean', description: 'Zahtevaj mala slova', group: 'security' },
      { key: 'password_require_numbers', value: 'true', type: 'boolean', description: 'Zahtevaj brojeve', group: 'security' },
      { key: 'password_require_symbols', value: 'false', type: 'boolean', description: 'Zahtevaj simbole', group: 'security' },
      { key: 'session_lifetime', value: '120', type: 'integer', description: 'Trajanje sesije (minuti)', group: 'security' },
      { key: 'max_login_attempts', value: '5', type: 'integer', description: 'Maksimalan broj pokušaja prijave', group: 'security' },
      { key: 'lockout_duration', value: '15', type: 'integer', description: 'Trajanje blokade (minuti)', group: 'security' },
      
      // Appearance Settings
      { key: 'default_theme', value: 'light', type: 'string', description: 'Podrazumevana tema', group: 'appearance' },
      { key: 'logo_url', value: '', type: 'string', description: 'URL loga', group: 'appearance' },
      { key: 'favicon_url', value: '', type: 'string', description: 'URL favicona', group: 'appearance' },
      { key: 'primary_color', value: '#3B82F6', type: 'string', description: 'Primarna boja', group: 'appearance' },
      
      // Notification Settings
      { key: 'notifications_enabled', value: 'true', type: 'boolean', description: 'Omogući notifikacije', group: 'notifications' },
      { key: 'email_notifications_enabled', value: 'true', type: 'boolean', description: 'Email notifikacije', group: 'notifications' },
      { key: 'push_notifications_enabled', value: 'false', type: 'boolean', description: 'Push notifikacije', group: 'notifications' },
      { key: 'notification_sound_enabled', value: 'true', type: 'boolean', description: 'Zvuk notifikacija', group: 'notifications' },
    ];
  };

  const groupedSettingsFromList = (settingsList: Setting[]): SettingsGroup[] => {
    const groups: Record<string, SettingsGroup> = {
      general: {
        name: 'Opšte',
        icon: FiSettings,
        color: 'gray',
        settings: [],
      },
      email: {
        name: 'Email',
        icon: FiMail,
        color: 'blue',
        settings: [],
      },
      security: {
        name: 'Sigurnost',
        icon: FiShield,
        color: 'red',
        settings: [],
      },
      appearance: {
        name: 'Izgled',
        icon: FiGlobe,
        color: 'purple',
        settings: [],
      },
      notifications: {
        name: 'Obavještenja',
        icon: FiBell,
        color: 'green',
        settings: [],
      },
    };

    settingsList.forEach(setting => {
      const groupKey = (setting.group && setting.group.trim()) || 'general';
      if (!groups[groupKey]) {
        groups[groupKey] = {
          name: groupKey.charAt(0).toUpperCase() + groupKey.slice(1),
          icon: FiSettings,
          color: 'gray',
          settings: [],
        };
      }
      groups[groupKey].settings.push(setting);
    });

    // Always return all predefined groups to ensure all tabs are visible
    // This ensures users can see all available setting categories
    return Object.values(groups);
  };

  const groupedSettings = (): SettingsGroup[] => {
    return groupedSettingsFromList(settings);
  };

  const handleSettingChange = (key: string, value: string) => {
    setSettings(prev =>
      prev.map(setting =>
        setting.key === key ? { ...setting, value } : setting
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Prepare settings array with full structure (including type, description, group)
      const settingsArray = settings.map(setting => ({
        key: setting.key,
        value: setting.value || '',
        type: setting.type || 'string',
        description: setting.description || setting.key,
        group: setting.group || 'general',
      }));

      await apiService.put('/admin/settings', { settings: settingsArray });
      toast.success('Postavke uspješno sačuvane');
      
      // Refresh settings after save to get latest from backend
      await fetchSettings();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Greška pri čuvanju postavki';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Da li ste sigurni da želite da resetujete sve izmene?')) {
      setSettings(JSON.parse(JSON.stringify(originalSettings)));
      toast.success('Izmene resetovane');
    }
  };

  const hasChanges = () => {
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  };

  // Memoize groups to prevent unnecessary recalculations
  const groups = useMemo(() => groupedSettings(), [settings]);

  // Set active tab to first group if current tab doesn't exist (only when groups change)
  useEffect(() => {
    if (groups.length > 0) {
      // Map group names to keys
      const groupKeyMap: Record<string, string> = {
        'opšte': 'general',
        'general': 'general',
        'email': 'email',
        'sigurnost': 'security',
        'security': 'security',
        'izgled': 'appearance',
        'appearance': 'appearance',
        'obavještenja': 'notifications',
        'notifications': 'notifications',
      };
      
      // Check if current activeTab matches any group
      const normalizedActiveTab = activeTab.toLowerCase();
      const matchingGroup = groups.find(g => {
        const groupName = g.name.toLowerCase();
        return groupKeyMap[groupName] === normalizedActiveTab || 
               groupName === normalizedActiveTab ||
               (normalizedActiveTab === 'general' && groupName === 'opšte') ||
               (normalizedActiveTab === 'opšte' && groupName === 'general');
      });
      
      if (!matchingGroup && groups.length > 0) {
        // Set to first group's key
        const firstGroupKey = groupKeyMap[groups[0].name.toLowerCase()] || groups[0].name.toLowerCase();
        setActiveTab(firstGroupKey);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]); // Only run when groups change, not when activeTab changes

  // Debug: Log groups to console (only when settings/groups actually change)
  useEffect(() => {
    console.log('📋 Settings groups:', groups.map(g => ({ name: g.name, count: g.settings.length })));
    console.log('📋 Active tab:', activeTab);
    console.log('📋 Total settings count:', settings.length);
    console.log('📋 Groups count:', groups.length);
  }, [groups, settings.length]); // Removed activeTab from dependencies to prevent logs on tab change

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiSettings className="text-gray-600 dark:text-gray-400" />
            Sistemske Postavke
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Konfigurisanje sistema i modula
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges() && (
            <button
              onClick={handleReset}
              className="btn-secondary flex items-center gap-2"
              disabled={saving}
            >
              <FiRefreshCw size={18} />
              Resetuj
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges()}
            className="btn-primary flex items-center gap-2"
          >
            <FiSave size={18} />
            {saving ? 'Čuvanje...' : 'Sačuvaj Izmene'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Učitavanje postavki...</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="card p-2">
            <div className="flex flex-wrap gap-2">
              {groups.map((group) => {
                const Icon = group.icon;
                return (
                  <button
                    key={group.name}
                    onClick={() => {
                      // Map group name to consistent key
                      const groupKeyMap: Record<string, string> = {
                        'Opšte': 'general',
                        'Email': 'email',
                        'Sigurnost': 'security',
                        'Izgled': 'appearance',
                        'Obavještenja': 'notifications',
                      };
                      const groupKey = groupKeyMap[group.name] || group.name.toLowerCase();
                      console.log('🔄 Switching tab to:', groupKey, 'from:', activeTab);
                      setActiveTab(groupKey);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      (() => {
                        const groupKeyMap: Record<string, string> = {
                          'Opšte': 'general',
                          'Email': 'email',
                          'Sigurnost': 'security',
                          'Izgled': 'appearance',
                          'Obavještenja': 'notifications',
                        };
                        const groupKey = groupKeyMap[group.name] || group.name.toLowerCase();
                        return activeTab === groupKey || activeTab === group.name.toLowerCase();
                      })()
                        ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700'
                    }`}
                  >
                    <Icon size={18} />
                    {group.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settings Form */}
          {groups
            .filter(group => {
              // Map group name to key for matching
              const groupKeyMap: Record<string, string> = {
                'Opšte': 'general',
                'general': 'general',
                'Email': 'email',
                'Sigurnost': 'security',
                'Izgled': 'appearance',
                'Obavještenja': 'notifications',
              };
              const groupKey = groupKeyMap[group.name] || group.name.toLowerCase();
              const normalizedActiveTab = activeTab.toLowerCase();
              const isMatch = groupKey === normalizedActiveTab || 
                             group.name.toLowerCase() === normalizedActiveTab ||
                             (normalizedActiveTab === 'general' && group.name === 'Opšte') ||
                             (normalizedActiveTab === 'opšte' && group.name === 'Opšte');
              console.log(`🔍 Filtering group "${group.name}" (key: ${groupKey}) vs activeTab "${normalizedActiveTab}": ${isMatch}`);
              return isMatch;
            })
            .map((group) => (
              <div key={group.name} className="space-y-4">
                {group.settings.length === 0 ? (
                  <div className="card p-8 text-center">
                    <FiSettings className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-600 dark:text-gray-400">
                      Nema postavki u ovoj grupi.
                    </p>
                  </div>
                ) : (
                  <>
                    {group.settings.map((setting) => (
                      <div key={setting.key} className="card p-6">
                        <div className="space-y-3">
                          <div>
                            <label className="label mb-1">
                              {setting.description || setting.key}
                            </label>
                            {setting.type === 'boolean' ? (
                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={setting.value === 'true'}
                                  onChange={(e) =>
                                    handleSettingChange(setting.key, e.target.checked ? 'true' : 'false')
                                  }
                                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {setting.value === 'true' ? 'Omogućeno' : 'Onemogućeno'}
                                </span>
                              </label>
                            ) : setting.type === 'integer' ? (
                              <input
                                type="number"
                                value={setting.value}
                                onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                                className="input"
                              />
                            ) : setting.key.toLowerCase().includes('password') || setting.key.toLowerCase().includes('secret') ? (
                              <input
                                type="password"
                                value={setting.value}
                                onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                                className="input"
                                placeholder={`Unesite ${setting.description || setting.key}`}
                              />
                            ) : (
                              <input
                                type="text"
                                value={setting.value}
                                onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                                className="input"
                                placeholder={`Unesite ${setting.description || setting.key}`}
                              />
                            )}
                          </div>
                          {setting.key !== setting.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Key: <code className="bg-gray-100 dark:bg-dark-700 px-1 rounded">{setting.key}</code>
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            ))}
        </>
      )}

      {/* Info Banner */}
      <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <FiSettings className="text-blue-600 dark:text-blue-400 mt-0.5" size={20} />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
              Napomena o Postavkama
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-400">
              Promene postavki se primenjuju odmah nakon čuvanja. Neke postavke mogu zahtevati restart aplikacije
              ili servera da bi bile potpuno aktivne.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


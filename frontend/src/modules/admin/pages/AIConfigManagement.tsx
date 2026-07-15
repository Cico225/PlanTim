import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  FiCpu,
  FiSettings,
  FiSave,
  FiRefreshCw,
  FiCheckCircle,
  FiX,
  FiAlertTriangle,
  FiKey,
  FiMessageSquare,
  FiFileText,
  FiSearch,
  FiUsers,
  FiActivity,
  FiPlay,
  FiEye,
  FiEyeOff,
} from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { apiService } from '@/services/api';

interface AISetting {
  value: any;
  type: string;
  description: string;
}

interface AIConfig {
  settings: Record<string, AISetting>;
  stats: AIStats;
  available_models: Record<string, string>;
  api_key_configured: boolean;
  organization_prompt?: {
    content: string | null;
    relative_path: string;
    file_readable: boolean;
  };
}

interface AIStats {
  total_chats: number;
  total_messages: number;
  total_documents: number;
  active_users: number;
  messages_today: number;
  messages_this_week: number;
  messages_this_month?: number;
  most_used_model?: {
    model: string;
    count: number;
  };
  top_users?: Array<{
    name: string;
    email: string;
    chat_count: number;
  }>;
}

interface AIChatLog {
  id: number;
  user_id: number;
  title: string | null;
  model: string;
  created_at: string;
  updated_at: string;
  user_name: string | null;
  user_email: string | null;
  message_count: number;
}

export default function AIConfigManagement() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('settings');

  // Config
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [showApiKey, setShowApiKey] = useState(false);

  // Stats
  const [stats, setStats] = useState<AIStats | null>(null);

  // Chat Logs
  const [chatLogs, setChatLogs] = useState<AIChatLog[]>([]);
  const [chatLogsLoading, setChatLogsLoading] = useState(false);

  useEffect(() => {
    fetchAIConfig();
    fetchAIStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchChatLogs();
    }
  }, [activeTab]);

  const fetchAIConfig = async () => {
    setLoading(true);
    try {
      const data = await apiService.get<AIConfig>('/admin/ai/config');
      setConfig(data);
      // Extract settings values
      const settingsValues: Record<string, any> = {};
      Object.keys(data.settings || {}).forEach((key) => {
        settingsValues[key] = data.settings[key].value;
      });
      setSettings(settingsValues);
    } catch (error: any) {
      console.error('Error fetching AI config:', error);
      toast.error('Greška pri učitavanju AI konfiguracije');
      // Set default config
      setConfig({
        settings: {},
        stats: {
          total_chats: 0,
          total_messages: 0,
          total_documents: 0,
          active_users: 0,
          messages_today: 0,
          messages_this_week: 0,
        },
        available_models: {},
        api_key_configured: false,
        organization_prompt: { content: null, relative_path: '', file_readable: false },
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAIStats = async () => {
    try {
      const data = await apiService.get<AIStats>('/admin/ai/stats');
      setStats(data);
    } catch (error: any) {
      console.error('Error fetching AI stats:', error);
    }
  };

  const fetchChatLogs = async () => {
    setChatLogsLoading(true);
    try {
      const response = await apiService.get<{ data: AIChatLog[] }>('/admin/ai/chat-logs');
      if (Array.isArray(response)) {
        setChatLogs(response);
      } else if (response.data) {
        setChatLogs(response.data);
      } else {
        setChatLogs([]);
      }
    } catch (error: any) {
      console.error('Error fetching chat logs:', error);
      setChatLogs([]);
    } finally {
      setChatLogsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await apiService.put('/admin/ai/config', settings);
      toast.success('AI konfiguracija je uspješno sačuvana');
      await fetchAIConfig();
    } catch (error: any) {
      console.error('Error saving AI config:', error);
      toast.error('Greška pri čuvanju AI konfiguracije');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const model = settings.default_model || 'gemini-1.5-flash';
      const response = await apiService.post<{
        success: boolean;
        message?: string;
        error?: string | null;
        hint?: string | null;
        model?: string;
      }>('/admin/ai/test-connection', { model });
      if (response.success) {
        toast.success(response.message || 'AI konekcija uspešna');
      } else {
        const detail = response.error ? `${response.message || 'Neuspjeh'}: ${response.error}` : response.message;
        const base = detail || 'AI konekcija neuspešna';
        const withHint =
          response.hint && typeof response.hint === 'string' && !base.includes(response.hint)
            ? `${base}\n\n${response.hint}`
            : base;
        toast.error(withHint);
      }
    } catch (error: any) {
      console.error('Error testing AI connection:', error);
      const data = error.response?.data;
      const hint = data?.hint;
      const detail = data?.error || data?.message;
      const msgBase = detail || error.message || 'Greška pri testiranju konekcije';
      toast.error(
        hint && typeof hint === 'string' && !msgBase.includes(hint)
          ? `${msgBase}\n\n${hint}`
          : msgBase
      );
    } finally {
      setTesting(false);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FiCpu className="text-primary-600 dark:text-primary-400" />
            AI Konfiguracija
          </h1>
        </div>
        <div className="card p-12 text-center">
          <FiRefreshCw className="animate-spin mx-auto text-primary-600 dark:text-primary-400 mb-4" size={48} />
          <p className="text-gray-600 dark:text-gray-400">Učitavanje AI konfiguracije...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <FiCpu className="text-primary-600 dark:text-primary-400" />
          AI Konfiguracija
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Upravljanje AI postavkama, modelima i konfiguracijama
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FiSettings className="inline mr-2" />
            Postavke
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stats'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FiActivity className="inline mr-2" />
            Statistike
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'logs'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <FiMessageSquare className="inline mr-2" />
            Chat Logovi
          </button>
        </nav>
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* API Key Status */}
          <div className={`card p-4 ${config?.api_key_configured ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {config?.api_key_configured ? (
                  <FiCheckCircle className="text-green-600 dark:text-green-400" size={24} />
                ) : (
                  <FiAlertTriangle className="text-yellow-600 dark:text-yellow-400" size={24} />
                )}
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    Google Gemini API ključ: {config?.api_key_configured ? 'Konfigurisan' : 'Nije konfigurisan'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {config?.api_key_configured
                      ? 'API ključ je podešen i AI funkcionalnosti su dostupne'
                      : 'Dodajte Gemini API ključ iz Google AI Studio u .env (GEMINI_API_KEY) ili u postavkama'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="btn-secondary flex items-center gap-2"
              >
                {testing ? (
                  <>
                    <FiRefreshCw className="animate-spin" />
                    Testiranje...
                  </>
                ) : (
                  <>
                    <FiPlay />
                    Testiraj Konekciju
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Učitan organizacijski prompt (read-only) */}
          <div className="card p-6 border border-gray-200 dark:border-dark-600">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1 flex items-center gap-2">
              <FiFileText className="text-primary-600 dark:text-primary-400" />
              Organizacijski prompt (Planika) — iz datoteke
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Ovo je tačan tekst koji Edel dobija iz{' '}
              <code className="bg-gray-100 dark:bg-dark-700 px-1 rounded text-[11px]">
                {config?.organization_prompt?.relative_path || 'resources/prompts/edel_planika_organization.txt'}
              </code>
              . Izmjene rade se u toj datoteci na serveru ili u repozitoriju, zatim deploy / osvježavanje.
            </p>
            {!config?.organization_prompt?.file_readable ? (
              <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                Datoteka nije dostupna za čitanje na serveru ili ne postoji.
              </p>
            ) : (
              <textarea
                readOnly
                value={config?.organization_prompt?.content || ''}
                className="w-full rounded-lg border border-gray-200 dark:border-dark-600 bg-gray-50 dark:bg-dark-900 text-gray-800 dark:text-gray-200 text-sm font-mono leading-relaxed p-3 min-h-[220px] max-h-[480px] resize-y outline-none"
                spellCheck={false}
                aria-label="Organizacijski prompt Planika"
              />
            )}
          </div>

          {/* AI Settings */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiSettings />
              AI Postavke
            </h2>

            <div className="space-y-6">
              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gemini API ključ (Google AI)
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={settings.gemini_api_key || ''}
                    onChange={(e) => setSettings({ ...settings, gemini_api_key: e.target.value })}
                    placeholder="AIza..."
                    className="input pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showApiKey ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  API ključ se čuva u bazi podataka. Za produkciju, koristite .env fajl.
                </p>
              </div>

              {/* Default Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Podrazumevani Model
                </label>
                <select
                  value={settings.default_model || 'gemini-1.5-flash'}
                  onChange={(e) => setSettings({ ...settings, default_model: e.target.value })}
                  className="input"
                >
                  {config?.available_models &&
                    Object.entries(config.available_models).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                </select>
              </div>

              {/* Max Tokens */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maksimalan Broj Tokena
                </label>
                <input
                  type="number"
                  value={settings.max_tokens || 1000}
                  onChange={(e) => setSettings({ ...settings, max_tokens: parseInt(e.target.value) })}
                  className="input"
                  min="100"
                  max="4000"
                />
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Maksimalan broj tokena u AI odgovoru (100-4000)
                </p>
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Temperature
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.temperature || 0.7}
                  onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                  className="input"
                  min="0"
                  max="2"
                />
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Temperature kontroliše kreativnost odgovora (0-2). Niža vrednost = precizniji odgovori.
                </p>
              </div>

              {/* System Prompt — glavni Planika kontekst je u resources/prompts/edel_planika_organization.txt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dodatni sistemski prompt (baza)
                </label>
                <textarea
                  value={settings.system_prompt || ''}
                  onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
                  className="input"
                  rows={6}
                  placeholder="Kratke dodatne upute (npr. konkretan HR e-mail, link na intranet)…"
                  maxLength={8000}
                />
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Glavni organizacijski tekst za Planiku učitava se iz datoteke na serveru:{' '}
                  <code className="text-xs bg-gray-100 dark:bg-dark-700 px-1 rounded">
                    resources/prompts/edel_planika_organization.txt
                  </code>{' '}
                  (uredite je u kodu ili na serveru). Ovdje možete dodati do 8000 znakova kratkih dopuna koje idu na kraj
                  sistema prompta.
                </p>
              </div>

              {/* Feature Toggles */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Funkcionalnosti</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.ai_enabled !== false}
                      onChange={(e) => setSettings({ ...settings, ai_enabled: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Omogući AI funkcionalnosti</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.ai_chat_enabled !== false}
                      onChange={(e) => setSettings({ ...settings, ai_chat_enabled: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Omogući AI Chat</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.document_generation_enabled !== false}
                      onChange={(e) => setSettings({ ...settings, document_generation_enabled: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Omogući Generisanje Dokumenata</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.semantic_search_enabled !== false}
                      onChange={(e) => setSettings({ ...settings, semantic_search_enabled: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Omogući Semantic Search</span>
                  </label>
                </div>
              </div>

              {/* Rate Limits */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Rate Limits</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Limit po Korisniku
                    </label>
                    <input
                      type="number"
                      value={settings.rate_limit_per_user || 100}
                      onChange={(e) => setSettings({ ...settings, rate_limit_per_user: parseInt(e.target.value) })}
                      className="input"
                      min="1"
                      max="1000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Limit po Satu
                    </label>
                    <input
                      type="number"
                      value={settings.rate_limit_per_hour || 1000}
                      onChange={(e) => setSettings({ ...settings, rate_limit_per_hour: parseInt(e.target.value) })}
                      className="input"
                      min="1"
                      max="10000"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
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
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="card p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Ukupno Chatova</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total_chats}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Ukupno Poruka</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total_messages}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Generisanih Dokumenata</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total_documents}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Aktivnih Korisnika</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.active_users}</p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Poruka Danas</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {stats.messages_today}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">Poruka Ove Nedelje</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                  {stats.messages_this_week}
                </p>
              </div>
              {stats.messages_this_month !== undefined && (
                <div className="card p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Poruka Ovog Meseca</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {stats.messages_this_month}
                  </p>
                </div>
              )}
              {stats.most_used_model && (
                <div className="card p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Najkorišćeniji Model</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                    {stats.most_used_model.model}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {stats.most_used_model.count} chatova
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Top Users */}
          {stats?.top_users && stats.top_users.length > 0 && (
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FiUsers />
                Najaktivniji Korisnici
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Korisnik
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Broj Chatova
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.top_users.map((user, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">{user.email}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {user.chat_count}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chat Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FiMessageSquare />
              AI Chat Logovi
            </h2>

            {chatLogsLoading ? (
              <div className="text-center py-8">
                <FiRefreshCw className="animate-spin mx-auto text-primary-600 dark:text-primary-400" size={32} />
                <p className="text-gray-600 dark:text-gray-400 mt-2">Učitavanje...</p>
              </div>
            ) : chatLogs.length === 0 ? (
              <div className="text-center py-12">
                <FiMessageSquare className="mx-auto text-gray-400" size={48} />
                <p className="text-gray-600 dark:text-gray-400 mt-4">Nema chat logova</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Korisnik
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Naslov
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Model
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Poruke
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Datum
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {chatLogs.map((chat) => (
                      <tr
                        key={chat.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{chat.user_name || 'N/A'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-500">{chat.user_email || 'N/A'}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {chat.title || 'Bez naslova'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                            {chat.model || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {chat.message_count || 0}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(chat.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


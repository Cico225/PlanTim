import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiMail,
  FiCalendar,
  FiCloud,
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiSend,
  FiPaperclip,
  FiFile,
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
} from 'react-icons/fi';
import { apiService } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

interface Office365Status {
  connected: boolean;
  connection: {
    email: string;
    last_sync_at: string;
    connected_at: string;
  } | null;
}

interface Document {
  id: number;
  name: string;
  original_name: string;
  mime_type: string;
  path: string;
}

export default function Office365Overview() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [status, setStatus] = useState<Office365Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  
  // Check if user is admin
  const isAdmin = user?.role?.toLowerCase() === 'admin' || 
                  user?.role?.toLowerCase() === 'super-admin' ||
                  (user as any)?.roles?.some((r: string) => r?.toLowerCase() === 'admin' || r?.toLowerCase() === 'super-admin');
  
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7242/ingest/c4a16070-a553-49bd-8411-12513436a0e0', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({location:'Office365Overview.tsx:49', message:'User and isAdmin check', data:{userId:user?.id, userRole:user?.role, userRoles:(user as any)?.roles, isAdmin}, timestamp:Date.now(), sessionId:'debug-session', runId:'run1', hypothesisId:'A'})}).catch(()=>{});
  }, [user, isAdmin]);
  // #endregion
  
  // Email form state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailForm, setEmailForm] = useState({
    to: [] as string[],
    toInput: '',
    subject: '',
    body: '',
    attachments: [] as Array<{ document_id: number; name: string }>,
  });
  
  // Sections state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    email: false,
    calendar: false,
    onedrive: false,
    sharepoint: false,
    teams: false,
  });
  
  // Data state
  const [calendars, setCalendars] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [onedriveFiles, setOnedriveFiles] = useState<any[]>([]);
  const [sharepointSites, setSharepointSites] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Admin state
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [allConnections, setAllConnections] = useState<any[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);

  const fetchUsers = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c4a16070-a553-49bd-8411-12513436a0e0', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({location:'Office365Overview.tsx:84', message:'fetchUsers entry', data:{isAdmin}, timestamp:Date.now(), sessionId:'debug-session', runId:'run1', hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!isAdmin) return; // Only fetch if admin
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c4a16070-a553-49bd-8411-12513436a0e0', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({location:'Office365Overview.tsx:87', message:'fetchUsers API call', data:{url:'/admin/users'}, timestamp:Date.now(), sessionId:'debug-session', runId:'run1', hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    try {
      const data = await apiService.get<any>('/admin/users');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c4a16070-a553-49bd-8411-12513436a0e0', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({location:'Office365Overview.tsx:89', message:'fetchUsers success', data:{usersCount:Array.isArray(data?.data)?data.data.length:0}, timestamp:Date.now(), sessionId:'debug-session', runId:'run1', hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setUsers(Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []));
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c4a16070-a553-49bd-8411-12513436a0e0', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({location:'Office365Overview.tsx:93', message:'fetchUsers error', data:{status:error?.response?.status, message:error?.response?.data?.message}, timestamp:Date.now(), sessionId:'debug-session', runId:'run1', hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      // Ignore 403 errors silently - user is not admin
      if (error?.response?.status !== 403) {
        console.error('Error fetching users:', error);
      }
    }
  };

  const fetchAllConnections = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c4a16070-a553-49bd-8411-12513436a0e0', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({location:'Office365Overview.tsx:97', message:'fetchAllConnections entry', data:{isAdmin}, timestamp:Date.now(), sessionId:'debug-session', runId:'run1', hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    if (!isAdmin) return; // Only fetch if admin
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c4a16070-a553-49bd-8411-12513436a0e0', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({location:'Office365Overview.tsx:101', message:'fetchAllConnections API call', data:{url:'/admin/office365/all-connections'}, timestamp:Date.now(), sessionId:'debug-session', runId:'run1', hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    try {
      setLoadingConnections(true);
      const data = await apiService.get<any>('/admin/office365/all-connections');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c4a16070-a553-49bd-8411-12513436a0e0', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({location:'Office365Overview.tsx:104', message:'fetchAllConnections success', data:{connectionsCount:data?.connections?.length||0}, timestamp:Date.now(), sessionId:'debug-session', runId:'run1', hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setAllConnections(data?.connections || []);
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c4a16070-a553-49bd-8411-12513436a0e0', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({location:'Office365Overview.tsx:107', message:'fetchAllConnections error', data:{status:error?.response?.status, message:error?.response?.data?.message}, timestamp:Date.now(), sessionId:'debug-session', runId:'run1', hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      // Ignore 403 errors silently - user is not admin
      if (error?.response?.status !== 403) {
        console.error('Error fetching all connections:', error);
      }
    } finally {
      setLoadingConnections(false);
    }
  };

  const fetchStatus = async (userId?: number) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c4a16070-a553-49bd-8411-12513436a0e0', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({location:'Office365Overview.tsx:113', message:'fetchStatus entry', data:{isAdmin, userId}, timestamp:Date.now(), sessionId:'debug-session', runId:'run1', hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    try {
      setLoading(true);
      // Only include user_id if admin and userId is provided
      const url = (isAdmin && userId) 
        ? `/office365/status?user_id=${userId}` 
        : '/office365/status';
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c4a16070-a553-49bd-8411-12513436a0e0', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({location:'Office365Overview.tsx:120', message:'fetchStatus API call', data:{url}, timestamp:Date.now(), sessionId:'debug-session', runId:'run1', hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const data = await apiService.get<Office365Status>(url);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c4a16070-a553-49bd-8411-12513436a0e0', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({location:'Office365Overview.tsx:122', message:'fetchStatus success', data:{connected:data?.connected}, timestamp:Date.now(), sessionId:'debug-session', runId:'run1', hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setStatus(data);
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c4a16070-a553-49bd-8411-12513436a0e0', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({location:'Office365Overview.tsx:123', message:'fetchStatus error', data:{status:error?.response?.status, message:error?.response?.data?.message}, timestamp:Date.now(), sessionId:'debug-session', runId:'run1', hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      console.error('Error fetching Office365 status:', error);
      // Don't trigger logout on 403 - just set status to disconnected
      if (error?.response?.status === 403 || error?.response?.status === 401) {
        setStatus({ connected: false, connection: null });
        // Don't show error toast for permission errors on initial load
        if (status !== null) {
          toast.error('Nemate dozvolu za ovu akciju');
        }
      } else {
        // Set status to null if error, but don't show toast on initial load
        if (status === null) {
          setStatus({ connected: false, connection: null });
        } else {
          toast.error(error.response?.data?.message || 'Greška pri učitavanju statusa');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c4a16070-a553-49bd-8411-12513436a0e0', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({location:'Office365Overview.tsx:144', message:'fetchDocuments API call', data:{url:'/dms/documents'}, timestamp:Date.now(), sessionId:'debug-session', runId:'run1', hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    try {
      const data = await apiService.get<any>('/dms/documents');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c4a16070-a553-49bd-8411-12513436a0e0', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({location:'Office365Overview.tsx:147', message:'fetchDocuments success', data:{documentsCount:Array.isArray(data?.data)?data.data.length:0}, timestamp:Date.now(), sessionId:'debug-session', runId:'run1', hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      setDocuments(Array.isArray(data?.data) ? data.data : []);
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/c4a16070-a553-49bd-8411-12513436a0e0', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({location:'Office365Overview.tsx:149', message:'fetchDocuments error', data:{status:error?.response?.status, message:error?.response?.data?.message}, timestamp:Date.now(), sessionId:'debug-session', runId:'run1', hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      console.error('Error fetching documents:', error);
    }
  };

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c4a16070-a553-49bd-8411-12513436a0e0', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({location:'Office365Overview.tsx:153', message:'useEffect entry', data:{isAdmin, selectedUserId, userLoaded:!!user}, timestamp:Date.now(), sessionId:'debug-session', runId:'run1', hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    // Only fetch status for selected user if admin, otherwise fetch own status
    if (isAdmin && selectedUserId) {
      fetchStatus(selectedUserId);
    } else {
      fetchStatus();
    }
    fetchDocuments();
    if (isAdmin) {
      fetchUsers();
      fetchAllConnections();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, isAdmin]);

  const handleConnect = async (userId?: number) => {
    if (!isAdmin) {
      toast.error('Samo administratori mogu povezivati Office 365');
      return;
    }
    
    try {
      setConnecting(true);
      const url = userId 
        ? `/admin/office365/auth-url?user_id=${userId}` 
        : '/admin/office365/auth-url';
      const response = await apiService.get<{ auth_url: string }>(url);
      window.location.href = response.auth_url;
    } catch (error: any) {
      console.error('Error getting auth URL:', error);
      // Don't trigger logout on 403 - just show error
      if (error?.response?.status === 403) {
        toast.error('Nemate dozvolu za ovu akciju');
      } else {
        toast.error(error.response?.data?.message || 'Greška pri povezivanju');
      }
      setConnecting(false);
    }
  };

  const handleDisconnect = async (userId?: number) => {
    if (!isAdmin) {
      toast.error('Samo administratori mogu raskidati Office 365 integraciju');
      return;
    }
    
    if (!confirm('Da li ste sigurni da želite raskinuti Office 365 integraciju?')) {
      return;
    }

    try {
      const url = '/admin/office365/disconnect';
      const body = userId ? { user_id: userId } : {};
      await apiService.post(url, body);
      toast.success('Office 365 integracija raskinuta');
      
      // Refresh status and connections
      if (isAdmin && selectedUserId) {
        fetchStatus(selectedUserId);
      } else {
        fetchStatus();
      }
      if (isAdmin) {
        fetchAllConnections();
      }
    } catch (error: any) {
      console.error('Error disconnecting:', error);
      // Don't trigger logout on 403 - just show error
      if (error?.response?.status === 403) {
        toast.error('Nemate dozvolu za ovu akciju');
      } else {
        toast.error(error.response?.data?.message || 'Greška pri raskidanju veze');
      }
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));

    // Fetch data when section is expanded
    if (!expandedSections[section]) {
      if (section === 'calendar') {
        fetchCalendars();
      } else if (section === 'onedrive') {
        fetchOneDriveFiles();
      } else if (section === 'sharepoint') {
        fetchSharePointSites();
      } else if (section === 'teams') {
        fetchTeams();
      }
    }
  };

  const fetchCalendars = async () => {
    try {
      const data = await apiService.get<{ calendars: any[] }>('/office365/calendars');
      setCalendars(data.calendars || []);
      
      // Also fetch events for default calendar
      if (data.calendars && data.calendars.length > 0) {
        fetchCalendarEvents(data.calendars[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching calendars:', error);
      // Don't show error toast if user doesn't have connection
      if (error?.response?.status !== 403 && error?.response?.status !== 401) {
        toast.error('Greška pri učitavanju kalendara');
      }
    }
  };

  const fetchCalendarEvents = async (calendarId?: string) => {
    try {
      const params = calendarId ? `?calendar_id=${calendarId}` : '';
      const data = await apiService.get<{ events: any[] }>(`/office365/calendar-events${params}`);
      setCalendarEvents(data.events || []);
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);
      // Don't show error toast if user doesn't have connection
      if (error?.response?.status !== 403 && error?.response?.status !== 401) {
        toast.error('Greška pri učitavanju događaja');
      }
    }
  };

  const fetchOneDriveFiles = async () => {
    try {
      const data = await apiService.get<{ files: any[] }>('/office365/onedrive-files');
      setOnedriveFiles(data.files || []);
    } catch (error: any) {
      console.error('Error fetching OneDrive files:', error);
      // Don't show error toast if user doesn't have connection
      if (error?.response?.status !== 403 && error?.response?.status !== 401) {
        toast.error('Greška pri učitavanju OneDrive fajlova');
      }
    }
  };

  const fetchSharePointSites = async () => {
    try {
      const data = await apiService.get<{ sites: any[] }>('/office365/sharepoint-sites');
      setSharepointSites(data.sites || []);
    } catch (error: any) {
      console.error('Error fetching SharePoint sites:', error);
      // Don't show error toast if user doesn't have connection
      if (error?.response?.status !== 403 && error?.response?.status !== 401) {
        toast.error('Greška pri učitavanju SharePoint site-ova');
      }
    }
  };

  const fetchTeams = async () => {
    try {
      const data = await apiService.get<{ teams: any[] }>('/office365/teams');
      setTeams(data.teams || []);
    } catch (error: any) {
      console.error('Error fetching Teams:', error);
      // Don't show error toast if user doesn't have connection
      if (error?.response?.status !== 403 && error?.response?.status !== 401) {
        toast.error('Greška pri učitavanju Teams-a');
      }
    }
  };

  const handleAddEmailRecipient = () => {
    if (emailForm.toInput && emailForm.toInput.includes('@')) {
      setEmailForm({
        ...emailForm,
        to: [...emailForm.to, emailForm.toInput],
        toInput: '',
      });
    }
  };

  const handleRemoveEmailRecipient = (index: number) => {
    setEmailForm({
      ...emailForm,
      to: emailForm.to.filter((_, i) => i !== index),
    });
  };

  const handleAddAttachment = (document: Document) => {
    if (!emailForm.attachments.find((a) => a.document_id === document.id)) {
      setEmailForm({
        ...emailForm,
        attachments: [
          ...emailForm.attachments,
          { document_id: document.id, name: document.original_name || document.name },
        ],
      });
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setEmailForm({
      ...emailForm,
      attachments: emailForm.attachments.filter((_, i) => i !== index),
    });
  };

  const handleSendEmail = async () => {
    if (!emailForm.to.length) {
      toast.error('Dodajte barem jednog primaoca');
      return;
    }

    if (!emailForm.subject.trim()) {
      toast.error('Unesite naslov emaila');
      return;
    }

    if (!emailForm.body.trim()) {
      toast.error('Unesite sadržaj emaila');
      return;
    }

    try {
      setSendingEmail(true);
      await apiService.post('/office365/send-email', {
        to: emailForm.to,
        subject: emailForm.subject,
        body: emailForm.body,
        is_html: true,
        attachments: emailForm.attachments.map((a) => ({ document_id: a.document_id })),
      });
      
      toast.success('Email uspješno poslat');
      setShowEmailForm(false);
      setEmailForm({
        to: [],
        toInput: '',
        subject: '',
        body: '',
        attachments: [],
      });
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(error.response?.data?.message || 'Greška pri slanju emaila');
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Office 365 Integracija
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Povezivanje sa Microsoft Office 365 i upravljanje servisima
        </p>
      </div>

      {/* All Connections - Admin View */}
      {allConnections.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Sve Office 365 konekcije
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Korisnik</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Povezan</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Akcije</th>
                </tr>
              </thead>
              <tbody>
                {allConnections.map((conn) => (
                  <tr key={conn.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                      {conn.user_name || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {conn.email || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {conn.created_at ? new Date(conn.created_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleDisconnect(conn.user_id)}
                        className="text-red-600 dark:text-red-400 hover:underline text-sm"
                      >
                        Raskini
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Selection - Admin View */}
      {isAdmin && (
      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Povezivanje Office 365 za korisnika
        </h2>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Odaberi korisnika
            </label>
            <select
              value={selectedUserId || ''}
              onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">-- Odaberi korisnika --</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => handleConnect(selectedUserId || undefined)}
            disabled={connecting || !selectedUserId}
            className="btn-primary"
          >
            {connecting ? 'Povezivanje...' : 'Poveži Office 365'}
          </button>
        </div>
      </div>
      )}

      {/* Connection Status */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {status?.connected ? (
              <FiCheckCircle className="text-green-500" size={32} />
            ) : (
              <FiXCircle className="text-red-500" size={32} />
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedUserId 
                  ? `Status za odabranog korisnika: ${status?.connected ? 'Povezan' : 'Nije povezan'}`
                  : status?.connected ? 'Povezan' : 'Nije povezan'
                }
              </h2>
              {status?.connected && status.connection && (
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  <p>Email: {status.connection.email}</p>
                  <p>Povezan: {new Date(status.connection.connected_at).toLocaleDateString()}</p>
                  {status.connection.last_sync_at && (
                    <p>Poslednja sinhronizacija: {new Date(status.connection.last_sync_at).toLocaleDateString()}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status?.connected && selectedUserId && (
              <button
                onClick={() => handleDisconnect(selectedUserId)}
                className="btn-secondary"
              >
                Raskini vezu
              </button>
            )}
            <button
              onClick={() => fetchStatus(selectedUserId || undefined)}
              className="btn-secondary flex items-center gap-2"
            >
              <FiRefreshCw size={16} />
              Osveži
            </button>
          </div>
        </div>
      </div>

      {!status?.connected && (
        <div className="card p-6">
          <p className="text-gray-600 dark:text-gray-400">
            Povežite se sa Office 365 account-om da biste koristili Outlook email, kalendar, OneDrive, SharePoint i Teams integracije.
          </p>
        </div>
      )}

      {status?.connected && (
        <>
          {/* Email Section */}
          <div className="card p-6">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('email')}
            >
              <div className="flex items-center gap-3">
                <FiMail className="text-blue-600 dark:text-blue-400" size={24} />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Outlook Email
                </h2>
              </div>
              {expandedSections.email ? (
                <FiChevronUp size={20} className="text-gray-400" />
              ) : (
                <FiChevronDown size={20} className="text-gray-400" />
              )}
            </div>

            {expandedSections.email && (
              <div className="mt-6 space-y-4">
                <button
                  onClick={() => setShowEmailForm(!showEmailForm)}
                  className="btn-primary flex items-center gap-2"
                >
                  <FiSend size={16} />
                  Novi Email
                </button>

                {showEmailForm && (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-4">
                    {/* Recipients */}
                    <div>
                      <label className="label">Za (Email adrese)</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="email"
                          value={emailForm.toInput}
                          onChange={(e) => setEmailForm({ ...emailForm, toInput: e.target.value })}
                          onKeyPress={(e) => e.key === 'Enter' && handleAddEmailRecipient()}
                          placeholder="email@example.com"
                          className="input flex-1"
                        />
                        <button
                          onClick={handleAddEmailRecipient}
                          className="btn-secondary"
                        >
                          Dodaj
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {emailForm.to.map((email, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                          >
                            {email}
                            <button
                              onClick={() => handleRemoveEmailRecipient(index)}
                              className="hover:text-red-600"
                            >
                              <FiXCircle size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="label">Naslov</label>
                      <input
                        type="text"
                        value={emailForm.subject}
                        onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                        placeholder="Naslov emaila"
                        className="input"
                      />
                    </div>

                    {/* Body */}
                    <div>
                      <label className="label">Sadržaj</label>
                      <textarea
                        value={emailForm.body}
                        onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                        rows={8}
                        placeholder="Sadržaj emaila (HTML podržan)"
                        className="input"
                      />
                    </div>

                    {/* Attachments from DMS */}
                    <div>
                      <label className="label">Prilozi (iz DMS sistema)</label>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 max-h-48 overflow-y-auto">
                        {documents.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Nema dostupnih dokumenata u DMS sistemu
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {documents.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
                              >
                                <div className="flex items-center gap-2">
                                  <FiFile size={16} className="text-gray-400" />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {doc.original_name || doc.name}
                                  </span>
                                </div>
                                {emailForm.attachments.find((a) => a.document_id === doc.id) ? (
                                  <span className="text-xs text-green-600 dark:text-green-400">
                                    Dodato
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleAddAttachment(doc)}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    Dodaj
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {emailForm.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {emailForm.attachments.map((attachment, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-full text-sm"
                            >
                              <FiPaperclip size={12} />
                              {attachment.name}
                              <button
                                onClick={() => handleRemoveAttachment(index)}
                                className="hover:text-red-600"
                              >
                                <FiXCircle size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => setShowEmailForm(false)}
                        className="btn-secondary"
                      >
                        Otkaži
                      </button>
                      <button
                        onClick={handleSendEmail}
                        disabled={sendingEmail}
                        className="btn-primary flex items-center gap-2"
                      >
                        <FiSend size={16} />
                        {sendingEmail ? 'Slanje...' : 'Pošalji Email'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Calendar Section */}
          <div className="card p-6">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('calendar')}
            >
              <div className="flex items-center gap-3">
                <FiCalendar className="text-green-600 dark:text-green-400" size={24} />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Kalendar
                </h2>
              </div>
              {expandedSections.calendar ? (
                <FiChevronUp size={20} className="text-gray-400" />
              ) : (
                <FiChevronDown size={20} className="text-gray-400" />
              )}
            </div>

            {expandedSections.calendar && (
              <div className="mt-6">
                {calendars.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {calendars.map((calendar) => (
                        <div
                          key={calendar.id}
                          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {calendar.name}
                          </h3>
                          {calendar.owner && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Vlasnik: {calendar.owner.emailAddress?.address}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    {calendarEvents.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                          Nadolazeći događaji
                        </h3>
                        <div className="space-y-2">
                          {calendarEvents.slice(0, 10).map((event) => (
                            <div
                              key={event.id}
                              className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                            >
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {event.subject}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {event.start?.dateTime && new Date(event.start.dateTime).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">
                    Učitavanje kalendara...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* OneDrive Section */}
          <div className="card p-6">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('onedrive')}
            >
              <div className="flex items-center gap-3">
                <FiCloud className="text-purple-600 dark:text-purple-400" size={24} />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  OneDrive
                </h2>
              </div>
              {expandedSections.onedrive ? (
                <FiChevronUp size={20} className="text-gray-400" />
              ) : (
                <FiChevronDown size={20} className="text-gray-400" />
              )}
            </div>

            {expandedSections.onedrive && (
              <div className="mt-6">
                {onedriveFiles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {onedriveFiles.map((file) => (
                      <div
                        key={file.id}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <FiFile size={20} className="text-gray-400" />
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {file.name}
                          </h3>
                        </div>
                        {file.size && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">
                    Učitavanje OneDrive fajlova...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* SharePoint Section */}
          <div className="card p-6">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('sharepoint')}
            >
              <div className="flex items-center gap-3">
                <FiCloud className="text-indigo-600 dark:text-indigo-400" size={24} />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  SharePoint
                </h2>
              </div>
              {expandedSections.sharepoint ? (
                <FiChevronUp size={20} className="text-gray-400" />
              ) : (
                <FiChevronDown size={20} className="text-gray-400" />
              )}
            </div>

            {expandedSections.sharepoint && (
              <div className="mt-6">
                {sharepointSites.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sharepointSites.map((site) => (
                      <div
                        key={site.id}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {site.displayName}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {site.webUrl}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">
                    Učitavanje SharePoint site-ova...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Teams Section */}
          <div className="card p-6">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleSection('teams')}
            >
              <div className="flex items-center gap-3">
                <FiUsers className="text-pink-600 dark:text-pink-400" size={24} />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Microsoft Teams
                </h2>
              </div>
              {expandedSections.teams ? (
                <FiChevronUp size={20} className="text-gray-400" />
              ) : (
                <FiChevronDown size={20} className="text-gray-400" />
              )}
            </div>

            {expandedSections.teams && (
              <div className="mt-6">
                {teams.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teams.map((team) => (
                      <div
                        key={team.id}
                        className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                      >
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {team.displayName}
                        </h3>
                        {team.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {team.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">
                    Učitavanje Teams-a...
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

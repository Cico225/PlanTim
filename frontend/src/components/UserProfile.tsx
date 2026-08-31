import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { useInboxCount } from '@/hooks/useInboxCount';
import { useUserModules } from '@/hooks/useUserModules';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import {
  FiUser,
  FiShield,
  FiSettings,
  FiActivity,
  FiX,
  FiSave,
  FiLock,
  FiLogOut,
  FiBell,
  FiGlobe,
  FiClock,
  FiHome,
  FiEdit2,
  FiCheck,
  FiXCircle,
  FiCamera,
  FiTrash2,
  FiRefreshCw,
} from 'react-icons/fi';

interface UserProfileProps {
  userId?: number;
  onClose?: () => void;
}

export default function UserProfile({ userId, onClose }: UserProfileProps) {
  const { user } = useAuthStore();
  
  // Check if user is admin
  const isAdmin = user?.role?.toLowerCase() === 'admin' || 
                  user?.role?.toLowerCase() === 'super-admin' ||
                  (user as any)?.roles?.some((r: string) => r?.toLowerCase() === 'admin' || r?.toLowerCase() === 'super-admin');
  const [activeTab, setActiveTab] = useState<'basic' | 'security' | 'settings' | 'digitalCard' | 'activity'>('basic');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [activityData, setActivityData] = useState<any>(null);
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now());

  const targetUserId = userId || user?.id;
  const isViewingOtherUser = userId !== undefined && userId !== user?.id;

  useEffect(() => {
    loadProfile();
  }, [targetUserId]);

  useEffect(() => {
    if (activeTab === 'activity') {
      loadActivity();
    }
  }, [activeTab, targetUserId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await authService.getProfile(targetUserId);
      console.log('Loaded profile data:', data);
      setProfileData(data);
      // Update avatar timestamp when profile is loaded to force refresh
      if (data?.avatar) {
        console.log('Avatar path:', data.avatar);
        setAvatarTimestamp(Date.now());
      }
    } catch (error: any) {
      console.error('Failed to load profile:', error);
      toast.error('Greška pri učitavanju profila');
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async () => {
    try {
      const data = await authService.getActivity(targetUserId);
      setActivityData(data);
    } catch (error: any) {
      console.error('Failed to load activity:', error);
      toast.error('Greška pri učitavanju aktivnosti');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const formData = new FormData();

      // Basic info - always send these fields
      formData.append('name', profileData?.name || '');
      formData.append('email', profileData?.email || '');
      if (profileData?.phone !== undefined) formData.append('phone', profileData.phone || '');
      if (profileData?.locale) formData.append('locale', profileData.locale);
      if (profileData?.theme) formData.append('theme', profileData.theme);
      if (profileData?.timezone) formData.append('timezone', profileData.timezone);

      // Avatar
      if (profileData?.avatarFile) {
        formData.append('avatar', profileData.avatarFile);
      }

      // Settings
      formData.append('settings[default_module]', profileData?.settings?.default_module || '');
      formData.append('settings[table_rows_per_page]', String(profileData?.settings?.table_rows_per_page || 25));
      formData.append('settings[auto_logout_timeout]', String(profileData?.settings?.auto_logout_timeout || 0));

      // Notification settings
      formData.append('notification_settings[email_enabled]', profileData?.notification_settings?.email_enabled ? '1' : '0');
      formData.append('notification_settings[desktop_enabled]', profileData?.notification_settings?.desktop_enabled ? '1' : '0');
      formData.append('notification_settings[sound_enabled]', profileData?.notification_settings?.sound_enabled ? '1' : '0');

      console.log('Saving profile:', {
        name: profileData?.name,
        email: profileData?.email,
        phone: profileData?.phone,
        hasAvatar: !!profileData?.avatarFile,
      });

      const hadAvatarFile = !!profileData?.avatarFile;
      
      const response = await authService.updateProfile(formData, targetUserId);
      
      console.log('Profile update response:', response);
      
      toast.success('Profil uspješno ažuriran');
      
      // Reload profile to get updated data (will set avatar from server)
      await loadProfile();
      
      // Clear avatar preview and file after profile is reloaded
      // This ensures the server avatar is displayed instead of the preview
      if (hadAvatarFile) {
        // Use setTimeout to ensure loadProfile state update is complete
        setTimeout(() => {
          setProfileData((prev: any) => {
            // Only clear preview if avatar is available from server
            if (prev?.avatar) {
              return {
                ...prev,
                avatarFile: undefined,
                avatarPreview: undefined
              };
            }
            return prev;
          });
        }, 200);
      }
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Greška pri ažuriranju profila';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profileData) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-dark-800 rounded-xl p-8">
          <FiRefreshCw className="w-8 h-8 animate-spin text-primary-500 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-dark-800 rounded-lg sm:rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center text-xl sm:text-2xl font-bold overflow-hidden flex-shrink-0">
              {profileData?.avatarPreview ? (
                <img src={profileData.avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : profileData?.avatar_url || profileData?.avatar ? (
                <img 
                  key={`header-${avatarTimestamp || Date.now()}`}
                  src={profileData.avatar_url || ''} 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                profileData?.name?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                {isViewingOtherUser ? `Profil korisnika` : 'Moj nalog'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{profileData?.email}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors flex-shrink-0"
            >
              <FiX className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {[
            { id: 'basic', label: 'Osnovni podaci', shortLabel: 'Osnovni', icon: FiUser },
            { id: 'security', label: 'Sigurnost', shortLabel: 'Sigurnost', icon: FiShield },
            { id: 'settings', label: 'Postavke sistema', shortLabel: 'Postavke', icon: FiSettings },
            { id: 'digitalCard', label: 'Digitalna vizit karta', shortLabel: 'Vizit karta', icon: FiEdit2 },
            { id: 'activity', label: 'Aktivnost', shortLabel: 'Aktivnost', icon: FiActivity },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 sm:py-4 font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400 bg-white dark:bg-dark-800'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-800'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden text-xs">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeTab === 'basic' && (
            <BasicInfoTab
              profileData={profileData}
              setProfileData={setProfileData}
              isViewingOtherUser={isViewingOtherUser}
              isAdmin={isAdmin}
              avatarTimestamp={avatarTimestamp}
              targetUserId={targetUserId}
              user={user}
            />
          )}
          {activeTab === 'security' && (
            <SecurityTab
              profileData={profileData}
              targetUserId={targetUserId}
              isViewingOtherUser={isViewingOtherUser}
              isAdmin={isAdmin}
              onSuccess={loadProfile}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsTab
              profileData={profileData}
              setProfileData={setProfileData}
            />
          )}
          {activeTab === 'digitalCard' && (
            <DigitalCardTab profileData={profileData} />
          )}
          {activeTab === 'activity' && activityData && (
            <ActivityTab activityData={activityData} />
          )}
        </div>

        {/* Footer */}
        {activeTab !== 'activity' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 p-4 sm:p-6 border-t border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-900">
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2.5 sm:py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-700 rounded-lg transition-colors text-sm sm:text-base"
              >
                Otkaži
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-sm sm:text-base"
            >
              {saving ? (
                <>
                  <FiRefreshCw className="w-4 h-4 animate-spin" />
                  Čuvanje...
                </>
              ) : (
                <>
                  <FiSave className="w-4 h-4" />
                  Sačuvaj
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Basic Info Tab Component
function BasicInfoTab({ profileData, setProfileData, isViewingOtherUser, isAdmin, avatarTimestamp, targetUserId, user }: any) {
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileData({ ...profileData, avatarFile: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileData({ ...profileData, avatarFile: file, avatarPreview: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Avatar */}
      <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 sm:gap-6">
        <div className="relative">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center text-2xl sm:text-3xl font-bold overflow-hidden">
            {(() => {
              return profileData?.avatarPreview ? (
                <img src={profileData.avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : profileData?.avatar_url || profileData?.avatar ? (
                <img 
                  key={`avatar-main-${avatarTimestamp || Date.now()}`}
                  src={profileData.avatar_url || ''} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              ) : (
                profileData?.name?.charAt(0).toUpperCase() || 'U'
              );
            })()}
          </div>
          {!isViewingOtherUser && (
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-600 transition-colors">
              <FiCamera className="w-4 h-4" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </label>
          )}
        </div>
        <div className="text-center sm:text-left">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">Profilna slika</h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Maksimalna veličina: 5MB</p>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Ime i prezime *
        </label>
        <input
          type="text"
          value={profileData?.name || ''}
          onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
          disabled={isViewingOtherUser && !isAdmin}
          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Email *
        </label>
        <input
          type="email"
          value={profileData?.email || ''}
          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
          disabled={isViewingOtherUser && !isAdmin}
          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Username (read-only) */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Username (read-only)
        </label>
        <input
          type="text"
          value={profileData?.username || profileData?.email || ''}
          disabled
          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-gray-100 dark:bg-dark-900 text-gray-500 dark:text-gray-400 cursor-not-allowed"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Telefon
        </label>
        <input
          type="tel"
          value={profileData?.phone || ''}
          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
          disabled={isViewingOtherUser && !isAdmin}
          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Role (read-only) */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Uloga (read-only)
        </label>
        <input
          type="text"
          value={profileData?.role || ''}
          disabled
          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-gray-100 dark:bg-dark-900 text-gray-500 dark:text-gray-400 cursor-not-allowed"
        />
      </div>

      {/* Language */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <FiGlobe className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1.5 sm:mr-2" />
          Jezik interfejsa
        </label>
        <select
          value={profileData?.locale || 'bs'}
          onChange={(e) => setProfileData({ ...profileData, locale: e.target.value })}
          disabled={isViewingOtherUser && !isAdmin}
          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="bs">Bosanski</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* Timezone */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <FiClock className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1.5 sm:mr-2" />
          Timezone
        </label>
        <select
          value={profileData?.timezone || 'Europe/Sarajevo'}
          onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
          disabled={isViewingOtherUser && !isAdmin}
          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="Europe/Sarajevo">Europe/Sarajevo (GMT+1)</option>
          <option value="Europe/Zagreb">Europe/Zagreb (GMT+1)</option>
          <option value="Europe/Belgrade">Europe/Belgrade (GMT+1)</option>
          <option value="UTC">UTC (GMT+0)</option>
        </select>
      </div>

      {/* Admin: Active Status */}
      {isViewingOtherUser && isAdmin && (
        <div className="pt-4 border-t border-gray-200 dark:border-dark-700">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={profileData?.is_active || false}
              onChange={(e) => setProfileData({ ...profileData, is_active: e.target.checked })}
              className="w-5 h-5 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Aktivan nalog
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

// Security Tab Component
function SecurityTab({ profileData, targetUserId, isViewingOtherUser, isAdmin, onSuccess }: any) {
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    try {
      if (!isViewingOtherUser && !passwordData.current_password) {
        toast.error('Unesite trenutnu lozinku');
        return;
      }

      if (passwordData.password !== passwordData.password_confirmation) {
        toast.error('Lozinke se ne poklapaju');
        return;
      }

      if (passwordData.password.length < 8) {
        toast.error('Lozinka mora imati najmanje 8 karaktera');
        return;
      }

      setChangingPassword(true);
      await authService.changePassword(passwordData, targetUserId);
      toast.success(isViewingOtherUser ? 'Lozinka resetovana' : 'Lozinka uspješno promijenjena');
      setPasswordData({ current_password: '', password: '', password_confirmation: '' });
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to change password:', error);
      toast.error(error.response?.data?.message || 'Greška pri promjeni lozinke');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!confirm('Da li ste sigurni da želite odjaviti sa svih uređaja?')) {
      return;
    }

    try {
      await authService.logoutAllDevices(targetUserId);
      toast.success('Odjavljeni sa svih uređaja');
      if (!isViewingOtherUser) {
        // Reload page to logout
        window.location.href = '/login';
      }
    } catch (error: any) {
      console.error('Failed to logout all devices:', error);
      toast.error('Greška pri odjavi');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
        <h3 className="font-semibold text-sm sm:text-base text-blue-900 dark:text-blue-100 mb-2">Sigurnost naloga</h3>
        <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
          Ovde možete promijeniti lozinku i upravljati sigurnošću svog naloga.
        </p>
      </div>

      {/* Change Password */}
      <div className="space-y-3 sm:space-y-4">
        <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">Promjena lozinke</h4>

        {!isViewingOtherUser && (
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Stara lozinka *
            </label>
            <input
              type="password"
              value={passwordData.current_password}
              onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
            />
          </div>
        )}

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nova lozinka *
          </label>
          <input
            type="password"
            value={passwordData.password}
            onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Potvrda nove lozinke *
          </label>
          <input
            type="password"
            value={passwordData.password_confirmation}
            onChange={(e) => setPasswordData({ ...passwordData, password_confirmation: e.target.value })}
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
          />
        </div>

        <button
          onClick={handleChangePassword}
          disabled={changingPassword || !passwordData.password || !passwordData.password_confirmation}
          className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto text-sm sm:text-base px-4 py-2.5 sm:py-2"
        >
          {changingPassword ? (
            <>
              <FiRefreshCw className="w-4 h-4 animate-spin" />
              Čuvanje...
            </>
          ) : (
            <>
              <FiLock className="w-4 h-4" />
              {isViewingOtherUser ? 'Resetuj lozinku' : 'Promijeni lozinku'}
            </>
          )}
        </button>
      </div>

      {/* Last Password Change */}
      {profileData?.password_changed_at && (
        <div className="pt-4 border-t border-gray-200 dark:border-dark-700">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Posljednja promjena lozinke:</span>{' '}
            <span className="break-words">{new Date(profileData.password_changed_at).toLocaleString('bs-BA')}</span>
          </p>
        </div>
      )}

      {/* Logout All Devices */}
      <div className="pt-4 border-t border-gray-200 dark:border-dark-700">
        <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-3 sm:mb-4">Odjavi sa svih uređaja</h4>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
          Ovo će odjaviti sve aktivne sesije i zahtevati ponovnu prijavu na svim uređajima.
        </p>
        <button
          onClick={handleLogoutAll}
          className="btn-secondary text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center gap-2 w-full sm:w-auto text-sm sm:text-base px-4 py-2.5 sm:py-2"
        >
          <FiLogOut className="w-4 h-4" />
          Odjavi sa svih uređaja
        </button>
      </div>
    </div>
  );
}

// Settings Tab Component
function SettingsTab({ profileData, setProfileData }: any) {
  const { modules } = useUserModules();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Default Module */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <FiHome className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1.5 sm:mr-2" />
          Default modul po loginu
        </label>
        <select
          value={profileData?.settings?.default_module || ''}
          onChange={(e) =>
            setProfileData({
              ...profileData,
              settings: { ...profileData?.settings, default_module: e.target.value },
            })
          }
          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
        >
          <option value="">Dashboard</option>
          {modules?.map((module: any) => (
            <option key={module.name} value={module.name}>
              {module.display_name}
            </option>
          ))}
        </select>
      </div>

      {/* Table Rows Per Page */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Broj redova u tabelama
        </label>
        <select
          value={profileData?.settings?.table_rows_per_page || 25}
          onChange={(e) =>
            setProfileData({
              ...profileData,
              settings: { ...profileData?.settings, table_rows_per_page: parseInt(e.target.value) },
            })
          }
          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Theme */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <FiSettings className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1.5 sm:mr-2" />
          Dark / Light mode
        </label>
        <select
          value={profileData?.theme || 'light'}
          onChange={(e) => setProfileData({ ...profileData, theme: e.target.value })}
          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto</option>
        </select>
      </div>

      {/* Notifications */}
      <div className="space-y-3 sm:space-y-4 pt-4 border-t border-gray-200 dark:border-dark-700">
        <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white flex items-center gap-2">
          <FiBell className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Notifikacije
        </h4>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={profileData?.notification_settings?.email_enabled || false}
            onChange={(e) =>
              setProfileData({
                ...profileData,
                notification_settings: {
                  ...profileData?.notification_settings,
                  email_enabled: e.target.checked,
                },
              })
            }
            className="w-5 h-5 text-primary-600 rounded flex-shrink-0"
          />
          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Email notifikacije</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={profileData?.notification_settings?.desktop_enabled || false}
            onChange={(e) =>
              setProfileData({
                ...profileData,
                notification_settings: {
                  ...profileData?.notification_settings,
                  desktop_enabled: e.target.checked,
                },
              })
            }
            className="w-5 h-5 text-primary-600 rounded flex-shrink-0"
          />
          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Desktop notifikacije</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={profileData?.notification_settings?.sound_enabled || false}
            onChange={(e) =>
              setProfileData({
                ...profileData,
                notification_settings: {
                  ...profileData?.notification_settings,
                  sound_enabled: e.target.checked,
                },
              })
            }
            className="w-5 h-5 text-primary-600 rounded flex-shrink-0"
          />
          <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Zvuk notifikacija</span>
        </label>
      </div>

      {/* Auto Logout */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <FiClock className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1.5 sm:mr-2" />
          Automatski logout (timeout u minutama)
        </label>
        <input
          type="number"
          min="0"
          max="1440"
          value={profileData?.settings?.auto_logout_timeout || 0}
          onChange={(e) =>
            setProfileData({
              ...profileData,
              settings: { ...profileData?.settings, auto_logout_timeout: parseInt(e.target.value) || 0 },
            })
          }
          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-dark-600 rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-white"
          placeholder="0 = isključeno"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Unesite 0 da isključite automatski logout
        </p>
      </div>
    </div>
  );
}

// Digital Business Card Tab Component
function DigitalCardTab({ profileData }: any) {
  const fullName = (profileData?.name || '').trim();
  let firstName = '';
  let lastName = '';

  if (fullName) {
    const parts = fullName.split(' ');
    if (parts.length === 1) {
      firstName = parts[0];
    } else {
      lastName = parts[parts.length - 1];
      firstName = parts.slice(0, -1).join(' ');
    }
  }

  const vcardLines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    fullName ? `FN:${fullName}` : '',
    fullName ? `N:${lastName};${firstName};;;` : '',
    profileData?.email ? `EMAIL;TYPE=INTERNET,WORK:${profileData.email}` : '',
    profileData?.phone ? `TEL;TYPE=CELL,VOICE:${profileData.phone}` : '',
    'END:VCARD',
  ].filter(Boolean);

  const vcardValue = vcardLines.join('\r\n');

  const handleDownloadVCard = () => {
    if (!vcardValue) return;

    const blob = new Blob([vcardValue], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${profileData?.name || 'kontakt'}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-gray-50 dark:bg-dark-900 rounded-lg p-3 sm:p-4 border border-gray-200 dark:border-dark-700">
        <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-1">
          Digitalna vizit karta
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
          Skenerom mobilnog uređaja očitajte QR kod za brzo spremanje kontakta ili preuzmite vCard fajl.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 sm:gap-6">
        <div className="rounded-2xl border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-900 p-4 sm:p-6 shadow-md flex flex-col items-center gap-4 w-full max-w-xs sm:max-w-sm">
          <div className="bg-white dark:bg-white p-3 sm:p-4 rounded-2xl border border-gray-200">
            <QRCode
              value={vcardValue || 'PlanTim'}
              size={200}
              bgColor="transparent"
              fgColor="#000000"
            />
          </div>
          <div className="text-center">
            <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              {profileData?.name || 'Ime i prezime'}
            </p>
            {profileData?.role && (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {profileData.role}
              </p>
            )}
            {profileData?.email && (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1">
                {profileData.email}
              </p>
            )}
            {profileData?.phone && (
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                {profileData.phone}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleDownloadVCard}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm rounded-lg bg-primary-600 hover:bg-primary-700 text-white transition-colors"
            disabled={!vcardValue}
          >
            <FiSave className="w-4 h-4" />
            Sačuvaj kontakt (vCard)
          </button>
          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 text-center max-w-sm">
            QR kod se može skenirati direktno sa ekrana, a vCard fajl možete poslati dalje (email, chat).
          </p>
        </div>
      </div>
    </div>
  );
}

// Activity Tab Component
function ActivityTab({ activityData }: any) {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Last Login */}
      <div className="bg-gray-50 dark:bg-dark-900 rounded-lg p-3 sm:p-4">
        <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-2">Posljednji login</h4>
        {activityData?.logins?.[0] && (
          <div className="space-y-2 text-xs sm:text-sm">
            <p className="text-gray-600 dark:text-gray-400 break-words">
              <span className="font-medium">Datum:</span>{' '}
              {new Date(activityData.logins[0].created_at).toLocaleString('bs-BA')}
            </p>
            <p className="text-gray-600 dark:text-gray-400 break-words">
              <span className="font-medium">IP adresa:</span> {activityData.logins[0].ip_address}
            </p>
            {activityData.logins[0].user_agent && (
              <p className="text-gray-600 dark:text-gray-400 break-words">
                <span className="font-medium">Uređaj:</span> {activityData.logins[0].user_agent}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Activity List */}
      <div>
        <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white mb-3 sm:mb-4">Posljednje akcije</h4>
        <div className="space-y-2">
          {activityData?.activities?.length > 0 ? (
            activityData.activities.map((activity: any) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 dark:bg-dark-900 rounded-lg"
              >
                <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">{activity.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(activity.created_at).toLocaleString('bs-BA')}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              Nema aktivnosti za prikaz
            </p>
          )}
        </div>
      </div>
    </div>
  );
}


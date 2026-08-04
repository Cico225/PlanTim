import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useMemo } from 'react';
import NotificationBell from '@/components/NotificationBell';
import InboxBell from '@/components/InboxBell';
import VersionDisplay from '@/components/VersionDisplay';
import UserProfile from '@/components/UserProfile';
import EdelAssistant from '@/components/EdelAssistant';
import { useNotificationCount } from '../hooks/useNotificationCount';
import { useInboxCount } from '../hooks/useInboxCount';
import { useUserModules } from '../hooks/useUserModules';
import { PLANIKA_SUBMODULES, PLANIKA_OVERVIEW_CARD } from '@/modules/planika/constants';
import {
  FiHome,
  FiUsers,
  FiBriefcase,
  FiFolder,
  FiBook,
  FiUserCheck,
  FiMail,
  FiBell,
  FiShield,
  FiCloud,
  FiGrid,
  FiCpu,
  FiSettings,
  FiMenu,
  FiX,
  FiSun,
  FiMoon,
  FiLogOut,
  FiGlobe,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp,
  FiPackage,
  FiSearch,
  FiDollarSign,
  FiCreditCard,
  FiBookOpen,
} from 'react-icons/fi';

type PlanikaNavItem = {
  name: string;
  href: string;
  icon: typeof FiHome;
  color: string;
  badge?: string;
  isPlanikaRoot?: boolean;
  isFinanceChild?: boolean;
  hasFinanceChildren?: boolean;
  children?: PlanikaNavItem[];
};

export default function MainLayout() {
  const { isAuthenticated, user, logout } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [planikaExpanded, setPlanikaExpanded] = useState(false);
  const [financeExpanded, setFinanceExpanded] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [edelOpen, setEdelOpen] = useState(false);
  
  // Get real counts for badges
  const { unreadCount: notificationCount } = useNotificationCount();
  const { unreadCount: inboxCount } = useInboxCount();
  const { modules: userModules, loading: modulesLoading } = useUserModules();

  // Handle responsive sidebar - close on mobile by default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        // On mobile, sidebar should be closed by default
        // But we don't want to force close if user explicitly opened it
      } else {
        // On desktop, sidebar should always be open
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      setScrolled(target.scrollTop > 20);
    };

    const nav = document.querySelector('.sidebar-nav');
    nav?.addEventListener('scroll', handleScroll);
    return () => nav?.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-expand Planika if user is on any Planika route
  useEffect(() => {
    if (location.pathname.startsWith('/planika')) {
      setPlanikaExpanded(true);
    }
    if (location.pathname.startsWith('/planika/finance')) {
      setFinanceExpanded(true);
    }
  }, [location.pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Map modules to navigation items with icons and colors
  const getModuleIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      FiHome,
      FiUsers,
      FiBriefcase,
      FiFolder,
      FiBook,
      FiUserCheck,
      FiMail,
      FiBell,
      FiShield,
      FiCloud,
      FiGrid,
      FiCpu,
      FiSettings,
      FiPackage,
      FiDollarSign,
      FiCreditCard,
    };
    return iconMap[iconName] || FiGrid;
  };

  const getModuleColor = (moduleName: string) => {
    const colorMap: Record<string, string> = {
      dashboard: 'blue',
      crm: 'purple',
      projects: 'indigo',
      dms: 'yellow',
      lms: 'green',
      hrm: 'teal',
      inbox: 'pink',
      notifications: 'red',
      gdpr: 'slate',
      office365: 'sky',
      planika: 'orange',
      ai: 'violet',
      admin: 'gray',
    };
    return colorMap[moduleName] || 'gray';
  };

  const getModuleBadge = (moduleName: string) => {
    if (moduleName === 'inbox' && inboxCount > 0) {
      return inboxCount.toString();
    }
    if (moduleName === 'notifications' && notificationCount > 0) {
      return notificationCount.toString();
    }
    return undefined;
  };

  // Helper function to get translated module name
  const getModuleTranslatedName = (moduleName: string, displayName: string): string => {
    // Try to get translation from i18n, fallback to display_name from database
    const translationKey = `${moduleName}.title`;
    const translated = t(translationKey, { defaultValue: null });
    // If translation exists and is different from key, use it
    if (translated && translated !== translationKey) {
      return translated;
    }
    // Fall back to display_name from database
    return displayName;
  };

  // Create navigation groups from user modules
  const createNavigationGroups = () => {
    const buildPlanikaItems = (): PlanikaNavItem[] => {
      const accessibleByName = new Map(userModules.map((m) => [m.name, m]));
      const hasPlanikaRoot = accessibleByName.has('planika');
      const items: PlanikaNavItem[] = [];

      if (hasPlanikaRoot || userModules.some((m) => m.name.startsWith('planika.'))) {
        items.push({
          name: t('planika.title'),
          href: PLANIKA_OVERVIEW_CARD.route,
          icon: PLANIKA_OVERVIEW_CARD.icon,
          color: PLANIKA_OVERVIEW_CARD.color,
          isPlanikaRoot: true,
        });
      }

      if (hasPlanikaRoot) {
        PLANIKA_SUBMODULES.filter((sub) => sub.id !== 'finance').forEach((submodule) => {
          items.push({
            name: t(submodule.nameKey),
            href: submodule.route,
            icon: submodule.icon,
            color: submodule.color,
          });
        });
      }

      const financeModule = accessibleByName.get('planika.finance');
      const hasFinanceAccess =
        !!financeModule || userModules.some((m) => m.name.startsWith('planika.finance'));

      // Finansije se prikazuje kao jedan meni bez podmenija — hub sa panelima
      if (hasFinanceAccess) {
        items.push({
          name: financeModule?.display_name || t('planika.finance'),
          href: financeModule?.route || '/planika/finance',
          icon: getModuleIcon(financeModule?.icon || 'FiDollarSign'),
          color: 'teal',
        });
      }

      return items;
    };

    const flattenPlanikaItems = (items: PlanikaNavItem[]): PlanikaNavItem[] => {
      if (!planikaExpanded) {
        return items.filter((item) => item.isPlanikaRoot);
      }

      const flattened: PlanikaNavItem[] = [];
      items.forEach((item) => {
        flattened.push(item);
        if (item.children?.length && financeExpanded) {
          flattened.push(...item.children);
        }
      });
      return flattened;
    };

    if (modulesLoading) {
      // Show minimal navigation while loading - only dashboard
      return [
        {
          title: t('navigation.main'),
          items: [
            { name: t('dashboard.title'), href: '/dashboard', icon: FiHome, color: 'blue' },
          ],
        },
      ];
    }
    
    if (userModules.length === 0) {
      // User has no permissions - show only dashboard as fallback
      return [
        {
          title: t('navigation.main'),
          items: [
            { name: t('dashboard.title'), href: '/dashboard', icon: FiHome, color: 'blue' },
          ],
        },
      ];
    }

    // Group modules by category
    const coreModules = userModules.filter(m => !m.is_plugin && m.name !== 'dashboard');
    const plugins = userModules.filter(m => m.is_plugin);
    const dashboardModule = userModules.find(m => m.name === 'dashboard');
    const adminModule = userModules.find(m => m.name === 'admin');
    const planikaModule = plugins.find(m => m.name === 'planika');
    const planikaChildModules = userModules.filter(m => m.name.startsWith('planika.'));
    const otherPlugins = plugins.filter(m => m.name !== 'planika' && m.name !== 'admin');

    const groups = [];

    // Dashboard group
    const dashboardItems = [];
    if (dashboardModule) {
      dashboardItems.push({
        name: getModuleTranslatedName(dashboardModule.name, dashboardModule.display_name),
        href: dashboardModule.route || '/dashboard',
        icon: getModuleIcon(dashboardModule.icon),
        color: getModuleColor(dashboardModule.name),
        badge: getModuleBadge(dashboardModule.name),
      });
    }
    
    // Add meeting-rooms to dashboard group
    const meetingRoomsModule = coreModules.find(m => m.name === 'meeting-rooms');
    if (meetingRoomsModule) {
      dashboardItems.push({
        name: getModuleTranslatedName(meetingRoomsModule.name, meetingRoomsModule.display_name),
        href: meetingRoomsModule.route || '/meeting-rooms',
        icon: getModuleIcon(meetingRoomsModule.icon),
        color: getModuleColor(meetingRoomsModule.name),
        badge: getModuleBadge(meetingRoomsModule.name),
      });
    }
    
    if (dashboardItems.length > 0) {
      groups.push({
        title: t('navigation.main'),
        items: dashboardItems,
      });
    }

    // Business modules
    const businessModules = coreModules.filter(m => 
      ['crm'].includes(m.name)
    );
    if (businessModules.length > 0) {
      groups.push({
        title: t('navigation.business'),
        items: businessModules.map(module => ({
          name: getModuleTranslatedName(module.name, module.display_name),
          href: module.route || `/${module.name}`,
          icon: getModuleIcon(module.icon),
          color: getModuleColor(module.name),
          badge: getModuleBadge(module.name),
        })),
      });
    }

    // Management modules
    const managementModules = coreModules.filter(m => 
      ['dms', 'lms', 'projects'].includes(m.name)
    );
    if (managementModules.length > 0) {
      groups.push({
        title: t('navigation.management'),
        items: managementModules.map(module => ({
          name: getModuleTranslatedName(module.name, module.display_name),
          href: module.route || `/${module.name}`,
          icon: getModuleIcon(module.icon),
          color: getModuleColor(module.name),
          badge: getModuleBadge(module.name),
        })),
      });
    }

    // Communication modules - Inbox i Notifications su uvijek vidljivi
    const communicationItems = [];
    
    // Inbox je uvijek vidljiv (svi korisnici mogu primati poruke)
    const inboxModule = coreModules.find(m => m.name === 'inbox');
    communicationItems.push({
      name: inboxModule ? getModuleTranslatedName(inboxModule.name, inboxModule.display_name) : t('inbox.title'),
      href: '/inbox',
      icon: FiMail,
      color: 'pink',
      badge: getModuleBadge('inbox'),
    });
    
    // Notifications je uvijek vidljiv
    const notificationsModule = coreModules.find(m => m.name === 'notifications');
    communicationItems.push({
      name: notificationsModule ? getModuleTranslatedName(notificationsModule.name, notificationsModule.display_name) : t('notifications.title'),
      href: '/notifications',
      icon: FiBell,
      color: 'red',
      badge: getModuleBadge('notifications'),
    });
    
    groups.push({
      title: t('navigation.communication'),
      items: communicationItems,
    });

    // Plugins - Planika modul se prikazuje samo ako korisnik ima dozvolu
    if (planikaModule || planikaChildModules.length > 0) {
      const planikaItems = buildPlanikaItems();
      groups.push({
        title: t('planika.title'),
        items: flattenPlanikaItems(planikaItems) as any,
        isPlanikaGroup: true,
      });
    }

    // Admin module
    if (adminModule) {
      groups.push({
        title: t('navigation.system'),
        items: [{
          name: getModuleTranslatedName(adminModule.name, adminModule.display_name),
          href: adminModule.route || '/admin',
          icon: getModuleIcon(adminModule.icon),
          color: getModuleColor(adminModule.name),
          badge: getModuleBadge(adminModule.name),
        }],
      });
    }

    return groups;
  };

  const navigationGroups = useMemo(() => createNavigationGroups(), [
    modulesLoading, 
    userModules, 
    inboxCount, 
    notificationCount, 
    i18n.language,
    planikaExpanded,
    financeExpanded,
    t
  ]);


  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'black'> = ['light', 'dark', 'black'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'bs' ? 'en' : 'bs';
    i18n.changeLanguage(newLang);
    localStorage.setItem('language', newLang);
  };

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors: Record<string, { bg: string; activeBg: string; text: string; activeText: string }> = {
      blue: { bg: 'bg-blue-500/10', activeBg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', activeText: 'text-white' },
      purple: { bg: 'bg-purple-500/10', activeBg: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', activeText: 'text-white' },
      indigo: { bg: 'bg-indigo-500/10', activeBg: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', activeText: 'text-white' },
      yellow: { bg: 'bg-yellow-500/10', activeBg: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', activeText: 'text-white' },
      green: { bg: 'bg-green-500/10', activeBg: 'bg-green-500', text: 'text-green-600 dark:text-green-400', activeText: 'text-white' },
      teal: { bg: 'bg-teal-500/10', activeBg: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400', activeText: 'text-white' },
      pink: { bg: 'bg-pink-500/10', activeBg: 'bg-pink-500', text: 'text-pink-600 dark:text-pink-400', activeText: 'text-white' },
      red: { bg: 'bg-red-500/10', activeBg: 'bg-red-500', text: 'text-red-600 dark:text-red-400', activeText: 'text-white' },
      orange: { bg: 'bg-orange-500/10', activeBg: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', activeText: 'text-white' },
      slate: { bg: 'bg-slate-500/10', activeBg: 'bg-slate-500', text: 'text-slate-600 dark:text-slate-400', activeText: 'text-white' },
      sky: { bg: 'bg-sky-500/10', activeBg: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', activeText: 'text-white' },
      violet: { bg: 'bg-violet-500/10', activeBg: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', activeText: 'text-white' },
      gray: { bg: 'bg-gray-500/10', activeBg: 'bg-gray-500', text: 'text-gray-600 dark:text-gray-400', activeText: 'text-white' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex">
      {/* Modern Sidebar */}
      <aside
        className={`print:hidden fixed inset-y-0 left-0 z-40 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'w-20' : 'w-72'} overflow-visible`}
        data-sidebar-open={sidebarOpen}
      >
        <div className="relative flex h-full flex-col border-r border-gray-200/50 bg-gradient-to-b from-white via-white to-gray-50 backdrop-blur-xl transition-all duration-300 dark:border-dark-700/50 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900">
          {/* Desktop collapse / expand toggle — always visible on the sidebar edge */}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-[1.35rem] z-50 hidden h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition hover:scale-110 hover:border-primary-300 hover:text-primary-600 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-200 dark:hover:border-primary-500 dark:hover:text-primary-400 lg:flex"
            title={sidebarCollapsed ? t('navigation.expand') : t('navigation.collapse')}
            aria-label={sidebarCollapsed ? t('navigation.expand') : t('navigation.collapse')}
          >
            {sidebarCollapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
          </button>

          {/* Logo Section with Gradient */}
          <div
            className={`relative flex h-16 items-center bg-gradient-to-r from-primary-600 to-primary-500 dark:from-primary-700 dark:to-primary-600 ${
              sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
            }`}
          >
            <div className={`flex items-center ${sidebarCollapsed ? '' : 'min-w-0 gap-2'}`}>
              <Link
                to="/dashboard"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm transition-transform duration-200 hover:scale-110"
                title="PlanTim"
              >
                <span className="text-xl font-bold text-white">P</span>
              </Link>
              {!sidebarCollapsed && (
                <div className="flex min-w-0 items-center gap-1.5">
                  <Link
                    to="/dashboard"
                    className="shrink-0 text-xl font-bold tracking-tight text-white"
                  >
                    PlanTim
                  </Link>
                  <VersionDisplay className="text-white/80" showUpdateBadge={false} />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white transition-colors hover:bg-white/30 lg:hidden"
              aria-label={t('navigation.collapse')}
            >
              <FiX size={18} />
            </button>
          </div>

          {/* Scroll Shadow Indicator */}
          {scrolled && (
            <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />
          )}

          {/* Navigation Groups */}
          <nav className="flex-1 overflow-y-auto sidebar-nav px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
            {navigationGroups.map((group, groupIndex) => {
              const isPlanikaGroup = Boolean((group as { isPlanikaGroup?: boolean }).isPlanikaGroup);
              const itemsToShow = group.items;

              return (
                <div key={groupIndex}>
                  {!sidebarCollapsed && (
                    <h3 className="px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                      {group.title}
                    </h3>
                  )}
                  <div className="space-y-1">
                    {itemsToShow.map((item, itemIndex) => {
                      if (!item) return null;

                      const planikaItem = item as PlanikaNavItem;
                      const isMainPlanikaItem = isPlanikaGroup && planikaItem.isPlanikaRoot;
                      const isFinanceParent = isPlanikaGroup && planikaItem.hasFinanceChildren;
                      const isFinanceChild = isPlanikaGroup && planikaItem.isFinanceChild;
                      const isActive = isFinanceParent
                        ? location.pathname.startsWith('/planika/finance')
                        : location.pathname.startsWith(planikaItem.href);
                      const Icon = planikaItem.icon;
                      const colorClasses = getColorClasses(planikaItem.color, isActive);
                      const indentClass = isFinanceChild ? 'ml-12' : (isPlanikaGroup && !isMainPlanikaItem ? 'ml-6' : '');

                      if (isMainPlanikaItem) {
                        return (
                          <div key={`${planikaItem.name}-${itemIndex}`}>
                            <Link
                              to={planikaItem.href}
                              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                                isActive
                                  ? 'bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/30 dark:to-primary-800/20 shadow-sm'
                                  : 'hover:bg-gray-100 dark:hover:bg-dark-700/50'
                              }`}
                              title={sidebarCollapsed ? planikaItem.name : undefined}
                            >
                              <div
                                className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
                                  isActive
                                    ? `${colorClasses.activeBg} shadow-lg shadow-${planikaItem.color}-500/20`
                                    : `${colorClasses.bg} group-hover:scale-110`
                                }`}
                              >
                                <Icon
                                  size={18}
                                  className={isActive ? colorClasses.activeText : colorClasses.text}
                                />
                              </div>

                              {!sidebarCollapsed && (
                                <>
                                  <span
                                    className={`flex-1 font-medium text-sm transition-colors ${
                                      isActive
                                        ? 'text-gray-900 dark:text-white'
                                        : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'
                                    }`}
                                  >
                                    {planikaItem.name}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setPlanikaExpanded(!planikaExpanded);
                                    }}
                                    className="flex items-center justify-center w-5 h-5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-500 dark:text-gray-400"
                                  >
                                    {planikaExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                                  </button>
                                </>
                              )}

                              {isActive && (
                                <div className="absolute left-0 w-1 h-8 bg-gradient-to-b from-primary-500 to-primary-600 rounded-r-full" />
                              )}
                            </Link>
                          </div>
                        );
                      }

                      if (isFinanceParent) {
                        return (
                          <div key={`${planikaItem.name}-${itemIndex}`}>
                            <div
                              className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ml-6 ${
                                isActive
                                  ? 'bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/30 dark:to-primary-800/20 shadow-sm'
                                  : 'hover:bg-gray-100 dark:hover:bg-dark-700/50'
                              }`}
                            >
                              <Link
                                to={planikaItem.href}
                                className="flex flex-1 items-center gap-3 min-w-0"
                                title={sidebarCollapsed ? planikaItem.name : undefined}
                              >
                                <div
                                  className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
                                    isActive
                                      ? `${colorClasses.activeBg} shadow-lg shadow-${planikaItem.color}-500/20`
                                      : `${colorClasses.bg} group-hover:scale-110`
                                  }`}
                                >
                                  <Icon
                                    size={18}
                                    className={isActive ? colorClasses.activeText : colorClasses.text}
                                  />
                                </div>

                                {!sidebarCollapsed && (
                                  <span
                                    className={`flex-1 font-medium text-sm transition-colors ${
                                      isActive
                                        ? 'text-gray-900 dark:text-white'
                                        : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'
                                    }`}
                                  >
                                    {planikaItem.name}
                                  </span>
                                )}
                              </Link>

                              {!sidebarCollapsed && (
                                <button
                                  type="button"
                                  onClick={() => setFinanceExpanded(!financeExpanded)}
                                  className="flex items-center justify-center w-5 h-5 rounded transition-colors hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-500 dark:text-gray-400"
                                >
                                  {financeExpanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={`${planikaItem.name}-${itemIndex}`}
                          to={planikaItem.href}
                          className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${indentClass} ${
                            isActive
                              ? 'bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/30 dark:to-primary-800/20 shadow-sm'
                              : 'hover:bg-gray-100 dark:hover:bg-dark-700/50'
                          }`}
                          title={sidebarCollapsed ? planikaItem.name : undefined}
                        >
                          {/* Icon with colored background */}
                          <div
                            className={`flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
                              isActive
                                ? `${colorClasses.activeBg} shadow-lg shadow-${planikaItem.color}-500/20`
                                : `${colorClasses.bg} group-hover:scale-110`
                            }`}
                          >
                            <Icon
                              size={18}
                              className={isActive ? colorClasses.activeText : colorClasses.text}
                            />
                          </div>

                          {/* Text */}
                          {!sidebarCollapsed && (
                            <>
                              <span
                                className={`flex-1 font-medium text-sm transition-colors ${
                                  isActive
                                    ? 'text-gray-900 dark:text-white'
                                    : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'
                                }`}
                              >
                                {planikaItem.name}
                              </span>
                              
                              {/* Badge */}
                              {planikaItem.badge && (
                                <span
                                  className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold ${
                                    isActive
                                      ? 'bg-primary-600 text-white'
                                      : 'bg-red-500 text-white'
                                  }`}
                                >
                                  {planikaItem.badge}
                                </span>
                              )}
                            </>
                          )}

                          {/* Badge for collapsed sidebar */}
                          {sidebarCollapsed && item.badge && (
                            <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg">
                              {item.badge}
                            </span>
                          )}

                          {/* Active indicator */}
                          {isActive && (
                            <div className="absolute left-0 w-1 h-8 bg-gradient-to-b from-primary-500 to-primary-600 rounded-r-full" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Modern User Section */}
          <div className="p-4 border-t border-gray-200/50 dark:border-dark-700/50 bg-gradient-to-t from-gray-50/50 to-transparent dark:from-dark-900/50">
            {!sidebarCollapsed ? (
              <>
                {/* User Info */}
                <button
                  onClick={() => setShowUserProfile(true)}
                  className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 dark:from-dark-700 dark:to-dark-800 group hover:shadow-md transition-all duration-200 w-full text-left cursor-pointer"
                >
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center font-bold text-lg shadow-lg group-hover:scale-105 transition-transform duration-200">
                      {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-dark-800 rounded-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {user?.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                  </div>
                </button>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={cycleTheme}
                    className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-white dark:bg-dark-700 hover:bg-gray-50 dark:hover:bg-dark-600 border border-gray-200 dark:border-dark-600 transition-all duration-200 hover:scale-105 hover:shadow-lg group"
                    title={t('theme.changeTheme')}
                  >
                    {theme === 'light' ? (
                      <FiSun size={18} className="text-yellow-500 group-hover:rotate-90 transition-transform duration-300" />
                    ) : (
                      <FiMoon size={18} className="text-blue-500 group-hover:-rotate-12 transition-transform duration-300" />
                    )}
                    <span className="text-xs text-gray-600 dark:text-gray-400">{t('navigation.theme')}</span>
                  </button>
                  
                  <button
                    onClick={toggleLanguage}
                    className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-white dark:bg-dark-700 hover:bg-gray-50 dark:hover:bg-dark-600 border border-gray-200 dark:border-dark-600 transition-all duration-200 hover:scale-105 hover:shadow-lg group"
                    title={t('language.changeLanguage')}
                  >
                    <FiGlobe size={18} className="text-green-500 group-hover:rotate-180 transition-transform duration-500" />
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">{i18n.language}</span>
                  </button>
                  
                  <button
                    onClick={() => logout()}
                    className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 hover:from-red-100 hover:to-red-200 dark:hover:from-red-900/30 dark:hover:to-red-800/30 border border-red-200 dark:border-red-800/50 transition-all duration-200 hover:scale-105 hover:shadow-lg group"
                    title={t('auth.logout')}
                  >
                    <FiLogOut size={18} className="text-red-600 dark:text-red-400 group-hover:translate-x-0.5 transition-transform duration-200" />
                    <span className="text-xs text-red-600 dark:text-red-400">{t('navigation.logout')}</span>
                  </button>
                </div>
              </>
            ) : (
              /* Collapsed User Section */
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => setShowUserProfile(true)}
                  className="relative group"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center font-bold shadow-lg cursor-pointer hover:scale-110 transition-transform duration-200">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white dark:border-dark-800 rounded-full" />
                </button>
                
                <button
                  onClick={cycleTheme}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-dark-700 hover:bg-gray-50 dark:hover:bg-dark-600 border border-gray-200 dark:border-dark-600 transition-all duration-200 hover:scale-110"
                  title={t('theme.changeTheme')}
                >
                  {theme === 'light' ? <FiSun size={18} className="text-yellow-500" /> : <FiMoon size={18} className="text-blue-500" />}
                </button>
                
                <button
                  onClick={toggleLanguage}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-dark-700 hover:bg-gray-50 dark:hover:bg-dark-600 border border-gray-200 dark:border-dark-600 transition-all duration-200 hover:scale-110"
                  title={t('language.changeLanguage')}
                >
                  <FiGlobe size={18} className="text-green-500" />
                </button>
                
                <button
                  onClick={() => logout()}
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800/50 transition-all duration-200 hover:scale-110"
                  title={t('auth.logout')}
                >
                  <FiLogOut size={18} className="text-red-600 dark:text-red-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex min-w-0 flex-1 flex-col overflow-x-hidden transition-all duration-300 print:ml-0 print:overflow-visible ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'}`}>
        {/* Modern Top bar */}
        <header className="print:hidden sticky top-0 z-30 grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-gray-200/50 bg-white/80 px-3 backdrop-blur-xl dark:border-dark-700/50 dark:bg-dark-800/80 sm:px-6 lg:flex lg:justify-between shadow-sm">
          <div className="relative z-10 flex min-w-0 items-center gap-1.5 sm:gap-4">
            <button
              onClick={() => {
                setSidebarOpen(!sidebarOpen);
              }}
              className="relative z-20 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-dark-700 dark:hover:text-white lg:hidden"
              aria-label={sidebarOpen ? t('navigation.collapse') : t('navigation.expand')}
            >
              <FiMenu size={22} className="relative z-10" />
            </button>
            <Link 
              to="/dashboard" 
              className="group flex min-w-0 shrink items-center gap-2 lg:hidden"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 shadow-md">
                <span className="text-sm font-bold text-white">P</span>
              </div>
              <span className="hidden truncate text-lg font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent sm:inline sm:text-xl">
                PlanTim
              </span>
            </Link>
            
            {/* Welcome Message - moved to left side */}
            <div className="ml-4 hidden items-center lg:flex">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('dashboard.welcome')}, {user?.name}! 👋
              </span>
            </div>
          </div>
          
          <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-4">
            {/* Search Bar */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 dark:bg-dark-700 border border-gray-200 dark:border-dark-600 hover:border-primary-300 dark:hover:border-primary-700 transition-all duration-200 w-64">
              <FiSearch size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder={t('common.search')}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400"
              />
            </div>

            {/* Korisničko uputstvo */}
            <Link
              to="/uputstvo"
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-primary-600 shadow-sm transition hover:border-primary-300 hover:bg-primary-50 dark:border-dark-600 dark:bg-dark-800 dark:text-primary-400 dark:hover:bg-dark-700 sm:h-10 sm:w-10"
              title="Korisničko uputstvo"
              aria-label="Korisničko uputstvo"
            >
              <FiBookOpen size={18} />
            </Link>

            {/* Edel — AI pomoćnik */}
            <button
              type="button"
              onClick={() => setEdelOpen(true)}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#9d174d]/80 bg-white shadow-md ring-2 ring-[#9d174d]/15 transition hover:border-[#9d174d] hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9d174d] focus-visible:ring-offset-2 dark:bg-dark-800 dark:ring-offset-dark-900 sm:h-10 sm:w-10 sm:hover:scale-105"
              title={t('ai.openEdel')}
              aria-label={t('ai.openEdel')}
            >
              <img
                src="/edel-mascot.png"
                alt=""
                className="h-full w-full object-cover object-top"
              />
            </button>
            
            {/* Inbox */}
            <InboxBell />
            
            {/* Notifications */}
            <NotificationBell />

            {/* User Avatar - clickable to open profile */}
            <button
              onClick={() => setShowUserProfile(true)}
              className="flex shrink-0 items-center gap-2 rounded-xl p-1 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors cursor-pointer sm:p-1.5 sm:pr-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 text-sm font-semibold text-white shadow-md">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="hidden xl:block text-sm font-medium text-gray-700 dark:text-gray-300">
                {user?.name}
              </span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6 print:overflow-visible print:p-0">
          <Outlet />
        </main>
      </div>

      {/* Modern Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/40 backdrop-blur-sm z-30 lg:hidden animate-fadeIn"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* User Profile Modal */}
      {showUserProfile && (
        <UserProfile onClose={() => setShowUserProfile(false)} />
      )}

      <EdelAssistant open={edelOpen} onClose={() => setEdelOpen(false)} userDisplayName={user?.name} />
    </div>
  );
}



import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiChevronDown,
  FiChevronRight,
  FiEye,
  FiEyeOff,
  FiPackage,
  FiSearch,
  FiToggleLeft,
  FiToggleRight,
} from 'react-icons/fi';

export interface ModulePermission {
  module_name: string;
  parent_name?: string | null;
  display_name: string;
  icon: string;
  is_plugin: boolean;
  available_permissions: string[];
  can_view: boolean;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_import: boolean;
  custom_permissions: Record<string, boolean> | null;
}

type PermissionNode = {
  permission: ModulePermission;
  index: number;
  children: PermissionNode[];
};

const BASIC_PERMS = [
  'can_view',
  'can_read',
  'can_create',
  'can_update',
  'can_delete',
  'can_export',
  'can_import',
] as const;

const PERMISSION_LABELS: Record<string, string> = {
  can_view: 'Pregled modula',
  can_read: 'Čitanje',
  can_create: 'Kreiranje',
  can_update: 'Izmjena',
  can_delete: 'Brisanje',
  can_export: 'Izvoz',
  can_import: 'Uvoz',
  create: 'Unos reklamacija',
  view_own: 'Pregled svoje prodavnice',
  review: 'Obrada reklamacija',
  view_all: 'Pregled svih prodavnica',
  manage: 'Administracija',
  import: 'Uvoz Excel',
  view: 'Pregled',
  pair: 'Uparivanje zabrana',
  report: 'Izvještaji',
  controls_create: 'Unos kontrola',
  controls_review: 'Pregled kontrola',
  evaluations_create: 'Unos evaluacija',
  plans_manage: 'Upravljanje planovima',
  stores_manage: 'Upravljanje prodavnicama',
  reports_view: 'Pregled izvještaja',
  reports_view_all: 'Pregled svih izvještaja',
  view_reports: 'Finansijski izvještaji',
  manage_budgets: 'Upravljanje budžetom',
  export: 'Izvoz podataka',
};

function labelForPermission(key: string): string {
  if (PERMISSION_LABELS[key]) return PERMISSION_LABELS[key];
  return key.replace(/_/g, ' ');
}

function buildPermissionTree(permissions: ModulePermission[]): PermissionNode[] {
  const nodes = new Map<string, PermissionNode>();

  permissions.forEach((permission, index) => {
    nodes.set(permission.module_name, { permission, index, children: [] });
  });

  const roots: PermissionNode[] = [];

  permissions.forEach((permission) => {
    const node = nodes.get(permission.module_name);
    if (!node) return;

    if (permission.parent_name && nodes.has(permission.parent_name)) {
      nodes.get(permission.parent_name)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function collectNodeIndices(node: PermissionNode): number[] {
  return [node.index, ...node.children.flatMap(collectNodeIndices)];
}

function applyEnableToPermission(permission: ModulePermission, enable: boolean, viewOnly = false): ModulePermission {
  const customPerms: Record<string, boolean> = {};
  if (!viewOnly && permission.available_permissions) {
    permission.available_permissions.forEach((cp) => {
      customPerms[cp] = enable;
    });
  }

  if (viewOnly) {
    return {
      ...permission,
      can_view: enable,
      can_read: enable,
      can_create: false,
      can_update: false,
      can_delete: false,
      can_export: false,
      can_import: false,
      custom_permissions: permission.custom_permissions
        ? Object.fromEntries(Object.keys(permission.custom_permissions).map((k) => [k, false]))
        : null,
    };
  }

  return {
    ...permission,
    can_view: enable,
    can_read: enable,
    can_create: enable,
    can_update: enable,
    can_delete: enable,
    can_export: enable,
    can_import: enable,
    custom_permissions: Object.keys(customPerms).length > 0 ? customPerms : permission.custom_permissions,
  };
}

function countEnabledInTree(nodes: PermissionNode[], permissions: ModulePermission[]): { enabled: number; total: number } {
  let enabled = 0;
  let total = 0;

  const walk = (list: PermissionNode[]) => {
    list.forEach((node) => {
      total += 1;
      if (permissions[node.index]?.can_view) enabled += 1;
      walk(node.children);
    });
  };

  walk(nodes);
  return { enabled, total };
}

function filterTree(nodes: PermissionNode[], query: string, permissions: ModulePermission[]): PermissionNode[] {
  if (!query.trim()) return nodes;

  const q = query.trim().toLowerCase();

  const filterNode = (node: PermissionNode): PermissionNode | null => {
    const p = permissions[node.index];
    const selfMatch =
      p.display_name.toLowerCase().includes(q) ||
      p.module_name.toLowerCase().includes(q);

    const filteredChildren = node.children
      .map(filterNode)
      .filter((child): child is PermissionNode => child !== null);

    if (selfMatch || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }

    return null;
  };

  return nodes
    .map(filterNode)
    .filter((node): node is PermissionNode => node !== null);
}

interface ModulePermissionsTreeProps {
  permissions: ModulePermission[];
  onChange: (permissions: ModulePermission[]) => void;
}

export default function ModulePermissionsTree({ permissions, onChange }: ModulePermissionsTreeProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const tree = useMemo(() => buildPermissionTree(permissions), [permissions]);
  const filteredTree = useMemo(() => filterTree(tree, search, permissions), [tree, search, permissions]);
  const stats = useMemo(() => countEnabledInTree(tree, permissions), [tree, permissions]);

  const updateAtIndex = (index: number, updater: (perm: ModulePermission) => ModulePermission) => {
    onChange(permissions.map((perm, i) => (i === index ? updater(perm) : perm)));
  };

  const updateMany = (indices: number[], updater: (perm: ModulePermission) => ModulePermission) => {
    const indexSet = new Set(indices);
    onChange(permissions.map((perm, i) => (indexSet.has(i) ? updater(perm) : perm)));
  };

  const toggleExpanded = (moduleName: string) => {
    setExpanded((prev) => ({ ...prev, [moduleName]: !prev[moduleName] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    permissions.forEach((p) => {
      next[p.module_name] = true;
    });
    setExpanded(next);
  };

  const collapseAll = () => setExpanded({});

  const enableViewForAll = () => {
    onChange(permissions.map((p) => applyEnableToPermission(p, true, true)));
  };

  const disableAll = () => {
    onChange(permissions.map((p) => applyEnableToPermission(p, false)));
  };

  const renderPermissionDetails = (permission: ModulePermission, index: number) => (
    <div className="mt-3 space-y-3 border-t border-gray-200/80 pt-3 dark:border-gray-700">
      <div className="flex flex-wrap gap-2">
        {BASIC_PERMS.map((perm) => {
          const isView = perm === 'can_view';
          const active = Boolean(permission[perm]);
          return (
            <button
              key={perm}
              type="button"
              onClick={() => updateAtIndex(index, (p) => ({ ...p, [perm]: !active }))}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? isView
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {perm === 'can_view' ? t('admin.canView') || 'Pregled' : labelForPermission(perm)}
            </button>
          );
        })}
      </div>

      {permission.available_permissions?.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('admin.moduleSpecificPermissions')}
          </p>
          <div className="flex flex-wrap gap-2">
            {permission.available_permissions.map((customPerm) => {
              const active = permission.custom_permissions?.[customPerm] ?? false;
              return (
                <button
                  key={customPerm}
                  type="button"
                  onClick={() =>
                    updateAtIndex(index, (p) => ({
                      ...p,
                      custom_permissions: {
                        ...(p.custom_permissions ?? {}),
                        [customPerm]: !active,
                      },
                    }))
                  }
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  {labelForPermission(customPerm)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderNode = (node: PermissionNode, depth = 0) => {
    const { permission, index, children } = node;
    const hasChildren = children.length > 0;
    const isOpen = expanded[permission.module_name] ?? depth < 1;
    const isVisible = permission.can_view;
    const childEnabled = children.filter((c) => permissions[c.index]?.can_view).length;

    return (
      <div key={permission.module_name} className={depth > 0 ? 'ml-4 border-l-2 border-gray-200 pl-4 dark:border-gray-700' : ''}>
        <div
          className={`rounded-xl border transition-colors ${
            isVisible
              ? 'border-green-300 bg-green-50/70 dark:border-green-800 dark:bg-green-900/10'
              : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/50'
          }`}
        >
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggleExpanded(permission.module_name)}
                  className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                >
                  {isOpen ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                </button>
              ) : (
                <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-700">
                  <FiPackage size={14} />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{permission.display_name}</h4>
                  {depth === 0 && permission.is_plugin && (
                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-purple-700 dark:bg-purple-900/40 dark:text-purple-200">
                      Plugin
                    </span>
                  )}
                  {hasChildren && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {childEnabled}/{children.length} podmodula
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    isVisible
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {isVisible ? <FiEye size={10} /> : <FiEyeOff size={10} />}
                    {isVisible ? 'U meniju' : 'Skriveno'}
                  </span>
                </div>
                <p className="mt-0.5 truncate font-mono text-xs text-gray-500 dark:text-gray-400">
                  {permission.module_name}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => updateAtIndex(index, (p) => applyEnableToPermission(p, !p.can_view, true))}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  isVisible
                    ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {isVisible ? 'Isključi pregled' : 'Uključi pregled'}
              </button>
              <button
                type="button"
                onClick={() => updateAtIndex(index, (p) => applyEnableToPermission(p, true))}
                className="rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
              >
                Sve dozvole
              </button>
              {hasChildren && (
                <button
                  type="button"
                  onClick={() =>
                    updateMany(collectNodeIndices(node), (p) => applyEnableToPermission(p, true, true))
                  }
                  className="rounded-lg bg-teal-100 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-200 dark:bg-teal-900/30 dark:text-teal-300"
                >
                  Grupa: pregled
                </button>
              )}
            </div>
          </div>

          {(isOpen || !hasChildren) && renderPermissionDetails(permission, index)}
        </div>

        {hasChildren && isOpen && (
          <div className="mt-3 space-y-3">
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            Moduli i podmoduli
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {stats.enabled} od {stats.total} vidljivo u meniju · novi moduli iz baze se automatski prikazuju
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={enableViewForAll} className="btn-secondary text-xs px-3 py-1.5">
            <FiToggleRight className="mr-1 inline" size={14} />
            Pregled svima
          </button>
          <button type="button" onClick={disableAll} className="btn-secondary text-xs px-3 py-1.5">
            <FiToggleLeft className="mr-1 inline" size={14} />
            Ukloni sve
          </button>
          <button type="button" onClick={expandAll} className="btn-secondary text-xs px-3 py-1.5">
            Proširi sve
          </button>
          <button type="button" onClick={collapseAll} className="btn-secondary text-xs px-3 py-1.5">
            Skupi sve
          </button>
        </div>
      </div>

      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pretraži module i podmodule…"
          className="input pl-9"
        />
      </div>

      {filteredTree.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-600">
          Nema modula za prikaz. Provjerite pretragu ili pokrenite migracije/seeder za `system_modules`.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTree.map((node) => renderNode(node))}
        </div>
      )}
    </div>
  );
}

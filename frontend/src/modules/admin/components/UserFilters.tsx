import { FiX } from 'react-icons/fi';

interface UserFiltersProps {
  filters: {
    is_active: string;
    role: string;
    sort: string;
  };
  setFilters: (filters: any) => void;
  onClose: () => void;
}

export default function UserFilters({ filters, setFilters, onClose }: UserFiltersProps) {
  const handleReset = () => {
    setFilters({
      is_active: 'all',
      role: 'all',
      sort: 'created_at_desc',
    });
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-dark-600">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Filteri</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600"
        >
          <FiX size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div>
          <label className="label">Status</label>
          <select
            value={filters.is_active}
            onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
            className="input"
          >
            <option value="all">Svi</option>
            <option value="1">Samo Aktivni</option>
            <option value="0">Samo Neaktivni</option>
          </select>
        </div>

        {/* Role Filter */}
        <div>
          <label className="label">Uloga</label>
          <select
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            className="input"
          >
            <option value="all">Sve Uloge</option>
            <option value="super-admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
            <option value="user">User</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <label className="label">Sortiraj</label>
          <select
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
            className="input"
          >
            <option value="created_at_desc">Najnoviji Prvo</option>
            <option value="created_at_asc">Najstariji Prvo</option>
            <option value="name_asc">Ime (A-Z)</option>
            <option value="name_desc">Ime (Z-A)</option>
            <option value="last_login_desc">Poslednja Prijava (Najnovija)</option>
            <option value="last_login_asc">Poslednja Prijava (Najstarija)</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        <button onClick={handleReset} className="btn-secondary text-sm">
          Resetuj Filtere
        </button>
      </div>
    </div>
  );
}







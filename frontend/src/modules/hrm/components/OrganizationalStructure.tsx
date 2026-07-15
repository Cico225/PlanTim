import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Edit2, Trash2, Users, User, Search, Filter, X, Store, Briefcase, MapPin, Phone, Mail } from 'lucide-react';
import { 
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getStores, createStore, updateStore, deleteStore,
  getWorkPositions, createWorkPosition, updateWorkPosition, deleteWorkPosition
} from '../../../services/hrmService';
import type { HRDepartment, HRStore, HRWorkPosition } from '../../../types/hrm';
import toast from 'react-hot-toast';

type TabType = 'departments' | 'stores' | 'positions';

export default function OrganizationalStructure() {
  const [activeTab, setActiveTab] = useState<TabType>('departments');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-6 h-6 text-teal-500" />
          Organizacijska struktura
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Upravljanje odjelima, prodavnicama i radnim mjestima</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('departments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'departments'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Building2 className="w-4 h-4 inline mr-2" />
            Odjeli
          </button>
          <button
            onClick={() => setActiveTab('stores')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stores'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Store className="w-4 h-4 inline mr-2" />
            Prodavnice
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'positions'
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Briefcase className="w-4 h-4 inline mr-2" />
            Radna mjesta
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'departments' && <DepartmentsTab />}
      {activeTab === 'stores' && <StoresTab />}
      {activeTab === 'positions' && <WorkPositionsTab />}
    </div>
  );
}

// Departments Tab
function DepartmentsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<HRDepartment | null>(null);
  const queryClient = useQueryClient();

  const { data: departments, isLoading } = useQuery({
    queryKey: ['hrm-departments', divisionFilter, searchTerm],
    queryFn: async () => {
      const result = await getDepartments();
      let filtered = result.data || result;
      
      if (divisionFilter !== 'all') {
        filtered = filtered.filter((dept: HRDepartment) => dept.division_type === divisionFilter);
      }
      
      if (searchTerm) {
        filtered = filtered.filter((dept: HRDepartment) => 
          dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          dept.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      return filtered;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-departments'] });
      toast.success('Odjel je uspješno obrisan');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Greška pri brisanju odjela';
      toast.error(message);
    },
  });

  const getDivisionColor = (type?: string) => {
    switch (type) {
      case 'direkcija': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'maloprodaja': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getDivisionLabel = (type?: string) => {
    switch (type) {
      case 'direkcija': return 'Direkcija';
      case 'maloprodaja': return 'Maloprodaja';
      default: return 'Nije određeno';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 items-center flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Pretraži odjele..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">Svi tipovi</option>
              <option value="direkcija">Direkcija</option>
              <option value="maloprodaja">Maloprodaja</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingDepartment(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Dodaj odjel
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
        </div>
      ) : departments && departments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((department: HRDepartment) => (
            <div
              key={department.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {department.name}
                  </h3>
                  {department.parent_department_name && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {department.parent_department_name}
                    </p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDivisionColor(department.division_type)}`}>
                  {getDivisionLabel(department.division_type)}
                </span>
              </div>

              {department.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {department.description}
                </p>
              )}

              <div className="space-y-2 mb-4">
                {(department.employees_count || department.employees_count === 0) && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    {department.employees_count || department.employee_count || 0} zaposlenih
                  </div>
                )}
                {department.manager_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <User className="w-4 h-4" />
                    {department.manager_name}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setEditingDepartment(department);
                    setShowForm(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Izmjeni
                </button>
                <button
                  onClick={() => {
                    if (confirm('Da li ste sigurni da želite obrisati ovaj odjel?')) {
                      deleteMutation.mutate(department.id);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Obriši
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nema odjela za prikaz</p>
        </div>
      )}

      {showForm && (
        <DepartmentFormModal
          department={editingDepartment}
          onClose={() => {
            setShowForm(false);
            setEditingDepartment(null);
          }}
        />
      )}
    </div>
  );
}

// Stores Tab - will continue in next message due to length
function StoresTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingStore, setEditingStore] = useState<HRStore | null>(null);
  const queryClient = useQueryClient();

  const { data: departments } = useQuery({
    queryKey: ['hrm-departments'],
    queryFn: () => getDepartments(),
  });

  const { data: stores, isLoading } = useQuery({
    queryKey: ['hrm-stores', departmentFilter, searchTerm],
    queryFn: async () => {
      const result = await getStores({ 
        department_id: departmentFilter !== 'all' ? Number(departmentFilter) : undefined,
        search: searchTerm,
      });
      return result.data || result;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteStore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-stores'] });
      toast.success('Prodavnica je uspješno obrisana');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 items-center flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Pretraži prodavnice..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">Svi odjeli</option>
              {(departments?.data || departments || []).map((dept: HRDepartment) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingStore(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Dodaj prodavnicu
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
        </div>
      ) : stores && stores.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store: HRStore) => (
            <div
              key={store.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {store.name}
                  </h3>
                  {store.department_name && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{store.department_name}</p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  store.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800'
                }`}>
                  {store.is_active ? 'Aktivna' : 'Neaktivna'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {store.address && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4" />
                    {store.address}
                  </div>
                )}
                {store.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Phone className="w-4 h-4" />
                    {store.phone}
                  </div>
                )}
                {store.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Mail className="w-4 h-4" />
                    {store.email}
                  </div>
                )}
                {store.manager_name && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <User className="w-4 h-4" />
                    {store.manager_name}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setEditingStore(store);
                    setShowForm(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Izmjeni
                </button>
                <button
                  onClick={() => {
                    if (confirm('Da li ste sigurni da želite obrisati ovu prodavnicu?')) {
                      deleteMutation.mutate(store.id);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Obriši
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nema prodavnica za prikaz</p>
        </div>
      )}

      {showForm && (
        <StoreFormModal
          store={editingStore}
          departments={departments?.data || departments || []}
          onClose={() => {
            setShowForm(false);
            setEditingStore(null);
          }}
        />
      )}
    </div>
  );
}

// Work Positions Tab
function WorkPositionsTab() {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingPosition, setEditingPosition] = useState<HRWorkPosition | null>(null);
  const queryClient = useQueryClient();

  const { data: departments } = useQuery({
    queryKey: ['hrm-departments'],
    queryFn: () => getDepartments(),
  });

  const { data: stores } = useQuery({
    queryKey: ['hrm-stores'],
    queryFn: () => getStores(),
  });

  const { data: positions, isLoading } = useQuery({
    queryKey: ['hrm-work-positions', departmentFilter, searchTerm],
    queryFn: async () => {
      const result = await getWorkPositions({ 
        department_id: departmentFilter !== 'all' ? Number(departmentFilter) : undefined,
        search: searchTerm,
      });
      return result.data || result;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteWorkPosition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-work-positions'] });
      toast.success('Radno mjesto je uspješno obrisano');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4 items-center flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Pretraži radna mjesta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">Svi odjeli</option>
              {(departments?.data || departments || []).map((dept: HRDepartment) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={() => {
            setEditingPosition(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Dodaj radno mjesto
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
        </div>
      ) : positions && positions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {positions.map((position: HRWorkPosition) => (
            <div
              key={position.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {position.name}
                  </h3>
                  {position.department_name && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">{position.department_name}</p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  position.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800'
                }`}>
                  {position.is_active ? 'Aktivno' : 'Neaktivno'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {position.employment_type && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Tip: {position.employment_type === 'full-time' ? 'Puno vrijeme' : position.employment_type}
                  </div>
                )}
                {(position.min_salary || position.max_salary) && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Plata: {position.min_salary ? `${position.min_salary.toLocaleString()} KM` : ''} 
                    {position.min_salary && position.max_salary ? ' - ' : ''}
                    {position.max_salary ? `${position.max_salary.toLocaleString()} KM` : ''}
                  </div>
                )}
                {position.max_employees && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Maksimalno zaposlenih: {position.max_employees} (Trenutno: {position.current_employees})
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setEditingPosition(position);
                    setShowForm(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Izmjeni
                </button>
                <button
                  onClick={() => {
                    if (confirm('Da li ste sigurni da želite obrisati ovo radno mjesto?')) {
                      deleteMutation.mutate(position.id);
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Obriši
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Nema radnih mjesta za prikaz</p>
        </div>
      )}

      {showForm && (
        <WorkPositionFormModal
          position={editingPosition}
          departments={departments?.data || departments || []}
          stores={stores?.data || stores || []}
          onClose={() => {
            setShowForm(false);
            setEditingPosition(null);
          }}
        />
      )}
    </div>
  );
}

// Modal Components - will be in separate file or continue here
// For now, I'll include simplified versions

function DepartmentFormModal({ department, onClose }: { department: HRDepartment | null; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: department?.name || '',
    description: department?.description || '',
    division_type: department?.division_type || '',
    manager_id: department?.manager_id || '',
    parent_department_id: department?.parent_department_id || department?.parent_id || '',
  });

  const queryClient = useQueryClient();

  const { data: departmentsData } = useQuery({
    queryKey: ['hrm-departments'],
    queryFn: () => getDepartments(),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { apiService } = await import('../../../services/api');
      return apiService.get('/admin/users');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createDepartment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-departments'] });
      toast.success('Odjel je uspješno kreiran');
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-departments'] });
      toast.success('Odjel je uspješno ažuriran');
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      manager_id: formData.manager_id ? Number(formData.manager_id) : null,
      parent_department_id: formData.parent_department_id ? Number(formData.parent_department_id) : null,
    };
    
    if (department) {
      updateMutation.mutate({ id: department.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const departments = departmentsData?.data || departmentsData || [];
  const users = usersData?.data || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {department ? 'Izmjeni odjel' : 'Novi odjel'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Naziv odjela *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tip odjela *
            </label>
            <select
              required
              value={formData.division_type}
              onChange={(e) => setFormData({ ...formData, division_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Izaberi tip odjela</option>
              <option value="direkcija">Direkcija</option>
              <option value="maloprodaja">Maloprodaja</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nadređeni odjel
            </label>
            <select
              value={formData.parent_department_id}
              onChange={(e) => setFormData({ ...formData, parent_department_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Nema nadređenog odjela</option>
              {departments
                .filter((dept: HRDepartment) => !department || dept.id !== department.id)
                .map((dept: HRDepartment) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Menadžer
            </label>
            <select
              value={formData.manager_id}
              onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Nema menadžera</option>
              {users.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Opis
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Otkaži
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              {department ? 'Sačuvaj izmjene' : 'Kreiraj odjel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Store Form Modal
function StoreFormModal({ store, departments, onClose }: { store: HRStore | null; departments: HRDepartment[]; onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: store?.name || '',
    code: store?.code || '',
    department_id: store?.department_id || '',
    store_manager_id: store?.store_manager_id || '',
    address: store?.address || '',
    city: store?.city || '',
    phone: store?.phone || '',
    email: store?.email || '',
    description: store?.description || '',
    is_active: store?.is_active ?? true,
  });

  const queryClient = useQueryClient();

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { apiService } = await import('../../../services/api');
      return apiService.get('/admin/users');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createStore(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-stores'] });
      toast.success('Prodavnica je uspješno kreirana');
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateStore(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-stores'] });
      toast.success('Prodavnica je uspješno ažurirana');
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      department_id: formData.department_id ? Number(formData.department_id) : null,
      store_manager_id: formData.store_manager_id ? Number(formData.store_manager_id) : null,
    };
    
    if (store) {
      updateMutation.mutate({ id: store.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const users = usersData?.data || [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {store ? 'Izmjeni prodavnicu' : 'Nova prodavnica'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Naziv prodavnice *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kod
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Odjel
            </label>
            <select
              value={formData.department_id}
              onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Izaberi odjel</option>
              {departments.map((dept: HRDepartment) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Adresa
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Grad
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Telefon
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Menadžer prodavnice
            </label>
            <select
              value={formData.store_manager_id}
              onChange={(e) => setFormData({ ...formData, store_manager_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Nema menadžera</option>
              {users.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Opis
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-teal-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Aktivna</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Otkaži
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              {store ? 'Sačuvaj izmjene' : 'Kreiraj prodavnicu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Work Position Form Modal
function WorkPositionFormModal({ position, departments, stores, onClose }: { 
  position: HRWorkPosition | null; 
  departments: HRDepartment[];
  stores: HRStore[];
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: position?.name || '',
    code: position?.code || '',
    department_id: position?.department_id || '',
    store_id: position?.store_id || '',
    description: position?.description || '',
    requirements: position?.requirements || '',
    employment_type: position?.employment_type || 'full-time',
    min_salary: position?.min_salary || '',
    max_salary: position?.max_salary || '',
    max_employees: position?.max_employees || '',
    is_active: position?.is_active ?? true,
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => createWorkPosition(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-work-positions'] });
      toast.success('Radno mjesto je uspješno kreirano');
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateWorkPosition(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-work-positions'] });
      toast.success('Radno mjesto je uspješno ažurirano');
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      department_id: formData.department_id ? Number(formData.department_id) : null,
      store_id: formData.store_id ? Number(formData.store_id) : null,
      min_salary: formData.min_salary ? Number(formData.min_salary) : null,
      max_salary: formData.max_salary ? Number(formData.max_salary) : null,
      max_employees: formData.max_employees ? Number(formData.max_employees) : null,
    };
    
    if (position) {
      updateMutation.mutate({ id: position.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  // Filter stores based on selected department
  const filteredStores = formData.department_id 
    ? stores.filter((store: HRStore) => store.department_id === Number(formData.department_id))
    : stores;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {position ? 'Izmjeni radno mjesto' : 'Novo radno mjesto'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Naziv radnog mjesta *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kod
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Odjel
            </label>
            <select
              value={formData.department_id}
              onChange={(e) => {
                setFormData({ ...formData, department_id: e.target.value, store_id: '' });
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Izaberi odjel</option>
              {departments.map((dept: HRDepartment) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prodavnica
            </label>
            <select
              value={formData.store_id}
              onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={!formData.department_id}
            >
              <option value="">Nema prodavnice</option>
              {filteredStores.map((store: HRStore) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tip zaposlenja
            </label>
            <select
              value={formData.employment_type}
              onChange={(e) => setFormData({ ...formData, employment_type: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="full-time">Puno vrijeme</option>
              <option value="part-time">Djelimično</option>
              <option value="contract">Ugovor</option>
              <option value="intern">Praksa</option>
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min. plata (KM)
              </label>
              <input
                type="number"
                value={formData.min_salary}
                onChange={(e) => setFormData({ ...formData, min_salary: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max. plata (KM)
              </label>
              <input
                type="number"
                value={formData.max_salary}
                onChange={(e) => setFormData({ ...formData, max_salary: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max. zaposlenih
              </label>
              <input
                type="number"
                value={formData.max_employees}
                onChange={(e) => setFormData({ ...formData, max_employees: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Opis
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Zahtjevi
            </label>
            <textarea
              rows={3}
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-teal-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Aktivno</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Otkaži
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              {position ? 'Sačuvaj izmjene' : 'Kreiraj radno mjesto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}








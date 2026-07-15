import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Edit2, Trash2, Users, User, ChevronRight, Search, Filter, X, Store, Briefcase } from 'lucide-react';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment, getStores, createStore, updateStore, deleteStore, getWorkPositions, createWorkPosition, updateWorkPosition, deleteWorkPosition } from '../../../services/hrmService';
import type { HRDepartment, HRStore, HRWorkPosition } from '../../../types/hrm';
import toast from 'react-hot-toast';

export default function DepartmentsList() {
  const [activeTab, setActiveTab] = useState<'departments' | 'stores' | 'positions'>('departments');
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<HRDepartment | HRStore | HRWorkPosition | null>(null);
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

  const handleDelete = (id: number) => {
    if (confirm('Da li ste sigurni da želite obrisati ovaj odjel?')) {
      deleteMutation.mutate(id);
    }
  };

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-teal-500" />
            Organizacijska struktura
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Upravljanje odjelima i hijerarhijom</p>
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

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
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

      {/* Departments List */}
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
                  Izmeni
                </button>
                <button
                  onClick={() => handleDelete(department.id)}
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

      {/* Department Form Modal */}
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
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Greška pri kreiranju odjela';
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateDepartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hrm-departments'] });
      toast.success('Odjel je uspješno ažuriran');
      onClose();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Greška pri ažuriranju odjela';
      toast.error(message);
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
            {department ? 'Izmeni odjel' : 'Novi odjel'}
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
              {department ? 'Sačuvaj izmene' : 'Kreiraj odjel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


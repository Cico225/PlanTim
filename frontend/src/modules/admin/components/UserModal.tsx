import { useState, useEffect } from 'react';
import { FiX, FiUser, FiMail, FiLock, FiPhone, FiImage, FiSave } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { apiService } from '@/services/api';

interface UserModalProps {
  user: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UserModal({ user, onClose, onSuccess }: UserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    is_active: true,
    role: 'employee',
  });
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        password: '',
        phone: user.phone || '',
        is_active: user.is_active ?? true,
        role: user.roles?.[0] || 'employee',
      });
    }
    fetchRoles();
  }, [user]);

  const fetchRoles = async () => {
    try {
      const data = await apiService.get('/admin/roles');
      setRoles(data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (user) {
        // Update user
        await apiService.put(`/admin/users/${user.id}`, formData);
        toast.success('Korisnik uspešno ažuriran');
      } else {
        // Create user
        await apiService.post('/admin/users', formData);
        toast.success('Korisnik uspešno kreiran');
      }
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Greška pri čuvanju korisnika');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-dark-600">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {user ? 'Uredi Korisnika' : 'Novi Korisnik'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Name */}
          <div>
            <label className="label">
              <FiUser className="inline mr-2" />
              Ime i Prezime *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input"
              placeholder="Unesite ime i prezime"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="label">
              <FiMail className="inline mr-2" />
              Email Adresa *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              placeholder="korisnik@example.com"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="label">
              <FiLock className="inline mr-2" />
              Lozinka {!user && '*'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input"
              placeholder={user ? 'Ostavite prazno za zadržavanje postojeće' : 'Minimalno 8 karaktera'}
              required={!user}
              minLength={8}
            />
            {user && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Ostavite prazno ako ne želite promeniti lozinku
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="label">
              <FiPhone className="inline mr-2" />
              Telefon
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input"
              placeholder="+387 XX XXX XXX"
            />
          </div>

          {/* Role */}
          <div>
            <label className="label">Uloga *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="input"
              required
            >
              <option value="">Izaberite ulogu</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
            />
            <label htmlFor="is_active" className="text-gray-900 dark:text-white font-medium cursor-pointer">
              Aktivan Nalog
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              <FiSave size={18} />
              {loading ? 'Čuvanje...' : user ? 'Ažuriraj Korisnika' : 'Kreiraj Korisnika'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Otkaži
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



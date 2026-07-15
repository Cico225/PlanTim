import { useState, useEffect } from 'react';
import { Link, Routes, Route } from 'react-router-dom';
import { FiPlus, FiSearch, FiUsers, FiEdit, FiTrash2, FiEye } from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import ContactForm from './ContactForm';
import ContactDetail from './ContactDetail';

interface Contact {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  position?: string;
  status?: string;
}

export default function ContactsList() {
  const { token } = useAuthStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (token) {
      loadContacts();
    }
  }, [token, currentPage, searchTerm]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: '15',
      });
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      const response = await apiService.get(`/crm/contacts?${params}`);
      setContacts(response.data || []);
      setTotalPages(response.last_page || 1);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      toast.error('Greška pri učitavanju kontakata');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Da li ste sigurni da želite obrisati ovaj kontakt?')) {
      return;
    }

    try {
      await apiService.delete(`/crm/contacts/${id}`);
      toast.success('Kontakt uspješno obrisan');
      loadContacts();
    } catch (error) {
      console.error('Failed to delete contact:', error);
      toast.error('Greška pri brisanju kontakta');
    }
  };

  return (
    <Routes>
      <Route index element={
        <div className="max-w-full min-w-0 space-y-4 overflow-x-hidden p-3 sm:space-y-6 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">Kontakti</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 sm:text-base">Upravljanje kontaktima</p>
            </div>
            <Link to="/crm/contacts/new" className="btn-primary flex w-full items-center justify-center gap-2 py-2.5 sm:w-auto sm:py-2">
              <FiPlus />
              Novi Kontakt
            </Link>
          </div>

          <div className="card p-4">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Pretraži kontakte..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {loading ? (
            <div className="card p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="card p-12 text-center">
              <FiUsers className="mx-auto text-gray-400" size={48} />
              <p className="text-gray-600 dark:text-gray-400 mt-4">Nema kontakata</p>
              <Link to="/crm/contacts/new" className="btn-primary mt-4 inline-flex items-center gap-2">
                <FiPlus />
                Dodaj prvi kontakt
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {contacts.map((contact) => (
                  <div key={contact.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {contact.first_name} {contact.last_name}
                        </p>
                        {contact.position && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{contact.position}</p>
                        )}
                        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 break-all">{contact.email}</p>
                        {contact.phone && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{contact.phone}</p>
                        )}
                        {contact.company_name && (
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{contact.company_name}</p>
                        )}
                      </div>
                      <span className={`shrink-0 px-2 py-1 text-xs font-medium rounded-full ${
                        contact.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {contact.status || 'active'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                      <Link to={`/crm/contacts/${contact.id}`} className="text-blue-600 dark:text-blue-400">
                        <FiEye size={20} />
                      </Link>
                      <Link to={`/crm/contacts/${contact.id}/edit`} className="text-yellow-600 dark:text-yellow-400">
                        <FiEdit size={20} />
                      </Link>
                      <button onClick={() => handleDelete(contact.id)} className="text-red-600 dark:text-red-400">
                        <FiTrash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card hidden overflow-hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ime</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Kompanija</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Akcije</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {contacts.map((contact) => (
                        <tr key={contact.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {contact.first_name} {contact.last_name}
                            </div>
                            {contact.position && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {contact.position}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">{contact.email}</div>
                            {contact.phone && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">{contact.phone}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900 dark:text-white">
                              {contact.company_name || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              contact.status === 'active' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {contact.status || 'active'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/crm/contacts/${contact.id}`}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900"
                              >
                                <FiEye size={18} />
                              </Link>
                              <Link
                                to={`/crm/contacts/${contact.id}/edit`}
                                className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-900"
                              >
                                <FiEdit size={18} />
                              </Link>
                              <button
                                onClick={() => handleDelete(contact.id)}
                                className="text-red-600 dark:text-red-400 hover:text-red-900"
                              >
                                <FiTrash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary w-full py-2.5 disabled:opacity-50 sm:w-auto sm:py-2"
                  >
                    Prethodna
                  </button>
                  <span className="text-center text-sm text-gray-600 dark:text-gray-400">
                    Strana {currentPage} od {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-secondary w-full py-2.5 disabled:opacity-50 sm:w-auto sm:py-2"
                  >
                    Sljedeća
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      } />
      <Route path="new" element={<ContactForm />} />
      <Route path=":id" element={<ContactDetail />} />
      <Route path=":id/edit" element={<ContactForm />} />
    </Routes>
  );
}


import { useEffect, useState } from 'react';
import { FiAward, FiPlus, FiTrash2, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { lmsService, Certificate, Course } from '@/services/lmsService';
import { useIsLmsAdmin } from '../pages/LMSMaloprodajaLandingPage';
import { apiService } from '@/services/api';

type AdminCertificate = Certificate & {
  course_title?: string;
  user_name?: string;
  user_email?: string;
};

type UserOption = { id: number; name: string; email: string };

export default function CertificateManager() {
  const isAdmin = useIsLmsAdmin();
  const [certificates, setCertificates] = useState<AdminCertificate[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIssue, setShowIssue] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [form, setForm] = useState({
    course_id: '',
    user_id: '',
    final_score: '',
    grade: '',
  });

  useEffect(() => {
    if (isAdmin) loadData();
  }, [isAdmin]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [certs, courseRes] = await Promise.all([
        lmsService.adminListCertificates(),
        lmsService.getCourses({ published: undefined }),
      ]);
      setCertificates(certs.certificates || []);
      setCourses(courseRes.data || []);

      try {
        const usersRes = await apiService.get<any>('/admin/users', { per_page: 200 });
        const list = Array.isArray(usersRes)
          ? usersRes
          : usersRes?.data || usersRes?.users || [];
        setUsers(
          list.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
          }))
        );
      } catch {
        setUsers([]);
      }
    } catch {
      toast.error('Neuspješno učitavanje certifikata');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cert: AdminCertificate) => {
    if (!cert.id) return;
    if (!confirm(`Obrisati certifikat #${cert.certificate_number || cert.id}?`)) return;
    try {
      await lmsService.adminDeleteCertificate(cert.id);
      setCertificates((prev) => prev.filter((c) => c.id !== cert.id));
      toast.success('Certifikat je obrisan');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Neuspješno brisanje certifikata');
    }
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.course_id || !form.user_id) {
      toast.error('Odaberite kurs i korisnika');
      return;
    }

    try {
      setIssuing(true);
      const result = await lmsService.adminIssueCertificate({
        course_id: parseInt(form.course_id, 10),
        user_id: parseInt(form.user_id, 10),
        final_score: form.final_score ? parseFloat(form.final_score) : undefined,
        grade: form.grade || undefined,
      });
      toast.success(result.already_earned ? 'Certifikat već postoji' : result.message);
      setShowIssue(false);
      setForm({ course_id: '', user_id: '', final_score: '', grade: '' });
      await loadData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Neuspješno izdavanje certifikata');
    } finally {
      setIssuing(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="card p-12 text-center">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Nemate pristup</h3>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-lime-200 border-t-lime-600" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Upravljanje certifikatima
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Pregledajte izdane certifikate, izdajte nove ili ih opozovite
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowIssue(true)}
          className="btn-primary inline-flex items-center gap-2"
        >
          <FiPlus className="h-4 w-4" />
          Izdaj certifikat
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-lime-100 bg-white shadow-sm dark:border-lime-900/30 dark:bg-dark-800">
        {certificates.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FiAward className="mx-auto mb-3 h-12 w-12 text-lime-500 opacity-70" />
            <p className="text-gray-600 dark:text-gray-400">Nema izdanih certifikata.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {certificates.map((cert) => (
                <div key={cert.id} className="rounded-xl border border-gray-100 p-4 dark:border-dark-600">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {cert.course_title || `Kurs #${cert.course_id}`}
                  </p>
                  <p className="text-sm text-gray-500">
                    {cert.user_name || `Korisnik #${cert.user_id}`}
                    {cert.user_email ? ` · ${cert.user_email}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {cert.certificate_number}
                    {cert.issued_at
                      ? ` · ${new Date(cert.issued_at).toLocaleDateString('bs-BA')}`
                      : ''}
                  </p>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleDelete(cert)}
                      className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                    >
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead className="bg-lime-50/80 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-lime-950/20">
                  <tr>
                    <th className="px-4 py-3">Kurs</th>
                    <th className="px-4 py-3">Korisnik</th>
                    <th className="px-4 py-3">Broj</th>
                    <th className="px-4 py-3">Rezultat</th>
                    <th className="px-4 py-3">Izdato</th>
                    <th className="px-4 py-3 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
                  {certificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-lime-50/40 dark:hover:bg-dark-900/40">
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {cert.course_title || `#${cert.course_id}`}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        <div>{cert.user_name || `#${cert.user_id}`}</div>
                        {cert.user_email && (
                          <div className="text-xs text-gray-400">{cert.user_email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {cert.certificate_number}
                      </td>
                      <td className="px-4 py-3">
                        {cert.final_score != null ? `${Number(cert.final_score).toFixed(1)}%` : '—'}
                        {cert.grade ? ` (${cert.grade})` : ''}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {cert.issued_at
                          ? new Date(cert.issued_at).toLocaleDateString('bs-BA')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(cert)}
                          className="rounded-lg p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          title="Obriši"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {showIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-dark-800">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Izdaj certifikat
              </h2>
              <button type="button" onClick={() => setShowIssue(false)} className="text-gray-400">
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleIssue} className="space-y-4">
              <div>
                <label className="label">Kurs *</label>
                <select
                  className="input"
                  value={form.course_id}
                  onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                  required
                >
                  <option value="">Odaberite kurs</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Korisnik *</label>
                {users.length > 0 ? (
                  <select
                    className="input"
                    value={form.user_id}
                    onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                    required
                  >
                    <option value="">Odaberite korisnika</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    className="input"
                    placeholder="ID korisnika"
                    value={form.user_id}
                    onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                    required
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Rezultat (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    className="input"
                    value={form.final_score}
                    onChange={(e) => setForm({ ...form, final_score: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Ocjena</label>
                  <input
                    className="input"
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                    placeholder="A / B / C"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowIssue(false)}>
                  Otkaži
                </button>
                <button type="submit" className="btn-primary" disabled={issuing}>
                  {issuing ? 'Izdavanje...' : 'Izdaj'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

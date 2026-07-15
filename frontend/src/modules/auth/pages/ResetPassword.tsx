import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '@/services/authService';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') || '';
  const emailFromQuery = searchParams.get('email') || '';

  const [formData, setFormData] = useState({
    email: emailFromQuery,
    password: '',
    password_confirmation: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !formData.email) {
      toast.error('Link za reset lozinke nije validan ili je istekao.');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Lozinka mora imati najmanje 8 karaktera.');
      return;
    }

    if (formData.password !== formData.password_confirmation) {
      toast.error('Lozinke se ne poklapaju.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.resetPassword(token, formData.email, formData.password);
      toast.success('Lozinka je uspješno resetovana. Možete se prijaviti sa novom lozinkom.');
      navigate('/login');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        'Greška pri resetovanju lozinke.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Postavljanje nove lozinke
      </h2>

      {!token || !emailFromQuery ? (
        <div className="space-y-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            Link za reset lozinke nije validan ili je istekao. Molimo zatražite novi link za reset
            lozinke.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            Povratak na prijavu
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Email adresa</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              required
              readOnly
            />
          </div>

          <div>
            <label className="label">Nova lozinka</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input"
              placeholder="••••••••"
              required
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Lozinka mora imati najmanje 8 karaktera.
            </p>
          </div>

          <div>
            <label className="label">Potvrda lozinke</label>
            <input
              type="password"
              value={formData.password_confirmation}
              onChange={(e) =>
                setFormData({ ...formData, password_confirmation: e.target.value })
              }
              className="input"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-primary py-3"
          >
            {isSubmitting ? 'Spašavam...' : 'Postavi novu lozinku'}
          </button>

          <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Sjetili ste se lozinke?{' '}
            <Link
              to="/login"
              className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
            >
              Povratak na prijavu
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}



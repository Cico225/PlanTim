import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.password_confirmation) {
      toast.error('Lozinke se ne poklapaju');
      return;
    }

    try {
      await register(formData.name, formData.email, formData.password);
      toast.success(t('auth.registerSuccess'));
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Greška pri registraciji');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {t('auth.register')}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">{t('auth.name')}</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input"
            placeholder="Ime Prezime"
            required
          />
        </div>

        <div>
          <label className="label">{t('auth.email')}</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="input"
            placeholder="ime@primjer.com"
            required
          />
        </div>

        <div>
          <label className="label">{t('auth.password')}</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="input"
            placeholder="••••••••"
            required
            minLength={8}
          />
        </div>

        <div>
          <label className="label">{t('auth.confirmPassword')}</label>
          <input
            type="password"
            value={formData.password_confirmation}
            onChange={(e) => setFormData({ ...formData, password_confirmation: e.target.value })}
            className="input"
            placeholder="••••••••"
            required
            minLength={8}
          />
        </div>

        {/* GDPR Consent */}
        <div className="space-y-3">
          <label className="flex items-start">
            <input
              type="checkbox"
              required
              className="w-4 h-4 mt-0.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              Prihvatam{' '}
              <Link to="/terms" className="text-primary-600 dark:text-primary-400 hover:underline">
                uslove korištenja
              </Link>
              {' '}i{' '}
              <Link to="/privacy" className="text-primary-600 dark:text-primary-400 hover:underline">
                politiku privatnosti
              </Link>
              {' '}u skladu sa GDPR propisima
            </span>
          </label>

          {/* reCAPTCHA Notice */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Ova stranica je zaštićena reCAPTCHA uslugom. Primjenjuju se Google{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary-600">
              Pravila privatnosti
            </a>
            {' '}i{' '}
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary-600">
              Uslovi korištenja
            </a>.
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-primary py-3"
        >
          {isLoading ? t('common.loading') : t('auth.registerButton')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        {t('auth.hasAccount')}{' '}
        <Link to="/login" className="text-primary-600 dark:text-primary-400 hover:underline font-medium">
          {t('auth.loginButton')}
        </Link>
      </p>
    </div>
  );
}



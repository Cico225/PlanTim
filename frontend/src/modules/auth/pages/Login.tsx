import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { authService } from '@/services/authService';
import ReCAPTCHA from 'react-google-recaptcha';

type LoginStep = 'credentials' | 'verification';

const LOGIN_VERIFICATION_STORAGE_KEY = 'login-verification-pending';

interface StoredVerificationState {
  verificationToken: string;
  maskedEmail: string;
  verificationCode: string;
}

function loadStoredVerificationState(): StoredVerificationState | null {
  try {
    const raw = sessionStorage.getItem(LOGIN_VERIFICATION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredVerificationState;
    if (!parsed.verificationToken) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function clearStoredVerificationState() {
  sessionStorage.removeItem(LOGIN_VERIFICATION_STORAGE_KEY);
}

function saveStoredVerificationState(state: StoredVerificationState) {
  sessionStorage.setItem(LOGIN_VERIFICATION_STORAGE_KEY, JSON.stringify(state));
}

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, verifyLogin, isLoading } = useAuthStore();
  const storedVerification = loadStoredVerificationState();
  const [step, setStep] = useState<LoginStep>(
    storedVerification ? 'verification' : 'credentials'
  );
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });
  const [verificationToken, setVerificationToken] = useState(storedVerification?.verificationToken ?? '');
  const [maskedEmail, setMaskedEmail] = useState(storedVerification?.maskedEmail ?? '');
  const [verificationCode, setVerificationCode] = useState(storedVerification?.verificationCode ?? '');
  const [isResendingCode, setIsResendingCode] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const RECAPTCHA_SITE_KEY = (import.meta.env as any).VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

  useEffect(() => {
    if (step === 'verification' && verificationToken) {
      saveStoredVerificationState({
        verificationToken,
        maskedEmail,
        verificationCode,
      });
      return;
    }

    clearStoredVerificationState();
  }, [step, verificationToken, maskedEmail, verificationCode]);

  const resetRecaptcha = () => {
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }
    setRecaptchaToken(null);
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recaptchaToken) {
      toast.error('Molimo potvrdite da niste robot (reCAPTCHA)');
      return;
    }

    try {
      const response = await login(formData.email, formData.password, recaptchaToken);

      if (response?.requires_verification) {
        setVerificationToken(response.verification_token);
        setMaskedEmail(response.masked_email);
        setVerificationCode('');
        setStep('verification');
        toast.success(response.message || t('auth.verificationCodeSent'));
        resetRecaptcha();
        return;
      }

      toast.success(t('auth.loginSuccess'));
      navigate('/dashboard');
      resetRecaptcha();
    } catch (error: any) {
      const validationErrors = error.response?.data?.errors;
      const message =
        validationErrors?.email?.[0] ||
        validationErrors?.recaptcha?.[0] ||
        error.response?.data?.message ||
        'Greška pri prijavi';
      toast.error(message);
      resetRecaptcha();
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (verificationCode.length !== 6) {
      toast.error(t('auth.verificationCodeInvalid'));
      return;
    }

    try {
      await verifyLogin(verificationToken, verificationCode);
      clearStoredVerificationState();
      toast.success(t('auth.loginSuccess'));
      navigate('/dashboard');
    } catch (error: any) {
      const message =
        error.response?.data?.errors?.code?.[0] ||
        error.response?.data?.message ||
        t('auth.verificationFailed');
      toast.error(message);
    }
  };

  const handleResendCode = async () => {
    if (!verificationToken) {
      return;
    }

    setIsResendingCode(true);
    try {
      const response = await authService.resendLoginCode(verificationToken);
      setMaskedEmail(response.masked_email);
      toast.success(response.message || t('auth.verificationCodeResent'));
    } catch (error: any) {
      const message =
        error.response?.data?.errors?.verification_token?.[0] ||
        error.response?.data?.message ||
        t('auth.verificationResendFailed');
      toast.error(message);
    } finally {
      setIsResendingCode(false);
    }
  };

  const handleBackToCredentials = () => {
    clearStoredVerificationState();
    setStep('credentials');
    setVerificationToken('');
    setMaskedEmail('');
    setVerificationCode('');
  };

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token);
  };

  const handleForgotPassword = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setShowForgotPasswordModal(true);
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotPasswordEmail || !forgotPasswordEmail.includes('@')) {
      toast.error('Molimo unesite validnu email adresu');
      return;
    }

    setIsSendingEmail(true);
    try {
      await authService.forgotPassword(forgotPasswordEmail);
      toast.success('Ako postoji korisnik sa ovom email adresom, poslat ćemo vam link za reset lozinke.');
      setShowForgotPasswordModal(false);
      setForgotPasswordEmail('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Greška pri slanju emaila za reset lozinke');
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (step === 'verification') {
    return (
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('auth.verificationTitle')}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('auth.verificationDescription', { email: maskedEmail })}
        </p>

        <form onSubmit={handleVerificationSubmit} className="space-y-4">
          <div>
            <label className="label">{t('auth.verificationCode')}</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="input text-center text-2xl tracking-[0.5em] font-mono"
              placeholder="000000"
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || verificationCode.length !== 6}
            className="w-full btn-primary py-3"
          >
            {isLoading ? t('common.loading') : t('auth.verifyAndLogin')}
          </button>

          <div className="flex flex-col gap-2 text-center text-sm">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isResendingCode}
              className="text-primary-600 dark:text-primary-400 hover:underline disabled:opacity-50"
            >
              {isResendingCode ? t('auth.resendingCode') : t('auth.resendCode')}
            </button>
            <button
              type="button"
              onClick={handleBackToCredentials}
              className="text-gray-600 dark:text-gray-400 hover:underline"
            >
              {t('auth.backToLogin')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {t('auth.login')}
      </h2>

      <form onSubmit={handleCredentialsSubmit} className="space-y-4">
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
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.remember}
                onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {t('auth.rememberMe')}
              </span>
            </label>

            <a
              href="#"
              onClick={handleForgotPassword}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline cursor-pointer"
            >
              {t('auth.forgotPassword')}
            </a>
          </div>

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
        </div>

        <div className="flex justify-center">
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey={RECAPTCHA_SITE_KEY}
            onChange={handleRecaptchaChange}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-primary py-3"
        >
          {isLoading ? t('common.loading') : t('auth.loginButton')}
        </button>
      </form>

      {showForgotPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Zaboravili ste lozinku?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Unesite vašu email adresu i poslat ćemo vam link za obnovu lozinke.
            </p>
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div>
                <label className="label">Email adresa</label>
                <input
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  className="input"
                  placeholder="ime@primjer.com"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPasswordModal(false);
                    setForgotPasswordEmail('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSendingEmail ? 'Šalje se...' : 'Pošalji'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

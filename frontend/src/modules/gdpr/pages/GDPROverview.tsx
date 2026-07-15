import { useTranslation } from 'react-i18next';

export default function GDPROverview() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('gdpr.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Upravljanje GDPR usklađenošću
        </p>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          GDPR Modul - U razvoju
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Consent Management, Right to Export, Right to Delete, Audit log, Data retention
        </p>
      </div>
    </div>
  );
}



import { useTranslation } from 'react-i18next';

export default function AIOverview() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('ai.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Vaš pametni AI asistent EDEL za automatizaciju i pomoć
        </p>
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          🤖 EDEL - AI Asistent - U razvoju
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          EDEL je vaš inteligentni asistent koji vam pomaže sa:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400">
          <li>💬 Chat konverzacije - postavite bilo koje pitanje EDEL-u</li>
          <li>🔌 Google Gemini integracija - personalizovana po korisniku</li>
          <li>📄 Automatsko generisanje dokumenata i sadržaja</li>
          <li>📊 Predikcija i napredna analitika podataka</li>
          <li>🔍 Semantic search - inteligentna pretraga sadržaja</li>
          <li>👁️ OCR - prepoznavanje teksta iz PDF i slika</li>
          <li>🧠 Učenje od vaših preferencija i navika</li>
          <li>⚡ Automatizacija ponavljajućih zadataka</li>
        </ul>
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-blue-900 dark:text-blue-200 font-medium">
            💡 EDEL (Enterprise Digital Enhanced Learning) - Vaš pouzdan partner u digitalnoj transformaciji!
          </p>
        </div>
      </div>
    </div>
  );
}



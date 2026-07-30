import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiBriefcase, FiTool } from 'react-icons/fi';

export default function LMSDirekcijaPage() {
  return (
    <div className="space-y-6">
      <Link
        to="/lms"
        className="inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <FiArrowLeft size={16} />
        Nazad na Sistem za učenje
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50/50 to-violet-50/30 p-8 dark:border-indigo-900/40 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900 sm:p-10"
      >
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
            <FiBriefcase size={28} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
              Sistem za učenje
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              Direkcija
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
              Modul za obuke direkcije i menadžmenta. Sadržaj i kursevi će biti dodani ovdje.
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-dashed border-indigo-200 bg-white/70 px-5 py-6 dark:border-indigo-800/50 dark:bg-dark-900/40">
          <FiTool className="h-6 w-6 shrink-0 text-indigo-500" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">U pripremi</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Trenutni LMS sadržaj dostupan je u panelu <strong>Maloprodaja</strong>.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

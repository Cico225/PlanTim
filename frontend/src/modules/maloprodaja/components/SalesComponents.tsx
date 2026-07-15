import { useState } from 'react';
import { Plus, Edit, Trash2, Upload, X } from 'lucide-react';

// Sales Plans Tab Component
export function SalesPlansTab({
  plans,
  employees,
  stores,
  selectedYear,
  selectedMonth,
  onEdit,
  onDelete,
  onCreate,
}: {
  plans: any[];
  employees: any[];
  stores: any[];
  selectedYear: number;
  selectedMonth: number;
  onEdit: (plan: any) => void;
  onDelete: (id: number) => void;
  onCreate: () => void;
}) {
  const months = [
    'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
    'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Planovi za {months[selectedMonth - 1]} {selectedYear}
        </h3>
        <button
          onClick={onCreate}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Novi Plan
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">Nema planova za odabrani mjesec.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Zaposlenik
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Prodavnica
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Bruto/Neto Plata
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Plan Cipela
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Plan Robe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Akcije
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {plans.map((plan) => (
                <tr key={plan.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {plan.employee_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {plan.store_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {plan.gross_salary ? `${Number(plan.gross_salary).toFixed(2)} / ${plan.net_salary ? Number(plan.net_salary).toFixed(2) : 'N/A'} ${plan.currency || 'BAM'}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {plan.planned_shoe_pairs || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {plan.planned_merchandise_pieces || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(plan)}
                        className="text-teal-600 hover:text-teal-900 dark:text-teal-400 dark:hover:text-teal-300"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(plan.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Sales Results Tab Component
export function SalesResultsTab({
  results,
  onUpload,
}: {
  results: any[];
  onUpload: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Rezultati Prodaje
        </h3>
        <button
          onClick={onUpload}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Učitaj Excel
        </button>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">Nema rezultata. Kliknite "Učitaj Excel" da učitete rezultate.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Zaposlenik
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Prodavnica
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Mjesec
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Prodano Cipela
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Prodano Robe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Promet
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {results.map((result) => (
                <tr key={result.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {result.employee_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {result.store_name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {result.month}/{result.year}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {result.sold_shoe_pairs || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {result.sold_merchandise_pieces || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {result.revenue ? `${Number(result.revenue).toFixed(2)} ${result.revenue_currency || 'BAM'}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Sales Performance Tab Component
export function SalesPerformanceTab({
  performance,
  selectedYear,
  selectedMonth,
}: {
  performance: any[];
  selectedYear: number;
  selectedMonth: number;
}) {
  const months = [
    'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
    'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
  ];

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-600 dark:text-green-400';
    if (percentage >= 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Dashboard - {months[selectedMonth - 1]} {selectedYear}
      </h3>

      {performance.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">Nema podataka za odabrani period.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {performance.map((perf) => (
            <div key={perf.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {perf.employee_name || 'N/A'}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {perf.store_name || 'N/A'}
                  </p>
                </div>
                {perf.bonus_eligible && (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">
                    Bonus: +{perf.bonus_percentage ? Number(perf.bonus_percentage).toFixed(1) : 0}%
                  </span>
                )}
              </div>

              {/* Shoe Pairs Performance */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">👟 Plan Cipela</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {perf.actual_shoe_pairs || 0} / {perf.planned_shoe_pairs || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${getProgressBarColor(perf.shoe_pairs_percentage || 0)}`}
                    style={{ width: `${Math.min(perf.shoe_pairs_percentage || 0, 100)}%` }}
                  ></div>
                </div>
                <p className={`text-xs mt-1 ${getPercentageColor(perf.shoe_pairs_percentage || 0)}`}>
                  {perf.shoe_pairs_percentage ? Number(perf.shoe_pairs_percentage).toFixed(1) : 0}% realizacije
                </p>
              </div>

              {/* Merchandise Performance */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">📦 Plan Robe</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {perf.actual_merchandise_pieces || 0} / {perf.planned_merchandise_pieces || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${getProgressBarColor(perf.merchandise_pieces_percentage || 0)}`}
                    style={{ width: `${Math.min(perf.merchandise_pieces_percentage || 0, 100)}%` }}
                  ></div>
                </div>
                <p className={`text-xs mt-1 ${getPercentageColor(perf.merchandise_pieces_percentage || 0)}`}>
                  {perf.merchandise_pieces_percentage ? Number(perf.merchandise_pieces_percentage).toFixed(1) : 0}% realizacije
                </p>
              </div>

              {/* Revenue Performance (if available) */}
              {perf.planned_revenue && perf.revenue_percentage && (
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">💰 Promet</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {perf.actual_revenue ? Number(perf.actual_revenue).toFixed(2) : 0} / {perf.planned_revenue ? Number(perf.planned_revenue).toFixed(2) : 0} BAM
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${getProgressBarColor(perf.revenue_percentage)}`}
                      style={{ width: `${Math.min(perf.revenue_percentage, 100)}%` }}
                    ></div>
                  </div>
                  <p className={`text-xs mt-1 ${getPercentageColor(perf.revenue_percentage)}`}>
                    {Number(perf.revenue_percentage).toFixed(1)}% realizacije
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Sales Plan Modal Component
export function SalesPlanModal({
  plan,
  employees,
  selectedYear,
  selectedMonth,
  onClose,
  onSave,
  isLoading,
}: {
  plan: any;
  employees: any[];
  selectedYear: number;
  selectedMonth: number;
  onClose: () => void;
  onSave: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    employee_id: plan?.employee_id || '',
    year: plan?.year || selectedYear,
    month: plan?.month || selectedMonth,
    gross_salary: plan?.gross_salary || '',
    net_salary: plan?.net_salary || '',
    currency: plan?.currency || 'BAM',
    planned_shoe_pairs: plan?.planned_shoe_pairs || '',
    planned_merchandise_pieces: plan?.planned_merchandise_pieces || '',
    planned_revenue: plan?.planned_revenue || '',
    revenue_currency: plan?.revenue_currency || 'BAM',
    notes: plan?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      employee_id: Number(formData.employee_id),
      year: Number(formData.year),
      month: Number(formData.month),
      gross_salary: formData.gross_salary ? Number(formData.gross_salary) : undefined,
      net_salary: formData.net_salary ? Number(formData.net_salary) : undefined,
      planned_shoe_pairs: formData.planned_shoe_pairs ? Number(formData.planned_shoe_pairs) : 0,
      planned_merchandise_pieces: formData.planned_merchandise_pieces ? Number(formData.planned_merchandise_pieces) : 0,
      planned_revenue: formData.planned_revenue ? Number(formData.planned_revenue) : undefined,
    };
    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {plan ? 'Uredi Plan' : 'Novi Plan'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Zaposlenik *
              </label>
              <select
                required
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                disabled={!!plan}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Odaberi zaposlenika</option>
                {employees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Godina *
              </label>
              <input
                type="number"
                required
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                disabled={!!plan}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mjesec *
              </label>
              <input
                type="number"
                required
                min="1"
                max="12"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                disabled={!!plan}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Finansijski Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Bruto Plata
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.gross_salary}
                  onChange={(e) => setFormData({ ...formData, gross_salary: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Neto Plata
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.net_salary}
                  onChange={(e) => setFormData({ ...formData, net_salary: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Valuta
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="BAM">BAM</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Prodajni Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  👟 Plan Prodaje Pari Cipela
                </label>
                <input
                  type="number"
                  value={formData.planned_shoe_pairs}
                  onChange={(e) => setFormData({ ...formData, planned_shoe_pairs: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  📦 Plan Prodaje Komadne Robe
                </label>
                <input
                  type="number"
                  value={formData.planned_merchandise_pieces}
                  onChange={(e) => setFormData({ ...formData, planned_merchandise_pieces: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Promet (opcionalno)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.planned_revenue}
                  onChange={(e) => setFormData({ ...formData, planned_revenue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Napomene
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {isLoading ? 'Čuvanje...' : 'Sačuvaj'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Sales Dashboard Tab Component
export function SalesDashboardTab({
  plans,
  results,
  performance,
  selectedYear,
  selectedMonth,
}: {
  plans: any[];
  results: any[];
  performance: any[];
  selectedYear: number;
  selectedMonth: number;
}) {
  const months = [
    'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
    'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar'
  ];

  // Combine plans and results to show side by side
  const dashboardData = performance.map((perf) => {
    const plan = plans.find(p => p.employee_id === perf.employee_id);
    const result = results.find(r => r.employee_id === perf.employee_id);
    
    // Calculate what's missing to fulfill the plan
    const missingRevenue = perf.planned_revenue && perf.actual_revenue 
      ? Math.max(0, perf.planned_revenue - perf.actual_revenue) 
      : null;
    const missingShoePairs = perf.planned_shoe_pairs && perf.actual_shoe_pairs
      ? Math.max(0, perf.planned_shoe_pairs - perf.actual_shoe_pairs)
      : 0;
    const missingMerchandise = perf.planned_merchandise_pieces && perf.actual_merchandise_pieces
      ? Math.max(0, perf.planned_merchandise_pieces - perf.actual_merchandise_pieces)
      : 0;

    return {
      ...perf,
      plan,
      result,
      missingRevenue,
      missingShoePairs,
      missingMerchandise,
    };
  });

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-600 dark:text-green-400';
    if (percentage >= 80) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Dashboard - {months[selectedMonth - 1]} {selectedYear}
      </h3>

      {dashboardData.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">Nema podataka za odabrani period.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {dashboardData.map((data) => (
            <div key={data.id || data.employee_id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {data.employee_name || 'N/A'}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {data.store_name || 'N/A'}
                  </p>
                </div>
                {data.bonus_eligible && (
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">
                    Bonus: +{data.bonus_percentage ? Number(data.bonus_percentage).toFixed(1) : 0}%
                  </span>
                )}
              </div>

              {/* Financial Plan vs Results */}
              {data.planned_revenue && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">💰 Finansijski Plan</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {data.actual_revenue ? Number(data.actual_revenue).toFixed(2) : 0} / {Number(data.planned_revenue).toFixed(2)} BAM
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-1">
                    <div
                      className={`h-2.5 rounded-full ${getProgressBarColor(data.revenue_percentage || 0)}`}
                      style={{ width: `${Math.min(data.revenue_percentage || 0, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className={getPercentageColor(data.revenue_percentage || 0)}>
                      {data.revenue_percentage ? Number(data.revenue_percentage).toFixed(1) : 0}% realizacije
                    </span>
                    {data.missingRevenue !== null && data.missingRevenue > 0 && (
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        Nedostaje: {Number(data.missingRevenue).toFixed(2)} BAM
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Shoe Pairs Performance */}
              <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">👟 Plan Cipela</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {data.actual_shoe_pairs || 0} / {data.planned_shoe_pairs || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-1">
                  <div
                    className={`h-2.5 rounded-full ${getProgressBarColor(data.shoe_pairs_percentage || 0)}`}
                    style={{ width: `${Math.min(data.shoe_pairs_percentage || 0, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className={getPercentageColor(data.shoe_pairs_percentage || 0)}>
                    {data.shoe_pairs_percentage ? Number(data.shoe_pairs_percentage).toFixed(1) : 0}% realizacije
                  </span>
                  {data.missingShoePairs > 0 && (
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      Nedostaje: {data.missingShoePairs} pari
                    </span>
                  )}
                </div>
              </div>

              {/* Merchandise Performance */}
              <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">📦 Plan Robe</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {data.actual_merchandise_pieces || 0} / {data.planned_merchandise_pieces || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-1">
                  <div
                    className={`h-2.5 rounded-full ${getProgressBarColor(data.merchandise_pieces_percentage || 0)}`}
                    style={{ width: `${Math.min(data.merchandise_pieces_percentage || 0, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className={getPercentageColor(data.merchandise_pieces_percentage || 0)}>
                    {data.merchandise_pieces_percentage ? Number(data.merchandise_pieces_percentage).toFixed(1) : 0}% realizacije
                  </span>
                  {data.missingMerchandise > 0 && (
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      Nedostaje: {data.missingMerchandise} komada
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Sales Plans Upload Modal Component
export function SalesPlansUploadModal({
  onClose,
  onUpload,
  isLoading,
  uploadResult,
}: {
  onClose: () => void;
  onUpload: (file: File, overwrite?: boolean) => void;
  isLoading: boolean;
  uploadResult?: any;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [overwrite, setOverwrite] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      onUpload(file, overwrite);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Učitaj Planove iz Excel-a
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Excel Fajl *
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Podržani formati: .xlsx, .xls
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="overwrite-plans"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
            />
            <label htmlFor="overwrite-plans" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Pregaziti postojeće planove (ako postoje)
            </label>
          </div>

          {uploadResult && uploadResult.errors && uploadResult.errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Greške pri učitavanju:</h4>
              <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
                {uploadResult.errors.slice(0, 10).map((error: any, index: number) => (
                  <li key={index}>Red {error.row_number}: {error.error}</li>
                ))}
                {uploadResult.errors.length > 10 && (
                  <li>... i još {uploadResult.errors.length - 10} grešaka</li>
                )}
              </ul>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Format Excel fajla:</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
              Minimalni stupci:
            </p>
            <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>Prodavnica (naziv ili šifra)</li>
              <li>Broj radnika</li>
              <li>Mjesec (1-12)</li>
              <li>Godina</li>
              <li>Plan finansijski (promet)</li>
              <li>Plan pari obuće</li>
              <li>Plan komadne robe</li>
            </ul>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
              <strong>Napomena:</strong> Plan će se automatski podijeliti na broj radnika. Menadžer prodavnice će imati 15% manji plan od običnih radnika.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={isLoading || !file}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {isLoading ? 'Učitavanje...' : 'Učitaj'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Sales Results Upload Modal Component
export function SalesResultsUploadModal({
  stores,
  onClose,
  onUpload,
  isLoading,
  uploadResult,
}: {
  stores: any[];
  onClose: () => void;
  onUpload: (file: File, storeId?: number, overwrite?: boolean) => void;
  isLoading: boolean;
  uploadResult?: any;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [storeId, setStoreId] = useState<number | undefined>();
  const [overwrite, setOverwrite] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      onUpload(file, storeId, overwrite);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Učitaj Rezultate iz Excel-a
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Excel Fajl *
            </label>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Podržani formati: .xlsx, .xls
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Prodavnica (opcionalno)
            </label>
            <select
              value={storeId || ''}
              onChange={(e) => setStoreId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Sve prodavnice (ako je u Excel-u)</option>
              {stores.map((store: any) => (
                <option key={store.id} value={store.id}>{store.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="overwrite"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
              className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
            />
            <label htmlFor="overwrite" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Pregaziti postojeće rezultate (ako postoje)
            </label>
          </div>

          {uploadResult && uploadResult.errors && uploadResult.errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Greške pri učitavanju:</h4>
              <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
                {uploadResult.errors.slice(0, 10).map((error: any, index: number) => (
                  <li key={index}>Red {error.row_number}: {error.error}</li>
                ))}
                {uploadResult.errors.length > 10 && (
                  <li>... i još {uploadResult.errors.length - 10} grešaka</li>
                )}
              </ul>
            </div>
          )}

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Format Excel fajla:</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
              Minimalni stupci:
            </p>
            <ul className="list-disc list-inside text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>Prodavnica (šifra ili naziv)</li>
              <li>Ime i prezime / ID zaposlenika</li>
              <li>Mjesec (1-12)</li>
              <li>Broj prodanih pari cipela</li>
              <li>Broj prodanih komada robe</li>
              <li>Promet (opcionalno)</li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={isLoading || !file}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
            >
              {isLoading ? 'Učitavanje...' : 'Učitaj'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}







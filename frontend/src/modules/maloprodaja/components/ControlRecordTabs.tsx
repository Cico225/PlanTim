import { Plus, Trash2, X, Upload, Download, Camera, Image as ImageIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import type { ControlRecord, ControlParticipant, PresentPerson, InventoryItem, ControlObservation, ControlMeasure, Attachment } from '../../../services/retailControlRecordsService';
import { uploadAttachment, deleteAttachment } from '../../../services/retailControlRecordsService';

// Header Tab Component (Osnovni podaci)
export function ControlRecordHeaderTab({
  formData,
  setFormData,
  stores,
  users,
  employees,
  selectedStore,
  onStoreChange,
  isLocked,
}: {
  formData: Partial<ControlRecord>;
  setFormData: (data: Partial<ControlRecord> | ((prev: Partial<ControlRecord>) => Partial<ControlRecord>)) => void;
  stores: any[];
  users: any[];
  employees: any[];
  selectedStore: any;
  onStoreChange: (storeId: string) => void;
  isLocked: boolean;
}) {
  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Prodavnica *
          </label>
          <select
            required
            value={formData.store_id || ''}
            onChange={(e) => {
              onStoreChange(e.target.value);
              setFormData((prev) => ({
                ...prev,
                store_id: Number(e.target.value),
              }));
            }}
            disabled={isLocked}
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700 text-base sm:text-sm appearance-none"
            style={{ WebkitAppearance: 'menulist', appearance: 'menulist' }}
          >
            <option value="">Odaberi prodavnicu</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name} {store.code ? `(${store.code})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Šifra prodavnice
          </label>
          <input
            type="text"
            value={selectedStore?.code || ''}
            disabled
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Grad / Lokacija
          </label>
          <input
            type="text"
            value={selectedStore?.location || ''}
            disabled
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tip kontrole *
          </label>
          <select
            required
            value={formData.control_type || 'inspection'}
            onChange={(e) => setFormData({ ...formData, control_type: e.target.value as any })}
            disabled={isLocked || !!formData.id}
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700 text-base sm:text-sm appearance-none"
            style={{ WebkitAppearance: 'menulist', appearance: 'menulist' }}
          >
            <option value="total_inventory">Totalna inventura</option>
            <option value="inspection">Obilazak / kontrola</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Datum kontrole - Od *
          </label>
          <input
            type="date"
            required
            value={formData.control_date_from || ''}
            onChange={(e) => {
              const newValue = e.target.value;
              setFormData((prev) => ({ ...prev, control_date_from: newValue }));
            }}
            disabled={isLocked}
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700 text-base sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Datum kontrole - Do
          </label>
          <input
            type="date"
            value={formData.control_date_to || ''}
            onChange={(e) => setFormData({ ...formData, control_date_to: e.target.value })}
            disabled={isLocked}
            min={formData.control_date_from}
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700 text-base sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Vrijeme početka
          </label>
          <input
            type="time"
            value={formData.start_time || ''}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            disabled={isLocked}
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700 text-base sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Vrijeme završetka
          </label>
          <input
            type="time"
            value={formData.end_time || ''}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            disabled={isLocked}
            className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-700 text-base sm:text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Učesnici (osobe koje su vršile kontrolu)
        </label>
        <div className="space-y-2">
          {(formData.participants || []).map((participant, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-2">
              <select
                value={participant.user_id || ''}
                onChange={(e) => {
                  const updated = [...(formData.participants || [])];
                  updated[index] = {
                    ...updated[index],
                    user_id: e.target.value ? Number(e.target.value) : undefined,
                    name: e.target.value ? users.find((u: any) => u.id === Number(e.target.value))?.name || '' : updated[index].name,
                  };
                  setFormData({ ...formData, participants: updated });
                }}
                disabled={isLocked}
                className="flex-1 px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base sm:text-sm appearance-none"
                style={{ WebkitAppearance: 'menulist', appearance: 'menulist' }}
              >
                <option value="">Odaberi korisnika</option>
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Ime i prezime"
                value={participant.name}
                onChange={(e) => {
                  const updated = [...(formData.participants || [])];
                  updated[index].name = e.target.value;
                  setFormData({ ...formData, participants: updated });
                }}
                disabled={isLocked}
                className="flex-1 px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base sm:text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Funkcija"
                  value={participant.function}
                  onChange={(e) => {
                    const updated = [...(formData.participants || [])];
                    updated[index].function = e.target.value;
                    setFormData({ ...formData, participants: updated });
                  }}
                  disabled={isLocked}
                  className="flex-1 px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base sm:text-sm"
                />
                {!isLocked && (
                  <button
                    type="button"
                  onClick={() => {
                    const updated = [...(formData.participants || [])];
                    updated.splice(index, 1);
                    setFormData({ ...formData, participants: updated });
                  }}
                    className="px-3 py-2.5 sm:py-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <X className="w-5 h-5 sm:w-4 sm:h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {!isLocked && (
            <button
              type="button"
              onClick={() => {
                setFormData({
                  ...formData,
                  participants: [...(formData.participants || []), { name: '', function: '' }],
                });
              }}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
            >
              <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
              Dodaj učesnika
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Prisutne osobe u prodavnici
        </label>
        <div className="space-y-2">
          {(formData.present_persons || []).map((person, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-2">
              <select
                value={person.employee_id || ''}
                onChange={(e) => {
                  const updated = [...(formData.present_persons || [])];
                  updated[index] = {
                    ...updated[index],
                    employee_id: e.target.value ? Number(e.target.value) : undefined,
                    name: e.target.value ? employees.find((emp: any) => emp.id === Number(e.target.value))?.name || '' : updated[index].name,
                  };
                  setFormData({ ...formData, present_persons: updated });
                }}
                disabled={isLocked}
                className="flex-1 px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base sm:text-sm appearance-none"
                style={{ WebkitAppearance: 'menulist', appearance: 'menulist' }}
              >
                <option value="">Odaberi zaposlenog</option>
                {employees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Ime i prezime"
                value={person.name}
                onChange={(e) => {
                  const updated = [...(formData.present_persons || [])];
                  updated[index].name = e.target.value;
                  setFormData({ ...formData, present_persons: updated });
                }}
                disabled={isLocked}
                className="flex-1 px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base sm:text-sm"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Funkcija"
                  value={person.function}
                  onChange={(e) => {
                    const updated = [...(formData.present_persons || [])];
                    updated[index].function = e.target.value;
                    setFormData({ ...formData, present_persons: updated });
                  }}
                  disabled={isLocked}
                  className="flex-1 px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base sm:text-sm"
                />
                {!isLocked && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(formData.present_persons || [])];
                      updated.splice(index, 1);
                      setFormData({ ...formData, present_persons: updated });
                    }}
                    className="px-3 py-2.5 sm:py-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <X className="w-5 h-5 sm:w-4 sm:h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {!isLocked && (
            <button
              type="button"
              onClick={() => {
                setFormData({
                  ...formData,
                  present_persons: [...(formData.present_persons || []), { name: '', function: '' }],
                });
              }}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2 font-medium text-sm sm:text-base"
            >
              <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
              Dodaj prisutnu osobu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Inventory Tab Component (Totalna inventura)
export function ControlRecordInventoryTab({
  formData,
  setFormData,
  isLocked,
}: {
  formData: Partial<ControlRecord>;
  setFormData: (data: Partial<ControlRecord> | ((prev: Partial<ControlRecord>) => Partial<ControlRecord>)) => void;
  isLocked: boolean;
}) {
  const items = formData.inventory_items || [];
  const totalBookValue = items.reduce((sum, item) => sum + (item.book_value || 0), 0);
  const totalCountedValue = items.reduce((sum, item) => sum + (item.counted_value || 0), 0);
  const totalDifference = totalCountedValue - totalBookValue;

  const deviationReasonsOptions = [
    'Nepravilno zaduženje',
    'Krađa',
    'Greška u prijemu robe',
    'Greška u evidenciji',
    'Nepoznat razlog',
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sažetak inventure</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ukupna knjigovodstvena vrijednost
            </label>
            <input
              type="number"
              value={totalBookValue.toFixed(2)}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Ukupna popisana vrijednost
            </label>
            <input
              type="number"
              value={totalCountedValue.toFixed(2)}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Razlika ukupno
            </label>
            <input
              type="number"
              value={totalDifference.toFixed(2)}
              disabled
              className={`w-full px-3 py-2 border rounded-lg bg-gray-100 dark:bg-gray-700 cursor-not-allowed ${
                totalDifference < 0
                  ? 'border-red-300 text-red-600 dark:border-red-700 dark:text-red-400'
                  : totalDifference > 0
                  ? 'border-green-300 text-green-600 dark:border-green-700 dark:text-green-400'
                  : 'border-gray-300 text-gray-900 dark:border-gray-600 dark:text-white'
              }`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status inventure
            </label>
            <input
              type="text"
              value={
                formData.inventory_status === 'no_difference' ? 'Bez razlike' :
                formData.inventory_status === 'shortage' ? 'Manjak' :
                formData.inventory_status === 'surplus' ? 'Višak' :
                formData.inventory_status === 'combined' ? 'Kombinovano' : '-'
              }
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Viškovi i manjkovi</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50">
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium">Artikal</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium">Šifra</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium">Knjigovodstveno</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium">Popisano</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium">Razlika</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium">Vrijednost razlike</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium">Napomena</th>
                {!isLocked && <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium">Akcije</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const difference = (item.counted_value || 0) - (item.book_value || 0);
                return (
                  <tr key={index} className={difference < 0 ? 'bg-red-50 dark:bg-red-900/10' : difference > 0 ? 'bg-green-50 dark:bg-green-900/10' : ''}>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      <input
                        type="text"
                        value={item.article_name}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[index].article_name = e.target.value;
                          setFormData({ ...formData, inventory_items: updated });
                        }}
                        disabled={isLocked}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      <input
                        type="text"
                        value={item.article_code || ''}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[index].article_code = e.target.value;
                          setFormData({ ...formData, inventory_items: updated });
                        }}
                        disabled={isLocked}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.book_value || 0}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[index].book_value = parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, inventory_items: updated });
                        }}
                        disabled={isLocked}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.counted_value || 0}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[index].counted_value = parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, inventory_items: updated });
                        }}
                        disabled={isLocked}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </td>
                    <td className={`border border-gray-300 dark:border-gray-600 px-4 py-2 font-medium ${
                      difference < 0 ? 'text-red-600 dark:text-red-400' : difference > 0 ? 'text-green-600 dark:text-green-400' : ''
                    }`}>
                      {difference.toFixed(2)}
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.difference_value || 0}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[index].difference_value = parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, inventory_items: updated });
                        }}
                        disabled={isLocked}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </td>
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[index].notes = e.target.value;
                          setFormData({ ...formData, inventory_items: updated });
                        }}
                        disabled={isLocked}
                        className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </td>
                    {!isLocked && (
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...items];
                            updated.splice(index, 1);
                            setFormData({ ...formData, inventory_items: updated });
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!isLocked && (
            <button
              type="button"
              onClick={() => {
                setFormData({
                  ...formData,
                  inventory_items: [...items, { article_name: '', article_code: '', book_value: 0, counted_value: 0, difference: 0, difference_value: 0 }],
                });
              }}
              className="mt-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Dodaj artikal
            </button>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Razlozi odstupanja</h3>
        <div className="space-y-2">
          {deviationReasonsOptions.map((reason) => (
            <label key={reason} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={(formData.deviation_reasons || []).includes(reason)}
                onChange={(e) => {
                  const reasons = formData.deviation_reasons || [];
                  if (e.target.checked) {
                    setFormData({ ...formData, deviation_reasons: [...reasons, reason] });
                  } else {
                    setFormData({ ...formData, deviation_reasons: reasons.filter(r => r !== reason) });
                  }
                }}
                disabled={isLocked}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm text-gray-900 dark:text-white">{reason}</span>
            </label>
          ))}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(formData.deviation_reasons || []).includes('Ostalo')}
              onChange={(e) => {
                const reasons = formData.deviation_reasons || [];
                if (e.target.checked) {
                  setFormData({ ...formData, deviation_reasons: [...reasons, 'Ostalo'] });
                } else {
                  setFormData({ ...formData, deviation_reasons: reasons.filter(r => r !== 'Ostalo'), deviation_reason_other: '' });
                }
              }}
              disabled={isLocked}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-900 dark:text-white">Ostalo</span>
          </label>
          {(formData.deviation_reasons || []).includes('Ostalo') && (
            <textarea
              value={formData.deviation_reason_other || ''}
              onChange={(e) => setFormData({ ...formData, deviation_reason_other: e.target.value })}
              disabled={isLocked}
              placeholder="Opišite razlog..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
            />
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Zaključak inventure</h3>
        <textarea
          value={formData.inventory_conclusion || ''}
          onChange={(e) => setFormData({ ...formData, inventory_conclusion: e.target.value })}
          disabled={isLocked}
          placeholder="Opis situacije, preporuke..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          rows={4}
        />
        <label className="flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            checked={formData.corrective_measures_proposed || false}
            onChange={(e) => setFormData({ ...formData, corrective_measures_proposed: e.target.checked })}
            disabled={isLocked}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          <span className="text-sm text-gray-900 dark:text-white">Predlažu se korektivne mjere</span>
        </label>
      </div>
    </div>
  );
}

// Inspection Tab Component (Obilazak i zapažanja)
export function ControlRecordInspectionTab({
  formData,
  setFormData,
  users,
  isLocked,
}: {
  formData: Partial<ControlRecord>;
  setFormData: (data: Partial<ControlRecord> | ((prev: Partial<ControlRecord>) => Partial<ControlRecord>)) => void;
  users: any[];
  isLocked: boolean;
}) {
  const categories = [
    { name: 'Izgled prodavnice', items: ['Čistoća', 'Izlog uređen', 'Rasvjeta ispravna', 'Cijene istaknute'] },
    { name: 'Roba', items: ['Izloženost robe', 'Dostupne veličine', 'Oštećena roba', 'Usklađenost sa planogramom'] },
    { name: 'Dokumentacija', items: ['Knjiga dnevnog pazara', 'Prijemi robe', 'Povrati / reklamacije'] },
    { name: 'Osoblje', items: ['Uniforme', 'Ljubaznost', 'Poznavanje asortimana'] },
  ];

  const observations = formData.observations || [];

  const getObservation = (category: string, item: string) => {
    return observations.find(obs => obs.category === category && obs.item === item) || null;
  };

  const updateObservation = (category: string, item: string, status?: 'ok' | 'not_ok' | 'n_a', note?: string) => {
    setFormData((prev) => {
      const prevObservations = prev.observations || [];
      const existing = prevObservations.findIndex(obs => obs.category === category && obs.item === item);
      if (existing >= 0) {
        const updated = [...prevObservations];
        if (status !== undefined) updated[existing].status = status;
        if (note !== undefined) updated[existing].note = note;
        return { ...prev, observations: updated };
      } else {
        return {
          ...prev,
          observations: [...prevObservations, { category, item, status, note }],
        };
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Operativna kontrola (checklista)</h3>
        {categories.map((category) => (
          <div key={category.name} className="mb-6">
            <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">{category.name}</h4>
            <div className="space-y-2">
              {category.items.map((item) => {
                const obs = getObservation(category.name, item);
                return (
                  <div key={item} className="flex items-center gap-4 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <span className="flex-1 text-sm text-gray-900 dark:text-white">{item}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateObservation(category.name, item, 'ok')}
                        disabled={isLocked}
                        className={`px-3 py-1 rounded text-sm ${
                          obs?.status === 'ok'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900/30'
                        } disabled:opacity-50`}
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => updateObservation(category.name, item, 'not_ok')}
                        disabled={isLocked}
                        className={`px-3 py-1 rounded text-sm ${
                          obs?.status === 'not_ok'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30'
                        } disabled:opacity-50`}
                      >
                        Nije OK
                      </button>
                      <button
                        type="button"
                        onClick={() => updateObservation(category.name, item, 'n_a')}
                        disabled={isLocked}
                        className={`px-3 py-1 rounded text-sm ${
                          obs?.status === 'n_a'
                            ? 'bg-gray-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                        } disabled:opacity-50`}
                      >
                        N/A
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Napomena..."
                      value={obs?.note || ''}
                      onChange={(e) => updateObservation(category.name, item, obs?.status, e.target.value)}
                      disabled={isLocked}
                      className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Uočena zapažanja</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pozitivna zapažanja
            </label>
            <textarea
              value={formData.positive_observations || ''}
              onChange={(e) => setFormData({ ...formData, positive_observations: e.target.value })}
              disabled={isLocked}
              placeholder="Opisite pozitivna zapažanja..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={4}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Negativna zapažanja
            </label>
            <textarea
              value={formData.negative_observations || ''}
              onChange={(e) => setFormData({ ...formData, negative_observations: e.target.value })}
              disabled={isLocked}
              placeholder="Opisite negativna zapažanja..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={4}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Naložene mjere</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50">
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium">Mjera</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium">Odgovorna osoba</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium">Rok</th>
                <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium">Status</th>
                {!isLocked && <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-sm font-medium">Akcije</th>}
              </tr>
            </thead>
            <tbody>
              {(formData.measures || []).map((measure, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                    <textarea
                      value={measure.measure}
                      onChange={(e) => {
                        const updated = [...(formData.measures || [])];
                        updated[index].measure = e.target.value;
                        setFormData({ ...formData, measures: updated });
                      }}
                      disabled={isLocked}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      rows={2}
                    />
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                    <select
                      value={measure.responsible_user_id || ''}
                      onChange={(e) => {
                        const updated = [...(formData.measures || [])];
                        updated[index].responsible_user_id = e.target.value ? Number(e.target.value) : undefined;
                        updated[index].responsible_name = e.target.value ? users.find((u: any) => u.id === Number(e.target.value))?.name : '';
                        setFormData({ ...formData, measures: updated });
                      }}
                      disabled={isLocked}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="">Odaberi</option>
                      {users.map((user: any) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                    {!measure.responsible_user_id && (
                      <input
                        type="text"
                        placeholder="Ili unesite ručno"
                        value={measure.responsible_name || ''}
                        onChange={(e) => {
                          const updated = [...(formData.measures || [])];
                          updated[index].responsible_name = e.target.value;
                          setFormData({ ...formData, measures: updated });
                        }}
                        disabled={isLocked}
                        className="w-full mt-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    )}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                    <input
                      type="date"
                      value={measure.deadline || ''}
                      onChange={(e) => {
                        const updated = [...(formData.measures || [])];
                        updated[index].deadline = e.target.value;
                        setFormData({ ...formData, measures: updated });
                      }}
                      disabled={isLocked}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                    <select
                      value={measure.status}
                      onChange={(e) => {
                        const updated = [...(formData.measures || [])];
                        updated[index].status = e.target.value as any;
                        setFormData({ ...formData, measures: updated });
                      }}
                      disabled={isLocked}
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="pending">Na čekanju</option>
                      <option value="in_progress">U toku</option>
                      <option value="completed">Završeno</option>
                      <option value="cancelled">Otkazano</option>
                    </select>
                  </td>
                  {!isLocked && (
                    <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...(formData.measures || [])];
                          updated.splice(index, 1);
                          setFormData({ ...formData, measures: updated });
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!isLocked && (
            <button
              type="button"
              onClick={() => {
                setFormData({
                  ...formData,
                  measures: [...(formData.measures || []), { measure: '', status: 'pending' }],
                });
              }}
              className="mt-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Dodaj mjeru
            </button>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Opšta ocjena prodavnice</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ocjena (1-5 ili A-E)
            </label>
            <select
              value={formData.store_rating || ''}
              onChange={(e) => setFormData({ ...formData, store_rating: e.target.value as any })}
              disabled={isLocked}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Odaberi ocjenu</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
              <option value="E">E</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Komentar
            </label>
            <textarea
              value={formData.store_rating_comment || ''}
              onChange={(e) => setFormData({ ...formData, store_rating_comment: e.target.value })}
              disabled={isLocked}
              placeholder="Automatski komentar (opciono)..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Image component that loads image as blob
function AttachmentImage({
  attachment,
  imageUrls,
  setImageUrls,
  onImageClick,
}: {
  attachment: Attachment;
  imageUrls: Map<number, string>;
  setImageUrls: React.Dispatch<React.SetStateAction<Map<number, string>>>;
  onImageClick: (url: string) => void;
}) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      if (!attachment.id || !attachment.file_url) {
        setLoading(false);
        return;
      }

      // Check if already loaded
      if (imageUrls.has(attachment.id)) {
        setImageUrl(imageUrls.get(attachment.id) || '');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const fullUrl = attachment.file_url.startsWith('http') 
          ? attachment.file_url 
          : `${window.location.origin}${attachment.file_url}`;
        
        const response = await fetch(fullUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load image: ${response.status}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        setImageUrl(url);
        setImageUrls(prev => new Map(prev).set(attachment.id!, url));
        setLoading(false);
      } catch (err) {
        console.error('Error loading image:', err);
        setError(true);
        setLoading(false);
      }
    };

    loadImage();

    // Cleanup
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [attachment.id, attachment.file_url]);

  if (loading) {
    return (
      <div className="aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        <div className="text-gray-400">Učitavanje...</div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
        <span className="text-4xl">{'🖼️'}</span>
      </div>
    );
  }

  return (
    <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative group">
      <img
        src={imageUrl}
        alt={attachment.file_name}
        className="w-full h-full object-cover cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          onImageClick(attachment.file_url || '');
        }}
        onError={() => {
          setError(true);
          setImageUrl('');
        }}
      />
      <div
        onClick={(e) => {
          e.preventDefault();
          onImageClick(attachment.file_url || '');
        }}
        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-30 transition-colors cursor-pointer"
      >
        <Download className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

// Attachments Tab Component
export function ControlRecordAttachmentsTab({
  recordId,
  attachments,
  isLocked,
  onAttachmentsChange,
}: {
  recordId?: number;
  attachments: Attachment[];
  isLocked: boolean;
  onAttachmentsChange?: (attachments: Attachment[]) => void;
}) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPreview, setCameraPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: number) => deleteAttachment(recordId!, attachmentId),
    onSuccess: (_, attachmentId) => {
      // Immediately update attachments list
      if (onAttachmentsChange) {
        const updatedAttachments = attachments.filter(att => att.id !== attachmentId);
        onAttachmentsChange(updatedAttachments);
      }
      
      // Also invalidate queries to refetch from server
      queryClient.invalidateQueries({ queryKey: ['retail-control-records'] });
      queryClient.invalidateQueries({ queryKey: ['retail-control-record', recordId] });
      
      toast.success('Prilog obrisan');
    },
    onError: () => {
      toast.error('Greška pri brisanju priloga');
    },
  });

  const handleFileUpload = async (file: File) => {
    if (!file || !recordId) return;

    setUploading(true);
    try {
      // apiService.post returns response.data directly, so uploadAttachment returns Attachment
      const uploadedAttachment = await uploadAttachment(recordId, file);
      
      // Immediately add the uploaded attachment to the list (backend returns file_url)
      if (onAttachmentsChange && uploadedAttachment) {
        const updatedAttachments = [...attachments, uploadedAttachment];
        onAttachmentsChange(updatedAttachments);
      }
      
      // Also invalidate queries to keep everything in sync
      queryClient.invalidateQueries({ queryKey: ['retail-control-records'] });
      queryClient.invalidateQueries({ queryKey: ['retail-control-record', recordId] });
      
      toast.success('Prilog učitan');
    } catch (error) {
      console.error('Error uploading attachment:', error);
      toast.error('Greška pri učitavanju priloga');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      setCameraPreview(null);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFileUpload(file);
    }
  };

  const handleCameraClick = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setCameraPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Upload immediately
      await handleFileUpload(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Greška pri pristupu kameri. Molimo koristite opciju "Snimi fotografiju"');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob(async (blob) => {
          if (blob && recordId) {
            const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
            await handleFileUpload(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const getFileIcon = (type: string) => {
    if (type === 'image') return '🖼️';
    if (type === 'pdf') return '📄';
    if (type === 'excel') return '📊';
    return '📎';
  };

  const isImage = (attachment: Attachment) => {
    return attachment.file_type === 'image' || 
           attachment.mime_type?.startsWith('image/') ||
           /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.file_name);
  };

  const [imageUrls, setImageUrls] = useState<Map<number, string>>(new Map());

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      imageUrls.forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [imageUrls]);

  // Show message if record not saved yet
  if (!recordId) {
    return (
      <div className="space-y-6">
        <div className="card p-6 text-center">
          <Camera className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Da biste mogli dodavati priloge, prvo sačuvajte evidenciju kontrole.
          </p>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Prilozi ({attachments.length})
          </h3>
          {attachments.length === 0 ? (
            <div className="text-center py-12 border border-gray-200 dark:border-gray-700 rounded-lg">
              <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500 dark:text-gray-400">Nema priloga</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-gray-800"
                >
                  {isImage(attachment) && attachment.file_url ? (
                    <AttachmentImage
                      attachment={attachment}
                      imageUrls={imageUrls}
                      setImageUrls={setImageUrls}
                      onImageClick={(url) => {
                        const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
                        window.open(fullUrl, '_blank', 'noopener,noreferrer');
                      }}
                    />
                  ) : (
                    <div className="aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-4xl">{getFileIcon(attachment.file_type)}</span>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate mb-1">
                      {attachment.file_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isLocked && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Dodaj prilog
          </label>
          
          {/* Camera view */}
          {showCamera && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex flex-col items-center justify-center p-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="max-w-full max-h-[70vh] rounded-lg mb-4"
              />
              <div className="flex gap-4">
                <button
                  onClick={capturePhoto}
                  disabled={uploading}
                  className="px-6 py-3 bg-white text-gray-900 rounded-full font-medium hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Snimam...' : 'Snimi'}
                </button>
                <button
                  onClick={stopCamera}
                  className="px-6 py-3 bg-red-600 text-white rounded-full font-medium hover:bg-red-700"
                >
                  Otkaži
                </button>
              </div>
            </div>
          )}

          {/* Upload buttons - Mobile optimized */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Camera button - primary for mobile */}
            <button
              type="button"
              onClick={handleCameraClick}
              disabled={uploading || !recordId}
              className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium transition-colors shadow-md"
            >
              <Camera className="w-5 h-5" />
              <span className="text-sm sm:text-base font-semibold">📷 Snimi fotografiju</span>
            </button>
            
            {/* File picker button */}
            <label className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Upload className="w-5 h-5" />
              <span className="text-sm sm:text-base">Odaberi fajl</span>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
                accept="image/*,.pdf,.xlsx,.xls"
              />
            </label>
          </div>

          {/* Hidden camera input with capture attribute for mobile */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
            disabled={uploading}
          />

          {uploading && (
            <div className="text-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">Učitavanje...</span>
            </div>
          )}
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <strong>Mobilni uređaj:</strong> Koristite "Snimi fotografiju" za direktno slikanje sa kamere.
            <br />
            <strong>Formati:</strong> Fotografije (JPG, PNG), PDF, Excel (XLSX, XLS). Maksimalna veličina: 50MB
          </p>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Prilozi ({attachments.length})
        </h3>
        {attachments.length === 0 ? (
          <div className="text-center py-12 border border-gray-200 dark:border-gray-700 rounded-lg">
            <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">Nema priloga</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-gray-800"
              >
                {/* Image preview or icon */}
                {isImage(attachment) && attachment.file_url ? (
                  <div className="relative group">
                    <AttachmentImage
                      attachment={attachment}
                      imageUrls={imageUrls}
                      setImageUrls={setImageUrls}
                      onImageClick={(url) => {
                        const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
                        window.open(fullUrl, '_blank', 'noopener,noreferrer');
                      }}
                    />
                    {!isLocked && (
                      <button
                        onClick={() => deleteMutation.mutate(attachment.id!)}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 z-10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative group">
                    <span className="text-4xl">{getFileIcon(attachment.file_type)}</span>
                    {!isLocked && (
                      <button
                        onClick={() => deleteMutation.mutate(attachment.id!)}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
                
                {/* File info */}
                <div className="p-3">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate mb-1">
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {attachment.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">
                      {attachment.notes}
                    </p>
                  )}
                      {attachment.file_url && !isImage(attachment) && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            if (attachment.file_url) {
                              const fullUrl = attachment.file_url.startsWith('http') 
                                ? attachment.file_url 
                                : `${window.location.origin}${attachment.file_url}`;
                              window.open(fullUrl, '_blank', 'noopener,noreferrer');
                            }
                          }}
                          className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400"
                        >
                          <Download className="w-3 h-3" />
                          Preuzmi
                        </button>
                      )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


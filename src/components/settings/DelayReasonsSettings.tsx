import { useState } from 'react';
import { Plus, Edit2, Trash2, Info } from 'lucide-react';
import { DelayReason } from '../projectManager/ProjectSettings';
import { AddReasonDialog } from './AddReasonDialog';

export const DelayReasonsSettings: React.FC<{
  editingReasons: DelayReason[];
  handleDeleteReason: (reasonId: string) => void;
  onUpdateDelayReasons: (reasons: DelayReason[]) => void;
}> = ({ editingReasons, handleDeleteReason, onUpdateDelayReasons }) => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingReason, setEditingReason] = useState<DelayReason | null>(null);
  
  return (
    <div className="max-w-6xl mx-auto">
      {/* Reasons Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">قائمة المسببات</h3>
          <button
            onClick={() => setShowAddDialog(true)}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Plus size={16} />
            إضافة مسبب جديد
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full" dir="rtl">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  #
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  اسم المسبب
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {editingReasons.map((reason, index) => (
                <tr key={reason.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-500 text-right">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm font-medium text-gray-900">{reason.name}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => {
                          setEditingReason(reason);
                          setShowAddDialog(true);
                        }}
                        className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="تعديل"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteReason(reason.id)}
                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {editingReasons.length === 0 && (
            <div className="py-12 text-center">
              <Info size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">لا توجد مسببات مسجلة</p>
              <p className="text-sm text-gray-400 mt-1">ابدأ بإضافة أول مسبب</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      {showAddDialog && (
        <AddReasonDialog
          reason={editingReason}
          onSave={(newReason) => {
            if (editingReason) {
              const updated = editingReasons.map(r => 
                r.id === editingReason.id ? { ...r, ...newReason } : r
              );
              onUpdateDelayReasons(updated);
            } else {
              const reason: DelayReason = {
                id: `reason-${Date.now()}`,
                name: newReason.name || '',
              };
              onUpdateDelayReasons([...editingReasons, reason]);
            }
            setShowAddDialog(false);
            setEditingReason(null);
          }}
          onClose={() => {
            setShowAddDialog(false);
            setEditingReason(null);
          }}
        />
      )}
    </div>
  );
};
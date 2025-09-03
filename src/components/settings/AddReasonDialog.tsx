import { useState } from "react";
import { DelayReason } from "../projectManager/ProjectSettings";

export const AddReasonDialog: React.FC<{
  reason: DelayReason | null;
  onSave: (reason: Partial<DelayReason>) => void;
  onClose: () => void;
}> = ({ reason, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: reason?.name || '',
  });

  return (
    <>
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
          {/* Dialog Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {reason ? 'تعديل المسبب' : 'إضافة مسبب جديد'}
            </h3>
          </div>

          {/* Dialog Body */}
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                اسم المسبب <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="مثال: نقص الموارد البشرية"
                autoFocus
              />
            </div>

            
          </div>

          {/* Dialog Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
                onClick={() => {
                if (formData.name.trim()) {
                    onSave(formData);
                }
                }}
                disabled={!formData.name.trim()}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
            >
                {reason ? 'حفظ التغييرات' : 'إضافة'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
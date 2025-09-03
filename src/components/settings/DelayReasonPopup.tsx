import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, TrendingUp, X } from 'lucide-react';

export interface DelayReason {
  id: string;
  name: string;
  type: 'delay' | 'advance';
  color: string;
  description?: string;
}

export interface TaskChange {
  taskId: string;
  taskName: string;
  oldDuration: number;
  newDuration: number;
  changeType: 'extend' | 'reduce';
  changeAmount: number;
}

interface DelayReasonPopupProps {
  isVisible: boolean;
  taskChange: TaskChange | null;
  delayReasons: DelayReason[];
  onSelectReason: (reasonId: string, comment?: string) => void;
  onSkip: () => void;
  onClose: () => void;
  position?: { x: number; y: number };
}

export const DelayReasonPopup: React.FC<DelayReasonPopupProps> = ({
  isVisible,
  taskChange,
  delayReasons,
  onSelectReason,
  onSkip,
  onClose,
  position = { x: 20, y: 20 }
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);

  // Reset state when popup opens
  useEffect(() => {
    if (isVisible && taskChange) {
      setSelectedReason('');
      setComment('');
      setShowComment(false);
    }
  }, [isVisible, taskChange]);

  if (!isVisible || !taskChange) return null;

  // Filter reasons based on change type
  const relevantReasons = delayReasons.filter(reason => {
    if (taskChange.changeType === 'extend') {
      return reason.type === 'delay';
    } else {
      return reason.type === 'advance';
    }
  });

  const handleSubmit = () => {
    if (selectedReason) {
      onSelectReason(selectedReason, comment.trim() || undefined);
    }
  };

  const changeText = taskChange.changeType === 'extend' ? 'تم تمديد' : 'تم تقليص';
  const changeIcon = taskChange.changeType === 'extend' ? 
    <AlertTriangle className="text-orange-500" size={20} /> : 
    <TrendingUp className="text-green-500" size={20} />;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 pointer-events-auto" onClick={onClose} />
      
      {/* Popup positioned at bottom-left */}
      <div 
        className="absolute pointer-events-auto"
        style={{
          left: position.x,
          bottom: position.y,
          transform: 'translateY(-100%)'
        }}
      >
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-96 max-h-[70vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {changeIcon}
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">تحديد سبب التغيير</h3>
                  <p className="text-xs text-gray-600">اختياري - يمكنك التخطي</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Task info */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm">
              <Clock size={16} className="text-gray-400" />
              <span className="font-medium text-gray-700">{taskChange.taskName}</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {changeText} من {taskChange.oldDuration} أيام إلى {taskChange.newDuration} أيام 
              ({taskChange.changeAmount > 0 ? '+' : ''}{taskChange.changeAmount} أيام)
            </div>
          </div>

          {/* Reasons list */}
          <div className="max-h-60 overflow-y-auto">
            {relevantReasons.length > 0 ? (
              <div className="p-2">
                {relevantReasons.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => setSelectedReason(reason.id)}
                    className={`w-full text-right p-3 rounded-lg mb-2 transition-all ${
                      selectedReason === reason.id
                        ? 'bg-blue-50 border-2 border-blue-200 shadow-sm'
                        : 'border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: reason.color }}
                        />
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          reason.type === 'delay' 
                            ? 'bg-orange-100 text-orange-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {reason.type === 'delay' ? 'تأخير' : 'تسريع'}
                        </span>
                      </div>
                      <div className="text-right flex-1">
                        <div className="font-medium text-gray-900 text-sm">{reason.name}</div>
                        {reason.description && (
                          <div className="text-xs text-gray-600 mt-1">{reason.description}</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <AlertTriangle size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">لا توجد أسباب متاحة لهذا النوع من التغيير</p>
                <p className="text-xs text-gray-400 mt-1">يمكنك إضافة أسباب جديدة من الإعدادات</p>
              </div>
            )}
          </div>

          {/* Comment section */}
          {selectedReason && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setShowComment(!showComment)}
                className="text-sm text-blue-600 hover:text-blue-700 mb-2"
              >
                {showComment ? 'إخفاء التعليق' : 'إضافة تعليق (اختياري)'}
              </button>
              
              {showComment && (
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="أضف تعليق أو تفاصيل إضافية..."
                  className="w-full px-3 py-2 border border-gray-200 rounded text-sm resize-none"
                  rows={3}
                  maxLength={200}
                />
              )}
            </div>
          )}

          {/* Actions */}
          <div className="px-4 py-3 bg-white border-t border-gray-200 flex gap-2 justify-end">
            <button
              onClick={onSkip}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              تخطي
            </button>
            <button
              onClick={handleSubmit}
              disabled={!selectedReason}
              className={`px-4 py-2 text-sm rounded transition-colors ${
                selectedReason
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              تأكيد
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
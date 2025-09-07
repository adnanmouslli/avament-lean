"use client";

import React, { useState, useCallback } from 'react';
import { HierarchyNode, Task } from './GanttCanvas';
import { X, Edit3, Save, Calendar, User, Clock, Target, CalendarDays } from 'lucide-react';
import { Slider } from '../ui/slider';

interface TasksSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: HierarchyNode;
  allTasks: Array<{ task: Task; nodePath: string; nodeId: string }>;
  onUpdateTaskProgress: (taskId: string, nodeId: string, progress: number) => void;
  projectStartDate?: Date; // تاريخ بداية المشروع
}

export const TasksSummaryModal: React.FC<TasksSummaryModalProps> = ({
  isOpen,
  onClose,
  node,
  allTasks,
  onUpdateTaskProgress,
  projectStartDate = new Date() // تاريخ افتراضي إذا لم يتم تمريره
}) => {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [tempProgress, setTempProgress] = useState<number>(0);

  if (!isOpen) return null;

  // حساب تاريخ البداية والنهاية للمهمة
  const getTaskDates = (task: Task) => {
    const startDate = new Date(projectStartDate);
    startDate.setDate(startDate.getDate() + task.startDay);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + task.duration - 1);
    
    return { startDate, endDate };
  };

  // تنسيق التاريخ للعرض
    const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).split('/').reverse().join('/'); // تنسيق: YYYY/MM/DD
    };

  // حساب مدة المهمة بالأيام
  const calculateDuration = (startDate: Date, endDate: Date) => {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'emerald';
    if (progress >= 75) return 'blue';
    if (progress >= 50) return 'amber';
    if (progress >= 25) return 'orange';
    return 'red';
  };

  const getStatusInfo = (progress: number) => {
    if (progress >= 100) return { text: 'مكتملة', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', borderColor: 'border-emerald-200' };
    if (progress >= 75) return { text: 'متقدمة', bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200' };
    if (progress >= 50) return { text: 'في التقدم', bgColor: 'bg-amber-50', textColor: 'text-amber-700', borderColor: 'border-amber-200' };
    if (progress >= 25) return { text: 'بداية العمل', bgColor: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-200' };
    return { text: 'لم تبدأ', bgColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200' };
  };

  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setTempProgress(task.progress || 0);
  };

  const handleSaveProgress = (task: Task, nodeId: string) => {
    onUpdateTaskProgress(task.id, nodeId, tempProgress);
    setEditingTaskId(null);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setTempProgress(0);
  };

  const completedTasks = allTasks.filter(t => (t.task.progress || 0) >= 100).length;
  const inProgressTasks = allTasks.filter(t => (t.task.progress || 0) > 0 && (t.task.progress || 0) < 100).length;
  const notStartedTasks = allTasks.filter(t => (t.task.progress || 0) === 0).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col border border-gray-200">
        
        {/* Fixed Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white p-4 rounded-t-xl flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div>
                <h2 className="text-lg font-bold">{node.content}</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Compact Statistics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 backdrop-blur rounded-lg p-2.5">
              <div className="text-emerald-300 text-xs font-medium">مكتملة</div>
              <div className="text-lg font-bold">{completedTasks}</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-2.5">
              <div className="text-amber-300 text-xs font-medium">قيد التنفيذ</div>
              <div className="text-lg font-bold">{inProgressTasks}</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-2.5">
              <div className="text-red-300 text-xs font-medium">لم تبدأ</div>
              <div className="text-lg font-bold">{notStartedTasks}</div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {allTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Target className="w-12 h-12 mb-3 text-gray-300" />
              <h3 className="text-base font-medium mb-1">لا توجد مهام</h3>
              <p className="text-sm">لا توجد مهام في هذا القسم حالياً</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {allTasks.map(({ task, nodePath, nodeId }) => {
                const statusInfo = getStatusInfo(task.progress || 0);
                const isEditing = editingTaskId === task.id;
                const { startDate, endDate } = getTaskDates(task);
                const duration = calculateDuration(startDate, endDate);

                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-lg border transition-all duration-200 hover:shadow-sm ${statusInfo.borderColor}`}
                  >
                    <div className={`${statusInfo.bgColor} p-3 rounded-t-lg border-b ${statusInfo.borderColor}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 space-x-reverse mb-1">
                            <h3 className="text-sm font-semibold text-gray-900">{task.content}</h3>
                            <span className={`
                              inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                              ${task.type === 'milestone' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}
                            `}>
                              {task.type === 'milestone' ? 'معلم' : 'مهمة'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{nodePath}</p>
                          
                          {/* معلومات المهمة مع التواريخ */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                            {task.author && (
                              <div className="flex items-center space-x-1 space-x-reverse text-blue-600">
                                <User className="w-3 h-3" />
                                <span className="truncate">{task.author}</span>
                              </div>
                            )}
                            <div className="flex items-center space-x-1 space-x-reverse text-green-600">
                              <Calendar className="w-3 h-3" />
                              <span className="truncate" title={`تاريخ البداية: ${formatDate(startDate)}`}>
                                بداية: {formatDate(startDate)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 space-x-reverse text-red-600">
                              <CalendarDays className="w-3 h-3" />
                              <span className="truncate" title={`تاريخ النهاية: ${formatDate(endDate)}`}>
                                نهاية: {formatDate(endDate)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 space-x-reverse text-gray-600">
                              <Clock className="w-3 h-3" />
                              <span>{duration} يوم</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right ml-3">
                          <div className={`
                            inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold
                            ${statusInfo.bgColor} ${statusInfo.textColor} border ${statusInfo.borderColor}
                          `}>
                            {statusInfo.text}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-3">
                      {/* Progress Section */}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">نسبة الإنجاز</span>
                        <div className="flex items-center space-x-1 space-x-reverse">
                          <span className="text-sm font-bold text-gray-900">
                            {isEditing ? tempProgress : (task.progress || 0)}%
                          </span>
                          {!isEditing ? (
                            <button
                              onClick={() => handleStartEdit(task)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title="تعديل"
                            >
                              <Edit3 className="w-3 h-3 text-gray-500" />
                            </button>
                          ) : (
                            <div className="flex space-x-1 space-x-reverse">
                              <button
                                onClick={() => handleSaveProgress(task, nodeId)}
                                className="p-1 bg-green-100 hover:bg-green-200 rounded transition-colors"
                                title="حفظ"
                              >
                                <Save className="w-3 h-3 text-green-600" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                title="إلغاء"
                              >
                                <X className="w-3 h-3 text-gray-600" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar and Slider */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <Slider
                            name=''
                            defaultValue={[tempProgress]}
                            onValueChange={(value) => setTempProgress(value[0])}
                            min={0}
                            max={100}
                            step={5}
                            className="w-full"
                          />
                          <div className="text-xs text-gray-500 text-center">اسحب لتعديل النسبة</div>
                        </div>
                      ) : (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-full rounded-full transition-all duration-300 bg-${getProgressColor(task.progress || 0)}-500`}
                            style={{ width: `${task.progress || 0}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="bg-gray-50 p-3 rounded-b-xl border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="text-xs text-gray-600">
                إجمالي المهام: {allTasks.length}
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
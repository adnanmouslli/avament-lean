// إنشاء ملف جديد: components/projectManager/TaskDetailsSidebar.tsx
"use client";

import React, { useState, useCallback } from 'react';
import { X, Calendar, Users, Clock, Link, Save } from 'lucide-react';

interface Task {
  id: string;
  content: string;
  startDay: number;
  duration: number;
  color: string;
  progress?: number;
  author?: string;
  type?: 'task' | 'milestone';
  managerId?: string;
}

interface Manager {
  id: string;
  name: string;
  color: string;
}

interface TaskDetailsSidebarProps {
  isVisible: boolean;
  onClose: () => void;
  task: Task;
  nodeId: string;
  managers: Manager[];
  onUpdateTask: (taskId: string, nodeId: string, updatedTask: Partial<Task>) => void;
  linkedTasks: {
    predecessors: Task[];
    successors: Task[];
  };
}

export const TaskDetailsSidebar: React.FC<TaskDetailsSidebarProps> = ({
  isVisible,
  onClose,
  task,
  nodeId,
  managers,
  onUpdateTask,
  linkedTasks
}) => {
  const [editedTask, setEditedTask] = useState<Task>(task);
  const [hasChanges, setHasChanges] = useState(false);

  const handleInputChange = useCallback((field: keyof Task, value: any) => {
    setEditedTask(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(() => {
    onUpdateTask(task.id, nodeId, editedTask);
    setHasChanges(false);
  }, [task.id, nodeId, editedTask, onUpdateTask]);

  const currentManager = managers.find(m => m.id === editedTask.managerId);

  return (
    <div className={`
      fixed top-14 right-0 h-[calc(100vh-3.5rem)] w-96 z-40
      bg-white shadow-xl border-l border-gray-200
      transition-transform duration-300 ease-in-out
      ${isVisible ? 'translate-x-0' : 'translate-x-full'}
    `}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">تفاصيل المهمة</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              اسم المهمة
            </label>
            <input
              type="text"
              value={editedTask.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Manager */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              الشركة المسؤولة
            </label>
            <select
              value={editedTask.managerId || ''}
              onChange={(e) => handleInputChange('managerId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">اختر الشركة</option>
              {managers.map(manager => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock size={16} className="inline mr-2" />
              المدة (بالأيام)
            </label>
            <input
              type="number"
              min="0"
              value={editedTask.duration}
              onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Start Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-2" />
              يوم البداية
            </label>
            <input
              type="number"
              min="0"
              value={editedTask.startDay}
              onChange={(e) => handleInputChange('startDay', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Progress */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نسبة الإنجاز: {editedTask.progress || 0}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={editedTask.progress || 0}
              onChange={(e) => handleInputChange('progress', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Linked Tasks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Link size={16} className="inline mr-2" />
              المهام المربوطة
            </label>
            
            {linkedTasks.predecessors.length > 0 && (
              <div className="mb-3">
                <h4 className="text-xs font-medium text-gray-600 mb-1">المهام السابقة:</h4>
                {linkedTasks.predecessors.map(linkedTask => (
                  <div key={linkedTask.id} className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded mb-1">
                    {linkedTask.content}
                  </div>
                ))}
              </div>
            )}

            {linkedTasks.successors.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-600 mb-1">المهام اللاحقة:</h4>
                {linkedTasks.successors.map(linkedTask => (
                  <div key={linkedTask.id} className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded mb-1">
                    {linkedTask.content}
                  </div>
                ))}
              </div>
            )}

            {linkedTasks.predecessors.length === 0 && linkedTasks.successors.length === 0 && (
              <p className="text-sm text-gray-500">لا توجد مهام مربوطة</p>
            )}
          </div>

        </div>

        {/* Footer */}
        {hasChanges && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save size={16} />
              <span>حفظ التغييرات</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
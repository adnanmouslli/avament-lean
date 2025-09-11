"use client";

import React, { useState, useCallback } from 'react';
import { HierarchyNode, Task } from './GanttCanvas';
import { X, Edit3, Check, User, Clock, Target, Calendar } from 'lucide-react';

interface TasksSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: HierarchyNode;
  allTasks: Array<{ task: Task; nodePath: string; nodeId: string }>;
  onUpdateTaskProgress: (taskId: string, nodeId: string, progress: number) => void;
  projectStartDate?: Date;
}

export const TasksSummaryModal: React.FC<TasksSummaryModalProps> = ({
  isOpen,
  onClose,
  node,
  allTasks,
  onUpdateTaskProgress,
  projectStartDate = new Date()
}) => {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [tempProgress, setTempProgress] = useState<number>(0);

  if (!isOpen) return null;

  const getTaskDates = (task: Task) => {
    const startDate = new Date(projectStartDate);
    startDate.setDate(startDate.getDate() + task.startDay);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + task.duration - 1);
    return { startDate, endDate };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ar', { month: 'short', day: 'numeric' });
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusBadge = (progress: number) => {
    if (progress >= 100) return { text: 'مكتملة', class: 'bg-green-100 text-green-700' };
    if (progress >= 50) return { text: 'جارية', class: 'bg-blue-100 text-blue-700' };
    if (progress > 0) return { text: 'بدأت', class: 'bg-yellow-100 text-yellow-700' };
    return { text: 'لم تبدأ', class: 'bg-gray-100 text-gray-700' };
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

  const stats = {
    completed: allTasks.filter(t => (t.task.progress || 0) >= 100).length,
    inProgress: allTasks.filter(t => (t.task.progress || 0) > 0 && (t.task.progress || 0) < 100).length,
    notStarted: allTasks.filter(t => (t.task.progress || 0) === 0).length
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`
          fixed inset-0 bg-black transition-opacity duration-300 z-30
          ${isOpen ? 'opacity-20' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`
        fixed top-14 right-0 h-[calc(100vh-3.5rem)] w-96 z-40
        bg-white shadow-2xl border-l border-gray-200
        transition-all duration-500 ease-out
        ${isOpen ? 
          'translate-x-0 opacity-100' : 
          'translate-x-full opacity-0'
        }
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`
            flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50
            transition-all duration-700 delay-100 ease-out
            ${isOpen ? 
              'transform translate-y-0 opacity-100' : 
              'transform -translate-y-4 opacity-0'
            }
          `}>
            <div className="flex items-center space-x-3">
              <div className={`
                transition-all duration-500 delay-200 ease-out
                ${isOpen ? 
                  'transform rotate-0 scale-100' : 
                  'transform rotate-180 scale-0'
                }
              `}>
                <Target className="text-blue-600" size={20} />
              </div>
              <div>
                <h3 className={`
                  text-lg font-semibold text-gray-900
                  transition-all duration-500 delay-300 ease-out
                  ${isOpen ? 
                    'transform translate-x-0 opacity-100' : 
                    'transform translate-x-4 opacity-0'
                  }
                `}>
                  مهام القسم
                </h3>
                <p className="text-sm text-gray-500 truncate max-w-48">{node.content}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`
                p-2 hover:bg-gray-200 rounded-lg transition-all duration-300
                ${isOpen ? 
                  'transform rotate-0 scale-100 opacity-100' : 
                  'transform rotate-90 scale-0 opacity-0'
                }
              `}
              style={{ transitionDelay: isOpen ? '400ms' : '0ms' }}
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Stats */}
          <div className={`
            grid grid-cols-3 gap-3 p-4 border-b border-gray-200 bg-gray-50
            transition-all duration-600 ease-out
            ${isOpen ? 
              'transform translate-x-0 opacity-100' : 
              'transform translate-x-8 opacity-0'
            }
          `}
          style={{ transitionDelay: isOpen ? '500ms' : '0ms' }}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-xs text-gray-600">مكتملة</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
              <div className="text-xs text-gray-600">جارية</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.notStarted}</div>
              <div className="text-xs text-gray-600">لم تبدأ</div>
            </div>
          </div>

          {/* Tasks List */}
          <div className="flex-1 overflow-y-auto p-4">
            {allTasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Target size={40} className="mx-auto mb-4 opacity-40" />
                <p className="text-sm">لا توجد مهام في هذا القسم</p>
              </div>
            ) : (
              <div className="space-y-2">
              {allTasks.map(({ task, nodeId }, index) => {
                const isEditing = editingTaskId === task.id;
                const { startDate, endDate } = getTaskDates(task);
                const statusBadge = getStatusBadge(task.progress || 0);

                return (
                  <div
                    key={task.id}
                    className={`
                      bg-white border border-gray-200 rounded-md p-2 hover:shadow-sm transition-all duration-500 ease-out
                      ${isOpen ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"}
                    `}
                    style={{ transitionDelay: isOpen ? `${300 + index * 40}ms` : "0ms" }}
                  >
                    {/* العنوان + الحالة */}
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-medium text-gray-900 truncate">
                        {task.content}
                      </h4>
                      <span className={`px-2 py-0.5 text-[10px] rounded-full ${statusBadge.class}`}>
                        {statusBadge.text}
                      </span>
                    </div>

                    {/* معلومات صغيرة */}
                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-gray-600 mb-1">
                      {task.author && <span> {task.author}</span>}
                    </div>

                    {/* التقدم */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span></span>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold">
                            {isEditing ? tempProgress : task.progress || 0}%
                          </span>
                          {!isEditing ? (
                            <button
                              onClick={() => handleStartEdit(task)}
                              className="p-0.5 hover:bg-gray-100 rounded"
                            >
                              <Edit3 size={12} className="text-gray-500" />
                            </button>
                          ) : (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleSaveProgress(task, nodeId)}
                                className="p-0.5 text-green-600 hover:bg-green-100 rounded"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-0.5 text-gray-500 hover:bg-gray-100 rounded"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {isEditing ? (
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={tempProgress}
                          onChange={(e) => setTempProgress(Number(e.target.value))}
                          className="w-full h-1 bg-gray-200 rounded-lg cursor-pointer"
                        />
                      ) : (
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${getProgressColor(task.progress || 0)}`}
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

        </div>
      </div>

      {/* Custom Slider Styles */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </>
  );
};
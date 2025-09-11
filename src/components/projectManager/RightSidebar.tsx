"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Layers,
  Users,
  Check,
  Target,
  Edit3,
  Trash2,
  User,
  Flag,
  Save,
  MoreHorizontal,
  Circle,
  Square
} from 'lucide-react';
import ColorPicker from '../ui/ColorPicker';
import { Manager } from '@/pages/ProjectManager';

// Types
interface Task {
  id: string;
  content: string;
  startDay: number;
  duration: number;
  color: string;
  progress?: number;
  author?: string;
  priority?: 'low' | 'medium' | 'high';
  type?: 'task' | 'milestone';
  teamSize?: number;
}

interface DragItem {
  id: string;
  content: string;
  color: string;
  duration: number;
  priority: 'low' | 'medium' | 'high';
  teamSize: number;
  type?: 'task' | 'milestone';
}

interface RightSidebarProps {
  viewState: {
    zoom: number;
    offsetX: number;
    offsetY: number;
  };
  setViewState: React.Dispatch<React.SetStateAction<any>>;
  onSearch?: (query: string) => void;
  onTasksSelected?: (taskIds: string[]) => void;
  onAddTask?: (task: Partial<Task>) => void;
  onDeleteTasks?: () => void;
  onLinkTasks?: () => void;
  hierarchyTree?: any[];
  isVisible?: boolean;
  onClose?: () => void;
  managers?: Manager[];
  onUpdateManager?: (managerId: string, updatedData: Partial<Manager>) => void;
  onAddManager?: (manager: Manager) => void;
  onDeleteManager?: (managerId: string) => void;
  onReassignTasks?: (oldManagerId: string, newManagerId: string) => void;
}

// Draggable Task Item Component
const DraggableTaskItem: React.FC<{
  task: DragItem;
  itemType: 'task' | 'milestone';
  onDragStart: () => void;
  onDragEnd: () => void;
  handleEditClick?: (e: React.MouseEvent) => void;
  handleDeleteClick?: (e: React.MouseEvent) => void;

}> = ({ task, itemType, onDragStart, onDragEnd, handleEditClick, handleDeleteClick }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragElement, setDragElement] = useState<HTMLElement | null>(null);

  const createDragPreview = (e: React.DragEvent) => {
    const preview = document.createElement('div');
    preview.className = 'drag-preview';
    
    if (itemType === 'milestone') {
      preview.style.cssText = `
        position: fixed;
        top: -1000px;
        left: -1000px;
        width: 24px;
        height: 24px;
        background-color: ${task.color};
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 9999;
        pointer-events: none;
        opacity: 0.9;
        border: 1px solid rgba(255,255,255,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      preview.innerHTML = `<div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div>`;
      e.dataTransfer.setDragImage(preview, 12, 12);
    } else {
      preview.style.cssText = `
        position: fixed;
        top: -1000px;
        left: -1000px;
        width: 100px;
        height: 24px;
        padding: 4px 8px;
        background-color: ${task.color};
        color: white;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 500;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        z-index: 9999;
        pointer-events: none;
        opacity: 0.9;
        border: 1px solid rgba(255,255,255,0.2);
        display: flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-family: 'Inter', sans-serif;
      `;
      preview.innerHTML = task.content;
      e.dataTransfer.setDragImage(preview, 8, 12);
    }
    
    document.body.appendChild(preview);
    setDragElement(preview);
    
    setTimeout(() => {
      if (document.body.contains(preview)) {
        document.body.removeChild(preview);
      }
    }, 0);
  };


  const taskData = {
    ...task,
    type: itemType
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        setIsDragging(true);
        onDragStart();
        createDragPreview(e);
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('task', JSON.stringify({
          ...taskData,
          managerId: task.id,
          name: task.content,
        }));
      }}
      onDragEnd={() => {
        setIsDragging(false);
        onDragEnd();
        if (dragElement && document.body.contains(dragElement)) {
          document.body.removeChild(dragElement);
        }
      }}
      className={`
        cursor-move transition-all duration-200 select-none w-full
        ${isDragging ? 'opacity-50 scale-95' : 'hover:scale-[1.02]'}
      `}
      title={`اسحب ${itemType === 'milestone' ? 'المعلم' : 'المهمة'} للإضافة`}
    >
      {itemType === 'milestone' ? (
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center shadow-sm border border-white/30 transition-all duration-200"
          style={{ backgroundColor: task.color }}
        >
          <Target size={10} className="text-white" />
        </div>
      ) : (
        <div
          className="w-full px-2 py-1.5 rounded shadow-sm border border-white/20 transition-all duration-200 flex items-center justify-between"
          style={{ backgroundColor: task.color }}
        >
          {/* اسم المحتوى - أقصى اليسار */}
          <div className="text-white text-xs font-medium truncate flex-1 text-left mr-2">
            {task.content}
          </div>

          {/* أزرار التحكم - أقصى اليمين */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleEditClick}
              className="p-1.5 text-blue-200 hover:text-white hover:bg-white/20 rounded-md transition-colors"
              title="تعديل"
            >
              <Edit3 size={14} />
            </button>
            {task.content !== 'بدون شركة' && (
              <button
                onClick={handleDeleteClick}
                className="p-1.5 text-red-200 hover:text-white hover:bg-white/20 rounded-md transition-colors"
                title="حذف"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Manager Card Component - محسن
const ManagerCard: React.FC<{
  task: DragItem;
  onDragStart: () => void;
  onDragEnd: () => void;
  onEdit?: (updatedTask: DragItem) => void;
  onDelete?: (taskId: string) => void;
  onUpdateManager?: (managerId: string, updatedData: Partial<Manager>) => void;
  onDeleteManager?: (managerId: string) => void;
  onShowDeleteWarning?: (managerId: string, managerName: string, taskCount: number) => void;
}> = ({ task, onDragStart, onDragEnd, onEdit, onDelete, onUpdateManager, onDeleteManager, onShowDeleteWarning }) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleSaveEdit = (updatedTask: DragItem) => {
    if (onEdit) {
      onEdit(updatedTask);
    }
    
    if (onUpdateManager) {
      onUpdateManager(updatedTask.id, {
        name: updatedTask.content,
        color: updatedTask.color
      });
    }
    
    setIsEditing(false);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsEditing(true);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (onShowDeleteWarning) {
      onShowDeleteWarning(task.id, task.content, 0); // سيتم حساب taskCount في المكون الرئيسي
    }
  };

  if (isEditing) {
    return (
      <EditManagerForm
        task={task}
        onSave={handleSaveEdit}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div>
      
      {/* منطقة السحب - تحت اسم الشركة */}
      <div className="mt-3 flex items-center justify-between gap-3">
        
        {/* المهمة - تأخذ معظم المساحة */}
        <div className="flex-1">
          <DraggableTaskItem
            task={task}
            itemType="task"
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            handleEditClick={handleEditClick}
            handleDeleteClick={handleDeleteClick}

          />
        </div>

        {/* المعلم */}
        <div className="flex-shrink-0">
          <DraggableTaskItem
            task={task}
            itemType="milestone"
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        </div>
      </div>
    </div>
  );
};

// New Manager Form - محسن
const NewManagerForm: React.FC<{
  onSubmit: (task: Omit<DragItem, 'id'>) => void;
  onCancel: () => void;
  initialName: string;
}> = ({ onSubmit, onCancel, initialName }) => {
  const [formData, setFormData] = useState({
    content: initialName,
    color: "#3b82f6",
    priority: 'medium' as 'low' | 'medium' | 'high',
    teamSize: 1,
    type: 'task' as 'task' | 'milestone',
    duration: 5
  });

  const handleSubmit = () => {
    if (formData.content.trim()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="space-y-4">
        
        {/* اسم الشركة */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            اسم الشركة
          </label>
          <input
            type="text"
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            placeholder="أدخل اسم الشركة..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            autoFocus
          />
        </div>

        {/* اختيار اللون */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            اللون
          </label>
          <ColorPicker
            color={formData.color}
            onChange={(newColor) =>
              setFormData((prev) => ({ ...prev, color: newColor }))
            }
          />
        </div>

        {/* الأزرار */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={handleSubmit}
            disabled={!formData.content.trim()}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              formData.content.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus size={14} />
            إضافة
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

// Edit Manager Form - محسن
const EditManagerForm: React.FC<{
  task: DragItem;
  onSave: (updatedTask: DragItem) => void;
  onCancel: () => void;
}> = ({ task, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    content: task.content,
    color: task.color,
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (formData.content.trim()) {
      const updatedTask = {
        ...task,
        content: formData.content.trim(),
        color: formData.color,
      };
      
      onSave(updatedTask);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-3">
        
        {/* اسم الشركة */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            اسم الشركة
          </label>
          <input
            type="text"
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
          />
        </div>

        {/* اختيار اللون */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            اللون
          </label>
          <ColorPicker
            color={formData.color}
            onChange={(newColor) =>
              setFormData((prev) => ({ ...prev, color: newColor }))
            }
          />
        </div>

        {/* الأزرار */}
        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={!formData.content.trim()}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
              formData.content.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Check size={12} />
            حفظ
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
};

// Main Component - محسن
export const RightSidebar: React.FC<RightSidebarProps> = ({
  viewState,
  setViewState,
  onSearch,
  onTasksSelected,
  onAddTask,
  hierarchyTree,
  onDeleteTasks,
  onLinkTasks,
  isVisible = true,
  onClose,
  managers = [],
  onUpdateManager,
  onAddManager,
  onDeleteManager,
  onReassignTasks,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDraggingTask, setIsDraggingTask] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [showDeleteWarning, setShowDeleteWarning] = useState<{
    isVisible: boolean;
    managerId: string;
    managerName: string;
    taskCount: number;
  } | null>(null);

  const customTasks: DragItem[] = managers.map(manager => ({
    id: manager.id,
    content: manager.name,
    color: manager.color,
    duration: 5,
    priority: 'medium',
    teamSize: 1,
    type: 'task'
  }));

  const filteredTasks = customTasks.filter(task => 
    task.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasSearchResults = searchQuery === '' || filteredTasks.length > 0;

  // دالة حساب عدد المهام المرتبطة بشركة معينة
  const getTaskCountForManager = useCallback((managerId: string): number => {
    let taskCount = 0;
    
    const countTasksInTree = (nodes: any[]) => {
      nodes.forEach(node => {
        node.tasks.forEach((task: any) => {
          if (task.managerId === managerId) {
            taskCount++;
          }
        });
        if (node.children) {
          countTasksInTree(node.children);
        }
      });
    };
    
    if (hierarchyTree) {
      countTasksInTree(hierarchyTree);
    }
    
    return taskCount;
  }, [hierarchyTree]);

  // دالة إظهار نافذة التحذير
  const handleShowDeleteWarning = useCallback((managerId: string, managerName: string, _taskCount: number) => {
    const actualTaskCount = getTaskCountForManager(managerId);
    
    if (actualTaskCount > 0) {
      setShowDeleteWarning({
        isVisible: true,
        managerId,
        managerName,
        taskCount: actualTaskCount
      });
    } else {
      // حذف مباشر إذا لم توجد مهام
      if (onDeleteManager) {
        onDeleteManager(managerId);
      }
    }
  }, [getTaskCountForManager, onDeleteManager]);

  const handleAddCustomTask = (taskData: Omit<DragItem, 'id'>) => {
    const newManager: Manager = {
      id: `manager-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: taskData.content,
      color: taskData.color
    };
    
    if (onAddManager) {
      onAddManager(newManager);
    }
    
    setShowAddForm(false);
    setSearchQuery('');
  };

  const handleEditTask = (updatedTask: DragItem) => {
    if (onUpdateManager) {
      onUpdateManager(updatedTask.id, {
        name: updatedTask.content,
        color: updatedTask.color
      });
    }
  };

  const handleDeleteTask = (taskId: string) => {
    handleShowDeleteWarning(taskId, '', 0);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowAddForm(false);
    onSearch?.(query);
  };

  return (
    <div className="w-full h-full bg-gray-50 border-l border-gray-200 flex flex-col">
      
      {/* Header */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">الشركات</h2>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users size={16} />
            <span>{customTasks.length}</span>
          </div>
        </div>
        
        {/* البحث */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="بحث..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
          />
        </div>
      </div>

      {/* المحتوى */}
      <div className="flex-1 overflow-y-auto p-4">
        {showAddForm ? (
          <NewManagerForm
            onSubmit={handleAddCustomTask}
            onCancel={() => setShowAddForm(false)}
            initialName={searchQuery}
          />
        ) : hasSearchResults ? (
          <div className="space-y-4">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Layers size={40} className="mx-auto mb-4 opacity-40" />
                <p className="text-base font-medium mb-2">لا توجد شركات</p>
                <p className="text-sm mb-6">قم بإضافة شركة للبدء</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  <Plus size={16} />
                  إضافة شركة
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">
                  </h3>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <Plus size={12} />
                    إضافة
                  </button>
                </div>

                <div className="space-y-3">
                  {filteredTasks.map(task => (
                    <ManagerCard
                      key={task.id}
                      task={task}
                      onDragStart={() => setIsDraggingTask(true)}
                      onDragEnd={() => setIsDraggingTask(false)}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      onUpdateManager={onUpdateManager}
                      onDeleteManager={onDeleteManager}
                      onShowDeleteWarning={handleShowDeleteWarning}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Search size={40} className="mx-auto mb-4 opacity-40" />
            <p className="text-base font-medium mb-2">لم يتم العثور على نتائج</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
            >
              <Plus size={16} />
              إضافة "{searchQuery}"
            </button>
          </div>
        )}
      </div>   

     {/* نافذة التحذير المختصرة عند حذف شركة */}
    {showDeleteWarning && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-4 max-w-sm w-full mx-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">حذف الشركة</h3>
          </div>
          
          <p className="text-sm text-gray-700 mb-4">
            عند حذف هذه الشركة، ستُسند جميع مهامها إلى شركة "بدون شركة" تلقائياً.
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={() => {
                // إنشاء شركة "بدون شركة" إذا لم تكن موجودة
                const unassignedManager = managers.find(m => m.name === 'بدون شركة');
                if (!unassignedManager && onAddManager) {
                  const newUnassignedManager: Manager = {
                    id: 'unassigned-manager',
                    name: 'بدون شركة',
                    color: '#6b7280'
                  };
                  onAddManager(newUnassignedManager);
                }
                
                // إعادة إسناد المهام
                if (onReassignTasks) {
                  onReassignTasks(showDeleteWarning.managerId, 'unassigned-manager');
                }
                
                // حذف الشركة
                if (onDeleteManager) {
                  onDeleteManager(showDeleteWarning.managerId);
                }
                
                setShowDeleteWarning(null);
              }}
              className="flex-1 bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-red-700 transition-colors"
            >
              حذف
            </button>
            <button
              onClick={() => setShowDeleteWarning(null)}
              className="flex-1 bg-gray-200 text-gray-800 px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    )}

    </div>
  );
};

export default RightSidebar;
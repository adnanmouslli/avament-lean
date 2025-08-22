"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  ZoomIn,
  ZoomOut,
  Layers,
  Calendar,
  Users,
  Filter,
  Settings,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  GripVertical,
  Clock,
  Tag,
  AlertCircle,
  Palette,
  Link2,
  FolderOpen,
  FileText,
  Target,
  Edit3,
  Trash2,
  User,
  Flag,
  Save,
  MoreHorizontal
} from 'lucide-react';

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
  type: string;
  content: string;
  color: string;
  duration: number;
  priority: 'low' | 'medium' | 'high';
  teamSize: number;
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
}

// Priority Badge Component
const PriorityBadge: React.FC<{ priority: 'low' | 'medium' | 'high' }> = ({ priority }) => {
  const colors = {
    low: { bg: 'bg-green-100', text: 'text-green-800', label: 'منخفض' },
    medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'متوسط' },
    high: { bg: 'bg-red-100', text: 'text-red-800', label: 'عالي' }
  };

  const config = colors[priority];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
      <Flag size={8} className="mr-1" />
      {config.label}
    </span>
  );
};

// Enhanced Draggable Task Component
const DraggableTask: React.FC<{
  task: DragItem;
  onDragStart: () => void;
  onDragEnd: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}> = ({ task, onDragStart, onDragEnd, onEdit, onDelete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [dragElement, setDragElement] = useState<HTMLElement | null>(null);

  const createDragPreview = (e: React.DragEvent) => {
    // إنشاء عنصر السحب المخصص - مبسط وأصغر
    const preview = document.createElement('div');
    preview.className = 'drag-preview';
    preview.style.cssText = `
      position: fixed;
      top: -1000px;
      left: -1000px;
      width: 180px;
      height: 28px;
      padding: 4px 8px;
      background-color: ${task.color};
      color: white;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
      z-index: 9999;
      pointer-events: none;
      opacity: 0.95;
      transform: rotate(-1deg);
      border: 1px solid rgba(255,255,255,0.2);
      display: flex;
      align-items: center;
      gap: 6px;
    `;
    
    // محتوى مبسط للعنصر
    preview.innerHTML = `
      <div style="width: 6px; height: 6px; background: rgba(255,255,255,0.9); border-radius: 50%; flex-shrink: 0;"></div>
      <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${task.content}</div>
    `;
    
    document.body.appendChild(preview);
    setDragElement(preview);
    
    // تعيين الصورة المخصصة للسحب
    e.dataTransfer.setDragImage(preview, 90, 14);
    
    // إزالة العنصر بعد بدء السحب
    setTimeout(() => {
      if (document.body.contains(preview)) {
        document.body.removeChild(preview);
      }
    }, 0);
  };

  return (
    <div
      className={`
        relative group rounded-lg transition-all cursor-move border
        ${isDragging 
          ? 'opacity-70 scale-[0.98] border-blue-300 shadow-lg transform rotate-0.5' 
          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }
      `}
      style={{ 
        backgroundColor: isDragging ? `${task.color}10` : `${task.color}08`
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Task Content */}
      <div
        draggable
        onDragStart={(e) => {
          setIsDragging(true);
          onDragStart();
          createDragPreview(e);
          e.dataTransfer.effectAllowed = 'copy';
          e.dataTransfer.setData('task', JSON.stringify(task));
        }}
        onDragEnd={() => {
          setIsDragging(false);
          onDragEnd();
          if (dragElement && document.body.contains(dragElement)) {
            document.body.removeChild(dragElement);
          }
        }}
        className="flex items-center gap-2 p-2"
        title="اسحب للإضافة إلى المخطط"
      >
        <GripVertical size={12} className="text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
        
        <div
          className="w-3 h-3 rounded-md flex-shrink-0 shadow-sm border border-white/30"
          style={{ backgroundColor: task.color }}
        />
        
        <div className="flex-1 min-w-0 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-900 truncate">{task.content}</span>
              {task.type === 'milestone' && (
                <Target size={10} className="text-purple-600 flex-shrink-0" />
              )}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
              {task.type !== 'milestone' && (
                <span className="flex items-center gap-1">
                  <Clock size={8} />
                  {task.duration} day 
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users size={8} />
                {task.teamSize}
              </span>
              <div className={`w-1.5 h-1.5 rounded-full ${
                task.priority === 'high' ? 'bg-red-400' : 
                task.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
              }`} />
            </div>
          </div>
          
          {showActions && !isDragging && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="تحرير"
              >
                <Edit3 size={10} className="text-gray-500" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.();
                }}
                className="p-1 hover:bg-red-100 rounded transition-colors"
                title="حذف"
              >
                <Trash2 size={10} className="text-red-500" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
// New Task Form Component
const NewTaskForm: React.FC<{
  onSubmit: (task: Omit<DragItem, 'id'>) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    content: '',
    color: '#3b82f6',
    duration: 5,
    priority: 'medium' as 'low' | 'medium' | 'high',
    teamSize: 1,
    type: 'task' as 'task' | 'milestone'
  });

  const colors = [
    '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', 
    '#ef4444', '#06b6d4', '#ec4899', '#64748b'
  ];

  const handleSubmit = () => {
    if (formData.content.trim()) {
      onSubmit(formData);
      setFormData({
        content: '',
        color: '#3b82f6',
        duration: 5,
        priority: 'medium',
        teamSize: 1,
        type: 'task'
      });
    }
  };
  

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="space-y-4">
        {/* Task Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            اسم المهمة <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            placeholder="أدخل اسم المهمة..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            autoFocus
          />
        </div>

        {/* Task Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            نوع المهمة
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setFormData(prev => ({ 
                ...prev, 
                type: 'task',
                duration: prev.type === 'milestone' ? 5 : prev.duration 
              }))}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                formData.type === 'task'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              مهمة عادية
            </button>
            <button
              onClick={() => setFormData(prev => ({ 
                ...prev, 
                type: 'milestone',
                duration: 0 
              }))}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                formData.type === 'milestone'
                  ? 'bg-purple-50 border-purple-300 text-purple-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              معلم
            </button>
          </div>
        </div>

        {/* Color Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            لون المهمة
          </label>
          <div className="flex gap-2 flex-wrap">
            {colors.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, color }))}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${
                  formData.color === color 
                    ? 'border-gray-900 scale-110 shadow-md' 
                    : 'border-gray-300 hover:scale-105'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Duration and Team Size */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              المدة (أيام)
            </label>
            <input
              type="number"
              min="0"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                duration: parseInt(e.target.value) || 0 
              }))}
              disabled={formData.type === 'milestone'}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${
                formData.type === 'milestone' ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
            {formData.type === 'milestone' && (
              <p className="text-xs text-gray-500 mt-1">المعالم لا تحتاج مدة</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عدد الأشخاص
            </label>
            <input
              type="number"
              min="1"
              value={formData.teamSize}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                teamSize: parseInt(e.target.value) || 1 
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            الأولوية
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as const).map(priority => (
              <button
                key={priority}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, priority }))}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  formData.priority === priority
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {priority === 'low' ? 'منخفض' : priority === 'medium' ? 'متوسط' : 'عالي'}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSubmit}
            disabled={!formData.content.trim()}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              formData.content.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save size={14} />
            إضافة المهمة
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
    
  );
};

// Main Component
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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('tasks');
  const [isDraggingTask, setIsDraggingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);

  // Custom tasks state
  const [customTasks, setCustomTasks] = useState<DragItem[]>([
    { 
      id: 'template1', 
      type: 'task', 
      content: 'تحليل المتطلبات', 
      color: '#3b82f6', 
      duration: 5, 
      priority: 'high', 
      teamSize: 2 
    },
    { 
      id: 'template2', 
      type: 'milestone', 
      content: 'انتهاء مرحلة التصميم', 
      color: '#8b5cf6', 
      duration: 0, 
      priority: 'high', 
      teamSize: 1 
    },
    { 
      id: 'template3', 
      type: 'task', 
      content: 'تطوير الواجهات', 
      color: '#10b981', 
      duration: 10, 
      priority: 'medium', 
      teamSize: 3 
    },
    { 
      id: 'template4', 
      type: 'task', 
      content: 'اختبار الوحدات', 
      color: '#f59e0b', 
      duration: 3, 
      priority: 'medium', 
      teamSize: 2 
    },
  ]);

  const handleAddCustomTask = (taskData: Omit<DragItem, 'id'>) => {
    const newTask: DragItem = {
      ...taskData,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    setCustomTasks(prev => [...prev, newTask]);
    setShowNewTaskForm(false);
    
    // إضافة المهمة إلى الشجرة أيضاً إذا كان هناك callback
    if (onAddTask) {
      const taskForTree = {
        id: newTask.id,
        content: newTask.content,
        startDay: 0,
        duration: newTask.duration,
        color: newTask.color,
        progress: 0,
        author: 'Current User',
        priority: newTask.priority === 'low' ? 1 : newTask.priority === 'medium' ? 2 : 3,
        row: 0,
        type: newTask.type,
        teamSize: newTask.teamSize
      };
      // @ts-ignore
      onAddTask(taskForTree);
    }
  };

  const handleEditTask = (taskId: string) => {
    setEditingTask(taskId);
    // يمكن إضافة منطق التحرير هنا
  };

  const handleDeleteTask = (taskId: string) => {
    setCustomTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const sections = [
    { id: 'tasks', label: 'المهام', icon: Layers },
    { id: 'tools', label: 'الأدوات', icon: Settings },
  ];


  return (
  <div className="w-full h-full bg-gray-50 border-l border-gray-200 flex flex-col relative shadow-lg">

    {/* Header */}
    <div className="p-4 bg-white border-b border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">لوحة الأدوات</h2>
       
      </div>
      
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="بحث في المهام..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
        />
      </div>
    </div>

    {/* Sections Navigation */}
    <div className="flex border-b border-gray-200 bg-white">
      {sections.map(section => (
        <button
          key={section.id}
          onClick={() => setActiveSection(section.id)}
          className={`
            flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors
            ${activeSection === section.id 
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          <section.icon size={16} />
          <span>{section.label}</span>
        </button>
      ))}
    </div>

    {/* Content */}
    <div className="flex-1 overflow-y-auto">
      {activeSection === 'tasks' && (
        <div className="p-4 space-y-4">
          {/* Add New Task */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">إدارة المهام</h3>
              {!showNewTaskForm && (
                <button
                  onClick={() => setShowNewTaskForm(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus size={12} />
                  مهمة جديدة
                </button>
              )}
            </div>

            {showNewTaskForm && (
              <div className="mb-4">
                <NewTaskForm
                  onSubmit={handleAddCustomTask}
                  onCancel={() => setShowNewTaskForm(false)}
                />
              </div>
            )}
          </div>

          {/* Tasks List */}
          <div>
            <h4 className="text-xs font-medium text-gray-500 uppercase mb-3 flex items-center gap-2">
              <GripVertical size={12} />
              المهام المتاحة ({customTasks.length})
              <span className="text-xs text-gray-400">• اسحب للإضافة</span>
            </h4>
            
            {customTasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <Layers size={32} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium mb-1">لا توجد مهام</p>
                <p className="text-xs">قم بإضافة مهمة جديدة لتبدأ</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customTasks.map(task => (
                  <DraggableTask
                    key={task.id}
                    task={task}
                    onDragStart={() => setIsDraggingTask(true)}
                    onDragEnd={() => setIsDraggingTask(false)}
                    onEdit={() => handleEditTask(task.id)}
                    onDelete={() => handleDeleteTask(task.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Drag Instructions */}
          {isDraggingTask && (
            <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
              <div className="bg-white px-4 py-2 rounded-lg shadow-lg border border-gray-200 flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <p className="text-gray-700 font-medium text-sm">
                  اسحب المهمة إلى منطقة العمل
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === 'tools' && (
        <div className="p-4 space-y-4">
          {/* Quick Actions */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">إجراءات سريعة</h4>
            <div className="space-y-2">
              <button 
                onClick={() => {
                  const milestone = {
                    id: `milestone-${Date.now()}`,
                    type: 'milestone' as const,
                    content: 'معلم جديد',
                    color: '#7c3aed',
                    duration: 0,
                    priority: 'high' as const,
                    teamSize: 1
                  };
                  
                  setCustomTasks(prev => [...prev, milestone]);
                  
                  if (onAddTask) {
                    const taskForTree = {
                      id: milestone.id,
                      content: milestone.content,
                      startDay: 0,
                      duration: milestone.duration,
                      color: milestone.color,
                      progress: 0,
                      author: 'Current User',
                      priority: 3,
                      row: 0,
                      type: milestone.type,
                      teamSize: milestone.teamSize
                    };
                    // @ts-ignore
                    onAddTask(taskForTree);
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <Target size={16} className="text-purple-600" />
                <span>إضافة معلم رئيسي</span>
              </button>
              
              <button 
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <FolderOpen size={16} className="text-blue-600" />
                <span>مجموعة جديدة</span>
              </button>
              
              <button 
                onClick={() => {
                  document.getElementById('file-import')?.click();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <FileText size={16} className="text-green-600" />
                <span>استيراد مهام</span>
              </button>
            </div>

            <input
              id="file-import"
              type="file"
              accept=".csv,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  console.log('تم اختيار الملف:', file.name);
                }
              }}
            />
          </div>

          {/* Zoom Controls */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">التحكم في العرض</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewState((prev: any) => ({ ...prev, zoom: Math.min(5, prev.zoom * 1.2) }))}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ZoomIn size={14} />
                  <span className="text-sm">تكبير</span>
                </button>
                <button
                  onClick={() => setViewState((prev: any) => ({ ...prev, zoom: Math.max(0.1, prev.zoom / 1.2) }))}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ZoomOut size={14} />
                  <span className="text-sm">تصغير</span>
                </button>
              </div>
              
              <div className="text-center text-xs text-gray-500 py-1">
                التكبير: {Math.round(viewState.zoom * 100)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);

}

export default RightSidebar;
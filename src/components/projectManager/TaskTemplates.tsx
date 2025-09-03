import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Plus,
  X,
  Edit,
  Trash2,
  Layers,
  Clock,
  Flag,
  ChevronDown,
  ChevronRight,
  Copy,
  Play,
  Save,
  ZoomIn,
  ZoomOut,
  MousePointer2,
  RotateCcw,
  Target,
  Grid3x3,
  Eye,
  EyeOff,
  Link,
  Users,
  Move,
  CornerDownRight
} from 'lucide-react';
import { Task, TaskLink } from './GanttCanvas';

export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  color: string;
  tasks: Task[];
  links?: TaskLink[];
}

// إضافة Manager interface مثل ProjectManager
interface Manager {
  id: string;
  name: string;
  color: string;
}

// إضافة نوع Canvas Task مع خصائص الموضع
interface CanvasTask extends Task {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ViewState {
  zoom: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
}

interface DragState {
  isDragging: boolean;
  item: CanvasTask | null;
  type: 'move' | 'create' | 'resize' | 'pan' | 'resize-left' | 'resize-right';
  startMouseX: number;
  startMouseY: number;
  originalItem: CanvasTask | null;
}

// إضافة حالة الروابط
interface LinkState {
  isCreating: boolean;
  sourceTask: CanvasTask | null;
  sourcePoint: 'start' | 'end' | null;
  mouseX: number;
  mouseY: number;
}

interface TaskTemplatesProps {
  taskTemplates?: TaskTemplate[];
  onUpdateTaskTemplates?: (templates: TaskTemplate[]) => void;
  onApplyTemplate?: (template: TaskTemplate) => void;
  managers: Manager[];
}

// نموذج إنشاء القالب الجديد
const NewTemplateForm: React.FC<{
  onSubmit: (template: Omit<TaskTemplate, 'id'>) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3b82f6'
  });

  const colorOptions = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#f97316', '#06b6d4', '#84cc16'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSubmit({
        ...formData,
        tasks: [],
        links: []
      });
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            اسم القالب <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="أدخل اسم القالب..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">اللون</label>
          <div className="flex gap-2 flex-wrap">
            {colorOptions.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, color }))}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${
                  formData.color === color ? 'border-gray-400 scale-110' : 'border-gray-200'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={!formData.name.trim()}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              formData.name.trim()
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            إنشاء القالب
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
};

// المكون الرئيسي المحسن
const TaskTemplates: React.FC<TaskTemplatesProps> = ({
  taskTemplates: initialTemplates = [],
  onUpdateTaskTemplates,
  onApplyTemplate,
  managers = []
}) => {
  // إعداد القوالب الافتراضية مع التوحيد
  const defaultTemplates: TaskTemplate[] = [
    {
      id: '1',
      name: 'قالب تطوير التطبيق',
      color: '#3b82f6',
      description: 'قالب شامل لتطوير التطبيقات',
      tasks: [
        {
          id: 'task-1',
          content: 'التحليل والتصميم',
          startDay: 0,
          duration: 5,
          color: '#3b82f6',
          type: 'task',
          progress: 0,
          row: 0
        },
        {
          id: 'milestone-1',
          content: 'بداية التطوير',
          startDay: 5,
          duration: 0,
          color: '#10b981',
          type: 'milestone',
          row: 1,
        
        },
        {
          id: 'task-2',
          content: 'التطوير الأساسي',
          startDay: 6,
          duration: 10,
          color: '#3b82f6',
          type: 'task',
          progress: 0,
          row: 2,
         
        },
        {
          id: 'task-3',
          content: 'الاختبار والمراجعة',
          startDay: 16,
          duration: 3,
          color: '#f59e0b',
          type: 'task',
          progress: 0,
          row: 3,
         
        }
      ],
      links: [
        {
          id: 'link-1',
          sourceTaskId: 'task-1',
          targetTaskId: 'milestone-1',
          sourcePoint: 'end',
          targetPoint: 'start',
          color: '#6b7280'
        },
        {
          id: 'link-2',
          sourceTaskId: 'milestone-1',
          targetTaskId: 'task-2',
          sourcePoint: 'end',
          targetPoint: 'start',
          color: '#6b7280'
        },
        {
          id: 'link-3',
          sourceTaskId: 'task-2',
          targetTaskId: 'task-3',
          sourcePoint: 'end',
          targetPoint: 'start',
          color: '#6b7280'
        }
      ]
    }
  ];

  // State Management
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TaskTemplate[]>(
    initialTemplates.length > 0 ? initialTemplates : defaultTemplates
  );

  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [showNewTemplateForm, setShowNewTemplateForm] = useState(false);

  const [viewState, setViewState] = useState<ViewState>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false
  });

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    item: null,
    type: 'move',
    startMouseX: 0,
    startMouseY: 0,
    originalItem: null
  });

  const [linkState, setLinkState] = useState<LinkState>({
    isCreating: false,
    sourceTask: null,
    sourcePoint: null,
    mouseX: 0,
    mouseY: 0
  });

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isLinkMode, setIsLinkMode] = useState(false);
  const [isDraggingFromSidebar, setIsDraggingFromSidebar] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');

  const [inlineEditingTask, setInlineEditingTask] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // تكوين الرسم
  const CANVAS_CONFIG = useMemo(() => ({
    leftPanelWidth: 320,
    gridSize: 20,
    snapToGrid: true,
    minZoom: 0.25,
    maxZoom: 3,
    taskMinWidth: 100,
    taskMinHeight: 30,
    rowHeight: 50, // height + gap (e.g., 30 + 20)
    milestoneSize: 20,
    selectionColor: '#3b82f6',
    gridColor: '#9ca3af', // تغميق اللون للشبكة
    backgroundColor: '#ffffff',
    linkColor: '#6b7280',
    linkWidth: 2,
    connectorRadius: 6,
    dayWidth: 30 // إضافة لربط width بدuration (مثل Gantt)
  }), []);

  // الحصول على القالب الحالي
  const getCurrentTemplate = useCallback(() => {
    return templates.find(t => t.id === selectedTemplate);
  }, [templates, selectedTemplate]);

  // الحصول على المهام الحالية مع إعداد الإحداثيات
  const getCurrentTasks = useCallback((): CanvasTask[] => {
    const template = getCurrentTemplate();
    if (!template) return [];

    return template.tasks.map(task => {

      
      const row = task.row || 0;
      const x = 100 + task.startDay * CANVAS_CONFIG.dayWidth;
      const y = 100 + row * CANVAS_CONFIG.rowHeight;
      const width = task.type === 'milestone' ? CANVAS_CONFIG.milestoneSize : Math.max(CANVAS_CONFIG.taskMinWidth, task.duration * CANVAS_CONFIG.dayWidth);
      const height = task.type === 'milestone' ? CANVAS_CONFIG.milestoneSize : CANVAS_CONFIG.taskMinHeight;


      return {
        ...task,
        x,
        y,
        width,
        height
      } as CanvasTask;
    });
  }, [getCurrentTemplate, CANVAS_CONFIG]);

  // Toggle template expansion
  const toggleTemplate = useCallback((templateId: string) => {
    setExpandedTemplates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  }, []);

  // إضافة قالب جديد
  const addNewTemplate = useCallback((templateData: Omit<TaskTemplate, 'id'>) => {
    const newTemplate: TaskTemplate = {
      id: `template-${Date.now()}`,
      ...templateData
    };
    
    setTemplates(prev => {
      const updated = [...prev, newTemplate];
      onUpdateTaskTemplates?.(updated);
      return updated;
    });
    
    setSelectedTemplate(newTemplate.id);
    setShowNewTemplateForm(false);
  }, [onUpdateTaskTemplates]);

  // حذف قالب
  const deleteTemplate = useCallback((templateId: string) => {
    setTemplates(prev => {
      const updated = prev.filter(t => t.id !== templateId);
      onUpdateTaskTemplates?.(updated);
      return updated;
    });
    
    if (selectedTemplate === templateId) {
      setSelectedTemplate(null);
    }
  }, [selectedTemplate, onUpdateTaskTemplates]);

  // إضافة مهمة جديدة
  const addNewTask = useCallback((type: 'task' | 'milestone' = 'task') => {
    if (!selectedTemplate) return;

    const template = getCurrentTemplate();
    if (!template) return;

    const maxRow = Math.max(...template.tasks.map(t => t.row || 0), -1);
    const manager = managers.find(m => m.id === selectedManagerId);

    const newTask: Task = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: type === 'milestone' ? 'معلم جديد' : 'مهمة جديدة',
      startDay: 0,
      duration: type === 'milestone' ? 0 : 5,
      color: manager?.color || '#3b82f6',
      progress: 0,
      author: manager?.name,
      managerId: selectedManagerId || undefined,
      row: maxRow + 1,
      type,
     
    };

    setTemplates(prev => {
      const updated = prev.map(tmpl => {
        if (tmpl.id === selectedTemplate) {
          return { ...tmpl, tasks: [...tmpl.tasks, newTask] };
        }
        return tmpl;
      });
      onUpdateTaskTemplates?.(updated);
      return updated;
    });
  }, [selectedTemplate, getCurrentTemplate, managers, selectedManagerId, onUpdateTaskTemplates, CANVAS_CONFIG]);

  // إنشاء رابط بين مهمتين
  const createLink = useCallback((sourceTask: CanvasTask, sourcePoint: 'start' | 'end', targetTask: CanvasTask, targetPoint: 'start' | 'end') => {
    if (!selectedTemplate || sourceTask.id === targetTask.id) return;

    const newLink: TaskLink = {
      id: `link-${Date.now()}`,
      sourceTaskId: sourceTask.id,
      targetTaskId: targetTask.id,
      sourcePoint,
      targetPoint,
      color: CANVAS_CONFIG.linkColor
    };

    setTemplates(prev => {
      const updated = prev.map(tmpl => {
        if (tmpl.id === selectedTemplate) {
          const existingLinks = tmpl.links || [];
          return { ...tmpl, links: [...existingLinks, newLink] };
        }
        return tmpl;
      });
      onUpdateTaskTemplates?.(updated);
      return updated;
    });
  }, [selectedTemplate, CANVAS_CONFIG.linkColor, onUpdateTaskTemplates]);

  // حذف رابط
  const deleteLink = useCallback((linkId: string) => {
    if (!selectedTemplate) return;

    setTemplates(prev => {
      const updated = prev.map(tmpl => {
        if (tmpl.id === selectedTemplate) {
          return { ...tmpl, links: (tmpl.links || []).filter(link => link.id !== linkId) };
        }
        return tmpl;
      });
      onUpdateTaskTemplates?.(updated);
      return updated;
    });
  }, [selectedTemplate, onUpdateTaskTemplates]);

  // حذف المهام المحددة
  const deleteSelectedTasks = useCallback(() => {
    if (!selectedTemplate || selectedItems.size === 0) return;

    setTemplates(prev => {
      const updated = prev.map(tmpl => {
        if (tmpl.id === selectedTemplate) {
          const remainingTasks = tmpl.tasks.filter(task => !selectedItems.has(task.id));
          const remainingLinks = (tmpl.links || []).filter(link => 
            !selectedItems.has(link.sourceTaskId) && !selectedItems.has(link.targetTaskId)
          );
          return { ...tmpl, tasks: remainingTasks, links: remainingLinks };
        }
        return tmpl;
      });
      onUpdateTaskTemplates?.(updated);
      return updated;
    });

    setSelectedItems(new Set());
  }, [selectedTemplate, selectedItems, onUpdateTaskTemplates]);



  // رسم المهمة
  const drawTask = useCallback((ctx: CanvasRenderingContext2D, task: CanvasTask) => {
    const x = task.x * viewState.zoom + viewState.offsetX + CANVAS_CONFIG.leftPanelWidth;
    const y = task.y * viewState.zoom + viewState.offsetY;
    const width = task.width * viewState.zoom;
    const height = task.height * viewState.zoom;

    ctx.save();

    // إذا كانت المهمة قيد السحب، استخدم قيم السحب المؤقتة
    const isBeingDragged = dragState.isDragging && dragState.item?.id === task.id;
    const displayTask = isBeingDragged ? dragState.item! : task;
    
    const finalX = displayTask.x * viewState.zoom + viewState.offsetX + CANVAS_CONFIG.leftPanelWidth;
    const finalY = displayTask.y * viewState.zoom + viewState.offsetY;
    const finalWidth = displayTask.width * viewState.zoom;
    const finalHeight = displayTask.height * viewState.zoom;

    // خلفية المهمة
    ctx.fillStyle = task.color;
    ctx.globalAlpha = isBeingDragged ? 0.8 : 0.9;
    ctx.beginPath();
    ctx.roundRect(finalX, finalY, finalWidth, finalHeight, 6);
    ctx.fill();

    // إطار
    ctx.strokeStyle = selectedItems.has(task.id) ? CANVAS_CONFIG.selectionColor : 
                     isBeingDragged ? '#000000' : 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = selectedItems.has(task.id) ? 3 : isBeingDragged ? 2 : 1;
    ctx.globalAlpha = 1;
    ctx.stroke();

    // شريط التقدم
    if (task.progress && task.progress > 0) {
      const progressWidth = (finalWidth * task.progress) / 100;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.roundRect(finalX, finalY, progressWidth, finalHeight, 6);
      ctx.fill();
    }

    // نص المهمة
    if (viewState.zoom >= 0.5) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `600 ${Math.max(10, 14 * viewState.zoom)}px Inter, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      
      const textX = finalX + 8 * viewState.zoom;
      const textY = finalY + finalHeight / 2;
      const maxTextWidth = finalWidth - 16 * viewState.zoom;
      
      let displayText = task.content;
      const textWidth = ctx.measureText(displayText).width;
      
      if (textWidth > maxTextWidth && maxTextWidth > 20) {
        const ratio = maxTextWidth / textWidth;
        const maxChars = Math.floor(displayText.length * ratio) - 3;
        displayText = displayText.substring(0, Math.max(0, maxChars)) + '...';
      }
      
      ctx.fillText(displayText, textX, textY);
    }

    // مؤشر المدة
    if (displayTask.duration > 0 && viewState.zoom >= 0.7) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = `400 ${Math.max(8, 10 * viewState.zoom)}px Inter, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(`${displayTask.duration}د`, finalX + finalWidth - 8 * viewState.zoom, finalY + finalHeight - 8 * viewState.zoom);
    }

    // اسم المدير
    if (task.author && viewState.zoom >= 0.6) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = `400 ${Math.max(6, 8 * viewState.zoom)}px Inter, sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText(task.author, finalX + finalWidth - 5, finalY + 15);
    }

    ctx.restore();
  }, [viewState, selectedItems, CANVAS_CONFIG, dragState]);

  // رسم المعلم
  const drawMilestone = useCallback((ctx: CanvasRenderingContext2D, task: CanvasTask) => {
    // إذا كانت المهمة قيد السحب، استخدم قيم السحب المؤقتة
    const isBeingDragged = dragState.isDragging && dragState.item?.id === task.id;
    const displayTask = isBeingDragged ? dragState.item! : task;
    
    const x = displayTask.x * viewState.zoom + viewState.offsetX + CANVAS_CONFIG.leftPanelWidth;
    const y = displayTask.y * viewState.zoom + viewState.offsetY;
    const size = CANVAS_CONFIG.milestoneSize * viewState.zoom;

    ctx.save();

    // شكل المعلم (معين)
    ctx.fillStyle = task.color;
    ctx.globalAlpha = isBeingDragged ? 0.8 : 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y - size / 2);
    ctx.lineTo(x + size / 2, y);
    ctx.lineTo(x, y + size / 2);
    ctx.lineTo(x - size / 2, y);
    ctx.closePath();
    ctx.fill();

    // إطار
    ctx.strokeStyle = selectedItems.has(task.id) ? CANVAS_CONFIG.selectionColor : 
                     isBeingDragged ? '#000000' : 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = selectedItems.has(task.id) ? 3 : isBeingDragged ? 2 : 1;
    ctx.globalAlpha = 1;
    ctx.stroke();

    ctx.restore();

    // تسمية
    if (viewState.zoom >= 0.6) {
      ctx.save();
      ctx.fillStyle = '#374151';
      ctx.font = `600 ${Math.max(8, 12 * viewState.zoom)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(task.content, x, y + size / 2 + 8 * viewState.zoom);
      
      // اسم المدير
      if (task.author) {
        ctx.fillStyle = '#6b7280';
        ctx.font = `400 ${Math.max(6, 10 * viewState.zoom)}px Inter, sans-serif`;
        ctx.fillText(task.author, x, y + size / 2 + 25 * viewState.zoom);
      }

      
      
      ctx.restore();
    }
  }, [viewState, selectedItems, CANVAS_CONFIG, dragState]);

  // رسم نقاط الاتصال
  const drawConnectionPoints = useCallback((ctx: CanvasRenderingContext2D, task: CanvasTask) => {
    if (!isLinkMode) return;

    const x = task.x * viewState.zoom + viewState.offsetX + CANVAS_CONFIG.leftPanelWidth;
    const y = task.y * viewState.zoom + viewState.offsetY;

    let startPoint: { x: number; y: number };
    let endPoint: { x: number; y: number };

    if (task.type === 'milestone') {
      const size = CANVAS_CONFIG.milestoneSize * viewState.zoom;
      startPoint = { x: x - size / 2, y };
      endPoint = { x: x + size / 2, y };
    } else {
      const width = task.width * viewState.zoom;
      const height = task.height * viewState.zoom;
      startPoint = { x, y: y + height / 2 };
      endPoint = { x: x + width, y: y + height / 2 };
    }

    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    // نقطة البداية
    ctx.beginPath();
    ctx.arc(startPoint.x, startPoint.y, CANVAS_CONFIG.connectorRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    // نقطة النهاية
    ctx.beginPath();
    ctx.arc(endPoint.x, endPoint.y, CANVAS_CONFIG.connectorRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }, [isLinkMode, viewState, CANVAS_CONFIG]);

  // رسم الروابط
  const drawLinks = useCallback((ctx: CanvasRenderingContext2D, tasks: CanvasTask[], links: TaskLink[]) => {
    if (!links || links.length === 0) return;

    ctx.save();
    ctx.strokeStyle = CANVAS_CONFIG.linkColor;
    ctx.lineWidth = CANVAS_CONFIG.linkWidth;

    links.forEach(link => {
      const sourceTask = tasks.find(t => t.id === link.sourceTaskId);
      const targetTask = tasks.find(t => t.id === link.targetTaskId);

      if (!sourceTask || !targetTask) return;

      const getTaskPoint = (task: CanvasTask, point: 'start' | 'end') => {
        const x = task.x * viewState.zoom + viewState.offsetX + CANVAS_CONFIG.leftPanelWidth;
        const y = task.y * viewState.zoom + viewState.offsetY;

        if (task.type === 'milestone') {
          const size = CANVAS_CONFIG.milestoneSize * viewState.zoom;
          return point === 'start' 
            ? { x: x - size / 2, y }
            : { x: x + size / 2, y };
        } else {
          const width = task.width * viewState.zoom;
          const height = task.height * viewState.zoom;
          return point === 'start' 
            ? { x, y: y + height / 2 }
            : { x: x + width, y: y + height / 2 };
        }
      };

      const startPoint = getTaskPoint(sourceTask, link.sourcePoint);
      const endPoint = getTaskPoint(targetTask, link.targetPoint);

      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);

      const controlDistance = Math.abs(endPoint.x - startPoint.x) * 0.3;
      const cp1x = startPoint.x + (link.sourcePoint === 'end' ? controlDistance : -controlDistance);
      const cp2x = endPoint.x + (link.targetPoint === 'start' ? -controlDistance : controlDistance);

      ctx.bezierCurveTo(cp1x, startPoint.y, cp2x, endPoint.y, endPoint.x, endPoint.y);
      ctx.stroke();

      // رسم السهم
      const arrowSize = 8;
      const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
      
      ctx.beginPath();
      ctx.moveTo(endPoint.x, endPoint.y);
      ctx.lineTo(
        endPoint.x - arrowSize * Math.cos(angle - Math.PI / 6),
        endPoint.y - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(endPoint.x, endPoint.y);
      ctx.lineTo(
        endPoint.x - arrowSize * Math.cos(angle + Math.PI / 6),
        endPoint.y - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
    });

    ctx.restore();
  }, [CANVAS_CONFIG, viewState]);

  // رسم الرابط المؤقت
  const drawTemporaryLink = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!linkState.isCreating || !linkState.sourceTask || !linkState.sourcePoint) return;

    const x = linkState.sourceTask.x * viewState.zoom + viewState.offsetX + CANVAS_CONFIG.leftPanelWidth;
    const y = linkState.sourceTask.y * viewState.zoom + viewState.offsetY;

    let startPoint: { x: number; y: number };

    if (linkState.sourceTask.type === 'milestone') {
      const size = CANVAS_CONFIG.milestoneSize * viewState.zoom;
      startPoint = linkState.sourcePoint === 'start' 
        ? { x: x - size / 2, y }
        : { x: x + size / 2, y };
    } else {
      const width = linkState.sourceTask.width * viewState.zoom;
      const height = linkState.sourceTask.height * viewState.zoom;
      startPoint = linkState.sourcePoint === 'start' 
        ? { x, y: y + height / 2 }
        : { x: x + width, y: y + height / 2 };
    }

    ctx.save();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(linkState.mouseX, linkState.mouseY);
    ctx.stroke();

    ctx.restore();
  }, [linkState, viewState, CANVAS_CONFIG]);

  // الرسم الرئيسي
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    // مسح الخلفية
    ctx.fillStyle = CANVAS_CONFIG.backgroundColor;
    ctx.fillRect(0, 0, rect.width, rect.height);


    // رسم المهام
    const tasks = getCurrentTasks();
    const template = getCurrentTemplate();
    
    // رسم الروابط
    if (template?.links) {
      drawLinks(ctx, tasks, template.links);
    }

    // رسم المهام والمعالم
    tasks.filter(t => t.type === 'task').forEach(task => drawTask(ctx, task));
    tasks.filter(t => t.type === 'milestone').forEach(task => drawMilestone(ctx, task));

    // رسم نقاط الاتصال
    if (isLinkMode) {
      tasks.forEach(task => drawConnectionPoints(ctx, task));
    }

    // رسم الرابط المؤقت
    drawTemporaryLink(ctx);

  }, [
    viewState, 
    getCurrentTasks, 
    getCurrentTemplate,
    selectedItems,
    drawTask,
    drawMilestone,
    drawConnectionPoints,
    drawLinks,
    drawTemporaryLink,
    isLinkMode,
    CANVAS_CONFIG
  ]);

  // محاذاة إلى الشبكة
  const snapToGrid = useCallback((value: number) => {
    if (!CANVAS_CONFIG.snapToGrid) return value;
    return Math.round(value / CANVAS_CONFIG.gridSize) * CANVAS_CONFIG.gridSize;
  }, [CANVAS_CONFIG]);

  // الحصول على المهمة في نقطة معينة
  const getTaskAtPoint = useCallback((mouseX: number, mouseY: number) => {
    const tasks = getCurrentTasks();
    
    for (const task of tasks) {
      const x = task.x * viewState.zoom + viewState.offsetX + CANVAS_CONFIG.leftPanelWidth;
      const y = task.y * viewState.zoom + viewState.offsetY;
      
      if (task.type === 'milestone') {
        const size = CANVAS_CONFIG.milestoneSize * viewState.zoom;
        const dx = Math.abs(mouseX - x);
        const dy = Math.abs(mouseY - y);
        if (dx <= size / 2 && dy <= size / 2) {
          return task;
        }
      } else {
        const width = task.width * viewState.zoom;
        const height = task.height * viewState.zoom;
        
        if (mouseX >= x && mouseX <= x + width && mouseY >= y && mouseY <= y + height) {
          return task;
        }
      }
    }
    
    return null;
  }, [getCurrentTasks, viewState, CANVAS_CONFIG]);

  // الحصول على نقطة الاتصال الأقرب
  const getClosestConnectionPoint = useCallback((task: CanvasTask, mouseX: number, mouseY: number): 'start' | 'end' => {
    const x = task.x * viewState.zoom + viewState.offsetX + CANVAS_CONFIG.leftPanelWidth;
    const y = task.y * viewState.zoom + viewState.offsetY;

    if (task.type === 'milestone') {
      const size = CANVAS_CONFIG.milestoneSize * viewState.zoom;
      const startPoint = { x: x - size / 2, y };
      const endPoint = { x: x + size / 2, y };
      
      const distanceToStart = Math.sqrt(Math.pow(mouseX - startPoint.x, 2) + Math.pow(mouseY - startPoint.y, 2));
      const distanceToEnd = Math.sqrt(Math.pow(mouseX - endPoint.x, 2) + Math.pow(mouseY - endPoint.y, 2));
      
      return distanceToStart < distanceToEnd ? 'start' : 'end';
    } else {
      const width = task.width * viewState.zoom;
      const height = task.height * viewState.zoom;
      const startPoint = { x, y: y + height / 2 };
      const endPoint = { x: x + width, y: y + height / 2 };
      
      const distanceToStart = Math.sqrt(Math.pow(mouseX - startPoint.x, 2) + Math.pow(mouseY - startPoint.y, 2));
      const distanceToEnd = Math.sqrt(Math.pow(mouseX - endPoint.x, 2) + Math.pow(mouseY - endPoint.y, 2));
      
      return distanceToStart < distanceToEnd ? 'start' : 'end';
    }
  }, [viewState, CANVAS_CONFIG]);

  // معالج الضغط على الماوس
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const clickedTask = getTaskAtPoint(mouseX, mouseY);

    if (clickedTask && isLinkMode) {
      // وضع إنشاء الروابط
      const connectionPoint = getClosestConnectionPoint(clickedTask, mouseX, mouseY);

      if (linkState.isCreating && linkState.sourceTask && linkState.sourcePoint) {
        // إتمام الرابط
        createLink(linkState.sourceTask, linkState.sourcePoint, clickedTask, connectionPoint);
        setLinkState({
          isCreating: false,
          sourceTask: null,
          sourcePoint: null,
          mouseX: 0,
          mouseY: 0
        });
      } else {
        // بداية الرابط
        setLinkState({
          isCreating: true,
          sourceTask: clickedTask,
          sourcePoint: connectionPoint,
          mouseX,
          mouseY
        });
      }
    } else if (clickedTask) {
      // تحديد المهمة
      if (!e.ctrlKey && !e.metaKey) {
        setSelectedItems(new Set([clickedTask.id]));
      } else {
        setSelectedItems(prev => {
          const newSet = new Set(prev);
          if (newSet.has(clickedTask.id)) {
            newSet.delete(clickedTask.id);
          } else {
            newSet.add(clickedTask.id);
          }
          return newSet;
        });
      }

      // بداية السحب
      const taskX = clickedTask.x * viewState.zoom + viewState.offsetX + CANVAS_CONFIG.leftPanelWidth;
      const taskY = clickedTask.y * viewState.zoom + viewState.offsetY;
      
      let dragType: 'move' | 'resize-left' | 'resize-right' = 'move';
      
      if (clickedTask.type !== 'milestone') {
        const taskWidth = clickedTask.width * viewState.zoom;
        const resizeZone = Math.min(20, taskWidth * 0.2);
        
        if (mouseX - taskX < resizeZone) {
          dragType = 'resize-left';
        } else if (taskX + taskWidth - mouseX < resizeZone) {
          dragType = 'resize-right';
        }
      }

      setDragState({
        isDragging: true,
        item: { ...clickedTask },
        type: dragType,
        startMouseX: mouseX,
        startMouseY: mouseY,
        originalItem: { ...clickedTask }
      });
    } else {
      // مسح التحديد أو بداية السحب للعرض
      if (!e.ctrlKey && !e.metaKey) {
        setSelectedItems(new Set());
      }
      
      if (linkState.isCreating) {
        setLinkState({
          isCreating: false,
          sourceTask: null,
          sourcePoint: null,
          mouseX: 0,
          mouseY: 0
        });
      } else {
        setViewState(prev => ({ ...prev, isDragging: true }));
        setDragState({
          isDragging: true,
          item: null,
          type: 'pan',
          startMouseX: mouseX,
          startMouseY: mouseY,
          originalItem: null
        });
      }
    }
  }, [
    getTaskAtPoint,
    getClosestConnectionPoint,
    isLinkMode,
    linkState,
    createLink,
    viewState,
    CANVAS_CONFIG
  ]);

  // معالج الضغط المزدوج لتحرير الاسم
  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const clickedTask = getTaskAtPoint(mouseX, mouseY);
    if (clickedTask) {
      setInlineEditingTask(clickedTask.id);
      setEditingContent(clickedTask.content);
    }
  }, [getTaskAtPoint]);

  // معالج حركة الماوس
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (linkState.isCreating) {
      setLinkState(prev => ({
        ...prev,
        mouseX,
        mouseY
      }));
    }

    if (dragState.isDragging) {
      if (dragState.type === 'pan') {
        // سحب العرض
        setViewState(prev => ({
          ...prev,
          offsetX: prev.offsetX + e.movementX,
          offsetY: prev.offsetY + e.movementY
        }));
      } else if (dragState.item && dragState.originalItem && selectedTemplate) {
        // سحب المهمة أو تغيير حجمها
        const deltaX = (mouseX - dragState.startMouseX) / viewState.zoom;
        const deltaY = (mouseY - dragState.startMouseY) / viewState.zoom;

        let updatedTask = { ...dragState.item };

        if (dragState.type === 'move') {
          // updatedTask.x = snapToGrid(dragState.originalItem.x + deltaX);
          // updatedTask.y = snapToGrid(dragState.originalItem.y + deltaY);
          
          // // تحديث row بناءً على الموضع الجديد (اختياري، إذا أردت الحفاظ على row)
          // const newRow = Math.max(0, Math.floor((updatedTask.y - 100) / 80));
          // updatedTask.row = newRow;
          
          const deltaX_snapped = Math.round(deltaX / CANVAS_CONFIG.dayWidth) * CANVAS_CONFIG.dayWidth;
          updatedTask.x = dragState.originalItem.x + deltaX_snapped;           
          const deltaY_snapped = Math.round(deltaY / CANVAS_CONFIG.rowHeight) * CANVAS_CONFIG.rowHeight;
          updatedTask.y = dragState.originalItem.y + deltaY_snapped;
          
          // Optional: update row for consistency, though not used in rendering
          updatedTask.row = Math.max(0, Math.round((updatedTask.y - 100) / CANVAS_CONFIG.rowHeight));

        } else if (dragState.type === 'resize-right' && updatedTask.type !== 'milestone') {
          // const newWidth = Math.max(CANVAS_CONFIG.taskMinWidth, dragState.originalItem.width + deltaX);
          const deltaX_snapped = Math.round(deltaX / CANVAS_CONFIG.dayWidth) * CANVAS_CONFIG.dayWidth;
          const newWidth = Math.max(CANVAS_CONFIG.taskMinWidth, dragState.originalItem.width + deltaX_snapped);
          updatedTask.width = newWidth;
          updatedTask.duration = Math.max(1, Math.round(newWidth / CANVAS_CONFIG.dayWidth)); // تحديث المدة حسب العرض
          
        } else if (dragState.type === 'resize-left' && updatedTask.type !== 'milestone') {
          // const newWidth = Math.max(CANVAS_CONFIG.taskMinWidth, dragState.originalItem.width - deltaX);
          // const newX = dragState.originalItem.x + (dragState.originalItem.width - newWidth);
          const deltaX_snapped = Math.round(deltaX / CANVAS_CONFIG.dayWidth) * CANVAS_CONFIG.dayWidth;
          const newWidth = Math.max(CANVAS_CONFIG.taskMinWidth, dragState.originalItem.width - deltaX_snapped);
          const newX = dragState.originalItem.x + (dragState.originalItem.width - newWidth); // Note: if deltaX positive, newWidth smaller, newX larger
          
          updatedTask.width = newWidth;
          updatedTask.x = newX;
          // updatedTask.startDay = dragState.originalItem.startDay + (dragState.originalItem.width - newWidth) / CANVAS_CONFIG.dayWidth;
          updatedTask.startDay = dragState.originalItem.startDay + Math.round((dragState.originalItem.width - newWidth) / CANVAS_CONFIG.dayWidth);
          updatedTask.duration = Math.max(1, Math.round(newWidth / CANVAS_CONFIG.dayWidth));
        }

        // تحديث المهمة في الحالة المؤقتة للعرض السلس
        setDragState(prev => ({ ...prev, item: updatedTask }));
      }
    } else {
      // تحديث شكل المؤشر
      const hoveredTask = getTaskAtPoint(mouseX, mouseY);
      
      if (hoveredTask) {
        if (isLinkMode) {
          canvas.style.cursor = 'crosshair';
        } else if (hoveredTask.type !== 'milestone') {
          const taskX = hoveredTask.x * viewState.zoom + viewState.offsetX + CANVAS_CONFIG.leftPanelWidth;
          const taskWidth = hoveredTask.width * viewState.zoom;
          const resizeZone = Math.min(20, taskWidth * 0.2);
          
          if (mouseX - taskX < resizeZone || taskX + taskWidth - mouseX < resizeZone) {
            canvas.style.cursor = 'col-resize';
          } else {
            canvas.style.cursor = 'grab';
          }
        } else {
          canvas.style.cursor = 'grab';
        }
      } else {
        canvas.style.cursor = isLinkMode ? 'crosshair' : 'default';
      }
    }
  }, [
    linkState,
    dragState,
    selectedTemplate,
    viewState,
    CANVAS_CONFIG,
    getTaskAtPoint,
    isLinkMode
  ]);

  // معالج رفع الماوس
  const handleCanvasMouseUp = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // حفظ التغييرات إذا كان هناك سحب لمهمة
    if (dragState.isDragging && dragState.item && dragState.type !== 'pan' && selectedTemplate) {
      const updatedTask = dragState.item;
      
      
       const newStartDay = Math.max(0, Math.round((updatedTask.x - 100) / CANVAS_CONFIG.dayWidth));
       const newRow = Math.max(0, Math.round((updatedTask.y - 100) / CANVAS_CONFIG.rowHeight));
       const newDuration = updatedTask.type === 'milestone' ? 0 : Math.max(1, Math.round(updatedTask.width / CANVAS_CONFIG.dayWidth));

      
      // تحديث القالب
      setTemplates(prev => {
        const updated = prev.map(template => {
          if (template.id === selectedTemplate) {
            return {
              ...template,
              tasks: template.tasks.map(task =>
                task.id === updatedTask.id ? { 
                  ...task,                 
                  startDay: newStartDay,
                  duration: newDuration,
                  row: newRow,
                } : task
              )
            };
          }
          return template;
        });
        onUpdateTaskTemplates?.(updated);
        return updated;
      });
      
    }

    setViewState(prev => ({ ...prev, isDragging: false }));
    setDragState({
      isDragging: false,
      item: null,
      type: 'move',
      startMouseX: 0,
      startMouseY: 0,
      originalItem: null
    });

    canvas.style.cursor = 'default';
  }, [dragState, selectedTemplate, onUpdateTaskTemplates, CANVAS_CONFIG]);

  // معالج العجلة
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      // تكبير/تصغير
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(CANVAS_CONFIG.minZoom, 
                      Math.min(CANVAS_CONFIG.maxZoom, viewState.zoom * zoomFactor));
      
      const worldX = (mouseX - viewState.offsetX - CANVAS_CONFIG.leftPanelWidth) / viewState.zoom;
      const worldY = (mouseY - viewState.offsetY) / viewState.zoom;
      
      const newOffsetX = mouseX - CANVAS_CONFIG.leftPanelWidth - worldX * newZoom;
      const newOffsetY = mouseY - worldY * newZoom;
      
      setViewState(prev => ({
        ...prev,
        zoom: newZoom,
        offsetX: newOffsetX,
        offsetY: newOffsetY
      }));
    } else {
      // سحب
      setViewState(prev => ({
        ...prev,
        offsetX: prev.offsetX - e.deltaX,
        offsetY: prev.offsetY - e.deltaY
      }));
    }
  }, [viewState, CANVAS_CONFIG]);

  // معالج السحب والإفلات
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const taskData = e.dataTransfer?.getData('task');
    if (!taskData || !selectedTemplate) return;
    
    try {
      const task = JSON.parse(taskData);
      const rect = canvasRef.current?.getBoundingClientRect();
      
      if (rect) {
        const dropX = e.clientX - rect.left - CANVAS_CONFIG.leftPanelWidth;
        const dropY = e.clientY - rect.top;
        
        const worldX = (dropX - viewState.offsetX) / viewState.zoom;
        const worldY = (dropY - viewState.offsetY) / viewState.zoom;
        
        const newStartDay = Math.max(0, Math.round((worldX - 100) / CANVAS_CONFIG.dayWidth));
        const newRow = Math.max(0, Math.round((worldY - 100) / CANVAS_CONFIG.rowHeight));

        const manager = managers.find(m => m.id === task.managerId);
        
        const newTask: Task = {
          id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content: task.content || task.name || 'مهمة جديدة',
          startDay: newStartDay,
          duration: task.type === 'milestone' ? 0 : (task.duration || 5),
          color: manager?.color || task.color || '#3b82f6',
          progress: task.progress || 0,
          author: manager?.name || task.author,
          managerId: task.managerId,
          row: newRow,
          type: task.type || 'task',
        
        };

        setTemplates(prev => {
          const updated = prev.map(template => {
            if (template.id === selectedTemplate) {
              return { ...template, tasks: [...template.tasks, newTask] };
            }
            return template;
          });
          onUpdateTaskTemplates?.(updated);
          return updated;
        });
      }
    } catch (error) {
      console.error('خطأ في معالجة المهمة المسحوبة:', error);
    }
  }, [selectedTemplate, viewState, CANVAS_CONFIG, managers, onUpdateTaskTemplates]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDragEnter = useCallback(() => {
    setIsDraggingFromSidebar(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDraggingFromSidebar(false);
  }, []);

  // اختصارات لوحة المفاتيح
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedItems.size > 0) {
        deleteSelectedTasks();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const template = getCurrentTemplate();
        if (template) {
          setSelectedItems(new Set(template.tasks.map(t => t.id)));
        }
      } else if (e.key === 'Escape') {
        setSelectedItems(new Set());
        setLinkState({
          isCreating: false,
          sourceTask: null,
          sourcePoint: null,
          mouseX: 0,
          mouseY: 0
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedItems, deleteSelectedTasks, getCurrentTemplate]);

  // حلقة الرسم
  useEffect(() => {
    const animate = () => {
      drawCanvas();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawCanvas]);

  // تهيئة بالقالب الأول
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templates[0].id);
    }
  }, [templates, selectedTemplate]);

  // مزامنة مع القوالب الخارجية
  useEffect(() => {
    if (initialTemplates.length > 0) {
      setTemplates(initialTemplates);
    }
  }, [initialTemplates]);



  useEffect(() => {
      const preventKeyboardZoom = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && (
          e.key === '+' || e.key === '=' || 
          e.key === '-' || e.key === '_' || 
          e.key === '0' || e.code === 'Minus' || 
          e.code === 'Equal' || e.code === 'Digit0'
        )) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };
  
      const preventMouseZoom = (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };
  
      document.addEventListener('keydown', preventKeyboardZoom, { passive: false });
      document.addEventListener('wheel', preventMouseZoom, { passive: false });
  
      return () => {
        document.removeEventListener('keydown', preventKeyboardZoom);
        document.removeEventListener('wheel', preventMouseZoom);
      };
    }, []);


  return (
    <div className="h-screen bg-gray-50 flex">
      {/* الشريط الجانبي الأيسر - قائمة القوالب */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Layers size={20} />
              قطار المهام
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setIsLinkMode(!isLinkMode)}
                className={`p-2 rounded-lg transition-colors ${
                  isLinkMode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={isLinkMode ? 'إنهاء الربط' : 'ربط المهام'}
              >
                <Link size={16} />
              </button>
              <button 
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={() => setShowNewTemplateForm(true)}
                title="قالب جديد"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {showNewTemplateForm && (
            <NewTemplateForm
              onSubmit={addNewTemplate}
              onCancel={() => setShowNewTemplateForm(false)}
            />
          )}

          {templates.map(template => {
            const isExpanded = expandedTemplates.has(template.id);
            const isSelected = selectedTemplate === template.id;
            
            return (
              <div
                key={template.id}
                className={`border-2 rounded-lg transition-all ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="p-3 bg-gray-50 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleTemplate(template.id)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: template.color }}
                      />
                      <button
                        onClick={() => setSelectedTemplate(template.id)}
                        className="font-semibold text-gray-800 hover:text-blue-600 transition-colors"
                      >
                        {template.name}
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      {onApplyTemplate && (
                        <button
                          onClick={() => onApplyTemplate(template)}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="تطبيق القالب"
                        >
                          <Play size={14} />
                        </button>
                      )}
                      <button
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="نسخ القالب"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => deleteTemplate(template.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="حذف القالب"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-3 space-y-2 bg-white rounded-b-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        المهام ({template.tasks.length})
                      </span>
                      {template.links && template.links.length > 0 && (
                        <span className="text-sm text-gray-500">
                          الروابط ({template.links.length})
                        </span>
                      )}
                    </div>
                    
                    {template.tasks.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        لا توجد مهام في هذا القالب
                      </p>
                    ) : (
                      template.tasks.map((task, index) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-medium">#{index + 1}</span>
                            {task.type === 'milestone' ? (
                              <Flag size={14} className="text-orange-500" />
                            ) : (
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: task.color }}
                              />
                            )}
                            <span className="text-sm font-medium">{task.content}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {task.author && (
                              <span className="text-xs text-blue-600 bg-blue-100 px-1 rounded">
                                {task.author}
                              </span>
                            )}
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock size={12} />
                              {task.duration} يوم
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="flex-1 flex flex-col">
        {/* شريط الأدوات العلوي */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            {/* أدوات التحكم اليسرى */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {selectedTemplate ? (
                  <span className="flex items-center gap-2">
                    <Target size={16} />
                    {getCurrentTemplate()?.name}
                  </span>
                ) : (
                  'اختر قالباً للتحرير'
                )}
              </div>
            </div>

            {/* أدوات التحكم اليمنى */}
            <div className="flex items-center gap-4">
              {/* عداد المهام المحددة */}
              {selectedItems.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{selectedItems.size} محددة</span>
                  <button
                    onClick={deleteSelectedTasks}
                    className="px-2 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1"
                  >
                    <Trash2 size={12} />
                    حذف
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{Math.round(viewState.zoom * 100)}%</span>
                <button
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  onClick={() => setViewState(prev => ({ 
                    ...prev, 
                    zoom: Math.min(CANVAS_CONFIG.maxZoom, prev.zoom * 1.2) 
                  }))}
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  onClick={() => setViewState(prev => ({ 
                    ...prev, 
                    zoom: Math.max(CANVAS_CONFIG.minZoom, prev.zoom / 1.2) 
                  }))}
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  onClick={() => setViewState({ zoom: 1, offsetX: 0, offsetY: 0, isDragging: false })}
                >
                  <RotateCcw size={16} />
                </button>
              </div>

              <button 
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2"
                onClick={() => {
                  const template = getCurrentTemplate();
                  if (template) {
                    onUpdateTaskTemplates?.(templates);
                    console.log('تم حفظ القالب:', template.name);
                  }
                }}
              >
                <Save size={16} />
                حفظ
              </button>
            </div>
          </div>
        </div>

        {/* منطقة الرسم */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-hidden relative bg-gray-50"
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-grab"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onWheel={handleWheel}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDoubleClick={handleCanvasDoubleClick}
          />
          
          {inlineEditingTask && (() => {
            const tasks = getCurrentTasks();
            const targetTask = tasks.find(t => t.id === inlineEditingTask);
            if (!targetTask) return null;

            const finalX = targetTask.x * viewState.zoom + viewState.offsetX + CANVAS_CONFIG.leftPanelWidth;
            const finalY = targetTask.y * viewState.zoom + viewState.offsetY;
            const finalWidth = targetTask.width * viewState.zoom;
            const finalHeight = targetTask.height * viewState.zoom;

            return (
              <input
                autoFocus
                type="text"
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                className="absolute bg-white border-2 border-blue-500 rounded px-2 py-1 text-sm z-50"
                style={{
                  left: `${finalX}px`,
                  top: `${finalY}px`,
                  width: `${finalWidth}px`,
                  height: `${finalHeight}px`,
                  fontSize: `${Math.max(10, 14 * viewState.zoom)}px`
                }}
                onBlur={(e) => {
                  const newContent = e.target.value.trim();
                  if (newContent && newContent !== targetTask.content) {
                    setTemplates(prev => {
                      const updated = prev.map(template => {
                        if (template.id === selectedTemplate) {
                          return {
                            ...template,
                            tasks: template.tasks.map(task =>
                              task.id === inlineEditingTask ? { ...task, content: newContent } : task
                            )
                          };
                        }
                        return template;
                      });
                      onUpdateTaskTemplates?.(updated);
                      return updated;
                    });
                  }
                  setInlineEditingTask(null);
                  setEditingContent('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    setInlineEditingTask(null);
                    setEditingContent('');
                  }
                }}
              />
            );
          })()}
          
          {/* شريط الحالة */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-gray-600 border border-gray-200 shadow-sm">
            {selectedItems.size > 0 ? (
              `${selectedItems.size} عنصر محدد`
            ) : selectedTemplate ? (
              <>
                {getCurrentTasks().length} مهام في القالب
                {getCurrentTemplate()?.links && getCurrentTemplate()!.links!.length > 0 && (
                  <> • {getCurrentTemplate()!.links!.length} روابط</>
                )}
              </>
            ) : (
              'اختر قالباً للبدء'
            )}
            {isLinkMode && (
              <> • وضع الربط نشط</>
            )}
            {linkState.isCreating && (
              <> • انقر على مهمة لإتمام الرابط</>
            )}
          </div>

          {/* رسائل المساعدة */}
          {!selectedTemplate && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Layers size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">اختر قالباً للبدء</p>
                <p className="text-sm">أو قم بإنشاء قالب جديد من الشريط الأيسر</p>
              </div>
            </div>
          )}

          {selectedTemplate && getCurrentTasks().length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Plus size={48} className="mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium">ابدأ بإضافة المهام</p>
                <p className="text-sm">اسحب المهام هنا</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default TaskTemplates;

"use client";

import React, {  useEffect, useRef, useCallback } from 'react';
import { 
  Target,
  Move3D
} from 'lucide-react';



interface Task {
  id: string;
  content: string;
  startDay: number;
  duration: number;
  color: string;
  progress?: number;
  author?: string;
  row?: number;
  groupId?: string;
}

interface HierarchyNode {
  id: string;
  type: 'project' | 'section' | 'task';
  content: string;
  level: number;
  children: HierarchyNode[];
  tasks: Task[];
  parent: string | null;
  color: string;
  progress?: number;
  author?: string;
  isLeaf: boolean;
  startDate?: Date;
  endDate?: Date;
}

interface ViewState {
  zoom: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
  dragStart: { x: number; y: number };
  lastDragPos: { x: number; y: number };
}

interface TaskDragState {
  isDragging: boolean;
  task: Task | null;
  type: 'move' | 'resize-left' | 'resize-right';
  startMouseX: number;
  startMouseY: number;
  originalTask: Task | null;
  offset: { x: number; y: number };
  originalGroupId: string;
  previewRow: number;
}

interface TaskGroup {
  id: string;
  name: string;
  tasks: Task[];
  color: string;
  level: number;
  startRow: number;
  endRow: number;
  actualHeight: number;
}



export const CanvasWorkspace = ({ 
  selectedNode,
  calculateTaskGroups,
  viewState,
  setViewState,
  taskDragState,
  setTaskDragState,
  handleCanvasMouseDown,
  handleCanvasMouseMove,
  handleCanvasMouseUp,
  handleWheel
}: {
  selectedNode: HierarchyNode | null;
  calculateTaskGroups: (node: HierarchyNode) => TaskGroup[];
  viewState: ViewState;
  setViewState: React.Dispatch<React.SetStateAction<ViewState>>;
  taskDragState: TaskDragState;
  setTaskDragState: React.Dispatch<React.SetStateAction<TaskDragState>>;
  handleCanvasMouseDown: (e: React.MouseEvent) => void;
  handleCanvasMouseMove: (e: React.MouseEvent) => void;
  handleCanvasMouseUp: () => void;
  handleWheel: (e: React.WheelEvent) => void;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // إعدادات Canvas محسنة
  const CANVAS_CONFIG = {
    dayWidth: 60,
    rowHeight: 70,
    headerHeight: 50, // تقليل الارتفاع من 80 إلى 50
    minZoom: 0.1,
    maxZoom: 5,
    gridColor: '#e5e7eb',
    weekendColor: '#fef3f2',
    todayColor: '#ef4444',
    taskBorderRadius: 8,
    taskMinWidth: 50,
    groupLabelWidth: 200,
    groupMinHeight: 2,
    groupPadding: 0.5,
    taskPadding: 4,
    infiniteCanvas: true,
    snapToGrid: true
  };

  const scaledDayWidth = CANVAS_CONFIG.dayWidth * viewState.zoom;
  const scaledRowHeight = CANVAS_CONFIG.rowHeight * viewState.zoom;

  // نظام التواريخ
  const PROJECT_START_DATE = new Date('2025-08-14');
  const PROJECT_END_DATE = new Date('2025-09-14');
  
  const getTotalProjectDays = useCallback(() => {
    const timeDiff = PROJECT_END_DATE.getTime() - PROJECT_START_DATE.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  }, []);

  const dayToDate = useCallback((dayNumber: number): Date => {
    const date = new Date(PROJECT_START_DATE);
    date.setDate(date.getDate() + dayNumber);
    return date;
  }, []);

  const formatDateForDisplay = useCallback((date: Date): { day: string; month: string; isWeekend: boolean } => {
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    
    return {
      day: date.getDate().toString(),
      month: months[date.getMonth()],
      isWeekend
    };
  }, []);

  const isValidDayNumber = useCallback((dayNumber: number): boolean => {
    return dayNumber >= 0 && dayNumber < getTotalProjectDays();
  }, [getTotalProjectDays]);

  const snapToGrid = useCallback((value: number, type: 'day' | 'row' = 'day') => {
    if (!CANVAS_CONFIG.snapToGrid) return value;
    
    const snapped = Math.round(value);
    
    if (type === 'day') {
      const totalDays = getTotalProjectDays();
      return Math.max(0, Math.min(totalDays - 1, snapped));
    } else {
      return Math.max(0, snapped);
    }
  }, [getTotalProjectDays]);

  // دالة رسم المهمة محسنة
  const renderTask = useCallback((
    task: Task, 
    ctx: CanvasRenderingContext2D, 
    rect: DOMRect, 
    groups: TaskGroup[]
  ) => {
    let displayTask = task;
    
    if (taskDragState.isDragging && taskDragState.task?.id === task.id) {
      displayTask = taskDragState.task;
    }

    const snappedStartDay = snapToGrid(displayTask.startDay, 'day');
    const snappedDuration = Math.max(1, displayTask.duration);
    const taskRow = displayTask.row || 0;

    const leftMargin = selectedNode?.isLeaf ? 0 : CANVAS_CONFIG.groupLabelWidth;
    
    const taskX = Math.round(snappedStartDay * scaledDayWidth + viewState.offsetX + leftMargin);
    const taskY = Math.round(taskRow * scaledRowHeight + viewState.offsetY + CANVAS_CONFIG.headerHeight);
    const taskWidth = Math.round(snappedDuration * scaledDayWidth) - (CANVAS_CONFIG.taskPadding * 2);
    const taskHeight = Math.round(scaledRowHeight) - (CANVAS_CONFIG.taskPadding * 2);

    if (taskX + taskWidth >= -100 && taskX <= rect.width + 100 && 
        taskY + taskHeight >= -100 && taskY <= rect.height + 100) {
      
      const isBeingDragged = taskDragState.isDragging && taskDragState.task?.id === displayTask.id;
      const adjustedX = taskX + CANVAS_CONFIG.taskPadding;
      const adjustedY = taskY + CANVAS_CONFIG.taskPadding;
      
      ctx.save();
      
      if (isBeingDragged) {
        ctx.globalAlpha = 0.9;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }
      
      // رسم الخلفية الرئيسية
      ctx.fillStyle = displayTask.color;
      ctx.beginPath();
      ctx.roundRect(adjustedX, adjustedY, taskWidth, taskHeight, 12);
      ctx.fill();

      // رسم الحد الخارجي
      ctx.strokeStyle = isBeingDragged ? '#3b82f6' : displayTask.color;
      ctx.lineWidth = isBeingDragged ? 3 : 2;
      ctx.beginPath();
      ctx.roundRect(adjustedX, adjustedY, taskWidth, taskHeight, 12);
      ctx.stroke();

      // رسم النص الرئيسي فقط
      if (viewState.zoom >= 0.3 && taskWidth > 40) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(12, 16 * viewState.zoom)}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const maxTextWidth = taskWidth - 20;
        let displayText = displayTask.content;
        
        if (maxTextWidth > 20) {
          const textWidth = ctx.measureText(displayText).width;
          if (textWidth > maxTextWidth) {
            const ratio = maxTextWidth / textWidth;
            const maxChars = Math.floor(displayText.length * ratio) - 3;
            displayText = displayText.substring(0, Math.max(0, maxChars)) + '...';
          }
        }

        // رسم النص في المنتصف
        ctx.fillText(displayText, adjustedX + taskWidth / 2, adjustedY + taskHeight / 2);
      }

      // رسم شريط التقدم البسيط في الأسفل
      if (displayTask.progress !== undefined && displayTask.progress > 0) {
        const progressWidth = (taskWidth * displayTask.progress) / 100;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.roundRect(adjustedX + 4, adjustedY + taskHeight - 8, progressWidth - 8, 4, 2);
        ctx.fill();
      }

      // رسم مؤشرات السحب المبسطة
      if (viewState.zoom >= 0.4 && isBeingDragged) {
        const handleSize = 6;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        // المؤشر الأيسر
        ctx.beginPath();
        ctx.roundRect(adjustedX + 4, adjustedY + taskHeight / 2 - handleSize / 2, handleSize, handleSize, handleSize / 2);
        ctx.fill();
        
        // المؤشر الأيمن
        ctx.beginPath();
        ctx.roundRect(adjustedX + taskWidth - 10, adjustedY + taskHeight / 2 - handleSize / 2, handleSize, handleSize, handleSize / 2);
        ctx.fill();
      }
      
      ctx.restore();
    }
  }, [taskDragState, viewState, scaledDayWidth, scaledRowHeight, selectedNode, snapToGrid]);

  // دالة الرسم الرئيسية محسنة
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !selectedNode) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const taskGroups = calculateTaskGroups(selectedNode);
    const leftMargin = selectedNode.isLeaf ? 0 : CANVAS_CONFIG.groupLabelWidth;

    // رسم خلفيات المجموعات
    if (!selectedNode.isLeaf && taskGroups.length > 0) {
      taskGroups.forEach((group, index) => {
        const groupStartY = group.startRow * scaledRowHeight + viewState.offsetY + CANVAS_CONFIG.headerHeight;
        const groupHeight = group.actualHeight * scaledRowHeight;
        
        const gradient = ctx.createLinearGradient(0, groupStartY, 0, groupStartY + groupHeight);
        gradient.addColorStop(0, `${group.color}12`);
        gradient.addColorStop(1, `${group.color}08`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(leftMargin, groupStartY, rect.width - leftMargin, groupHeight);
        
        ctx.strokeStyle = `${group.color}40`;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(leftMargin, groupStartY, rect.width - leftMargin, groupHeight);
        ctx.setLineDash([]);
      });
    }

    // رسم الشبكة
    const gridStartX = Math.floor((-viewState.offsetX - leftMargin) / scaledDayWidth) * scaledDayWidth;
    const gridEndX = Math.ceil((rect.width - viewState.offsetX) / scaledDayWidth) * scaledDayWidth;
    const gridStartY = Math.floor((-viewState.offsetY - CANVAS_CONFIG.headerHeight) / scaledRowHeight) * scaledRowHeight;
    const gridEndY = Math.ceil((rect.height - viewState.offsetY) / scaledRowHeight) * scaledRowHeight;

    ctx.strokeStyle = CANVAS_CONFIG.gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    for (let x = gridStartX; x <= gridEndX; x += scaledDayWidth) {
      const canvasX = x + viewState.offsetX + leftMargin;
      if (canvasX >= leftMargin) {
        ctx.moveTo(canvasX, CANVAS_CONFIG.headerHeight);
        ctx.lineTo(canvasX, rect.height);
      }
    }
    
    for (let y = gridStartY; y <= gridEndY; y += scaledRowHeight) {
      const canvasY = y + viewState.offsetY + CANVAS_CONFIG.headerHeight;
      if (canvasY >= CANVAS_CONFIG.headerHeight) {
        ctx.moveTo(leftMargin, canvasY);
        ctx.lineTo(rect.width, canvasY);
      }
    }
    
    ctx.stroke();

    // رسم التواريخ المحسن والمبسط
    if (viewState.zoom >= 0.3) {
      const totalDays = getTotalProjectDays();
      const startDayIndex = Math.max(0, Math.floor((-viewState.offsetX - leftMargin) / scaledDayWidth));
      const endDayIndex = Math.min(totalDays - 1, Math.ceil((rect.width - viewState.offsetX - leftMargin) / scaledDayWidth));
      
      // شريط التواريخ المبسط
      const headerHeight = CANVAS_CONFIG.headerHeight;
      
      // خلفية موحدة
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(leftMargin, 0, rect.width - leftMargin, headerHeight);
      
      // خط فاصل
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(leftMargin, headerHeight);
      ctx.lineTo(rect.width, headerHeight);
      ctx.stroke();
      
      // رسم الأيام
      ctx.fillStyle = '#64748b';
      ctx.font = `${Math.max(10, 12 * viewState.zoom)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      
      for (let dayIndex = startDayIndex; dayIndex <= endDayIndex; dayIndex++) {
        if (isValidDayNumber(dayIndex)) {
          const canvasX = dayIndex * scaledDayWidth + viewState.offsetX + leftMargin;
          
          if (canvasX >= leftMargin && canvasX <= rect.width) {
            const date = dayToDate(dayIndex);
            const { day, month, isWeekend } = formatDateForDisplay(date);
            
            if (isWeekend && viewState.zoom >= 0.4) {
              ctx.fillStyle = 'rgba(239, 68, 68, 0.08)';
              ctx.fillRect(canvasX, headerHeight, scaledDayWidth, rect.height - headerHeight);
            }
            
            // رقم اليوم
            ctx.fillStyle = isWeekend ? '#dc2626' : '#475569';
            ctx.font = `bold ${Math.max(10, 12 * viewState.zoom)}px Inter, sans-serif`;
            ctx.fillText(day, canvasX + scaledDayWidth / 2, 25);
            
            // الشهر تحت اليوم
            if (viewState.zoom >= 0.5) {
              ctx.fillStyle = isWeekend ? '#dc2626' : '#64748b';
              ctx.font = `${Math.max(8, 10 * viewState.zoom)}px Inter, sans-serif`;
              ctx.fillText(month.substring(0, 3), canvasX + scaledDayWidth / 2, 45);
            }
            
            // خط اليوم الحالي
            const today = new Date();
            if (date.toDateString() === today.toDateString()) {
              ctx.strokeStyle = '#10b981';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(canvasX + scaledDayWidth / 2, headerHeight);
              ctx.lineTo(canvasX + scaledDayWidth / 2, rect.height);
              ctx.stroke();
            }
          }
        }
      }
    }

    // رسم تسميات المجموعات المحسنة
    if (!selectedNode.isLeaf && taskGroups.length > 0) {
      const labelGradient = ctx.createLinearGradient(0, 0, leftMargin, 0);
      labelGradient.addColorStop(0, '#f8fafc');
      labelGradient.addColorStop(1, '#f1f5f9');
      
      ctx.fillStyle = labelGradient;
      ctx.fillRect(0, 0, leftMargin, rect.height);
      
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(leftMargin, 0);
      ctx.lineTo(leftMargin, rect.height);
      ctx.stroke();
      
      taskGroups.forEach((group, groupIndex) => {
        const groupStartY = group.startRow * scaledRowHeight + viewState.offsetY + CANVAS_CONFIG.headerHeight;
        const groupHeight = group.actualHeight * scaledRowHeight;
        const groupCenterY = groupStartY + groupHeight / 2;
        
        if (groupStartY < rect.height && groupStartY + groupHeight > 0) {
          ctx.fillStyle = group.color;
          ctx.fillRect(0, groupStartY, 6, groupHeight);
          
          ctx.fillStyle = `${group.color}15`;
          ctx.fillRect(6, groupStartY, leftMargin - 6, groupHeight);
          
          ctx.fillStyle = group.color;
          ctx.font = `bold ${Math.max(11, 14 * viewState.zoom)}px Inter, sans-serif`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'middle';
          
          const maxTextWidth = leftMargin - 20;
          let displayText = group.name;
          
          const textWidth = ctx.measureText(displayText).width;
          if (textWidth > maxTextWidth) {
            const ratio = maxTextWidth / textWidth;
            const maxChars = Math.floor(displayText.length * ratio) - 3;
            displayText = displayText.substring(0, Math.max(0, maxChars)) + '...';
          }
          
          ctx.fillText(displayText, leftMargin - 12, groupCenterY - 8);
          
          if (viewState.zoom >= 0.6) {
            ctx.font = `${Math.max(9, 11 * viewState.zoom)}px Inter, sans-serif`;
            ctx.fillStyle = `${group.color}CC`;
            const infoText = `${group.tasks.length} مهام`;
            ctx.fillText(infoText, leftMargin - 12, groupCenterY + 8);
          }
          
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(8, 10 * viewState.zoom)}px Inter, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText((groupIndex + 1).toString(), 3, groupCenterY);
        }
      });
    }

    // رسم المهام
    taskGroups.forEach(group => {
      group.tasks.forEach(task => {
        renderTask(task, ctx, rect, taskGroups);
      });
    });

    // رسم مؤشر معاينة أثناء السحب
    if (taskDragState.isDragging && taskDragState.task) {
      const previewTask = taskDragState.task;
      const previewRow = taskDragState.previewRow;
      
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      
      const previewX = previewTask.startDay * scaledDayWidth + viewState.offsetX + leftMargin + CANVAS_CONFIG.taskPadding;
      const previewY = previewRow * scaledRowHeight + viewState.offsetY + CANVAS_CONFIG.headerHeight + CANVAS_CONFIG.taskPadding;
      const previewWidth = previewTask.duration * scaledDayWidth - (CANVAS_CONFIG.taskPadding * 2);
      const previewHeight = scaledRowHeight - (CANVAS_CONFIG.taskPadding * 2);
      
      ctx.beginPath();
      ctx.roundRect(previewX, previewY, previewWidth, previewHeight, CANVAS_CONFIG.taskBorderRadius);
      ctx.stroke();
      ctx.restore();
    }

  }, [selectedNode, viewState, taskDragState, scaledDayWidth, scaledRowHeight, calculateTaskGroups, getTotalProjectDays, isValidDayNumber, dayToDate, formatDateForDisplay, renderTask]);

  // تحديث الرسم
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

  return (
    <div className="flex-1 flex flex-col bg-white">
      {selectedNode ? (
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-gray-50"
          style={{ cursor: viewState.isDragging ? 'grabbing' : 'default' }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onWheel={handleWheel}
          />

        
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <Target size={48} className="mx-auto mb-3 text-gray-300" />
            <h3 className="text-lg font-semibold mb-1">اختر عقدة من الهيكل</h3>
            <p className="text-sm">حدد مشروعاً أو قسماً أو مهمة لعرض التفاصيل</p>
          </div>
        </div>
      )}
    </div>
  );
};
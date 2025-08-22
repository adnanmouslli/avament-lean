"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link2 } from 'lucide-react';
import { ViewSettings } from './ViewSettingsModal';

const COLORS = {
  hierarchyColors: [
    '#2563eb', '#0ea5e9', '#16a34a', '#ca8a04', '#e11d48', '#7c3aed'
  ]
};

export interface Task {
  id: string;
  content: string;
  startDay: number;
  duration: number;
  color: string;
  progress?: number;
  author?: string;
  priority?: number;
  row?: number;
  type?: 'task' | 'milestone';
}

interface TaskLink {
  id: string;
  sourceTaskId: string;
  targetTaskId: string;
  sourcePoint: 'start' | 'end';
  targetPoint: 'start' | 'end';
  color: string;
}

export interface HierarchyNode {
  id: string;
  type: 'project' | 'section' | 'task';
  content: string;
  level: number;
  children: HierarchyNode[];
  tasks: Task[];
  links: TaskLink[];
  parent: string | null;
  color: string;
  progress?: number;
  author?: string;
  priority?: number;
  isLeaf: boolean;
  isExpanded?: boolean;
  startDate?: Date;
  endDate?: Date;
  yPosition?: number;
  height?: number;
}

interface ViewState {
  zoom: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
}

interface TaskDragState {
  isDragging: boolean;
  task: Task | null;
  type: 'move' | 'resize-left' | 'resize-right';
  startMouseX: number;
  startMouseY: number;
  originalTask: Task | null;
  nodeId?: string;
}

interface LinkState {
  isCreating: boolean;
  sourceTask: Task | null;
  sourcePoint: 'start' | 'end' | null;
  mouseX: number;
  mouseY: number;
}

interface GanttCanvasProps {
  sidebarCollapsed: boolean;
  viewState: ViewState;
  setViewState: React.Dispatch<React.SetStateAction<ViewState>>;
  searchQuery?: string;
  selectedTaskIds?: string[];
  onTaskDrop?: (task: any) => void;
  onTasksSelected?: (taskIds: string[]) => void;
  onGroupAdded?: (group: HierarchyNode) => void;
  showTreeEditor?: boolean;
  setShowTreeEditor?: (show: boolean) => void;
  hierarchyTree?: HierarchyNode[];
  setHierarchyTree?: React.Dispatch<React.SetStateAction<HierarchyNode[]>>;
  viewSettings?: ViewSettings; 

}

export const GanttCanvas: React.FC<GanttCanvasProps> = ({
  sidebarCollapsed,
  viewState,
  setViewState,
  searchQuery,
  selectedTaskIds,
  onTaskDrop,
  onGroupAdded,
  hierarchyTree: externalHierarchyTree,
  setHierarchyTree: externalSetHierarchyTree,
  viewSettings
}) => {

  const [localHierarchyTree, setLocalHierarchyTree] = useState<HierarchyNode[]>([]);

  const hierarchyTree = externalHierarchyTree || localHierarchyTree;
  const setHierarchyTree = externalSetHierarchyTree || setLocalHierarchyTree;



  const [timeAxisMode, setTimeAxisMode] = useState<'days' | 'weeks'>('days');


  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  const showLinks = viewSettings?.showLinks ?? true;
  const isLinkMode = viewSettings?.isLinkMode ?? false;
  const showGrid = viewSettings?.showGrid ?? true;
  const showWeekends = viewSettings?.showWeekends ?? true;
  const showProgress = viewSettings?.showProgress ?? true;
  const showAuthors = viewSettings?.showAuthors ?? true;
  const showMilestones = viewSettings?.showMilestones ?? true;
  const showTimestamps = viewSettings?.showTimestamps ?? false;
  const showColors = viewSettings?.showColors ?? true;
  const showTaskIds = viewSettings?.showTaskIds ?? false;


  const [taskDragState, setTaskDragState] = useState<TaskDragState>({
    isDragging: false,
    task: null,
    type: 'move',
    startMouseX: 0,
    startMouseY: 0,
    originalTask: null
  });

  const [linkState, setLinkState] = useState<LinkState>({
    isCreating: false,
    sourceTask: null,
    sourcePoint: null,
    mouseX: 0,
    mouseY: 0
  });

  const [filteredTree, setFilteredTree] = useState<HierarchyNode[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const CANVAS_CONFIG = useMemo(() => ({
    leftPanelWidth: sidebarCollapsed ? 60 : 320,
    dayWidth: 80,
    rowHeight: 40, // Increased for better touch targets
    taskHeight: 24,
    headerHeight: 80,
    minZoom: 0.1,
    maxZoom: 5,
    gridColor: '#e5e7eb',
    weekendColor: '#fef3f2',
    todayColor: '#ef4444',
    taskBorderRadius: 4, // Smaller radius for more professional look
    taskMinWidth: 80,
    taskPadding: 4,
    taskBorderWidth: 1, // Thinner border
    linkColor: '#6b7280', // More neutral link color
    linkWidth: 1.5,
    connectorRadius: 4,
    milestoneSize: 16, // Smaller milestone
    milestoneColor: '#6b7280'
  }), [sidebarCollapsed]);

  const PROJECT_START_DATE = useMemo(() => new Date('2025-08-14'), []);
  const PROJECT_END_DATE = useMemo(() => new Date('2025-09-14'), []);

  const scaledDayWidth = useMemo(() => CANVAS_CONFIG.dayWidth * viewState.zoom, [CANVAS_CONFIG.dayWidth, viewState.zoom]);
  const scaledRowHeight = useMemo(() => CANVAS_CONFIG.rowHeight * viewState.zoom, [CANVAS_CONFIG.rowHeight, viewState.zoom]);
  const scaledTaskHeight = useMemo(() => CANVAS_CONFIG.taskHeight * viewState.zoom, [CANVAS_CONFIG.taskHeight, viewState.zoom]);






  const getTotalProjectDays = useCallback(() => {
    const timeDiff = PROJECT_END_DATE.getTime() - PROJECT_START_DATE.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  }, [PROJECT_END_DATE, PROJECT_START_DATE]);

  const dayToDate = useCallback((dayIndex: number): Date => {
    const date = new Date(PROJECT_START_DATE);
    date.setDate(date.getDate() + dayIndex);
    return date;
  }, [PROJECT_START_DATE]);

  const formatDate = useCallback((date: Date) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return {
      day: date.getDate(),
      month: months[date.getMonth()],
      year: date.getFullYear(),
      dayName: days[date.getDay()],
      isWeekend: date.getDay() === 5 || date.getDay() === 6
    };
  }, []);

  const calculateNodeHeight = useCallback((node: HierarchyNode): number => {
    if (node.isLeaf && node.tasks && node.tasks.length > 0) {
      const maxRow = Math.max(...node.tasks.map(t => t.row || 0));
      return (maxRow + 2) * scaledRowHeight;
    }
    return scaledRowHeight;
  }, [scaledRowHeight]);

  const flattenTree = useCallback((nodes: HierarchyNode[]): HierarchyNode[] => {
    const flattened: HierarchyNode[] = [];
    let currentY = CANVAS_CONFIG.headerHeight + viewState.offsetY;
    
    const traverse = (node: HierarchyNode, level: number) => {
      const height = calculateNodeHeight(node);
      const nodeWithPosition = { 
        ...node, 
        level,
        yPosition: currentY,
        height,
        isExpanded: expandedNodes.has(node.id)
      };
      
      flattened.push(nodeWithPosition);
      currentY += height;
      
      if (expandedNodes.has(node.id) && node.children.length > 0) {
        node.children.forEach(child => traverse(child, level + 1));
      }
    };
    
    nodes.forEach(node => traverse(node, 0));
    return flattened;
  }, [expandedNodes, calculateNodeHeight, CANVAS_CONFIG.headerHeight, viewState.offsetY]);

  const getTaskConnectionPoints = useCallback((task: Task, node: HierarchyNode) => {
    const baseY = (node.yPosition || 0) + CANVAS_CONFIG.taskPadding + (task.row || 0) * (scaledTaskHeight + CANVAS_CONFIG.taskPadding);
    
    if (task.type === 'milestone') {
      const taskX = CANVAS_CONFIG.leftPanelWidth + viewState.offsetX + task.startDay * scaledDayWidth;
      const taskY = baseY + scaledTaskHeight / 2;
      const size = CANVAS_CONFIG.milestoneSize * viewState.zoom;

      return {
        start: { x: taskX - size / 2, y: taskY },
        end: { x: taskX + size / 2, y: taskY }
      };
    } else {
      const taskX = CANVAS_CONFIG.leftPanelWidth + viewState.offsetX + task.startDay * scaledDayWidth;
      const taskWidth = task.duration * scaledDayWidth;
      const taskY = baseY + scaledTaskHeight / 2;

      return {
        start: { x: taskX, y: taskY },
        end: { x: taskX + taskWidth, y: taskY }
      };
    }
  }, [CANVAS_CONFIG, scaledDayWidth, scaledTaskHeight, viewState.offsetX]);

  const drawLinks = useCallback((ctx: CanvasRenderingContext2D, node: HierarchyNode) => {
    if (!node.links || node.links.length === 0) return;

    ctx.save();
    ctx.strokeStyle = CANVAS_CONFIG.linkColor;
    ctx.lineWidth = CANVAS_CONFIG.linkWidth;
    ctx.setLineDash([]);

    node.links.forEach(link => {
      const sourceTask = node.tasks.find(t => t.id === link.sourceTaskId);
      const targetTask = node.tasks.find(t => t.id === link.targetTaskId);

      if (!sourceTask || !targetTask) return;

      const sourcePoints = getTaskConnectionPoints(sourceTask, node);
      const targetPoints = getTaskConnectionPoints(targetTask, node);

      const startPoint = sourcePoints[link.sourcePoint];
      const endPoint = targetPoints[link.targetPoint];

      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);

      const controlDistance = Math.abs(endPoint.x - startPoint.x) * 0.3;
      const cp1x = startPoint.x + (link.sourcePoint === 'end' ? controlDistance : -controlDistance);
      const cp2x = endPoint.x + (link.targetPoint === 'start' ? -controlDistance : controlDistance);

      ctx.bezierCurveTo(cp1x, startPoint.y, cp2x, endPoint.y, endPoint.x, endPoint.y);
      ctx.stroke();

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
  }, [CANVAS_CONFIG, getTaskConnectionPoints]);

  const drawConnectionPoints = useCallback((ctx: CanvasRenderingContext2D, task: Task, node: HierarchyNode) => {
  if (!isLinkMode) return;

  const points = getTaskConnectionPoints(task, node);
  
  ctx.save();
  ctx.fillStyle = '#000000'; // تغيير اللون إلى الأسود
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;

  // نقطة البداية
  ctx.beginPath();
  ctx.arc(points.start.x, points.start.y, CANVAS_CONFIG.connectorRadius + 1, 0, 2 * Math.PI); // زيادة الحجم قليلاً
  ctx.fill();
  ctx.stroke();

  // نقطة النهاية
  ctx.beginPath();
  ctx.arc(points.end.x, points.end.y, CANVAS_CONFIG.connectorRadius + 1, 0, 2 * Math.PI);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}, [isLinkMode, getTaskConnectionPoints, CANVAS_CONFIG]);

  const drawTemporaryLink = useCallback((ctx: CanvasRenderingContext2D, flattened: HierarchyNode[]) => {
    if (!linkState.isCreating || !linkState.sourceTask || !linkState.sourcePoint) return;

    // إيجاد العقدة من الشجرة المسطحة التي تحتوي على yPosition
    const sourceNode = flattened.find(node => 
      node.tasks && node.tasks.some(t => t.id === linkState.sourceTask?.id)
    );
    
    if (!sourceNode || !sourceNode.yPosition) return;

    const sourcePoints = getTaskConnectionPoints(linkState.sourceTask, sourceNode);
    const startPoint = sourcePoints[linkState.sourcePoint];

    ctx.save();
    ctx.strokeStyle = '#000000'; // اللون الأسود
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(linkState.mouseX, linkState.mouseY);
    ctx.stroke();

    ctx.restore();
  }, [linkState, getTaskConnectionPoints]);

  const generateData = useCallback((): HierarchyNode[] => {
    const totalDays = getTotalProjectDays();
    
    const generateRandomTasks = (parentId: string, count: number): Task[] => {
      const tasks: Task[] = [];
      const authors = ['Ahmad', 'Sarah', 'Mohammad'];
      const taskNames = ['Analysis', 'Design', 'Development', 'Testing', 'Documentation'];
      
      for (let i = 0; i < count; i++) {
        const isMilestone = Math.random() < 0.2;
        const startDay = Math.floor(Math.random() * (totalDays - 20)) + 5;
        const row = i;
        
        if (isMilestone) {
          tasks.push({
            id: `${parentId}-milestone-${i}`,
            content: `Milestone ${i + 1}`,
            startDay,
            duration: 0,
            color: COLORS.hierarchyColors[i % COLORS.hierarchyColors.length],
            row,
            type: 'milestone'
          });
        } else {
          const duration = Math.floor(Math.random() * 10) + 3;
          tasks.push({
            id: `${parentId}-task-${i}`,
            content: `${taskNames[i % taskNames.length]} ${i + 1}`,
            startDay,
            duration,
            color: COLORS.hierarchyColors[i % COLORS.hierarchyColors.length],
            progress: Math.floor(Math.random() * 100),
            row,
            author: authors[i % authors.length],
            type: 'task'
          });
        }
      }
      
      return tasks;
    };

    const generateSampleLinks = (tasks: Task[]): TaskLink[] => {
      const links: TaskLink[] = [];
      for (let i = 0; i < Math.min(2, tasks.length - 1); i++) {
        links.push({
          id: `link-${i}`,
          sourceTaskId: tasks[i].id,
          targetTaskId: tasks[i + 1].id,
          sourcePoint: 'end',
          targetPoint: 'start',
          color: CANVAS_CONFIG.linkColor
        });
      }
      return links;
    };

    const project: HierarchyNode = {
      id: 'project-1',
      type: 'project',
      content: 'New System Project',
      level: 0,
      isLeaf: false,
      color: COLORS.hierarchyColors[0],
      parent: null,
      tasks: [],
      links: [],
      children: [],
      startDate: PROJECT_START_DATE,
      endDate: PROJECT_END_DATE
    };
    
    for (let s = 1; s <= 2; s++) {
      const section: HierarchyNode = {
        id: `section-${s}`,
        type: 'section',
        content: `Phase ${s}`,
        level: 1,
        isLeaf: false,
        color: COLORS.hierarchyColors[s],
        parent: 'project-1',
        tasks: [],
        links: [],
        children: []
      };
      
      for (let t = 1; t <= 2; t++) {
        const taskCount = Math.floor(Math.random() * 3) + 5;
        const tasks = generateRandomTasks(`section-${s}-taskgroup-${t}`, taskCount);
        const links = generateSampleLinks(tasks);

        const taskGroup: HierarchyNode = {
          id: `section-${s}-taskgroup-${t}`,
          type: 'task',
          content: `Task Group ${t}`,
          level: 2,
          isLeaf: true,
          color: COLORS.hierarchyColors[(s + t) % COLORS.hierarchyColors.length],
          parent: `section-${s}`,
          tasks,
          links,
          children: []
        };
        
        section.children.push(taskGroup);
      }
      
      project.children.push(section);
    }
    
    return [project];
  }, [getTotalProjectDays, PROJECT_START_DATE, PROJECT_END_DATE, CANVAS_CONFIG.linkColor]);


  const addNewTaskToTree = useCallback((newTask: any, dropX: number, dropY: number) => {
    const treeToRender = searchQuery ? filteredTree : hierarchyTree;
    const flattened = flattenTree(treeToRender);

  let targetNode: HierarchyNode | null = null;
  let targetRow = 0;
  
  // إيجاد العقدة المستهدفة
  for (const node of flattened) {
    if (!node.yPosition || !node.height) continue;
    
    if (dropY >= node.yPosition && dropY < node.yPosition + node.height) {
      if (node.isLeaf) {
        targetNode = node;
        const relativeY = dropY - node.yPosition - CANVAS_CONFIG.taskPadding;
        targetRow = Math.floor(relativeY / (scaledTaskHeight + CANVAS_CONFIG.taskPadding));
        break;
      }
    }
  }
  
  if (!targetNode) {
    targetNode = flattened.find(n => n.isLeaf && n.type === 'task') || null;
    if (!targetNode) {
      console.error('لا يمكن إيجاد مكان مناسب للمهمة');
      return;
    }
  }
  
  const day = Math.floor((dropX - CANVAS_CONFIG.leftPanelWidth - viewState.offsetX) / scaledDayWidth);
  
  const finalTask: Task = {
    id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    content: newTask.content || 'مهمة جديدة',
    startDay: Math.max(0, Math.min(getTotalProjectDays() - (newTask.duration || 5), day)),
    duration: newTask.type === 'milestone' ? 0 : (newTask.duration || 5),
    color: newTask.color || '#3b82f6',
    progress: 0,
    author: 'المستخدم الحالي',
    row: Math.max(0, targetRow),
    type: newTask.type || 'task'
  };
  
  setHierarchyTree(prev => {
    const updateNodeInTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
      return nodes.map(node => {
        if (node.id === targetNode?.id) {
          const updatedTasks = [...node.tasks, finalTask];
          const maxExistingRow = Math.max(...node.tasks.map(t => t.row || 0), -1);
          
          if (finalTask.row! > maxExistingRow + 1) {
            finalTask.row = maxExistingRow + 1;
          }
          
          return { ...node, tasks: updatedTasks };
        }
        return { ...node, children: updateNodeInTree(node.children) };
      });
    };
    
    return updateNodeInTree(prev);
  });
  
  console.log('✅ تمت إضافة المهمة:', finalTask.content, 'إلى:', targetNode?.content);
}, [hierarchyTree, flattenTree, scaledDayWidth, scaledTaskHeight, CANVAS_CONFIG, viewState, getTotalProjectDays]);

// 3. أضف دالة حذف المهام المحددة:
const deleteSelectedTasks = useCallback(() => {
  if (!selectedTaskIds || selectedTaskIds.length === 0) return;
  
  setHierarchyTree(prev => {
    const removeTasksFromTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
      return nodes.map(node => ({
        ...node,
        tasks: node.tasks.filter(task => !selectedTaskIds.includes(task.id)),
        children: removeTasksFromTree(node.children)
      }));
    };
    
    return removeTasksFromTree(prev);
  });
  
  console.log('🗑️ تم حذف', selectedTaskIds.length, 'مهمة');
}, [selectedTaskIds]);

// 4. أضف دالة ربط المهام المحددة:
const linkSelectedTasks = useCallback(() => {
  if (!selectedTaskIds || selectedTaskIds.length < 2) {
    console.warn('يجب تحديد مهمتين على الأقل للربط');
    return;
  }
  
  const selectedTasks: { task: Task; nodeId: string }[] = [];
  
  const findTasksInTree = (nodes: HierarchyNode[]) => {
    nodes.forEach(node => {
      node.tasks.forEach(task => {
        if (selectedTaskIds.includes(task.id)) {
          selectedTasks.push({ task, nodeId: node.id });
        }
      });
      findTasksInTree(node.children);
    });
  };
  
  findTasksInTree(hierarchyTree);
  
  for (let i = 0; i < selectedTasks.length - 1; i++) {
    const source = selectedTasks[i];
    const target = selectedTasks[i + 1];
    
    if (source.nodeId === target.nodeId) {
      const newLink: TaskLink = {
        id: `link-${Date.now()}-${i}`,
        sourceTaskId: source.task.id,
        targetTaskId: target.task.id,
        sourcePoint: 'end',
        targetPoint: 'start',
        color: CANVAS_CONFIG.linkColor
      };
      
      setHierarchyTree(prev => {
        const addLinkToNode = (nodes: HierarchyNode[]): HierarchyNode[] => {
          return nodes.map(node => {
            if (node.id === source.nodeId) {
              return { ...node, links: [...(node.links || []), newLink] };
            }
            return { ...node, children: addLinkToNode(node.children) };
          });
        };
        
        return addLinkToNode(prev);
      });
    }
  }
  
  console.log('🔗 تم ربط', selectedTasks.length, 'مهمة');
}, [selectedTaskIds, hierarchyTree, CANVAS_CONFIG.linkColor]);


  const createLink = useCallback((sourceTask: Task, sourcePoint: 'start' | 'end', targetTask: Task, targetPoint: 'start' | 'end', nodeId: string) => {
    if (sourceTask.id === targetTask.id) return;

    const newLink: TaskLink = {
      id: `link-${Date.now()}`,
      sourceTaskId: sourceTask.id,
      targetTaskId: targetTask.id,
      sourcePoint,
      targetPoint,
      color: CANVAS_CONFIG.linkColor
    };

    setHierarchyTree(prev => {
      const updateLinksInTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
        return nodes.map(node => ({
          ...node,
          links: node.id === nodeId ? [...(node.links || []), newLink] : node.links,
          children: updateLinksInTree(node.children)
        }));
      };
      return updateLinksInTree(prev);
    });
  }, [CANVAS_CONFIG.linkColor]);


   const drawSidebar = useCallback((ctx: CanvasRenderingContext2D, rect: DOMRect, flattened: HierarchyNode[]) => {
        ctx.save();
        
        // خلفية الشريط الجانبي بلون هادئ ثابت
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, CANVAS_CONFIG.leftPanelWidth, rect.height);
        
        // حدود رفيعة ورسمية
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(CANVAS_CONFIG.leftPanelWidth, 0);
        ctx.lineTo(CANVAS_CONFIG.leftPanelWidth, rect.height);
        ctx.stroke();
        
        // رأس بلون رسمي ثابت
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(0, 0, CANVAS_CONFIG.leftPanelWidth, CANVAS_CONFIG.headerHeight);
        
        // خط فاصل رفيع أسفل الرأس
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_CONFIG.headerHeight);
        ctx.lineTo(CANVAS_CONFIG.leftPanelWidth, CANVAS_CONFIG.headerHeight);
        ctx.stroke();
        
        // محتوى الرأس بخط رسمي
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 14px "Segoe UI", "Arial", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        // العنوان الرئيسي
        ctx.fillText('Project Structure', 15, CANVAS_CONFIG.headerHeight / 2 - 6);
        
        // العنوان الفرعي
        ctx.font = '400 10px "Segoe UI", "Arial", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText('Phases and Tasks Management', 15, CANVAS_CONFIG.headerHeight / 2 + 8);
        
        // أزرار التحكم بالمحور الزمني
        drawTimeAxisControls(ctx);
        
        // رسم شجرة العقد المحسنة
        drawTreeNodes(ctx, rect, flattened);
        
        ctx.restore();
    }, [CANVAS_CONFIG, viewState.zoom]);

    // دالة رسم المحور الزمني المحسن
    const drawEnhancedTimeAxis = useCallback((ctx: CanvasRenderingContext2D, rect: DOMRect, visibleStartDay: number, visibleEndDay: number, effectiveLeftPanelWidth: number) => {
        ctx.save();
        
        // خلفية المحور الزمني
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(effectiveLeftPanelWidth, 0, rect.width - effectiveLeftPanelWidth, CANVAS_CONFIG.headerHeight);
        
        // خط فاصل سفلي
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(effectiveLeftPanelWidth, CANVAS_CONFIG.headerHeight);
        ctx.lineTo(rect.width, CANVAS_CONFIG.headerHeight);
        ctx.stroke();
        
        if (timeAxisMode === 'days') {
            drawDaysAxis(ctx, rect, visibleStartDay, visibleEndDay, effectiveLeftPanelWidth);
        } else {
            drawWeeksAxis(ctx, rect, visibleStartDay, visibleEndDay, effectiveLeftPanelWidth);
        }
        
        ctx.restore();
    }, [CANVAS_CONFIG, timeAxisMode, dayToDate, formatDate, scaledDayWidth, viewState.offsetX]);


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
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const flattened = flattenTree(hierarchyTree);
    const totalDays = getTotalProjectDays();

    // تحديد عرض الشريط الجانبي بناءً على حالة الإغلاق
    const effectiveLeftPanelWidth = sidebarCollapsed ? 0 : CANVAS_CONFIG.leftPanelWidth;

    const startDay = Math.floor(-viewState.offsetX / scaledDayWidth);
    const endDay = Math.ceil((rect.width - effectiveLeftPanelWidth - viewState.offsetX) / scaledDayWidth);
    const visibleStartDay = Math.max(0, startDay);
    const visibleEndDay = Math.min(totalDays, endDay);

    const projectStartX = effectiveLeftPanelWidth + viewState.offsetX;
    const projectEndX = effectiveLeftPanelWidth + viewState.offsetX + totalDays * scaledDayWidth;
    const workAreaTop = CANVAS_CONFIG.headerHeight;
    const workAreaBottom = Math.max(workAreaTop, flattened.reduce((maxY, node) => 
      node.yPosition && node.height ? Math.max(maxY, node.yPosition + node.height) : maxY, workAreaTop));
    
    const firstTaskNode = flattened.find(node => node.isLeaf && node.tasks.length > 0);
    const actualWorkAreaTop = firstTaskNode && firstTaskNode.yPosition ? 
      firstTaskNode.yPosition + CANVAS_CONFIG.taskPadding : workAreaTop;

    // رسم خلفية منطقة العمل
    ctx.save();
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(effectiveLeftPanelWidth, CANVAS_CONFIG.headerHeight, 
                rect.width - effectiveLeftPanelWidth, rect.height - CANVAS_CONFIG.headerHeight);
    
    const workAreaStartX = Math.max(effectiveLeftPanelWidth, projectStartX);
    const workAreaEndX = Math.min(rect.width, projectEndX);
    
    if (workAreaEndX > workAreaStartX && workAreaBottom > actualWorkAreaTop) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(workAreaStartX, actualWorkAreaTop, 
                  workAreaEndX - workAreaStartX, workAreaBottom - actualWorkAreaTop);
    }
    ctx.restore();

    // رسم خطوط الشبكة (إذا كانت مفعلة)
    if (showGrid) {
      ctx.save();
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1.5;
      
      // خطوط الأيام العمودية
      for (let day = visibleStartDay; day <= visibleEndDay; day++) {
        const x = effectiveLeftPanelWidth + viewState.offsetX + day * scaledDayWidth;
        if (x >= Math.max(effectiveLeftPanelWidth, projectStartX) && 
            x <= Math.min(rect.width, projectEndX)) {
          ctx.beginPath();
          ctx.moveTo(x, actualWorkAreaTop);
          ctx.lineTo(x, workAreaBottom);
          ctx.stroke();
        }
      }
      
      // خطوط الصفوف الأفقية
      flattened.forEach(node => {
        if (node.yPosition && node.height && node.isLeaf && node.tasks.length > 0) {
          const lineY = node.yPosition + node.height;
          if (lineY >= actualWorkAreaTop && lineY <= workAreaBottom) {
            ctx.beginPath();
            ctx.moveTo(Math.max(effectiveLeftPanelWidth, projectStartX), lineY);
            ctx.lineTo(Math.min(rect.width, projectEndX), lineY);
            ctx.stroke();
          }
          
          const maxRow = Math.max(...node.tasks.map(t => t.row || 0));
          for (let row = 1; row <= maxRow; row++) {
            const rowY = node.yPosition + row * (scaledTaskHeight + CANVAS_CONFIG.taskPadding);
            if (rowY < node.yPosition + node.height && rowY >= actualWorkAreaTop && rowY <= workAreaBottom) {
              ctx.globalAlpha = 0.3;
              ctx.beginPath();
              ctx.moveTo(Math.max(effectiveLeftPanelWidth, projectStartX), rowY);
              ctx.lineTo(Math.min(rect.width, projectEndX), rowY);
              ctx.stroke();
              ctx.globalAlpha = 1;
            }
          }
        }
      });
      ctx.restore();
    }

    // تمييز عطل الأسبوع (إذا كانت مفعلة)
    if (showWeekends) {
      ctx.save();
      for (let day = visibleStartDay; day <= visibleEndDay; day++) {
        const date = dayToDate(day);
        const formatted = formatDate(date);
        
        if (formatted.isWeekend) {
          const x = effectiveLeftPanelWidth + viewState.offsetX + day * scaledDayWidth;
          const startX = Math.max(Math.max(effectiveLeftPanelWidth, projectStartX), x);
          const endX = Math.min(Math.min(rect.width, projectEndX), x + scaledDayWidth);
          
          if (endX > startX) {
            ctx.fillStyle = 'rgba(254, 243, 242, 0.5)';
            ctx.fillRect(startX, actualWorkAreaTop, endX - startX, workAreaBottom - actualWorkAreaTop);
          }
        }
      }
      ctx.restore();
    }

    // رسم المهام والعقد
    flattened.forEach((node, index) => {
      if (!node.yPosition || !node.height) return;
      
      const nodeY = node.yPosition;
      const nodeHeight = node.height;
      
      if (nodeY + nodeHeight > CANVAS_CONFIG.headerHeight && nodeY < rect.height) {
        if (node.isLeaf && node.tasks.length > 0) {
          // رسم الروابط (إذا كانت مفعلة)
          if (showLinks) {
            drawLinks(ctx, node);
          }
          
          node.tasks.forEach(task => {
            let displayTask = task;
            
            if (taskDragState.isDragging && taskDragState.task?.id === task.id && taskDragState.nodeId === node.id) {
              displayTask = taskDragState.task;
            }

            const taskX = effectiveLeftPanelWidth + viewState.offsetX + displayTask.startDay * scaledDayWidth;
            const taskY = nodeY + CANVAS_CONFIG.taskPadding + (displayTask.row || 0) * (scaledTaskHeight + CANVAS_CONFIG.taskPadding);
            
            // رسم المعالم (إذا كانت مفعلة)
            if (displayTask.type === 'milestone' && showMilestones) {

              const baseSize = CANVAS_CONFIG.milestoneSize * 1.5; // زيادة الحجم بنسبة 50%
              const size = baseSize * viewState.zoom;
              const milestoneY = taskY + scaledTaskHeight / 2;
              
              ctx.save();
              
              // تحسين الألوان والحدود
              const milestoneColor = showColors ? (displayTask.color || CANVAS_CONFIG.milestoneColor) : '#6b7280';
              const isDragging = taskDragState.isDragging && taskDragState.task?.id === displayTask.id;
              
              // رسم ظل للمعلم لإعطاء عمق
              if (viewState.zoom >= 0.3) {
                ctx.save();
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(taskX + 2, milestoneY + 2, size / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
              }
              
              // رسم الخلفية الرئيسية للمعلم
              ctx.fillStyle = milestoneColor;
              ctx.strokeStyle = isDragging ? '#3b82f6' : 'rgba(0, 0, 0, 0.3)';
              ctx.lineWidth = Math.max(2, 3 * viewState.zoom);
              
              ctx.beginPath();
              ctx.arc(taskX, milestoneY, size / 2, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              
              // إضافة حلقة داخلية للتأكيد
              if (viewState.zoom >= 0.4) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = Math.max(1, 2 * viewState.zoom);
                ctx.beginPath();
                ctx.arc(taskX, milestoneY, (size / 2) - 4, 0, Math.PI * 2);
                ctx.stroke();
              }
              
              // تحسين النص داخل المعلم
              if (viewState.zoom >= 0.3 && displayTask.content) {
                const maxTextLength = Math.floor(size / 8); // تحديد طول النص حسب حجم المعلم
                const displayText = displayTask.content.length > maxTextLength 
                  ? displayTask.content.substring(0, maxTextLength) + '...'
                  : displayTask.content;
                
                ctx.fillStyle = '#ffffff';
                ctx.font = `700 ${Math.max(8, Math.min(14, size / 4))}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                // إضافة outline للنص لجعله أوضح
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.lineWidth = 1;
                ctx.strokeText(displayText, taskX, milestoneY);
                ctx.fillText(displayText, taskX, milestoneY);
              }

              // تحسين عرض الطوابع الزمنية
              if (showTimestamps && viewState.zoom >= 0.5) {
                const startDate = dayToDate(displayTask.startDay);
                const dateText = startDate.toLocaleDateString('ar-SA');
                
                // خلفية للنص للوضوح
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.font = `600 ${Math.max(8, 9 * viewState.zoom)}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                
                const textMetrics = ctx.measureText(dateText);
                const textWidth = textMetrics.width;
                const textHeight = 14 * viewState.zoom;
                const timestampY = milestoneY + size/2 + 20;
                
                // رسم خلفية النص
                ctx.beginPath();
                ctx.roundRect(taskX - textWidth/2 - 4, timestampY - textHeight/2 - 2, 
                              textWidth + 8, textHeight + 4, 4);
                ctx.fill();
                
                // رسم النص
                ctx.fillStyle = '#ffffff';
                ctx.fillText(dateText, taskX, timestampY);
              }

              // تحسين عرض معرف المعلم
              if (showTaskIds && viewState.zoom >= 0.6) {
                const idText = `#${displayTask.id.slice(-4)}`;
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.font = `600 ${Math.max(7, 8 * viewState.zoom)}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                
                const textMetrics = ctx.measureText(idText);
                const textWidth = textMetrics.width;
                const textHeight = 12 * viewState.zoom;
                const idY = milestoneY - size/2 - 15;
                
                // رسم خلفية للمعرف
                ctx.beginPath();
                ctx.roundRect(taskX - textWidth/2 - 3, idY - textHeight/2 - 1, 
                              textWidth + 6, textHeight + 2, 3);
                ctx.fill();
                
                // رسم النص
                ctx.fillStyle = '#ffffff';
                ctx.fillText(idText, taskX, idY);
              }
              
              // إضافة مؤشر بصري عند التحويم (إذا كان متاح)
              if (isDragging) {
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 4;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.arc(taskX, milestoneY, size / 2 + 8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
              }

              ctx.restore();
              
              if (showLinks) {
                drawConnectionPoints(ctx, displayTask, node);
              }
            }

            // رسم المهام العادية
            else if (displayTask.type !== 'milestone' || !showMilestones) {
              const taskWidth = displayTask.duration * scaledDayWidth;
              
              if (taskX + taskWidth >= effectiveLeftPanelWidth && taskX <= rect.width) {
                const isBeingDragged = taskDragState.isDragging && taskDragState.task?.id === displayTask.id;
                
                ctx.save();
                
                if (isBeingDragged) {
                  ctx.globalAlpha = 0.8;
                  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                  ctx.shadowBlur = 10;
                  ctx.shadowOffsetX = 2;
                  ctx.shadowOffsetY = 2;
                }
                
                // لون المهمة (مع أو بدون ألوان)
                ctx.fillStyle = showColors ? displayTask.color : '#6b7280';
                ctx.beginPath();
                ctx.roundRect(taskX, taskY, taskWidth, scaledTaskHeight, CANVAS_CONFIG.taskBorderRadius);
                ctx.fill();

                ctx.strokeStyle = isBeingDragged ? '#3b82f6' : 'rgba(0, 0, 0, 0.1)';
                ctx.lineWidth = CANVAS_CONFIG.taskBorderWidth;
                ctx.beginPath();
                ctx.roundRect(taskX, taskY, taskWidth, scaledTaskHeight, CANVAS_CONFIG.taskBorderRadius);
                ctx.stroke();

                // شريط التقدم (إذا كان مفعلاً)
                if (showProgress && displayTask.progress !== undefined && displayTask.progress > 0) {
                  const progressWidth = (taskWidth * displayTask.progress) / 100;
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                  ctx.beginPath();
                  ctx.roundRect(taskX, taskY + scaledTaskHeight - 4, progressWidth, 3, 2);
                  ctx.fill();
                }

                // نص المهمة
                if (viewState.zoom >= 0.3 && taskWidth > 30) {
                  ctx.fillStyle = '#ffffff';
                  ctx.font = `600 ${Math.max(8, 10 * viewState.zoom)}px Inter, sans-serif`;
                  ctx.textAlign = 'left';
                  ctx.textBaseline = 'middle';
                  
                  let displayText = displayTask.content;
                  const maxTextWidth = taskWidth - 10;
                  const textWidth = ctx.measureText(displayText).width;
                  
                  if (textWidth > maxTextWidth && maxTextWidth > 20) {
                    const ratio = maxTextWidth / textWidth;
                    const maxChars = Math.floor(displayText.length * ratio) - 3;
                    displayText = displayText.substring(0, Math.max(0, maxChars)) + '...';
                  }

                  ctx.fillText(displayText, taskX + 5, taskY + scaledTaskHeight / 2);
                  
                  // اسم المؤلف (إذا كان مفعلاً)
                  if (showAuthors && viewState.zoom >= 0.6 && displayTask.author) {
                    ctx.font = `400 ${Math.max(6, 8 * viewState.zoom)}px Inter, sans-serif`;
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fillText(displayTask.author, taskX + 5, taskY + scaledTaskHeight - 5);
                  }

                  // معرف المهمة (إذا كان مفعلاً)
                  if (showTaskIds && viewState.zoom >= 0.8) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.font = `400 ${Math.max(6, 8 * viewState.zoom)}px Inter, sans-serif`;
                    ctx.fillText(`#${displayTask.id.slice(-4)}`, taskX + 2, taskY + 10);
                  }
                }

                // الطوابع الزمنية (إذا كانت مفعلة)
                if (showTimestamps && viewState.zoom >= 0.7) {
                  const startDate = dayToDate(displayTask.startDay);
                  const endDate = dayToDate(displayTask.startDay + displayTask.duration);
                  
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                  ctx.font = `400 ${Math.max(6, 7 * viewState.zoom)}px Inter, sans-serif`;
                  ctx.textAlign = 'left';
                  
                  // تاريخ البداية
                  ctx.fillText(startDate.toLocaleDateString('ar-SA'), taskX + 2, taskY + scaledTaskHeight + 12);
                  
                  // تاريخ النهاية (إذا كان هناك مساحة كافية)
                  if (taskWidth > 120) {
                    ctx.textAlign = 'right';
                    ctx.fillText(endDate.toLocaleDateString('ar-SA'), taskX + taskWidth - 2, taskY + scaledTaskHeight + 12);
                  }
                }
                
                ctx.restore();

                // نقاط الاتصال للروابط
                if (showLinks) {
                  drawConnectionPoints(ctx, displayTask, node);
                }
              }
            }
            
            // تمييز المهام المحددة
            const isSelected = selectedTaskIds?.includes(task.id);
            if (isSelected) {
              ctx.save();
              ctx.strokeStyle = '#2563eb';
              ctx.lineWidth = 3;
              ctx.setLineDash([5, 3]);
              
              const taskX = effectiveLeftPanelWidth + viewState.offsetX + task.startDay * scaledDayWidth;
              const taskY = nodeY + CANVAS_CONFIG.taskPadding + (task.row || 0) * (scaledTaskHeight + CANVAS_CONFIG.taskPadding);
              
              if (task.type === 'milestone') {
                const size = CANVAS_CONFIG.milestoneSize * viewState.zoom;
                const milestoneY = taskY + scaledTaskHeight / 2;
                ctx.strokeRect(taskX - size/2 - 4, milestoneY - size/2 - 4, size + 8, size + 8);
              } else {
                const taskWidth = task.duration * scaledDayWidth;
                ctx.strokeRect(taskX - 2, taskY - 2, taskWidth + 4, scaledTaskHeight + 4);
              }
              
              ctx.restore();
            }
          });
          
        if (showLinks && linkState.isCreating) {
            drawTemporaryLink(ctx, flattened);
          }
        }
      }
    });

    // ★ استبدال رسم رأس التقويم القديم بالمحور الزمني المحسن ★
    drawEnhancedTimeAxis(ctx, rect, visibleStartDay, visibleEndDay, effectiveLeftPanelWidth);

    // رسم الشريط الجانبي الأيسر (إذا لم يكن مطوياً)
    if (!sidebarCollapsed) {
      drawSidebar(ctx, rect, flattened);
    }

  }, [
    // Dependencies محدثة مع إعدادات العرض الجديدة
    hierarchyTree, 
    viewState, 
    taskDragState, 
    linkState, 
    scaledDayWidth, 
    scaledRowHeight, 
    scaledTaskHeight, 
    CANVAS_CONFIG, 
    expandedNodes, 
    flattenTree, 
    calculateNodeHeight, 
    dayToDate, 
    formatDate, 
    getTotalProjectDays, 
    drawLinks, 
    drawConnectionPoints, 
    drawTemporaryLink, 
    sidebarCollapsed,
    selectedTaskIds,
    showLinks,
    showGrid,
    showWeekends,
    showProgress,
    showAuthors,
    showMilestones,
    showTimestamps,
    showColors,
    showTaskIds,
    // ★ إضافة dependencies جديدة للمحور الزمني ★
    timeAxisMode,
    drawEnhancedTimeAxis,
    drawSidebar
  ]);

    // دالة رسم أزرار التحكم بالمحور الزمني
    const drawTimeAxisControls = useCallback((ctx: CanvasRenderingContext2D) => {
        const buttonWidth = 35;
        const buttonHeight = 20;
        const spacing = 5;
        const startX = CANVAS_CONFIG.leftPanelWidth - (buttonWidth * 2 + spacing + 10);
        const startY = 8;
        
        // زر الأيام
        ctx.fillStyle = timeAxisMode === 'days' ? '#3b82f6' : '#6b7280';
        ctx.beginPath();
        ctx.roundRect(startX, startY, buttonWidth, buttonHeight, 4);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '500 9px "Segoe UI", "Arial", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Days', startX + buttonWidth / 2, startY + buttonHeight / 2);
        
        // زر الأسابيع
        ctx.fillStyle = timeAxisMode === 'weeks' ? '#3b82f6' : '#6b7280';
        ctx.beginPath();
        ctx.roundRect(startX + buttonWidth + spacing, startY, buttonWidth, buttonHeight, 4);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText('Weeks', startX + buttonWidth + spacing + buttonWidth / 2, startY + buttonHeight / 2);
    }, [CANVAS_CONFIG, timeAxisMode]);

    // تحديث معالج النقر لإضافة التحكم بأزرار المحور الزمني
    const handleTimeAxisButtonClick = useCallback((mouseX: number, mouseY: number) => {
        if (sidebarCollapsed || mouseY >= CANVAS_CONFIG.headerHeight) return false;
        
        const buttonWidth = 35;
        const buttonHeight = 20;
        const spacing = 5;
        const startX = CANVAS_CONFIG.leftPanelWidth - (buttonWidth * 2 + spacing + 10);
        const startY = 8;
        
        // فحص النقر على زر الأيام
        if (mouseX >= startX && mouseX <= startX + buttonWidth && 
            mouseY >= startY && mouseY <= startY + buttonHeight) {
            setTimeAxisMode('days');
            return true;
        }
        
        // فحص النقر على زر الأسابيع
        if (mouseX >= startX + buttonWidth + spacing && 
            mouseX <= startX + buttonWidth * 2 + spacing && 
            mouseY >= startY && mouseY <= startY + buttonHeight) {
            setTimeAxisMode('weeks');
            return true;
        }
        
        return false;
    }, [CANVAS_CONFIG, sidebarCollapsed]);

   
    // دالة رسم محور الأيام
    const drawDaysAxis = useCallback((ctx: CanvasRenderingContext2D, rect: DOMRect, visibleStartDay: number, visibleEndDay: number, effectiveLeftPanelWidth: number) => {
        const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // اختصارات أيام الأسبوع
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // رسم الأيام
        for (let day = visibleStartDay; day <= visibleEndDay; day++) {
            const x = effectiveLeftPanelWidth + viewState.offsetX + day * scaledDayWidth;
            if (x + scaledDayWidth >= effectiveLeftPanelWidth && x <= rect.width) {
                const date = dayToDate(day);
                const dayOfWeek = date.getDay();
                const formatted = formatDate(date);
                const isWeekend = formatted.isWeekend; 
                               
                // خلفية عطلة نهاية الأسبوع
                if (isWeekend) {
                    ctx.fillStyle = 'rgba(254, 226, 226, 0.3)';
                    ctx.fillRect(x, 0, scaledDayWidth, CANVAS_CONFIG.headerHeight);
                }
                
                // رقم اليوم
                ctx.fillStyle = isWeekend ? '#dc2626' : '#374151';
                ctx.font = '500 11px "Segoe UI", "Arial", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(date.getDate().toString(), x + scaledDayWidth / 2, CANVAS_CONFIG.headerHeight - 15);
                
                // اختصار اليوم
                ctx.fillStyle = isWeekend ? '#dc2626' : '#6b7280';
                ctx.font = '400 9px "Segoe UI", "Arial", sans-serif';
                ctx.fillText(dayNames[dayOfWeek], x + scaledDayWidth / 2, CANVAS_CONFIG.headerHeight - 5);
                
                // الشهر والسنة (في بداية كل شهر أو اليوم المرئي الأول)
                if (date.getDate() === 1 || day === visibleStartDay) {
                    ctx.fillStyle = '#1e293b';
                    ctx.font = '600 12px "Segoe UI", "Arial", sans-serif';
                    const monthText = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
                    ctx.fillText(monthText, x + scaledDayWidth * 3, 15);
                }
                
                // خطوط فاصلة رفيعة
                if (day > visibleStartDay) {
                    ctx.strokeStyle = '#f1f5f9';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x, CANVAS_CONFIG.headerHeight - 30);
                    ctx.lineTo(x, CANVAS_CONFIG.headerHeight);
                    ctx.stroke();
                }
            }
        }
    }, [CANVAS_CONFIG, dayToDate, scaledDayWidth, viewState.offsetX]);

    // دالة رسم محور الأسابيع
    const drawWeeksAxis = useCallback((ctx: CanvasRenderingContext2D, rect: DOMRect, visibleStartDay: number, visibleEndDay: number, effectiveLeftPanelWidth: number) => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const weekWidth = scaledDayWidth * 7; // عرض الأسبوع
        
        // حساب الأسبوع الأول والأخير المرئيين
        const firstWeekStart = Math.floor(visibleStartDay / 7) * 7;
        const lastWeekStart = Math.floor(visibleEndDay / 7) * 7;
        
        for (let weekStart = firstWeekStart; weekStart <= lastWeekStart; weekStart += 7) {
            const x = effectiveLeftPanelWidth + viewState.offsetX + weekStart * scaledDayWidth;
            if (x + weekWidth >= effectiveLeftPanelWidth && x <= rect.width) {
                const startDate = dayToDate(weekStart);
                const endDate = dayToDate(weekStart + 6);
                
                // خلفية الأسبوع
                ctx.fillStyle = weekStart % 14 === 0 ? 'rgba(248, 250, 252, 0.8)' : 'rgba(241, 245, 249, 0.5)';
                ctx.fillRect(x, 0, weekWidth, CANVAS_CONFIG.headerHeight);
                
                // رقم الأسبوع
                const weekNumber = Math.floor(weekStart / 7) + 1;
                ctx.fillStyle = '#374151';
                ctx.font = '600 12px "Segoe UI", "Arial", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`W${weekNumber}`, x + weekWidth / 2, CANVAS_CONFIG.headerHeight - 20);
                
                // تاريخ بداية ونهاية الأسبوع
                ctx.fillStyle = '#6b7280';
                ctx.font = '400 9px "Segoe UI", "Arial", sans-serif';
                const dateRange = `${startDate.getDate()}/${startDate.getMonth() + 1} - ${endDate.getDate()}/${endDate.getMonth() + 1}`;
                ctx.fillText(dateRange, x + weekWidth / 2, CANVAS_CONFIG.headerHeight - 8);
                
                // الشهر والسنة (في بداية كل شهر أو الأسبوع المرئي الأول)
                if (startDate.getDate() <= 7 || weekStart === firstWeekStart) {
                    ctx.fillStyle = '#1e293b';
                    ctx.font = '600 12px "Segoe UI", "Arial", sans-serif';
                    const monthText = `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;
                    ctx.fillText(monthText, x + weekWidth / 2, 15);
                }
                
                // خطوط فاصلة بين الأسابيع
                if (weekStart > firstWeekStart) {
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, CANVAS_CONFIG.headerHeight);
                    ctx.stroke();
                }
            }
        }
    }, [CANVAS_CONFIG, dayToDate, scaledDayWidth, viewState.offsetX]);


  // دالة رسم عقد الشجرة المحسنة
  const drawTreeNodes = useCallback((ctx: CanvasRenderingContext2D, rect: DOMRect, flattened: HierarchyNode[]) => {
    const baseIndent = 15;
    const levelIndent = 25;
    const lineHeight = Math.max(35, scaledRowHeight * 0.8);
    
    flattened.forEach((node, index) => {
      if (!node.yPosition || !node.height) return;
      
      const nodeY = node.yPosition;
      const nodeHeight = node.height;
      
      if (nodeY + nodeHeight > CANVAS_CONFIG.headerHeight && nodeY < rect.height) {
        const indent = baseIndent + node.level * levelIndent;
        const centerY = Math.max(nodeY + Math.min(nodeHeight, lineHeight) / 2, CANVAS_CONFIG.headerHeight + 20);
        
        // خلفية العقدة مع تأثيرات بصرية
        const bgY = Math.max(nodeY, CANVAS_CONFIG.headerHeight);
        const bgHeight = Math.min(nodeHeight, rect.height - bgY);
        
        // تدرج خلفية حسب نوع العقدة
        let nodeColor = 'rgba(248, 250, 252, 0.8)';
        if (node.type === 'project') {
          nodeColor = 'rgba(239, 246, 255, 0.9)';
        } else if (node.type === 'section') {
          nodeColor = 'rgba(243, 244, 246, 0.8)';
        }
        
        ctx.fillStyle = nodeColor;
        ctx.fillRect(0, bgY, CANVAS_CONFIG.leftPanelWidth, bgHeight);
        
        // خط فاصل أنيق
        if (node.level === 0) {
          ctx.fillStyle = 'rgba(203, 213, 225, 0.6)';
          ctx.fillRect(0, nodeY + nodeHeight - 1, CANVAS_CONFIG.leftPanelWidth, 1);
        }
        
        // رسم خطوط الاتصال للشجرة
        drawTreeConnections(ctx, node, indent, centerY, flattened);
        
        // أزرار التوسيع/الطي المحدثة
        if (node.children.length > 0) {
          drawExpandCollapseButton(ctx, node, centerY);
        }
        
        // نص العقدة مع تحسينات
        drawNodeText(ctx, node, indent, centerY);
        
        
        // إحصائيات المهام
        if (viewState.zoom >= 0.7) {
          drawTaskStats(ctx, node, centerY);
        }
      }
    });
  }, [CANVAS_CONFIG, scaledRowHeight, viewState.zoom]);

  // دالة رسم خطوط الاتصال
  const drawTreeConnections = useCallback((ctx: CanvasRenderingContext2D, node: HierarchyNode, indent: number, centerY: number, flattened: HierarchyNode[]) => {
    if (node.level === 0) return;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    
    const parentIndent = 15 + (node.level - 1) * 25;
    const currentIndent = indent;
    
    // خط أفقي للعقدة الحالية
    ctx.beginPath();
    ctx.moveTo(parentIndent + 10, centerY);
    ctx.lineTo(currentIndent - 5, centerY);
    ctx.stroke();
    
    // خط عمودي للوالد (إذا لم تكن آخر عقدة في المستوى)
    const siblingIndex = flattened.findIndex(n => n.id === node.id);
    const nextSibling = flattened.slice(siblingIndex + 1).find(n => n.level <= node.level);
    
    if (!nextSibling || nextSibling.level < node.level) {
      // هذه آخر عقدة في المستوى
      ctx.beginPath();
      ctx.moveTo(parentIndent + 10, centerY - 15);
      ctx.lineTo(parentIndent + 10, centerY);
      ctx.stroke();
    } else {
      // هناك عقد أخرى في نفس المستوى
      const nextSiblingY = nextSibling.yPosition ? nextSibling.yPosition + Math.min(nextSibling.height || 0, 35) / 2 : centerY + 40;
      ctx.beginPath();
      ctx.moveTo(parentIndent + 10, centerY - 15);
      ctx.lineTo(parentIndent + 10, Math.min(nextSiblingY, centerY + 20));
      ctx.stroke();
    }
    
    ctx.restore();
  }, []);


  // دالة رسم أزرار التوسيع/الطي البسيطة مع دعم الزوم
  const drawExpandCollapseButton = useCallback((ctx: CanvasRenderingContext2D, node: HierarchyNode, centerY: number) => {
      ctx.save();
      
      // حساب الحجم بناءً على الزوم
      const buttonSize = Math.max(14, Math.min(20, 16 * viewState.zoom));
      const iconSize = Math.max(3, Math.min(6, 4 * viewState.zoom));
      
      const buttonX = CANVAS_CONFIG.leftPanelWidth - buttonSize - 10;
      const buttonY = centerY - buttonSize / 2;
      const isExpanded = node.isExpanded;
      
      // خلفية بسيطة
      ctx.fillStyle = isExpanded ? '#e0f2fe' : '#f1f5f9';
      ctx.beginPath();
      ctx.roundRect(buttonX, buttonY, buttonSize, buttonSize, 3);
      ctx.fill();
      
      // حدود بسيطة
      ctx.strokeStyle = isExpanded ? '#0ea5e9' : '#94a3b8';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // الأيقونة
      ctx.strokeStyle = isExpanded ? '#0369a1' : '#475569';
      ctx.lineWidth = Math.max(1, 1.5 * viewState.zoom);
      ctx.lineCap = 'round';
      
      const centerX = buttonX + buttonSize / 2;
      const centerYPos = buttonY + buttonSize / 2;
      
      ctx.beginPath();
      if (isExpanded) {
          // خط أفقي (-)
          ctx.moveTo(centerX - iconSize, centerYPos);
          ctx.lineTo(centerX + iconSize, centerYPos);
      } else {
          // علامة زائد (+)
          ctx.moveTo(centerX - iconSize, centerYPos);
          ctx.lineTo(centerX + iconSize, centerYPos);
          ctx.moveTo(centerX, centerYPos - iconSize);
          ctx.lineTo(centerX, centerYPos + iconSize);
      }
      ctx.stroke();
      
      ctx.restore();
  }, [CANVAS_CONFIG, viewState.zoom]);


  // دالة رسم نص العقدة
  const drawNodeText = useCallback((ctx: CanvasRenderingContext2D, node: HierarchyNode, indent: number, centerY: number) => {
    ctx.save();
    
    const textX = indent + 20;
    const maxTextWidth = CANVAS_CONFIG.leftPanelWidth - textX - 50;
    
    // تحديد نمط النص حسب نوع العقدة
    if (node.type === 'project') {
      ctx.fillStyle = '#1e293b';
      ctx.font = `700 ${Math.max(12, 14 * viewState.zoom)}px "Inter", "Segoe UI", sans-serif`;
    } else if (node.type === 'section') {
      ctx.fillStyle = '#334155';
      ctx.font = `600 ${Math.max(11, 13 * viewState.zoom)}px "Inter", "Segoe UI", sans-serif`;
    } else {
      ctx.fillStyle = '#475569';
      ctx.font = `500 ${Math.max(10, 12 * viewState.zoom)}px "Inter", "Segoe UI", sans-serif`;
    }
    
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    // قطع النص إذا كان طويلاً
    let displayText = node.content;
    const textWidth = ctx.measureText(displayText).width;
    
    if (textWidth > maxTextWidth && maxTextWidth > 30) {
      const ratio = maxTextWidth / textWidth;
      const maxChars = Math.floor(displayText.length * ratio) - 3;
      displayText = displayText.substring(0, Math.max(0, maxChars)) + '...';
    }
    
    ctx.fillText(displayText, textX, centerY + 2);
    
    
    ctx.restore();
  }, [CANVAS_CONFIG, viewState.zoom]);


  // دالة رسم إحصائيات المهام
  const drawTaskStats = useCallback((ctx: CanvasRenderingContext2D, node: HierarchyNode, centerY: number) => {
    if (node.tasks.length === 0) return;
    
    ctx.save();
    
    const statsX = CANVAS_CONFIG.leftPanelWidth - 80;
    //@ts-ignore
    const completedTasks = node.tasks.filter(t => t.progress >= 100).length;
    const totalTasks = node.tasks.length;
    
    // خلفية الإحصائيات
    ctx.fillStyle = 'rgba(241, 245, 249, 0.8)';
    ctx.beginPath();
    ctx.roundRect(statsX - 5, centerY - 8, 70, 16, 8);
    ctx.fill();
    
    // نص الإحصائيات
    ctx.fillStyle = '#64748b';
    ctx.font = `500 ${Math.max(8, 9 * viewState.zoom)}px "Inter", "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const statsText = `${completedTasks}/${totalTasks}`;
    ctx.fillText(statsText, statsX + 30, centerY);
    
    // مؤشر ملون للتقدم
    const progressRatio = totalTasks > 0 ? completedTasks / totalTasks : 0;
    let progressColor = '#ef4444'; // أحمر
    if (progressRatio >= 0.5) progressColor = '#f59e0b'; // برتقالي
    if (progressRatio >= 0.8) progressColor = '#10b981'; // أخضر
    
    ctx.fillStyle = progressColor;
    ctx.beginPath();
    ctx.arc(statsX - 8, centerY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }, [CANVAS_CONFIG, viewState.zoom]);


  // تحديث معالج النقر للتعامل مع الشريط الجانبي المحسن وأزرار المحور الزمني
const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // ★ إضافة فحص أزرار المحور الزمني أولاً ★
    if (handleTimeAxisButtonClick(mouseX, mouseY)) {
        return; // إذا تم النقر على زر المحور الزمني، توقف هنا
    }

    // إذا كان الشريط الجانبي مطوياً، لا نتعامل مع النقرات عليه
    if (sidebarCollapsed || mouseX >= CANVAS_CONFIG.leftPanelWidth) {

      const effectiveLeftPanelWidth = sidebarCollapsed ? 0 : CANVAS_CONFIG.leftPanelWidth;
      
      // البحث عن المهمة المنقورة
      const flattened = flattenTree(hierarchyTree);
      let clickedTask: Task | null = null;
      let clickedNode: HierarchyNode | null = null;

      for (const node of flattened) {
        if (!node.isLeaf || !node.tasks || !node.yPosition || !node.height) continue;
        
        const nodeY = node.yPosition;
        
        for (const task of node.tasks) {
          const taskX = effectiveLeftPanelWidth + viewState.offsetX + task.startDay * scaledDayWidth;
          const taskY = nodeY + CANVAS_CONFIG.taskPadding + (task.row || 0) * (scaledTaskHeight + CANVAS_CONFIG.taskPadding);
          
          if (task.type === 'milestone') {
            const size = CANVAS_CONFIG.milestoneSize * viewState.zoom;
            const milestoneY = taskY + scaledTaskHeight / 2;
            const dx = Math.abs(mouseX - taskX);
            const dy = Math.abs(mouseY - milestoneY);
            
            if ((dx / (size / 2) + dy / (size / 2)) <= 1) {
              clickedTask = task;
              clickedNode = node;
              break;
            }
          } else {
            const taskWidth = task.duration * scaledDayWidth;
            
            if (mouseX >= taskX && mouseX <= taskX + taskWidth && 
                mouseY >= taskY && mouseY <= taskY + scaledTaskHeight) {
              clickedTask = task;
              clickedNode = node;
              break;
            }
          }
        }
        
        if (clickedTask) break;
      }

      // معالجة المهام المنقورة (نفس الكود السابق)
      if (clickedTask && clickedNode && isLinkMode && showLinks) {
        // وضع إنشاء الروابط
        const points = getTaskConnectionPoints(clickedTask, clickedNode);
        const distanceToStart = Math.sqrt(Math.pow(mouseX - points.start.x, 2) + Math.pow(mouseY - points.start.y, 2));
        const distanceToEnd = Math.sqrt(Math.pow(mouseX - points.end.x, 2) + Math.pow(mouseY - points.end.y, 2));
        
        const connectionPoint = distanceToStart < distanceToEnd ? 'start' : 'end';

        if (linkState.isCreating && linkState.sourceTask && linkState.sourcePoint) {
          createLink(linkState.sourceTask, linkState.sourcePoint, clickedTask, connectionPoint, clickedNode.id);
          setLinkState({
            isCreating: false,
            sourceTask: null,
            sourcePoint: null,
            mouseX: 0,
            mouseY: 0
          });
        } else {
          setLinkState({
            isCreating: true,
            sourceTask: clickedTask,
            sourcePoint: connectionPoint,
            mouseX,
            mouseY
          });
        }
      } else if (clickedTask && clickedNode && !isLinkMode) {
        // وضع سحب المهام
        if (clickedTask.type === 'milestone') {
          setTaskDragState({
            isDragging: true,
            task: { ...clickedTask },
            type: 'move',
            startMouseX: mouseX,
            startMouseY: mouseY,
            originalTask: { ...clickedTask },
            nodeId: clickedNode.id
          });
        } else {
          const taskX = effectiveLeftPanelWidth + viewState.offsetX + clickedTask.startDay * scaledDayWidth;
          const taskWidth = clickedTask.duration * scaledDayWidth;
          const resizeZone = Math.min(20, taskWidth * 0.2);

          let dragType: 'move' | 'resize-left' | 'resize-right' = 'move';
          if (mouseX - taskX < resizeZone) {
            dragType = 'resize-left';
          } else if (taskX + taskWidth - mouseX < resizeZone) {
            dragType = 'resize-right';
          }

          setTaskDragState({
            isDragging: true,
            task: { ...clickedTask },
            type: dragType,
            startMouseX: mouseX,
            startMouseY: mouseY,
            originalTask: { ...clickedTask },
            nodeId: clickedNode.id
          });

          canvas.style.cursor = dragType === 'move' ? 'grabbing' : 'col-resize';
        }
      } else {
        if (linkState.isCreating) {
          setLinkState({
            isCreating: false,
            sourceTask: null,
            sourcePoint: null,
            mouseX: 0,
            mouseY: 0
          });
        } else {
          setViewState(prev => ({
            ...prev,
            isDragging: true
          }));
          canvas.style.cursor = 'grabbing';
        }
      }
      
      return;
    }

    // معالجة النقرات في الشريط الجانبي
    if (mouseY < CANVAS_CONFIG.headerHeight) {
      return;
    }

    const flattened = flattenTree(hierarchyTree);
    
    for (const node of flattened) {
      if (!node.yPosition || !node.height) continue;
      
      const nodeY = node.yPosition;
      const nodeHeight = node.height;
      
      if (mouseY >= nodeY && mouseY < nodeY + nodeHeight) {
        const centerY = nodeY + Math.min(nodeHeight, scaledRowHeight) / 2;
        
        // فحص النقر على زر التوسيع/الطي
        if (mouseX >= CANVAS_CONFIG.leftPanelWidth - 40 && mouseX <= CANVAS_CONFIG.leftPanelWidth - 16 && 
            mouseY >= centerY - 12 && mouseY <= centerY + 12 &&
            node.children.length > 0) {
          // تبديل حالة التوسيع/الطي
          setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(node.id)) {
              newSet.delete(node.id);
            } else {
              newSet.add(node.id);
            }
            return newSet;
          });
          return;
        }
      }
    }
  }, [
    // ★ إضافة handleTimeAxisButtonClick في dependencies ★
    handleTimeAxisButtonClick,
    hierarchyTree, 
    viewState, 
    scaledDayWidth, 
    scaledRowHeight, 
    scaledTaskHeight, 
    CANVAS_CONFIG, 
    isLinkMode, 
    linkState, 
    flattenTree, 
    getTaskConnectionPoints, 
    createLink, 
    showLinks, 
    sidebarCollapsed
  ]);

// ★ إضافة معالج hover لأزرار المحور الزمني ★
const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const effectiveLeftPanelWidth = sidebarCollapsed ? 0 : CANVAS_CONFIG.leftPanelWidth;

    // ★ فحص hover على أزرار المحور الزمني ★
    if (!sidebarCollapsed && mouseY < CANVAS_CONFIG.headerHeight) {
      const buttonWidth = 35;
      const buttonHeight = 20;
      const spacing = 5;
      const startX = CANVAS_CONFIG.leftPanelWidth - (buttonWidth * 2 + spacing + 10);
      const startY = 8;
      
      // فحص hover على أزرار المحور الزمني
      if (mouseX >= startX && mouseX <= startX + buttonWidth * 2 + spacing && 
          mouseY >= startY && mouseY <= startY + buttonHeight) {
        canvas.style.cursor = 'pointer';
        return;
      }
    }

    if (linkState.isCreating) {
      setLinkState(prev => ({
        ...prev,
        mouseX,
        mouseY
      }));
    }

    if (taskDragState.isDragging && taskDragState.task && taskDragState.originalTask) {
      e.preventDefault();
      
      const deltaX = mouseX - taskDragState.startMouseX;
      const deltaY = mouseY - taskDragState.startMouseY;
      
      const daysDelta = deltaX / scaledDayWidth;
      const rowsDelta = deltaY / (scaledTaskHeight + CANVAS_CONFIG.taskPadding);

      let newTask = { ...taskDragState.originalTask };

      if (taskDragState.type === 'move') {
        newTask.startDay = taskDragState.originalTask.startDay + daysDelta;
        newTask.row = Math.max(0, (taskDragState.originalTask.row || 0) + rowsDelta);
      } else if (taskDragState.type === 'resize-left' && taskDragState.originalTask.type !== 'milestone') {
        const newStartDay = taskDragState.originalTask.startDay + daysDelta;
        newTask.startDay = Math.min(newStartDay, taskDragState.originalTask.startDay + taskDragState.originalTask.duration - 1);
        newTask.duration = Math.max(1, taskDragState.originalTask.duration - (newTask.startDay - taskDragState.originalTask.startDay));
      } else if (taskDragState.type === 'resize-right' && taskDragState.originalTask.type !== 'milestone') {
        newTask.duration = Math.max(1, taskDragState.originalTask.duration + daysDelta);
      }

      setTaskDragState(prev => ({ ...prev, task: newTask }));
    } else if (viewState.isDragging) {
      setViewState(prev => ({
        ...prev,
        offsetX: prev.offsetX + e.movementX,
        offsetY: prev.offsetY + e.movementY
      }));
    } else {
      // تحديث نوع المؤشر
      canvas.style.cursor = 'default';
      
      if (mouseX < effectiveLeftPanelWidth && !sidebarCollapsed) {
        canvas.style.cursor = 'pointer';
      } else if (isLinkMode && showLinks) {
        canvas.style.cursor = 'crosshair';
      } else {
        // البحث عن مهمة تحت المؤشر
        const flattened = flattenTree(hierarchyTree);
        
        for (const node of flattened) {
          if (!node.isLeaf || !node.tasks || !node.yPosition) continue;
          
          for (const task of node.tasks) {
            const taskX = effectiveLeftPanelWidth + viewState.offsetX + task.startDay * scaledDayWidth;
            const taskY = node.yPosition + CANVAS_CONFIG.taskPadding + (task.row || 0) * (scaledTaskHeight + CANVAS_CONFIG.taskPadding);
            
            if (task.type === 'milestone') {
              const size = CANVAS_CONFIG.milestoneSize * viewState.zoom;
              const milestoneY = taskY + scaledTaskHeight / 2;
              const dx = Math.abs(mouseX - taskX);
              const dy = Math.abs(mouseY - milestoneY);
              
              if ((dx / (size / 2) + dy / (size / 2)) <= 1) {
                canvas.style.cursor = 'grab';
                return;
              }
            } else {
              const taskWidth = task.duration * scaledDayWidth;
              
              if (mouseX >= taskX && mouseX <= taskX + taskWidth && 
                  mouseY >= taskY && mouseY <= taskY + scaledTaskHeight) {
                const resizeZone = Math.min(20, taskWidth * 0.2);
                
                if (mouseX - taskX < resizeZone || taskX + taskWidth - mouseX < resizeZone) {
                  canvas.style.cursor = 'col-resize';
                } else {
                  canvas.style.cursor = 'grab';
                }
                return;
              }
            }
          }
        }
      }
    }
  }, [
    taskDragState, 
    viewState, 
    scaledDayWidth, 
    scaledTaskHeight, 
    CANVAS_CONFIG, 
    isLinkMode, 
    linkState, 
    flattenTree, 
    hierarchyTree, 
    showLinks, 
    sidebarCollapsed
  ]);

// معالج رفع الماوس يبقى كما هو بدون تغيير
const handleCanvasMouseUp = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (taskDragState.isDragging && taskDragState.task && taskDragState.nodeId) {
      const totalDays = getTotalProjectDays();
      
      let finalTask = { ...taskDragState.task };
      
      if (finalTask.type === 'milestone') {
        finalTask.startDay = Math.max(0, Math.min(totalDays - 1, Math.round(finalTask.startDay)));
        finalTask.duration = 0;
        finalTask.row = Math.max(0, Math.round(finalTask.row || 0));
      } else {
        finalTask.startDay = Math.max(0, Math.min(
          totalDays - Math.max(1, Math.round(finalTask.duration)),
          Math.round(finalTask.startDay)
        ));
        finalTask.duration = Math.max(1, Math.round(finalTask.duration));
        finalTask.row = Math.max(0, Math.round(finalTask.row || 0));
      }
      
      // تحديث ارتفاع العقدة إذا لزم الأمر
      setHierarchyTree(prev => {
        const updateTaskInTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
          return nodes.map(node => ({
            ...node,
            tasks: node.id === taskDragState.nodeId 
              ? node.tasks.map(t => t.id === finalTask.id ? finalTask : t)
              : node.tasks,
            children: updateTaskInTree(node.children)
          }));
        };
        return updateTaskInTree(prev);
      });
    }

    setTaskDragState({
      isDragging: false,
      task: null,
      type: 'move',
      startMouseX: 0,
      startMouseY: 0,
      originalTask: null,
      nodeId: undefined
    });

    setViewState(prev => ({
      ...prev,
      isDragging: false
    }));

    canvas.style.cursor = 'default';
  }, [taskDragState, getTotalProjectDays]);


  // Wheel handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.ctrlKey || e.metaKey) {
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomFactor = e.deltaY > 0 ? 0.85 : 1.15;
      const newZoom = Math.max(CANVAS_CONFIG.minZoom, 
                      Math.min(CANVAS_CONFIG.maxZoom, viewState.zoom * zoomFactor));
      
      const worldX = (mouseX - viewState.offsetX) / viewState.zoom;
      const worldY = (mouseY - viewState.offsetY) / viewState.zoom;
      
      const newOffsetX = mouseX - worldX * newZoom;
      const newOffsetY = mouseY - worldY * newZoom;
      
      setViewState(prev => ({ 
        ...prev, 
        zoom: newZoom,
        offsetX: newOffsetX,
        offsetY: newOffsetY
      }));
    } else {
      setViewState(prev => ({
        ...prev,
        offsetX: prev.offsetX - e.deltaX * 2,
        offsetY: prev.offsetY - e.deltaY * 2
      }));
    }
  }, [viewState, CANVAS_CONFIG]);

  useEffect(() => {
    const tree = generateData();
    setHierarchyTree(tree);
    setExpandedNodes(new Set(['project-1', 'section-1', 'section-2']));
  }, [generateData]);

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


  useEffect(() => {
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const taskData = e.dataTransfer?.getData('task');
    if (!taskData) return;
    
    try {
      const task = JSON.parse(taskData);
      const rect = canvasRef.current?.getBoundingClientRect();
      
      if (rect) {
        const dropX = e.clientX - rect.left;
        const dropY = e.clientY - rect.top;
        
        addNewTaskToTree(task, dropX, dropY);
        
        if (onTaskDrop) {
          onTaskDrop(task);
        }
      }
    } catch (error) {
      console.error('خطأ في معالجة المهمة المسحوبة:', error);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'copy';
  };
  
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    if (canvasRef.current) {
      canvasRef.current.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
    }
  };
  
  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    if (canvasRef.current) {
      canvasRef.current.style.backgroundColor = '';
    }
  };

  const canvas = canvasRef.current;
  if (canvas) {
    canvas.addEventListener('drop', handleDrop);
    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('dragenter', handleDragEnter);
    canvas.addEventListener('dragleave', handleDragLeave);
    
    return () => {
      canvas.removeEventListener('drop', handleDrop);
      canvas.removeEventListener('dragover', handleDragOver);
      canvas.removeEventListener('dragenter', handleDragEnter);
      canvas.removeEventListener('dragleave', handleDragLeave);
    };
  }
}, [addNewTaskToTree, onTaskDrop]);


// 6. أضف useEffect للبحث والفلترة:
useEffect(() => {
  if (!searchQuery || searchQuery.trim() === '') {
    setFilteredTree(hierarchyTree);
    return;
  }
  
  const filterTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
    return nodes.map(node => {
      const filteredTasks = node.tasks.filter(task =>
        task.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.author?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      const filteredChildren = filterTree(node.children);
      
      const hasMatchingContent = node.content.toLowerCase().includes(searchQuery.toLowerCase());
      const hasMatchingTasks = filteredTasks.length > 0;
      const hasMatchingChildren = filteredChildren.some(child => 
        child.tasks.length > 0 || child.children.length > 0
      );
      
      if (hasMatchingContent || hasMatchingTasks || hasMatchingChildren) {
        return { ...node, tasks: filteredTasks, children: filteredChildren };
      }
      
      return { ...node, tasks: [], children: [] };
    }).filter(node => 
      node.tasks.length > 0 || 
      node.children.length > 0 ||
      node.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };
  
  setFilteredTree(filterTree(hierarchyTree));
}, [searchQuery, hierarchyTree]);

// 7. تصدير الدوال للاستخدام الخارجي:
useEffect(() => {
  if (window) {
    (window as any).ganttActions = {
      deleteSelectedTasks,
      linkSelectedTasks,
      addNewTaskToTree
    };
  }
}, [deleteSelectedTasks, linkSelectedTasks, addNewTaskToTree]);



  // في بداية GanttCanvas component
useEffect(() => {
  if (searchQuery) {
    // فلترة المهام المعروضة بناءً على البحث
    const filtered = hierarchyTree.map(node => ({
      ...node,
      tasks: node.tasks.filter(task =>
        task.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }));
    // تطبيق الفلترة على الرسم
  }
}, [searchQuery]);

// للتعامل مع المهام المحددة
useEffect(() => {
  if (selectedTaskIds && selectedTaskIds.length > 0) {
    // تمييز المهام المحددة بإطار أزرق أو لون مختلف
  }
}, [selectedTaskIds]);


  return (
    <div className="flex-1 flex flex-col bg-white">
    
      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-gray-50"
        style={{ 
          cursor: viewState.isDragging ? 'grabbing' : 'default'
        }}
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
    </div>
  );
};
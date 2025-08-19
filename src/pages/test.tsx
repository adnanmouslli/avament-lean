"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Settings, 
  Filter, 
  Search,
  Plus,
  Calendar,
  Target,
  Building2,
  Layers3,
  Package,
  GripVertical,
  BarChart3,
  PanelLeftOpen,
  PanelLeftClose,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move3D,
  Link2
} from 'lucide-react';

const COLORS = {
  hierarchyColors: [
    '#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'
  ]
};

interface Task {
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

interface HierarchyNode {
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
  // للعرض
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

const ProjectManager = () => {
  const [hierarchyTree, setHierarchyTree] = useState<HierarchyNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isLinkMode, setIsLinkMode] = useState(false);
  const [showLinks, setShowLinks] = useState(true);
  
  const [viewState, setViewState] = useState<ViewState>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false
  });

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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const CANVAS_CONFIG = useMemo(() => ({
    leftPanelWidth: 320,
    dayWidth: 80,
    rowHeight: 30,
    taskHeight: 24,
    headerHeight: 80,
    minZoom: 0.1,
    maxZoom: 5,
    gridColor: '#e5e7eb',
    weekendColor: '#fef3f2',
    todayColor: '#ef4444',
    taskBorderRadius: 8,
    taskMinWidth: 80,
    taskPadding: 4,
    taskBorderWidth: 2,
    linkColor: '#3b82f6',
    linkWidth: 2,
    connectorRadius: 6,
    milestoneSize: 20,
    milestoneColor: '#7c3aed'
  }), []);

  const PROJECT_START_DATE = useMemo(() => new Date('2025-01-14'), []);
  const PROJECT_END_DATE = useMemo(() => new Date('2025-02-14'), []);

  const scaledDayWidth = useMemo(() => CANVAS_CONFIG.dayWidth * viewState.zoom, [CANVAS_CONFIG.dayWidth, viewState.zoom]);
  const scaledRowHeight = useMemo(() => CANVAS_CONFIG.rowHeight * viewState.zoom, [CANVAS_CONFIG.rowHeight, viewState.zoom]);
  const scaledTaskHeight = useMemo(() => CANVAS_CONFIG.taskHeight * viewState.zoom, [CANVAS_CONFIG.taskHeight, viewState.zoom]);

  const getTotalProjectDays = useCallback(() => {
    const timeDiff = PROJECT_END_DATE.getTime() - PROJECT_START_DATE.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  }, [PROJECT_END_DATE, PROJECT_START_DATE]);

  // تحويل اليوم إلى تاريخ
  const dayToDate = useCallback((dayIndex: number): Date => {
    const date = new Date(PROJECT_START_DATE);
    date.setDate(date.getDate() + dayIndex);
    return date;
  }, [PROJECT_START_DATE]);

  // تنسيق التاريخ
  const formatDate = useCallback((date: Date) => {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    
    return {
      day: date.getDate(),
      month: months[date.getMonth()],
      year: date.getFullYear(),
      dayName: days[date.getDay()],
      isWeekend: date.getDay() === 5 || date.getDay() === 6
    };
  }, []);

  // حساب ارتفاع العقدة بناءً على المهام
  const calculateNodeHeight = useCallback((node: HierarchyNode): number => {
    if (node.isLeaf && node.tasks && node.tasks.length > 0) {
      const maxRow = Math.max(...node.tasks.map(t => t.row || 0));
      return (maxRow + 2) * scaledRowHeight;
    }
    return scaledRowHeight;
  }, [scaledRowHeight]);

  // تسطيح الشجرة مع حساب المواضع
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

  // حساب نقاط الاتصال للمهمة
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

  // رسم الروابط
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
  }, [CANVAS_CONFIG, getTaskConnectionPoints]);

  // رسم نقاط الاتصال
  const drawConnectionPoints = useCallback((ctx: CanvasRenderingContext2D, task: Task, node: HierarchyNode) => {
    if (!isLinkMode) return;

    const points = getTaskConnectionPoints(task, node);
    
    ctx.save();
    ctx.fillStyle = CANVAS_CONFIG.linkColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(points.start.x, points.start.y, CANVAS_CONFIG.connectorRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(points.end.x, points.end.y, CANVAS_CONFIG.connectorRadius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }, [isLinkMode, getTaskConnectionPoints, CANVAS_CONFIG]);

  // رسم الرابط المؤقت
  const drawTemporaryLink = useCallback((ctx: CanvasRenderingContext2D, node: HierarchyNode) => {
    if (!linkState.isCreating || !linkState.sourceTask || !linkState.sourcePoint) return;

    const sourcePoints = getTaskConnectionPoints(linkState.sourceTask, node);
    const startPoint = sourcePoints[linkState.sourcePoint];

    ctx.save();
    ctx.strokeStyle = CANVAS_CONFIG.linkColor;
    ctx.lineWidth = CANVAS_CONFIG.linkWidth;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(linkState.mouseX, linkState.mouseY);
    ctx.stroke();

    ctx.restore();
  }, [linkState, getTaskConnectionPoints, CANVAS_CONFIG]);

  // توليد البيانات التجريبية
  const generateData = useCallback((): HierarchyNode[] => {
    const totalDays = getTotalProjectDays();
    
    const generateRandomTasks = (parentId: string, count: number): Task[] => {
      const tasks: Task[] = [];
      const authors = ['م. أحمد', 'م. سارة', 'م. محمد'];
      const taskNames = ['تحليل', 'تصميم', 'تطوير', 'اختبار', 'توثيق'];
      
      for (let i = 0; i < count; i++) {
        const isMilestone = Math.random() < 0.2;
        const startDay = Math.floor(Math.random() * (totalDays - 20)) + 5;
        const row = i;
        
        if (isMilestone) {
          tasks.push({
            id: `${parentId}-milestone-${i}`,
            content: `معلم ${i + 1}`,
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
      content: 'مشروع النظام الجديد',
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
        content: `المرحلة ${s}`,
        level: 1,
        isLeaf: false,
        color: COLORS.hierarchyColors[s],
        parent: 'project-1',
        tasks: [],
        links: [],
        children: []
      };
      
      for (let t = 1; t <= 2; t++) {
        const taskCount = Math.floor(Math.random() * 3) + 2;
        const tasks = generateRandomTasks(`section-${s}-taskgroup-${t}`, taskCount);
        const links = generateSampleLinks(tasks);

        const taskGroup: HierarchyNode = {
          id: `section-${s}-taskgroup-${t}`,
          type: 'task',
          content: `مجموعة المهام ${t}`,
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

  useEffect(() => {
    const tree = generateData();
    setHierarchyTree(tree);
    setExpandedNodes(new Set(['project-1', 'section-1', 'section-2']));
  }, [generateData]);

  // دالة الرسم الرئيسية
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
    
    // مسح Canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const flattened = flattenTree(hierarchyTree);
    const totalDays = getTotalProjectDays();

    // رسم اللوحة اليسرى الثابتة
    ctx.save();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, CANVAS_CONFIG.leftPanelWidth, rect.height);
    
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CANVAS_CONFIG.leftPanelWidth, 0);
    ctx.lineTo(CANVAS_CONFIG.leftPanelWidth, rect.height);
    ctx.stroke();
    ctx.restore();

    // رسم رأس التقويم
    ctx.save();
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(CANVAS_CONFIG.leftPanelWidth, 0, rect.width - CANVAS_CONFIG.leftPanelWidth, CANVAS_CONFIG.headerHeight);
    
    // رسم الأيام
    const startDay = Math.floor(-viewState.offsetX / scaledDayWidth);
    const endDay = Math.ceil((rect.width - CANVAS_CONFIG.leftPanelWidth - viewState.offsetX) / scaledDayWidth);
    
    ctx.fillStyle = '#475569';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    
    for (let day = Math.max(0, startDay); day < Math.min(totalDays, endDay); day++) {
      const x = CANVAS_CONFIG.leftPanelWidth + viewState.offsetX + day * scaledDayWidth;
      const date = dayToDate(day);
      const formatted = formatDate(date);
      
      // خلفية نهاية الأسبوع
      if (formatted.isWeekend) {
        ctx.fillStyle = CANVAS_CONFIG.weekendColor;
        ctx.fillRect(x, CANVAS_CONFIG.headerHeight, scaledDayWidth, rect.height);
      }
      
      // رقم اليوم
      ctx.fillStyle = formatted.isWeekend ? '#ef4444' : '#475569';
      ctx.fillText(formatted.day.toString(), x + scaledDayWidth / 2, 35);
      
      // الشهر
      if (date.getDate() === 1 || day === Math.max(0, startDay)) {
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText(formatted.month, x + scaledDayWidth * 2, 15);
        ctx.font = '11px Inter, sans-serif';
      }
    }
    
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CANVAS_CONFIG.leftPanelWidth, CANVAS_CONFIG.headerHeight);
    ctx.lineTo(rect.width, CANVAS_CONFIG.headerHeight);
    ctx.stroke();
    ctx.restore();

    // رسم الشبكة
    ctx.save();
    ctx.strokeStyle = CANVAS_CONFIG.gridColor;
    ctx.lineWidth = 0.5;
    
    // خطوط عمودية
    for (let day = Math.max(0, startDay); day < Math.min(totalDays, endDay); day++) {
      const x = CANVAS_CONFIG.leftPanelWidth + viewState.offsetX + day * scaledDayWidth;
      ctx.beginPath();
      ctx.moveTo(x, CANVAS_CONFIG.headerHeight);
      ctx.lineTo(x, rect.height);
      ctx.stroke();
    }
    
    // خطوط أفقية حسب العقد
    flattened.forEach(node => {
      if (node.yPosition && node.height) {
        ctx.beginPath();
        ctx.moveTo(0, node.yPosition + node.height);
        ctx.lineTo(rect.width, node.yPosition + node.height);
        ctx.stroke();
      }
    });
    ctx.restore();

    // رسم العقد
    flattened.forEach((node, index) => {
      if (!node.yPosition || !node.height) return;
      
      const nodeY = node.yPosition;
      const nodeHeight = node.height;
      
      if (nodeY + nodeHeight > 0 && nodeY < rect.height) {
        // رسم خلفية العقدة
        if (node.type === 'project') {
          ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
          ctx.fillRect(0, nodeY, CANVAS_CONFIG.leftPanelWidth, nodeHeight);
        } else if (node.type === 'section') {
          ctx.fillStyle = 'rgba(139, 92, 246, 0.03)';
          ctx.fillRect(0, nodeY, CANVAS_CONFIG.leftPanelWidth, nodeHeight);
        }
        
        // منطقة العمل للمهام
        if (node.isLeaf) {
          ctx.fillStyle = 'rgba(248, 250, 252, 0.6)';
          ctx.fillRect(CANVAS_CONFIG.leftPanelWidth, nodeY, rect.width - CANVAS_CONFIG.leftPanelWidth, nodeHeight);
          
          ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)';
          ctx.lineWidth = 1;
          ctx.strokeRect(CANVAS_CONFIG.leftPanelWidth, nodeY, rect.width - CANVAS_CONFIG.leftPanelWidth, nodeHeight);
        }
        
        // رسم الهيكل الشجري
        const indent = 20 + node.level * 25;
        const centerY = nodeY + Math.min(nodeHeight, scaledRowHeight) / 2;
        
        // أيقونة التوسيع/الطي
        if (node.children.length > 0) {
          ctx.save();
          ctx.fillStyle = '#64748b';
          ctx.translate(indent - 15, centerY);
          
          if (node.isExpanded) {
            ctx.beginPath();
            ctx.moveTo(-4, -2);
            ctx.lineTo(4, -2);
            ctx.lineTo(0, 4);
            ctx.closePath();
          } else {
            ctx.beginPath();
            ctx.moveTo(-2, -4);
            ctx.lineTo(-2, 4);
            ctx.lineTo(4, 0);
            ctx.closePath();
          }
          ctx.fill();
          ctx.restore();
        }
        
        // أيقونة النوع
        ctx.fillStyle = node.color;
        if (node.type === 'project') {
          ctx.fillRect(indent - 6, centerY - 6, 12, 12);
        } else if (node.type === 'section') {
          ctx.save();
          ctx.translate(indent, centerY);
          ctx.rotate(Math.PI / 4);
          ctx.fillRect(-5, -5, 10, 10);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(indent, centerY, 5, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // النص
        ctx.fillStyle = '#1e293b';
        ctx.font = node.type === 'project' ? 'bold 13px Inter, sans-serif' : '12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(node.content, indent + 15, centerY + 4);
        
        // عدد المهام
        if (node.isLeaf && node.tasks.length > 0) {
          ctx.fillStyle = '#64748b';
          ctx.font = '10px Inter, sans-serif';
          ctx.fillText(`(${node.tasks.length} مهام)`, indent + 15 + ctx.measureText(node.content).width + 5, centerY + 4);
        }
        
        // رسم خط المشروع/القسم
        if ((node.type === 'project' || node.type === 'section') && node.isExpanded) {
          let minStart = Infinity;
          let maxEnd = -Infinity;
          
          const findTaskRange = (n: HierarchyNode) => {
            if (n.tasks.length > 0) {
              n.tasks.forEach(task => {
                minStart = Math.min(minStart, task.startDay);
                maxEnd = Math.max(maxEnd, task.startDay + task.duration);
              });
            }
            if (n.isExpanded) {
              n.children.forEach(child => findTaskRange(child));
            }
          };
          
          findTaskRange(node);
          
          if (minStart !== Infinity && maxEnd !== -Infinity) {
            const lineStartX = CANVAS_CONFIG.leftPanelWidth + viewState.offsetX + minStart * scaledDayWidth;
            const lineEndX = CANVAS_CONFIG.leftPanelWidth + viewState.offsetX + maxEnd * scaledDayWidth;
            
            ctx.save();
            ctx.strokeStyle = node.type === 'project' ? '#1e293b' : '#475569';
            ctx.lineWidth = node.type === 'project' ? 3 : 2;
            
            ctx.beginPath();
            ctx.moveTo(Math.max(CANVAS_CONFIG.leftPanelWidth, lineStartX), centerY);
            ctx.lineTo(Math.min(rect.width, lineEndX), centerY);
            ctx.stroke();
            
            // نقاط البداية والنهاية
            if (lineStartX >= CANVAS_CONFIG.leftPanelWidth) {
              ctx.fillStyle = '#10b981';
              ctx.beginPath();
              ctx.arc(lineStartX, centerY, 4, 0, Math.PI * 2);
              ctx.fill();
            }
            
            if (lineEndX <= rect.width) {
              ctx.fillStyle = '#ef4444';
              ctx.beginPath();
              ctx.arc(lineEndX, centerY, 4, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        }
        
        // رسم المهام والروابط
        if (node.isLeaf && node.tasks.length > 0) {
          // رسم الروابط أولاً
          if (showLinks) {
            drawLinks(ctx, node);
          }
          
          // رسم المهام
          node.tasks.forEach(task => {
            let displayTask = task;
            
            if (taskDragState.isDragging && taskDragState.task?.id === task.id && taskDragState.nodeId === node.id) {
              displayTask = taskDragState.task;
            }

            const taskX = CANVAS_CONFIG.leftPanelWidth + viewState.offsetX + displayTask.startDay * scaledDayWidth;
            const taskY = nodeY + CANVAS_CONFIG.taskPadding + (displayTask.row || 0) * (scaledTaskHeight + CANVAS_CONFIG.taskPadding);
            
            if (displayTask.type === 'milestone') {
              // رسم المعلم
              const size = CANVAS_CONFIG.milestoneSize * viewState.zoom;
              const milestoneY = taskY + scaledTaskHeight / 2;
              
              ctx.save();
              ctx.fillStyle = displayTask.color || CANVAS_CONFIG.milestoneColor;
              ctx.strokeStyle = taskDragState.isDragging && taskDragState.task?.id === displayTask.id ? '#3b82f6' : 'rgba(0, 0, 0, 0.2)';
              ctx.lineWidth = 2;
              
              ctx.beginPath();
              ctx.moveTo(taskX, milestoneY - size / 2);
              ctx.lineTo(taskX + size / 2, milestoneY);
              ctx.lineTo(taskX, milestoneY + size / 2);
              ctx.lineTo(taskX - size / 2, milestoneY);
              ctx.closePath();
              
              ctx.fill();
              ctx.stroke();
              
              if (viewState.zoom >= 0.5 && displayTask.content) {
                ctx.fillStyle = '#ffffff';
                ctx.font = `600 ${Math.max(8, 10 * viewState.zoom)}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(displayTask.content, taskX, milestoneY);
              }
              ctx.restore();
              
              if (showLinks) {
                drawConnectionPoints(ctx, displayTask, node);
              }
            } else {
              // رسم المهمة العادية
              const taskWidth = displayTask.duration * scaledDayWidth;
              
              if (taskX + taskWidth >= CANVAS_CONFIG.leftPanelWidth && taskX <= rect.width) {
                const isBeingDragged = taskDragState.isDragging && taskDragState.task?.id === displayTask.id;
                
                ctx.save();
                
                if (isBeingDragged) {
                  ctx.globalAlpha = 0.8;
                  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                  ctx.shadowBlur = 10;
                  ctx.shadowOffsetX = 2;
                  ctx.shadowOffsetY = 2;
                }
                
                // خلفية المهمة
                ctx.fillStyle = displayTask.color;
                ctx.beginPath();
                ctx.roundRect(taskX, taskY, taskWidth, scaledTaskHeight, CANVAS_CONFIG.taskBorderRadius);
                ctx.fill();

                // حواف المهمة
                ctx.strokeStyle = isBeingDragged ? '#3b82f6' : 'rgba(0, 0, 0, 0.1)';
                ctx.lineWidth = CANVAS_CONFIG.taskBorderWidth;
                ctx.beginPath();
                ctx.roundRect(taskX, taskY, taskWidth, scaledTaskHeight, CANVAS_CONFIG.taskBorderRadius);
                ctx.stroke();

                // شريط التقدم
                if (displayTask.progress !== undefined && displayTask.progress > 0) {
                  const progressWidth = (taskWidth * displayTask.progress) / 100;
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                  ctx.beginPath();
                  ctx.roundRect(taskX, taskY + scaledTaskHeight - 4, progressWidth, 3, 2);
                  ctx.fill();
                }

                // النص
                if (viewState.zoom >= 0.3 && taskWidth > 30) {
                  ctx.fillStyle = '#ffffff';
                  ctx.font = `600 ${Math.max(10, 12 * viewState.zoom)}px Inter, sans-serif`;
                  ctx.textAlign = 'right';
                  ctx.textBaseline = 'middle';
                  
                  let displayText = displayTask.content;
                  const maxTextWidth = taskWidth - 10;
                  const textWidth = ctx.measureText(displayText).width;
                  
                  if (textWidth > maxTextWidth && maxTextWidth > 20) {
                    const ratio = maxTextWidth / textWidth;
                    const maxChars = Math.floor(displayText.length * ratio) - 3;
                    displayText = displayText.substring(0, Math.max(0, maxChars)) + '...';
                  }

                  ctx.fillText(displayText, taskX + taskWidth - 5, taskY + scaledTaskHeight / 2);
                  
                  if (viewState.zoom >= 0.6 && displayTask.author) {
                    ctx.font = `400 ${Math.max(8, 10 * viewState.zoom)}px Inter, sans-serif`;
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.fillText(displayTask.author, taskX + taskWidth - 5, taskY + scaledTaskHeight - 5);
                  }
                }
                
                ctx.restore();

                if (showLinks) {
                  drawConnectionPoints(ctx, displayTask, node);
                }
              }
            } 
             });
          
          // رسم الرابط المؤقت
          if (showLinks && linkState.isCreating) {
            drawTemporaryLink(ctx, node);
          }
        }
      }
    });

  }, [hierarchyTree, viewState, taskDragState, linkState, scaledDayWidth, scaledRowHeight, scaledTaskHeight, 
      CANVAS_CONFIG, expandedNodes, flattenTree, calculateNodeHeight, dayToDate, formatDate, 
      getTotalProjectDays, drawLinks, drawConnectionPoints, drawTemporaryLink, showLinks, isLinkMode]);

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

  // إنشاء رابط جديد
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

  // معالج النقر على Canvas
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // التحقق من النقر على أيقونات التوسيع/الطي
    if (mouseX < CANVAS_CONFIG.leftPanelWidth) {
      const flattened = flattenTree(hierarchyTree);
      
      for (const node of flattened) {
        if (!node.yPosition || !node.height) continue;
        
        const nodeY = node.yPosition;
        const nodeHeight = node.height;
        
        if (mouseY >= nodeY && mouseY < nodeY + nodeHeight) {
          const indent = 20 + node.level * 25;
          const centerY = nodeY + Math.min(nodeHeight, scaledRowHeight) / 2;
          
          if (mouseX >= indent - 20 && mouseX <= indent - 10 && 
              mouseY >= centerY - 10 && mouseY <= centerY + 10 &&
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
      return;
    }

    // البحث عن المهمة المنقورة
    const flattened = flattenTree(hierarchyTree);
    let clickedTask: Task | null = null;
    let clickedNode: HierarchyNode | null = null;

    for (const node of flattened) {
      if (!node.isLeaf || !node.tasks || !node.yPosition || !node.height) continue;
      
      const nodeY = node.yPosition;
      
      for (const task of node.tasks) {
        const taskX = CANVAS_CONFIG.leftPanelWidth + viewState.offsetX + task.startDay * scaledDayWidth;
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
        const taskX = CANVAS_CONFIG.leftPanelWidth + viewState.offsetX + clickedTask.startDay * scaledDayWidth;
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
  }, [hierarchyTree, viewState, scaledDayWidth, scaledRowHeight, scaledTaskHeight, CANVAS_CONFIG, 
      isLinkMode, linkState, flattenTree, getTaskConnectionPoints, createLink, showLinks]);

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
      // تحديد نوع المؤشر
      canvas.style.cursor = 'default';
      
      if (mouseX < CANVAS_CONFIG.leftPanelWidth) {
        canvas.style.cursor = 'pointer';
      } else if (isLinkMode && showLinks) {
        canvas.style.cursor = 'crosshair';
      } else {
        // البحث عن مهمة تحت المؤشر
        const flattened = flattenTree(hierarchyTree);
        
        for (const node of flattened) {
          if (!node.isLeaf || !node.tasks || !node.yPosition) continue;
          
          for (const task of node.tasks) {
            const taskX = CANVAS_CONFIG.leftPanelWidth + viewState.offsetX + task.startDay * scaledDayWidth;
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
  }, [taskDragState, viewState, scaledDayWidth, scaledTaskHeight, CANVAS_CONFIG, isLinkMode, linkState, flattenTree, hierarchyTree, showLinks]);

  // معالج رفع الماوس
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
      
      // تحديث ارتفاع العقدة إذا لزم
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

  // معالج عجلة الماوس
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

  // دوال التحكم
  const zoomIn = () => setViewState(prev => ({ 
    ...prev, 
    zoom: Math.min(CANVAS_CONFIG.maxZoom, prev.zoom * 1.2) 
  }));
  
  const zoomOut = () => setViewState(prev => ({ 
    ...prev, 
    zoom: Math.max(CANVAS_CONFIG.minZoom, prev.zoom / 1.2) 
  }));
  
  const resetView = () => setViewState({ 
    zoom: 1, 
    offsetX: 0, 
    offsetY: 0, 
    isDragging: false
  });

  const toggleLinkMode = () => {
    setIsLinkMode(!isLinkMode);
    if (linkState.isCreating) {
      setLinkState({
        isCreating: false,
        sourceTask: null,
        sourcePoint: null,
        mouseX: 0,
        mouseY: 0
      });
    }
  };

  const toggleShowLinks = () => {
    setShowLinks(!showLinks);
    if (showLinks) {
      setIsLinkMode(false);
      if (linkState.isCreating) {
        setLinkState({
          isCreating: false,
          sourceTask: null,
          sourcePoint: null,
          mouseX: 0,
          mouseY: 0
        });
      }
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-xl">
              <Target size={20} />
            </div>
            
            <div>
              <h1 className="text-xl font-bold text-gray-900">AVAMENT Gantt</h1>
              <p className="text-sm text-gray-600">نظام إدارة المشاريع بمناطق ديناميكية</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-1 space-x-1">
              <button onClick={zoomOut} className="p-2 hover:bg-white rounded" title="تصغير">
                <ZoomOut size={16} />
              </button>
              <span className="px-2 text-sm font-medium min-w-16 text-center">
                {Math.round(viewState.zoom * 100)}%
              </span>
              <button onClick={zoomIn} className="p-2 hover:bg-white rounded" title="تكبير">
                <ZoomIn size={16} />
              </button>
              <button onClick={resetView} className="p-2 hover:bg-white rounded text-blue-600" title="إعادة تعيين">
                <RotateCcw size={16} />
              </button>
            </div>

            <button 
              onClick={toggleShowLinks}
              className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                showLinks 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={showLinks ? "إخفاء الروابط" : "إظهار الروابط"}
            >
              {showLinks ? 'إخفاء الروابط' : 'إظهار الروابط'}
            </button>

            <button 
              onClick={toggleLinkMode}
              className={`p-2 rounded-lg transition-colors ${
                isLinkMode && showLinks
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${!showLinks ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="وضع ربط المهام"
              disabled={!showLinks}
            >
              <Link2 size={16} />
            </button>

            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
              <Plus size={16} />
              <span>مهمة جديدة</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col bg-white">
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
      </div>
    </div>
  );
};

export default ProjectManager;
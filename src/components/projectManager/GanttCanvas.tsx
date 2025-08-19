"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link2 } from 'lucide-react';

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
}

export const GanttCanvas: React.FC<GanttCanvasProps> = ({
  sidebarCollapsed,
  viewState,
  setViewState
}) => {
  const [hierarchyTree, setHierarchyTree] = useState<HierarchyNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isLinkMode, setIsLinkMode] = useState(false);
  const [showLinks, setShowLinks] = useState(true);
  
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
    leftPanelWidth: sidebarCollapsed ? 60 : 320,
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
  }), [sidebarCollapsed]);

  const PROJECT_START_DATE = useMemo(() => new Date('2025-01-14'), []);
  const PROJECT_END_DATE = useMemo(() => new Date('2025-02-14'), []);

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
        const taskCount = Math.floor(Math.random() * 3) + 5;
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
    
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const flattened = flattenTree(hierarchyTree);
    const totalDays = getTotalProjectDays();

    // Calculate visible time range
    const startDay = Math.floor(-viewState.offsetX / scaledDayWidth);
    const endDay = Math.ceil((rect.width - CANVAS_CONFIG.leftPanelWidth - viewState.offsetX) / scaledDayWidth);
    const visibleStartDay = Math.max(0, startDay);
    const visibleEndDay = Math.min(totalDays, endDay);

    // Calculate work area bounds
    const projectStartX = CANVAS_CONFIG.leftPanelWidth + viewState.offsetX;
    const projectEndX = CANVAS_CONFIG.leftPanelWidth + viewState.offsetX + totalDays * scaledDayWidth;
    const workAreaTop = CANVAS_CONFIG.headerHeight;
    const workAreaBottom = Math.max(workAreaTop, flattened.reduce((maxY, node) => 
      node.yPosition && node.height ? Math.max(maxY, node.yPosition + node.height) : maxY, workAreaTop));
    
    const firstTaskNode = flattened.find(node => node.isLeaf && node.tasks.length > 0);
    const actualWorkAreaTop = firstTaskNode && firstTaskNode.yPosition ? 
      firstTaskNode.yPosition + CANVAS_CONFIG.taskPadding : workAreaTop;

    // Draw gray background for entire area except left panel and calendar header
    ctx.save();
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(CANVAS_CONFIG.leftPanelWidth, CANVAS_CONFIG.headerHeight, 
                rect.width - CANVAS_CONFIG.leftPanelWidth, rect.height - CANVAS_CONFIG.headerHeight);
    
    // White area inside time range and actual work area only
    const workAreaStartX = Math.max(CANVAS_CONFIG.leftPanelWidth, projectStartX);
    const workAreaEndX = Math.min(rect.width, projectEndX);
    
    if (workAreaEndX > workAreaStartX && workAreaBottom > actualWorkAreaTop) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(workAreaStartX, actualWorkAreaTop, 
                  workAreaEndX - workAreaStartX, workAreaBottom - actualWorkAreaTop);
    }
    
    ctx.restore();

    // Draw grid lines (only inside time range and actual work area)
    ctx.save();
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Vertical lines (days) - only inside time range and actual work area
    for (let day = visibleStartDay; day <= visibleEndDay; day++) {
      const x = CANVAS_CONFIG.leftPanelWidth + viewState.offsetX + day * scaledDayWidth;
      if (x >= Math.max(CANVAS_CONFIG.leftPanelWidth, projectStartX) && 
          x <= Math.min(rect.width, projectEndX)) {
        ctx.beginPath();
        ctx.moveTo(x, actualWorkAreaTop);
        ctx.lineTo(x, workAreaBottom);
        ctx.stroke();
      }
    }
    
    // Horizontal lines (rows) - only inside time range and work area for nodes with tasks
    flattened.forEach(node => {
      if (node.yPosition && node.height && node.isLeaf && node.tasks.length > 0) {
        const lineY = node.yPosition + node.height;
        if (lineY >= actualWorkAreaTop && lineY <= workAreaBottom) {
          ctx.beginPath();
          ctx.moveTo(Math.max(CANVAS_CONFIG.leftPanelWidth, projectStartX), lineY);
          ctx.lineTo(Math.min(rect.width, projectEndX), lineY);
          ctx.stroke();
        }
        
        // Sub-lines for rows within task nodes only
        const maxRow = Math.max(...node.tasks.map(t => t.row || 0));
        for (let row = 1; row <= maxRow; row++) {
          const rowY = node.yPosition + row * (scaledTaskHeight + CANVAS_CONFIG.taskPadding);
          if (rowY < node.yPosition + node.height && rowY >= actualWorkAreaTop && rowY <= workAreaBottom) {
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(Math.max(CANVAS_CONFIG.leftPanelWidth, projectStartX), rowY);
            ctx.lineTo(Math.min(rect.width, projectEndX), rowY);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
    });
    
    ctx.restore();

    // Draw weekend backgrounds (only inside time range and actual work area)
    ctx.save();
    for (let day = visibleStartDay; day <= visibleEndDay; day++) {
      const date = dayToDate(day);
      const formatted = formatDate(date);
      
      if (formatted.isWeekend) {
        const x = CANVAS_CONFIG.leftPanelWidth + viewState.offsetX + day * scaledDayWidth;
        const startX = Math.max(Math.max(CANVAS_CONFIG.leftPanelWidth, projectStartX), x);
        const endX = Math.min(Math.min(rect.width, projectEndX), x + scaledDayWidth);
        
        if (endX > startX) {
          ctx.fillStyle = 'rgba(254, 243, 242, 0.5)';
          ctx.fillRect(startX, actualWorkAreaTop, endX - startX, workAreaBottom - actualWorkAreaTop);
        }
      }
    }
    ctx.restore();

    // Draw nodes and tasks
    flattened.forEach((node, index) => {
      if (!node.yPosition || !node.height) return;
      
      const nodeY = node.yPosition;
      const nodeHeight = node.height;
      
      if (nodeY + nodeHeight > CANVAS_CONFIG.headerHeight && nodeY < rect.height) {
        // Draw tasks and links
        if (node.isLeaf && node.tasks.length > 0) {
          // Draw links first
          if (showLinks) {
            drawLinks(ctx, node);
          }
          
          // Draw tasks
          node.tasks.forEach(task => {
            let displayTask = task;
            
            if (taskDragState.isDragging && taskDragState.task?.id === task.id && taskDragState.nodeId === node.id) {
              displayTask = taskDragState.task;
            }

            const taskX = CANVAS_CONFIG.leftPanelWidth + viewState.offsetX + displayTask.startDay * scaledDayWidth;
            const taskY = nodeY + CANVAS_CONFIG.taskPadding + (displayTask.row || 0) * (scaledTaskHeight + CANVAS_CONFIG.taskPadding);
            
            if (displayTask.type === 'milestone') {
              // Draw milestone
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
              // Draw regular task
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
                
                // Task background
                ctx.fillStyle = displayTask.color;
                ctx.beginPath();
                ctx.roundRect(taskX, taskY, taskWidth, scaledTaskHeight, CANVAS_CONFIG.taskBorderRadius);
                ctx.fill();

                // Task border
                ctx.strokeStyle = isBeingDragged ? '#3b82f6' : 'rgba(0, 0, 0, 0.1)';
                ctx.lineWidth = CANVAS_CONFIG.taskBorderWidth;
                ctx.beginPath();
                ctx.roundRect(taskX, taskY, taskWidth, scaledTaskHeight, CANVAS_CONFIG.taskBorderRadius);
                ctx.stroke();

                // Progress bar
                if (displayTask.progress !== undefined && displayTask.progress > 0) {
                  const progressWidth = (taskWidth * displayTask.progress) / 100;
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                  ctx.beginPath();
                  ctx.roundRect(taskX, taskY + scaledTaskHeight - 4, progressWidth, 3, 2);
                  ctx.fill();
                }

                // Text
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
          
          // Draw temporary link
          if (showLinks && linkState.isCreating) {
            drawTemporaryLink(ctx, node);
          }
        }
      }
    });

    // Draw calendar header (should be above everything)
    ctx.save();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(CANVAS_CONFIG.leftPanelWidth, 0, rect.width - CANVAS_CONFIG.leftPanelWidth, CANVAS_CONFIG.headerHeight);
    
    // Calendar header border
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CANVAS_CONFIG.leftPanelWidth, CANVAS_CONFIG.headerHeight);
    ctx.lineTo(rect.width, CANVAS_CONFIG.headerHeight);
    ctx.stroke();
    
    // Draw days in header
    ctx.fillStyle = '#475569';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    
    for (let day = visibleStartDay; day <= visibleEndDay; day++) {
      const x = CANVAS_CONFIG.leftPanelWidth + viewState.offsetX + day * scaledDayWidth;
      if (x + scaledDayWidth >= CANVAS_CONFIG.leftPanelWidth && x <= rect.width) {
        const date = dayToDate(day);
        const formatted = formatDate(date);
        
        // Day number
        ctx.fillStyle = formatted.isWeekend ? '#ef4444' : '#475569';
        ctx.fillText(formatted.day.toString(), x + scaledDayWidth / 2, 35);
        
        // Month
        if (date.getDate() === 1 || day === visibleStartDay) {
          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 12px Inter, sans-serif';
          ctx.fillText(formatted.month, x + scaledDayWidth * 2, 15);
          ctx.font = '11px Inter, sans-serif';
        }
      }
    }
    ctx.restore();

    // Draw left panel
    if (!sidebarCollapsed) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_CONFIG.leftPanelWidth, rect.height);
      
      // Left panel border
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CANVAS_CONFIG.leftPanelWidth, 0);
      ctx.lineTo(CANVAS_CONFIG.leftPanelWidth, rect.height);
      ctx.stroke();
      ctx.restore();

      // Draw left panel contents
      flattened.forEach((node, index) => {
        if (!node.yPosition || !node.height) return;
        
        const nodeY = node.yPosition;
        const nodeHeight = node.height;
        
        if (nodeY + nodeHeight > CANVAS_CONFIG.headerHeight && nodeY < rect.height) {
          // Node background by type
          ctx.save();
          if (node.type === 'project') {
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, Math.max(nodeY, CANVAS_CONFIG.headerHeight), CANVAS_CONFIG.leftPanelWidth, 
                        Math.min(nodeHeight, rect.height - Math.max(nodeY, CANVAS_CONFIG.headerHeight)));
          } else if (node.type === 'section') {
            ctx.fillStyle = '#fafbfc';
            ctx.fillRect(0, Math.max(nodeY, CANVAS_CONFIG.headerHeight), CANVAS_CONFIG.leftPanelWidth,
                        Math.min(nodeHeight, rect.height - Math.max(nodeY, CANVAS_CONFIG.headerHeight)));
          }
          
          // Separator line below node
          ctx.strokeStyle = '#f1f5f9';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, nodeY + nodeHeight);
          ctx.lineTo(CANVAS_CONFIG.leftPanelWidth, nodeY + nodeHeight);
          ctx.stroke();
          ctx.restore();
          
          // Draw tree structure
          const indent = 15 + node.level * 20;
          const centerY = Math.max(nodeY + Math.min(nodeHeight, scaledRowHeight) / 2, CANVAS_CONFIG.headerHeight + 15);
          
          // Enhanced expand/collapse icon
          if (node.children.length > 0) {
            ctx.save();
            
            // Click area
            ctx.fillStyle = node.isExpanded ? '#f1f5f9' : '#f8fafc';
            ctx.beginPath();
            ctx.roundRect(indent - 18, centerY - 8, 16, 16, 3);
            ctx.fill();
            
            // Expand button border
            ctx.strokeStyle = '#d1d5db';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Expand symbol
            ctx.fillStyle = '#6b7280';
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#6b7280';
            
            if (node.isExpanded) {
              // Minus sign
              ctx.beginPath();
              ctx.moveTo(indent - 14, centerY);
              ctx.lineTo(indent - 6, centerY);
              ctx.stroke();
            } else {
              // Plus sign
              ctx.beginPath();
              ctx.moveTo(indent - 14, centerY);
              ctx.lineTo(indent - 6, centerY);
              ctx.moveTo(indent - 10, centerY - 4);
              ctx.lineTo(indent - 10, centerY + 4);
              ctx.stroke();
            }
            ctx.restore();
          }
          
          // Enhanced type icon
          ctx.save();
          if (node.type === 'project') {
            // Project icon
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(indent + 2, centerY - 5, 10, 10);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('P', indent + 7, centerY + 2);
          } else if (node.type === 'section') {
            // Section icon
            ctx.fillStyle = '#8b5cf6';
            ctx.beginPath();
            ctx.roundRect(indent + 2, centerY - 5, 10, 10, 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 8px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('S', indent + 7, centerY + 2);
          } else {
            // Task icon
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(indent + 7, centerY, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 7px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('T', indent + 7, centerY + 2);
          }
          ctx.restore();
          
          // Text
          ctx.save();
          ctx.fillStyle = '#1f2937';
          ctx.font = node.type === 'project' ? 'bold 13px Inter, sans-serif' : 
                    node.type === 'section' ? '600 12px Inter, sans-serif' : '12px Inter, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(node.content, indent + 18, centerY + 4);
          
          // Task count
          if (node.isLeaf && node.tasks.length > 0) {
            const textWidth = ctx.measureText(node.content).width;
            ctx.fillStyle = '#9ca3af';
            ctx.font = '10px Inter, sans-serif';
            ctx.fillText(`(${node.tasks.length})`, indent + 18 + textWidth + 8, centerY + 4);
          }
          ctx.restore();
          
          // Draw project/section timeline
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
              
              // Start and end points
              if (lineStartX >= CANVAS_CONFIG.leftPanelWidth) {
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.arc(lineStartX, centerY, 3, 0, Math.PI * 2);
                ctx.fill();
              }
              
              if (lineEndX <= rect.width) {
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(lineEndX, centerY, 3, 0, Math.PI * 2);
                ctx.fill();
              }
              ctx.restore();
            }
          }
        }
      });

      // Draw left panel header (above everything)
      ctx.save();
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 0, CANVAS_CONFIG.leftPanelWidth, CANVAS_CONFIG.headerHeight);
      
      // Left panel header border
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_CONFIG.headerHeight);
      ctx.lineTo(CANVAS_CONFIG.leftPanelWidth, CANVAS_CONFIG.headerHeight);
      ctx.stroke();
      
      // Panel title
      ctx.fillStyle = '#374151';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('هيكل المشروع', 20, 30);
      
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText('المراحل والمهام', 20, 50);
      ctx.restore();
    } else {
      // Draw collapsed sidebar
      ctx.save();
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, CANVAS_CONFIG.leftPanelWidth, rect.height);
      
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CANVAS_CONFIG.leftPanelWidth, 0);
      ctx.lineTo(CANVAS_CONFIG.leftPanelWidth, rect.height);
      ctx.stroke();
      ctx.restore();
    }

  }, [hierarchyTree, viewState, taskDragState, linkState, scaledDayWidth, scaledRowHeight, scaledTaskHeight, 
      CANVAS_CONFIG, expandedNodes, flattenTree, calculateNodeHeight, dayToDate, formatDate, 
      getTotalProjectDays, drawLinks, drawConnectionPoints, drawTemporaryLink, showLinks, isLinkMode, sidebarCollapsed]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check for clicks on expand/collapse icons
    if (mouseX < CANVAS_CONFIG.leftPanelWidth && !sidebarCollapsed) {
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
            // Toggle expand/collapse state
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

    // Search for clicked task
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
      // Link creation mode
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
      // Task drag mode
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
      isLinkMode, linkState, flattenTree, getTaskConnectionPoints, createLink, showLinks, sidebarCollapsed]);

  // Mouse move handler
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
      // Update cursor type
      canvas.style.cursor = 'default';
      
      if (mouseX < CANVAS_CONFIG.leftPanelWidth && !sidebarCollapsed) {
        canvas.style.cursor = 'pointer';
      } else if (isLinkMode && showLinks) {
        canvas.style.cursor = 'crosshair';
      } else {
        // Search for task under cursor
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
  }, [taskDragState, viewState, scaledDayWidth, scaledTaskHeight, CANVAS_CONFIG, isLinkMode, linkState, flattenTree, hierarchyTree, showLinks, sidebarCollapsed]);

  // Mouse up handler
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
      
      // Update node height if needed
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
    <div className="flex-1 flex flex-col bg-white">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 h-10">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleShowLinks}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
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
              className={`p-1 rounded transition-colors ${
                isLinkMode && showLinks
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${!showLinks ? 'opacity-50 cursor-not-allowed' : ''}`}
              title="وضع ربط المهام"
              disabled={!showLinks}
            >
              <Link2 size={14} />
            </button>
          </div>

          <div className="text-xs text-gray-500">
            {isLinkMode && showLinks && 'وضع ربط المهام نشط - انقر على نقاط الاتصال لربط المهام'}
          </div>
        </div>
      </div>

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
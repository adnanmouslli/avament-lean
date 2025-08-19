"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Plus,
  Target,
  Building2,
  Layers3,
  PanelLeftOpen,
  PanelLeftClose,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move3D
} from 'lucide-react';
import { CanvasWorkspace } from './ProjectManagerGroub/CanvasWorkspace';
import { ProjectSidebar } from './ProjectManagerGroub/ProjectSidebar';
import { ProjectHeader } from './ProjectManagerGroub/ProjectHeader';

const COLORS = {
  hierarchyColors: [
    '#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'
  ]
};

interface Task { // اضافة المهمة السابق واللاحقة للربط بين المهام 
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

// Main Component
export const ProjectManagerGroub = () => {
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);
  const [hierarchyTree, setHierarchyTree] = useState<HierarchyNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const [viewState, setViewState] = useState<ViewState>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    lastDragPos: { x: 0, y: 0 }
  });

  const [taskDragState, setTaskDragState] = useState<TaskDragState>({
    isDragging: false,
    task: null,
    type: 'move',
    startMouseX: 0,
    startMouseY: 0,
    originalTask: null,
    offset: { x: 0, y: 0 },
    originalGroupId: '',
    previewRow: 0
  });

  // إعدادات Canvas
  const CANVAS_CONFIG = {
    dayWidth: 60,
    rowHeight: 70,
    headerHeight: 80,
    minZoom: 0.1,
    maxZoom: 5,
    gridColor: '#e5e7eb',
    weekendColor: '#fef3f2',
    todayColor: '#ef4444',
    taskBorderRadius: 8,
    taskMinWidth: 50,
    groupLabelWidth: 220,
    groupMinHeight: 2,
    groupPadding: 0.5,
    taskPadding: 4,
    infiniteCanvas: true,
    snapToGrid: true
  };

  const scaledDayWidth = CANVAS_CONFIG.dayWidth * viewState.zoom;
  const scaledRowHeight = CANVAS_CONFIG.rowHeight * viewState.zoom;
  
  const getTotalProjectDays = useCallback(() => {
    const PROJECT_START_DATE = new Date('2025-08-14');
    const PROJECT_END_DATE = new Date('2025-09-14');
    const timeDiff = PROJECT_END_DATE.getTime() - PROJECT_START_DATE.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
  }, []);

  // منع zoom المتصفح
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

  const findNodeInTree = useCallback((nodeId: string, tree: HierarchyNode[]): HierarchyNode | null => {
    for (const node of tree) {
      if (node.id === nodeId) return node;
      if (node.children?.length > 0) {
        const found = findNodeInTree(nodeId, node.children);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // دالة حساب المجموعات
  const calculateTaskGroups = useCallback((node: HierarchyNode): TaskGroup[] => {
    if (node.isLeaf) {
      if (node.tasks.length === 0) return [];
      
      const sortedTasks = [...node.tasks].sort((a, b) => (a.row || 0) - (b.row || 0));
      const maxRow = Math.max(...sortedTasks.map(t => t.row || 0));
      
      return [{
        id: node.id,
        name: node.content,
        tasks: sortedTasks.map(task => ({ ...task, groupId: node.id })),
        color: node.color,
        level: node.level,
        startRow: 0,
        endRow: maxRow,
        actualHeight: maxRow + 1
      }];
    }

    const groups: TaskGroup[] = [];
    let currentRowOffset = 0;
    
    const collectGroups = (currentNode: HierarchyNode) => {
      if (currentNode.isLeaf && currentNode.tasks.length > 0) {
        const sortedTasks = [...currentNode.tasks].sort((a, b) => (a.row || 0) - (b.row || 0));
        const maxTaskRow = Math.max(...sortedTasks.map(t => t.row || 0));
        const groupHeight = maxTaskRow + 1;
        
        const adjustedTasks = sortedTasks.map(task => ({
          ...task,
          row: (task.row || 0) + currentRowOffset,
          groupId: currentNode.id
        }));
        
        groups.push({
          id: currentNode.id,
          name: currentNode.content,
          tasks: adjustedTasks,
          color: currentNode.color,
          level: currentNode.level,
          startRow: currentRowOffset,
          endRow: currentRowOffset + maxTaskRow,
          actualHeight: groupHeight
        });
        
        currentRowOffset += groupHeight + CANVAS_CONFIG.groupPadding;
      }
      
      currentNode.children.forEach(child => {
        collectGroups(child);
      });
    };
    
    collectGroups(node);
    return groups;
  }, []);

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

  // دالة العثور على المجموعة والصف المناسب أثناء السحب
  const findTargetGroupAndRow = useCallback((mouseY: number, groups: TaskGroup[]) => {
    const adjustedMouseY = mouseY - viewState.offsetY - CANVAS_CONFIG.headerHeight;
    const targetRow = Math.round(adjustedMouseY / scaledRowHeight);
    
    for (const group of groups) {
      if (targetRow >= group.startRow && targetRow <= group.endRow) {
        const relativeRow = targetRow - group.startRow;
        return {
          groupId: group.id,
          row: targetRow,
          relativeRow: relativeRow
        };
      }
    }
    
    let closestGroup = groups[0];
    let minDistance = Math.abs(targetRow - groups[0].startRow);
    
    for (const group of groups) {
      const distanceToStart = Math.abs(targetRow - group.startRow);
      const distanceToEnd = Math.abs(targetRow - group.endRow);
      const minGroupDistance = Math.min(distanceToStart, distanceToEnd);
      
      if (minGroupDistance < minDistance) {
        minDistance = minGroupDistance;
        closestGroup = group;
      }
    }
    
    const clampedRow = Math.max(closestGroup.startRow, Math.min(closestGroup.endRow, targetRow));
    return {
      groupId: closestGroup.id,
      row: clampedRow,
      relativeRow: clampedRow - closestGroup.startRow
    };
  }, [viewState, scaledRowHeight]);

  // التعامل مع ضغط الماوس
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedNode) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const leftMargin = selectedNode.isLeaf ? 0 : CANVAS_CONFIG.groupLabelWidth;
    
    if (mouseX < leftMargin) return;

    const taskGroups = calculateTaskGroups(selectedNode);
    
    let clickedTask: Task | null = null;
    
    for (const group of taskGroups) {
      for (const task of group.tasks) {
        const snappedStartDay = snapToGrid(task.startDay, 'day');
        const snappedDuration = Math.max(1, task.duration);
        const taskRow = task.row || 0;
        
        const taskX = snappedStartDay * scaledDayWidth + viewState.offsetX + leftMargin + CANVAS_CONFIG.taskPadding;
        const taskY = taskRow * scaledRowHeight + viewState.offsetY + CANVAS_CONFIG.headerHeight + CANVAS_CONFIG.taskPadding;
        const taskWidth = snappedDuration * scaledDayWidth - (CANVAS_CONFIG.taskPadding * 2);
        const taskHeight = scaledRowHeight - (CANVAS_CONFIG.taskPadding * 2);

        if (mouseX >= taskX && mouseX <= taskX + taskWidth && 
            mouseY >= taskY && mouseY <= taskY + taskHeight) {
          clickedTask = task;
          break;
        }
      }
      if (clickedTask) break;
    }

    if (clickedTask) {
      const snappedStartDay = snapToGrid(clickedTask.startDay, 'day');
      const snappedDuration = Math.max(1, clickedTask.duration);
      
      const taskX = snappedStartDay * scaledDayWidth + viewState.offsetX + leftMargin + CANVAS_CONFIG.taskPadding;
      const taskWidth = snappedDuration * scaledDayWidth - (CANVAS_CONFIG.taskPadding * 2);
      
      let dragType: 'move' | 'resize-left' | 'resize-right' = 'move';
      const resizeZone = Math.min(20, taskWidth * 0.2);

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
        offset: { x: 0, y: 0 },
        originalGroupId: clickedTask.groupId || '',
        previewRow: clickedTask.row || 0
      });
    } else {
      setViewState(prev => ({
        ...prev,
        isDragging: true,
        dragStart: { x: mouseX, y: mouseY },
        lastDragPos: { x: mouseX, y: mouseY }
      }));
    }
  }, [selectedNode, viewState, scaledDayWidth, scaledRowHeight, calculateTaskGroups, snapToGrid]);

  // التعامل مع حركة الماوس
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!selectedNode) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (taskDragState.isDragging && taskDragState.task && taskDragState.originalTask) {
      e.preventDefault();
      
      const deltaX = mouseX - taskDragState.startMouseX;
      const deltaY = mouseY - taskDragState.startMouseY;
      
      const daysDelta = deltaX / scaledDayWidth;
      const rowsDelta = deltaY / scaledRowHeight;

      let newTask = { ...taskDragState.originalTask };
      const taskGroups = calculateTaskGroups(selectedNode);

      if (taskDragState.type === 'move') {
        const newStartDay = snapToGrid(taskDragState.originalTask.startDay + daysDelta, 'day');
        const targetInfo = findTargetGroupAndRow(mouseY, taskGroups);
        
        const totalDays = getTotalProjectDays();
        if (newStartDay + taskDragState.originalTask.duration <= totalDays) {
          newTask.startDay = newStartDay;
          newTask.row = targetInfo.row;
          newTask.groupId = targetInfo.groupId;
        } else {
          newTask.startDay = Math.max(0, totalDays - taskDragState.originalTask.duration);
          newTask.row = targetInfo.row;
          newTask.groupId = targetInfo.groupId;
        }
        
        setTaskDragState(prev => ({ 
          ...prev, 
          task: newTask,
          previewRow: targetInfo.row
        }));
        
      } else if (taskDragState.type === 'resize-left') {
        const newStartDay = snapToGrid(taskDragState.originalTask.startDay + daysDelta, 'day');
        const maxStartDay = taskDragState.originalTask.startDay + taskDragState.originalTask.duration - 1;
        newTask.startDay = Math.min(newStartDay, maxStartDay);
        newTask.duration = Math.max(1, taskDragState.originalTask.duration - (newTask.startDay - taskDragState.originalTask.startDay));
        
        setTaskDragState(prev => ({ ...prev, task: newTask }));
        
      } else if (taskDragState.type === 'resize-right') {
        const totalDays = getTotalProjectDays();
        const maxDuration = totalDays - taskDragState.originalTask.startDay;
        const newDuration = Math.max(1, snapToGrid(taskDragState.originalTask.duration + daysDelta, 'day'));
        newTask.duration = Math.min(newDuration, maxDuration);
        
        setTaskDragState(prev => ({ ...prev, task: newTask }));
      }

    } else if (viewState.isDragging) {
      const deltaX = mouseX - viewState.lastDragPos.x;
      const deltaY = mouseY - viewState.lastDragPos.y;

      setViewState(prev => ({
        ...prev,
        offsetX: prev.offsetX + deltaX,
        offsetY: prev.offsetY + deltaY,
        lastDragPos: { x: mouseX, y: mouseY }
      }));
    }
  }, [taskDragState, viewState, scaledDayWidth, scaledRowHeight, selectedNode, snapToGrid, calculateTaskGroups, getTotalProjectDays, findTargetGroupAndRow]);

  // التعامل مع رفع الماوس
  const handleCanvasMouseUp = useCallback(() => {
    if (taskDragState.isDragging && taskDragState.task) {
      const finalTask = { ...taskDragState.task };
      
      finalTask.startDay = snapToGrid(finalTask.startDay, 'day');
      finalTask.duration = Math.max(1, finalTask.duration);
      finalTask.row = snapToGrid(finalTask.row || 0, 'row');
      
      const totalDays = getTotalProjectDays();
      if (finalTask.startDay + finalTask.duration > totalDays) {
        finalTask.duration = totalDays - finalTask.startDay;
      }
      
      setHierarchyTree(prev => {
        const updateTaskInTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
          return nodes.map(node => ({
            ...node,
            tasks: node.tasks?.map(t => 
              t.id === finalTask.id ? finalTask : t
            ) || [],
            children: updateTaskInTree(node.children)
          }));
        };
        return updateTaskInTree(prev);
      });

      if (selectedNode && selectedNode.tasks) {
        const hasTask = selectedNode.tasks.some(t => t.id === finalTask.id);
        if (hasTask) {
          setSelectedNode(prev => ({
            ...prev!,
            tasks: prev!.tasks.map(t => 
              t.id === finalTask.id ? finalTask : t
            )
          }));
        }
      }
    }

    setTaskDragState({
      isDragging: false,
      task: null,
      type: 'move',
      startMouseX: 0,
      startMouseY: 0,
      originalTask: null,
      offset: { x: 0, y: 0 },
      originalGroupId: '',
      previewRow: 0
    });

    setViewState(prev => ({
      ...prev,
      isDragging: false,
      dragStart: { x: 0, y: 0 },
      lastDragPos: { x: 0, y: 0 }
    }));
  }, [taskDragState, selectedNode, snapToGrid, getTotalProjectDays]);

  // التعامل مع العجلة
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
  }, [viewState]);

  // أزرار التحكم
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
    isDragging: false, 
    dragStart: { x: 0, y: 0 },
    lastDragPos: { x: 0, y: 0 }
  });

  // توليد البيانات التجريبية
  const generateSampleData = useCallback((): HierarchyNode[] => {
    const totalDays = getTotalProjectDays();
    
    const generateRandomTasks = (parentId: string, count: number): Task[] => {
      const tasks: Task[] = [];
      const authors = ['م. أحمد', 'م. سارة', 'م. محمد', 'م. خالد', 'م. ريم'];
      const taskNames = [
        'صب الخرسانة', 'تركيب البلاط', 'تمديد الكهرباء', 'تمديد السباكة', 
        'طلاء الجدران', 'تركيب الأبواب', 'عزل الأسطح', 'اختبار التسربات'
      ];
      
      for (let i = 0; i < count; i++) {
        const maxStartDay = Math.max(0, totalDays - 7);
        const startDay = Math.floor(Math.random() * maxStartDay);
        const maxDuration = Math.min(14, totalDays - startDay);
        const duration = Math.floor(Math.random() * maxDuration) + 1;
        
        tasks.push({
          id: `${parentId}-task-${i}`,
          content: `${taskNames[i % taskNames.length]} - ${i + 1}`,
          startDay,
          duration,
          color: COLORS.hierarchyColors[i % COLORS.hierarchyColors.length],
          progress: Math.floor(Math.random() * 100),
          row: i,
          author: authors[i % authors.length]
        });
      }
      
      return tasks;
    };

    const projects: HierarchyNode[] = [];
    
    const project: HierarchyNode = {
      id: 'project-1',
      type: 'project',
      content: 'نظام إدارة المشاريع AVAMENT',
      level: 0,
      isLeaf: false,
      color: COLORS.hierarchyColors[0],
      parent: null,
      tasks: [],
      children: [],
      startDate: new Date('2025-08-14'),
      endDate: new Date('2025-09-14')
    };
    
    for (let s = 1; s <= 3; s++) {
      const section: HierarchyNode = {
        id: `project-1-section-${s}`,
        type: 'section',
        content: `مرحلة ${s === 1 ? 'التحليل والتخطيط' : s === 2 ? 'التطوير والبرمجة' : 'الاختبار والنشر'}`,
        level: 1,
        isLeaf: false,
        color: COLORS.hierarchyColors[s],
        parent: 'project-1',
        tasks: [],
        children: []
      };
      
      const taskGroup: HierarchyNode = {
        id: `project-1-section-${s}-taskgroup-1`,
        type: 'task',
        content: `المهام الأساسية - القسم ${s}`,
        level: 2,
        isLeaf: true,
        color: COLORS.hierarchyColors[s + 1],
        parent: `project-1-section-${s}`,
        tasks: generateRandomTasks(`project-1-section-${s}-taskgroup-1`, 4),
        children: []
      };
      
      section.children.push(taskGroup);
            section.children.push(taskGroup);

      project.children.push(section);
      
    }
    
    projects.push(project);
    return projects;
  }, [getTotalProjectDays]);

  useEffect(() => {
    const tree = generateSampleData();
    setHierarchyTree(tree);
    setExpandedNodes(new Set(['project-1', 'project-1-section-1']));
    if (tree[0]?.children[0]?.children[0]) {
      setSelectedNode(tree[0].children[0].children[0]);
    }
  }, [generateSampleData]);

  // تحديث selectedNode عند تغيير hierarchyTree
  useEffect(() => {
    if (selectedNode && hierarchyTree.length > 0 && !taskDragState.isDragging) {
      const updatedNode = findNodeInTree(selectedNode.id, hierarchyTree);
      if (updatedNode) {
        setSelectedNode(updatedNode);
      }
    }
  }, [hierarchyTree, selectedNode?.id, taskDragState.isDragging, findNodeInTree]);

  // الحصول على اسم المشروع الحالي
  const getCurrentProjectName = () => {
    if (hierarchyTree.length > 0) {
      return hierarchyTree[0].content;
    }
    return 'مشروع جديد';
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      {/* Header مبسط ومحسن */}
      <ProjectHeader 
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        viewState={viewState}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        resetView={resetView}
        projectName={getCurrentProjectName()}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <ProjectSidebar 
          hierarchyTree={hierarchyTree}
          selectedNode={selectedNode}
          setSelectedNode={setSelectedNode}
          expandedNodes={expandedNodes}
          setExpandedNodes={setExpandedNodes}
          sidebarCollapsed={sidebarCollapsed}
          sidebarWidth={sidebarWidth}
          setSidebarWidth={setSidebarWidth}
        />

        {/* Canvas Workspace */}
        <CanvasWorkspace 
          selectedNode={selectedNode}
          calculateTaskGroups={calculateTaskGroups}
          viewState={viewState}
          setViewState={setViewState}
          taskDragState={taskDragState}
          setTaskDragState={setTaskDragState}
          handleCanvasMouseDown={handleCanvasMouseDown}
          handleCanvasMouseMove={handleCanvasMouseMove}
          handleCanvasMouseUp={handleCanvasMouseUp}
          handleWheel={handleWheel}
        />
      </div>
    </div>
  );
};
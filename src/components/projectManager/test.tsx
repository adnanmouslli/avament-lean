"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ViewSettings } from './ViewSettingsModal';

import { Slider } from '../ui/slider';
import { TasksSummaryModal } from './TasksSummaryModal';


const COLORS = {
  hierarchyColors: [
    '#2563eb', '#0ea5e9', '#16a34a', '#ca8a04', '#e11d48', '#7c3aed'
  ]
};


export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: Date;
}

export interface TaskHistoryEvent {
  id: string;
  eventType: 'created' | 'updated' | 'progress_changed' | 'moved' | 'assigned' | 'completed' | 'deleted';
  description: string;
  oldValue?: any;
  newValue?: any;
  userId: string;
  userName: string;
  timestamp: Date;
}

export interface Task {
  id: string;
  content: string;
  startDay: number;
  duration: number;
  color: string;
  progress?: number;
  author?: string;
  managerId?: string; 
  priority?: number;
  row?: number;
  type?: 'task' | 'milestone';

  comments?: TaskComment[];
  history?: TaskHistoryEvent[];

}

export interface TaskLink {
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
  icon?: string;

  imageUrl?: string;
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
  onGroupAdded?: (group: HierarchyNode) => void;
  showTreeEditor?: boolean;
  setShowTreeEditor?: (show: boolean) => void;
  hierarchyTree?: HierarchyNode[];
  setHierarchyTree?: React.Dispatch<React.SetStateAction<HierarchyNode[]>>;
  viewSettings?: ViewSettings; 
  
  onTaskSelected?: (task: Task | null, nodeId?: string) => void;
  onSelectedTasksChange?: (tasks: Map<string, { task: Task; nodeId: string }>) => void;

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
  viewSettings,
  onTaskSelected,
  onSelectedTasksChange
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
  const showTodayLine = viewSettings?.showTodayLine ?? false;
  const showHoverTask = viewSettings?.showHoverTask ?? false;

  
  
  const [isDraggingView, setIsDraggingView] = useState(false);
  const [initialMousePosition, setInitialMousePosition] = useState<{x: number, y: number} | null>(null);



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


  const [inlineEditingTask, setInlineEditingTask] = useState<{
    taskId: string;
    nodeId: string;
    field: 'content' | 'progress';
  } | null>(null);

  const [hoverTooltip, setHoverTooltip] = useState<{
    taskId: string;
    nodeId: string;
    x: number;
    y: number;
    visible: boolean;
  } | null>(null);

  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);


  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const imageLoadingRef = useRef<Set<string>>(new Set());
  const imageHitRectsRef = useRef<Array<{ nodeId: string; x: number; y: number; w: number; h: number; url: string | undefined }>>([]);

  const [imageTick, setImageTick] = useState(0);      // لعمل re-draw بعد ما تتحمل الصور
  const [popupImage, setPopupImage] = useState<{ nodeId: string; url?: string } | null>(null); // تعديل الـ state ليشمل nodeId

  
  const getCachedImage = useCallback((url?: string | null) => {
    if (!url) return null;
    const cache = imageCacheRef.current;
    const loading = imageLoadingRef.current;

    const cached = cache.get(url);
    if (cached) return cached;

    if (!loading.has(url)) {
      loading.add(url);
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        cache.set(url, img);
        loading.delete(url);
        setImageTick(t => t + 1); // أعد الرسم مرة وحدة لما تجهز
      };
      img.onerror = () => {
        loading.delete(url);
      };
      img.src = url; // مثال: "/AVAMENT_big.png"
    }
    return null;
  }, []);




  const CANVAS_CONFIG = useMemo(() => ({
    leftPanelWidth: sidebarCollapsed ? 120 : 320,
    dayWidth: 80,
    rowHeight: 40, // Increased for better touch targets
    taskHeight: 24,
    headerHeight: 80,
    minZoom: 0.1,
    maxZoom: 1.5,
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
    milestoneSize: 18, // Smaller milestone
    milestoneColor: '#6b7280',
    
  }), [sidebarCollapsed]);

  const PROJECT_START_DATE = useMemo(() => new Date('2025-08-14'), []);
  const PROJECT_END_DATE = useMemo(() => new Date('2025-09-14'), []);

  const scaledDayWidth = useMemo(() => CANVAS_CONFIG.dayWidth * viewState.zoom, [CANVAS_CONFIG.dayWidth, viewState.zoom]);
  const scaledRowHeight = useMemo(() => CANVAS_CONFIG.rowHeight * viewState.zoom, [CANVAS_CONFIG.rowHeight, viewState.zoom]);

  const scaledTaskHeight = useMemo(() => {
  const baseHeight = CANVAS_CONFIG.taskHeight;
  return Math.min(baseHeight * viewState.zoom, scaledRowHeight * 0.8);
}, [CANVAS_CONFIG.taskHeight, viewState.zoom, scaledRowHeight]);



  const [selectedTasks, setSelectedTasks] = useState<Map<string, { task: Task; nodeId: string }>>(new Map());
  const [contextMenu, setContextMenu] = useState<{ 
    x: number; 
    y: number; 
    task: Task; 
    nodeId: string;
    visible: boolean;
  } | null>(null);



  // حالة وضع التحرير للشجرة
  const [treeEditMode, setTreeEditMode] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeContent, setEditingNodeContent] = useState('');
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);
  

  const [tasksSummaryModal, setTasksSummaryModal] = useState<{
  isOpen: boolean;
  node: HierarchyNode | null;
  allTasks: Array<{ task: Task; nodePath: string; nodeId: string }>;
}>({
  isOpen: false,
  node: null,
  allTasks: []
});

// دالة لجمع جميع المهام من العقدة وأطفالها
const collectAllTasks = useCallback((node: HierarchyNode, basePath: string = ''): Array<{ task: Task; nodePath: string; nodeId: string }> => {
  const result: Array<{ task: Task; nodePath: string; nodeId: string }> = [];
  const currentPath = basePath ? `${basePath} > ${node.content}` : node.content;
  
  // إضافة مهام العقدة الحالية
  node.tasks.forEach(task => {
    result.push({
      task,
      nodePath: currentPath,
      nodeId: node.id
    });
  });
  
  // إضافة مهام الأطفال
  node.children.forEach(child => {
    result.push(...collectAllTasks(child, currentPath));
  });
  
  return result;
}, []);


// إضافة معالج تحديث التقدم
const handleUpdateTaskProgress = useCallback((taskId: string, nodeId: string, progress: number) => {
  setHierarchyTree(prev => {
    const updateInTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
      return nodes.map(node => ({
        ...node,
        tasks: node.id === nodeId 
          ? node.tasks.map(t => t.id === taskId ? { ...t, progress } : t)
          : node.tasks,
        children: updateInTree(node.children)
      }));
    };
    const updatedTree = updateInTree(prev);
    
    // أعد حساب المهام للـ modal
    if (tasksSummaryModal.isOpen && tasksSummaryModal.node) {
      const updatedNode = findNodeInTree(updatedTree, tasksSummaryModal.node.id);
      if (updatedNode) {
        const refreshedTasks = collectAllTasks(updatedNode);
        setTasksSummaryModal(prevModal => ({
          ...prevModal,
          allTasks: refreshedTasks
        }));
      }
    }
    
    return updatedTree;
  });
}, [tasksSummaryModal, collectAllTasks]);

// أضف دالة مساعدة للعثور على العقدة
const findNodeInTree = useCallback((nodes: HierarchyNode[], nodeId: string): HierarchyNode | null => {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    const found = findNodeInTree(node.children, nodeId);
    if (found) return found;
  }
  return null;
}, []);

  // دوال التحكم بالشجرة في وضع التحرير
  const addNodeToTree = useCallback((parentId: string | null, position: 'before' | 'after' | 'inside') => {
    const newNode: HierarchyNode = {
      id: `node-${Date.now()}`,
      type: parentId ? 'section' : 'project',
      content: 'New Section',
      level: 0,
      children: [],
      tasks: [],
      links: [],
      parent: parentId,
      color: COLORS.hierarchyColors[Math.floor(Math.random() * COLORS.hierarchyColors.length)],
      isLeaf: true,
      isExpanded: true
    };

    setHierarchyTree(prev => {
      if (!parentId && position === 'inside') {
        return [...prev, newNode];
      }

      const addNode = (nodes: HierarchyNode[]): HierarchyNode[] => {
        return nodes.map(node => {
          if (node.id === parentId) {
            if (position === 'inside') {
              return { ...node, children: [...node.children, { ...newNode, parent: node.id, level: node.level + 1 }] };
            }
          }
          return { ...node, children: addNode(node.children) };
        });
      };

      if (parentId && position === 'before') {
        const insertBefore = (nodes: HierarchyNode[], parent: HierarchyNode | null = null): HierarchyNode[] => {
          const result: HierarchyNode[] = [];
          for (const node of nodes) {
            if (node.id === parentId) {
              result.push({ ...newNode, parent: parent?.id || null, level: node.level });
              result.push(node);
            } else {
              result.push({ ...node, children: insertBefore(node.children, node) });
            }
          }
          return result;
        };
        return insertBefore(prev);
      }

      if (parentId && position === 'after') {
        const insertAfter = (nodes: HierarchyNode[], parent: HierarchyNode | null = null): HierarchyNode[] => {
          const result: HierarchyNode[] = [];
          for (const node of nodes) {
            if (node.id === parentId) {
              result.push(node);
              result.push({ ...newNode, parent: parent?.id || null, level: node.level });
            } else {
              result.push({ ...node, children: insertAfter(node.children, node) });
            }
          }
          return result;
        };
        return insertAfter(prev);
      }

      return addNode(prev);
    });
  }, []);

  const deleteNodeFromTree = useCallback((nodeId: string) => {
    setHierarchyTree(prev => {
      const deleteNode = (nodes: HierarchyNode[]): HierarchyNode[] => {
        return nodes.filter(node => node.id !== nodeId).map(node => ({
          ...node,
          children: deleteNode(node.children)
        }));
      };
      return deleteNode(prev);
    });
  }, []);


  const moveNodeInTree = useCallback((nodeId: string, targetId: string, position: 'before' | 'after' | 'inside') => {
  setHierarchyTree(prev => {
    let movedNode: HierarchyNode | null = null;
    
    // استخراج العقدة مع إنشاء نسخ جديدة لتجنب التعديل المباشر
    const extractNode = (nodes: HierarchyNode[]): HierarchyNode[] => {
      const result: HierarchyNode[] = [];
      for (const node of nodes) {
        if (node.id === nodeId) {
          movedNode = { 
            ...node, 
            children: [...node.children] // نسخ مصفوفة الأطفال للأمان
          };
          continue; // عدم إضافة العقدة المستخرجة
        }
        const newChildren = extractNode(node.children);
        result.push({ ...node, children: newChildren });
      }
      return result;
    };

    const treeWithoutNode = extractNode([...prev]);

    if (!movedNode) return prev;

    // إدراج العقدة في الموقع الجديد مع إنشاء نسخ جديدة
    const insertNode = (nodes: HierarchyNode[], parent: HierarchyNode | null = null): HierarchyNode[] => {
      const result: HierarchyNode[] = [];
      
      for (const node of nodes) {
        if (node.id === targetId) {
          if (position === 'before') {
            movedNode!.parent = parent?.id || null;
            movedNode!.level = node.level;
            result.push({ ...movedNode! });
            result.push({ ...node, children: insertNode(node.children, node) });
          } else if (position === 'after') {
            result.push({ ...node, children: insertNode(node.children, node) });
            movedNode!.parent = parent?.id || null;
            movedNode!.level = node.level;
            result.push({ ...movedNode! });
          } else if (position === 'inside') {
            movedNode!.parent = node.id;
            movedNode!.level = node.level + 1;
            result.push({
              ...node,
              children: [...insertNode(node.children, node), { ...movedNode! }]
            });
          }
        } else {
          result.push({
            ...node,
            children: insertNode(node.children, node)
          });
        }
      }
      
      return result;
    };

    return insertNode(treeWithoutNode);
  });
}, []);


  const updateNodeContent = useCallback((nodeId: string, newContent: string) => {
    setHierarchyTree(prev => {
      const updateNode = (nodes: HierarchyNode[]): HierarchyNode[] => {
        return nodes.map(node => {
          if (node.id === nodeId) {
            return { ...node, content: newContent };
          }
          return { ...node, children: updateNode(node.children) };
        });
      };
      return updateNode(prev);
    });
  }, []);


    const getTotalProjectDays = useCallback(() => {
      const timeDiff = PROJECT_END_DATE.getTime() - PROJECT_START_DATE.getTime();
      return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    }, [PROJECT_END_DATE, PROJECT_START_DATE]);

    const generateData = useCallback((): HierarchyNode[] => {
      const totalDays = 30; // مدة المشروع شهر كامل
      const totalTasks = 20; // عدد المهام المطلوب
      const authors = ['Engineer A', 'Engineer B', 'Contractor C'];

      const generateRandomTasks = (parentId: string, taskCount: number): Task[] => {
        const tasks: Task[] = [];

        for (let i = 0; i < taskCount; i++) {
          const isMilestone = Math.random() < 0.05; // 5% Milestones فقط
          const startDay = Math.floor(Math.random() * (totalDays - 5)) + 1;
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
            const duration = Math.floor(Math.random() * 5) + 1; // مدة قصيرة (1-5 أيام)
            tasks.push({
              id: `${parentId}-task-${i}`,
              content: `Task ${i + 1}`,
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
        for (let i = 0; i < tasks.length - 1; i++) {
          // ربط المهمة التالية بالتي قبلها
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
        id: 'project-tower-1',
        type: 'project',
        content: 'Civil Tower Construction',
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

      // نقسم المهام على 4 أقسام × 250 مهمة تقريباً
      const sections = ['Foundation', 'Structural Work', 'Electrical & Plumbing', 'Finishing'];
      const tasksPerSection = Math.floor(totalTasks / sections.length);

      sections.forEach((sec, sIndex) => {
        const section: HierarchyNode = {
          id: `section-${sIndex + 1}`,
          type: 'section',
          content: sec,
          level: 1,
          isLeaf: false,
          color: COLORS.hierarchyColors[(sIndex + 1) % COLORS.hierarchyColors.length],
          parent: 'project-tower-1',
          tasks: [],
          links: [],
          children: []
        };

        // توليد مجموعة واحدة كبيرة داخل كل قسم
        const tasks = generateRandomTasks(`section-${sIndex + 1}-taskgroup-1`, tasksPerSection);
        const links = generateSampleLinks(tasks);

        const taskGroup: HierarchyNode = {
          id: `section-${sIndex + 1}-taskgroup-1`,
          type: 'task',
          content: `Task Group`,
          level: 2,
          isLeaf: true,
          color: COLORS.hierarchyColors[(sIndex + 10) % COLORS.hierarchyColors.length],
          parent: `section-${sIndex + 1}`,
          tasks,
          links,
          children: [],
          imageUrl: "/Photo.png"
        };

        section.children.push(taskGroup);
        project.children.push(section);
      });

      return [project];
    }, [PROJECT_START_DATE, PROJECT_END_DATE, CANVAS_CONFIG.linkColor]);



  // أضف هذه الدالة لحذف مهمة واحدة:
  const deleteTask = useCallback((taskId: string, nodeId: string) => {
    setHierarchyTree(prev => {
      const removeTaskFromTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
        return nodes.map(node => {
          if (node.id === nodeId) {
            return {
              ...node,
              tasks: node.tasks.filter(task => task.id !== taskId)
            };
          }
          return {
            ...node,
            children: removeTaskFromTree(node.children)
          };
        });
      };
      return removeTaskFromTree(prev);
    });
    
    // إزالة من التحديد المتعدد
    setSelectedTasks(prev => {
      const newMap = new Map(prev);
      newMap.delete(taskId);
      return newMap;
    });
    
    console.log('تم حذف المهمة');
  }, []);

  // أضف هذه الدالة لحذف المهام المحددة:
  const deleteSelectedTasksMulti = useCallback(() => {
    if (selectedTasks.size === 0) return;
    
    setHierarchyTree(prev => {
      const removeTasksFromTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
        return nodes.map(node => {
          const tasksToDelete = new Set<string>();
          selectedTasks.forEach(({ task, nodeId }) => {
            if (nodeId === node.id) {
              tasksToDelete.add(task.id);
            }
          });
          
          if (tasksToDelete.size > 0) {
            return {
              ...node,
              tasks: node.tasks.filter(task => !tasksToDelete.has(task.id))
            };
          }
          
          return {
            ...node,
            children: removeTasksFromTree(node.children)
          };
        });
      };
      
      return removeTasksFromTree(prev);
    });
    
    console.log(`تم حذف ${selectedTasks.size} مهمة`);
    setSelectedTasks(new Map());
  }, [selectedTasks]);

  // أضف هذه الدالة لنسخ المهام المحددة:
  const duplicateSelectedTasks = useCallback(() => {
    if (selectedTasks.size === 0) return;
    
    const duplicatedTasks: Array<{ task: Task; nodeId: string }> = [];
    
    selectedTasks.forEach(({ task, nodeId }) => {
      const newTask: Task = {
        ...task,
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: `${task.content} (نسخة)`,
        row: (task.row || 0) + 1
      };
      duplicatedTasks.push({ task: newTask, nodeId });
    });
    
    setHierarchyTree(prev => {
      const addTasksToTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
        return nodes.map(node => {
          const tasksToAdd = duplicatedTasks
            .filter(({ nodeId }) => nodeId === node.id)
            .map(({ task }) => task);
          
          if (tasksToAdd.length > 0) {
            return {
              ...node,
              tasks: [...node.tasks, ...tasksToAdd]
            };
          }
          
          return {
            ...node,
            children: addTasksToTree(node.children)
          };
        });
      };
      
      return addTasksToTree(prev);
    });
    
    console.log(`تم نسخ ${selectedTasks.size} مهمة`);
    setSelectedTasks(new Map());
  }, [selectedTasks]);



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
      isWeekend: date.getDay() === 3 || date.getDay() === 4
    };
  }, []);

  const calculateNodeHeight = useCallback((node: HierarchyNode): number => {
  if (node.isLeaf && node.tasks && node.tasks.length > 0) {
    const maxRow = Math.max(...node.tasks.map(t => t.row || 0));
    // حساب الارتفاع الكلي بناءً على عدد الصفوف
    const rowCount = maxRow + 1;
    const paddingTop = CANVAS_CONFIG.taskPadding * viewState.zoom;
    const paddingBottom = CANVAS_CONFIG.taskPadding * viewState.zoom;
    const rowHeight = CANVAS_CONFIG.rowHeight * viewState.zoom;
    
    return paddingTop + (rowCount * rowHeight) + paddingBottom;
  }
  return CANVAS_CONFIG.rowHeight * viewState.zoom;
}, [CANVAS_CONFIG.rowHeight, CANVAS_CONFIG.taskPadding, viewState.zoom]);


  
  // 1. إنشاء دالة مركزية لحساب العرض الفعلي للشريط الجانبي
  const getEffectiveLeftPanelWidth = useCallback(() => {
    return sidebarCollapsed ? 120 : CANVAS_CONFIG.leftPanelWidth; // 120 هو عرض الشريط المطوي
  }, [sidebarCollapsed, CANVAS_CONFIG.leftPanelWidth]);


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
  const effectiveLeftPanelWidth = getEffectiveLeftPanelWidth();
  
  const scaleFactor = timeAxisMode === 'weeks' ? 0.2 : 1;
  const displayStartDay = task.startDay * scaleFactor;
  const displayDuration = task.duration * scaleFactor;
  
  // استخدام نفس حساب taskY المحدث
  const rowSpacing = CANVAS_CONFIG.rowHeight * viewState.zoom;
  const baseY = (node.yPosition || 0) + (CANVAS_CONFIG.taskPadding * viewState.zoom) + 
                (task.row || 0) * rowSpacing;
  
  if (task.type === 'milestone') {
    const taskX = effectiveLeftPanelWidth + viewState.offsetX + displayStartDay * scaledDayWidth;
    const taskY = baseY + scaledTaskHeight / 2;
    const size = CANVAS_CONFIG.milestoneSize * viewState.zoom;

    return {
      start: { x: taskX - size / 2, y: taskY },
      end: { x: taskX + size / 2, y: taskY }
    };
  } else {
    const taskX = effectiveLeftPanelWidth + viewState.offsetX + displayStartDay * scaledDayWidth;
    const taskWidth = displayDuration * scaledDayWidth;
    const taskY = baseY + scaledTaskHeight / 2;

    return {
      start: { x: taskX, y: taskY },
      end: { x: taskX + taskWidth, y: taskY }
    };
  }
}, [CANVAS_CONFIG, scaledDayWidth, scaledTaskHeight, viewState.offsetX, viewState.zoom, getEffectiveLeftPanelWidth, timeAxisMode]);


  // Add new ref for delete buttons hit areas
  const linkDeleteHitRectsRef = useRef<Array<{ linkId: string; nodeId: string; x: number; y: number; w: number; h: number }>>([]);

  // In drawCanvas, before drawing links, reset the array
  linkDeleteHitRectsRef.current = [];

  
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

    // New: Draw red delete button only in link mode
    if (isLinkMode) {
      // Calculate approximate midpoint
      const midX = (startPoint.x + cp1x + cp2x + endPoint.x) / 4;
      const midY = (startPoint.y + startPoint.y + endPoint.y + endPoint.y) / 4; // Simplified for bezier

      const buttonRadius = 8 * viewState.zoom; // Adjustable size

      ctx.save();
      ctx.fillStyle = '#ef4444'; // Red
      ctx.beginPath();
      ctx.arc(midX, midY, buttonRadius, 0, 2 * Math.PI);
      ctx.fill();

      // Draw white X
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 * viewState.zoom;
      ctx.beginPath();
      ctx.moveTo(midX - buttonRadius / 2, midY - buttonRadius / 2);
      ctx.lineTo(midX + buttonRadius / 2, midY + buttonRadius / 2);
      ctx.moveTo(midX + buttonRadius / 2, midY - buttonRadius / 2);
      ctx.lineTo(midX - buttonRadius / 2, midY + buttonRadius / 2);
      ctx.stroke();

      ctx.restore();

      // Add hit rect (square for easier clicking)
      linkDeleteHitRectsRef.current.push({
        linkId: link.id,
        nodeId: node.id,
        x: midX - buttonRadius,
        y: midY - buttonRadius,
        w: buttonRadius * 2,
        h: buttonRadius * 2
      });
    }
  });

  ctx.restore();
}, [CANVAS_CONFIG, getTaskConnectionPoints, isLinkMode, viewState.zoom]);

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

 
  const isWeekend = (day: number) => {
    const date = dayToDate(day);
    const formatted = formatDate(date);
    return formatted.isWeekend;
  };

const findNextWorkDay = (startDay: number, totalDays: number) => {
  let day = Math.floor(startDay);
  while (day < totalDays && isWeekend(day)) {
    day++;
  }
  return Math.min(day, totalDays - 1);
};

const calculateAdjustedDuration = (startDay: number, originalDuration: number, totalDays: number) => {
  if (originalDuration === 0) return 0;
  
  let workDays = 0;
  let adjustedDuration = 0;
  let currentDay = Math.floor(startDay);
  
  while (workDays < originalDuration && currentDay < totalDays) {
    if (!isWeekend(currentDay)) {
      workDays++;
    }
    adjustedDuration++;
    currentDay++;
  }
  
  return adjustedDuration;
};


  const addNewTaskToTree = useCallback((newTask: any, dropX: number, dropY: number) => {
     const treeToRender = searchQuery ? filteredTree : hierarchyTree;
      const flattened = flattenTree(treeToRender);
      const effectiveLeftPanelWidth = getEffectiveLeftPanelWidth(); // ★ استخدام الدالة المركزية

      let targetNode: HierarchyNode | null = null;
      let targetRow = 0;
      
      // إيجاد العقدة المستهدفة
      for (const node of flattened) {
          if (!node.yPosition || !node.height) continue;
          
          if (dropY >= node.yPosition && dropY < node.yPosition + node.height) {
              if (node.isLeaf) {
                  targetNode = node;
                  const rowSpacing = CANVAS_CONFIG.rowHeight * viewState.zoom;
                  const relativeY = dropY - node.yPosition - (CANVAS_CONFIG.taskPadding * viewState.zoom);
                  targetRow = Math.floor(relativeY / rowSpacing);

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
      
      let day = Math.floor((dropX - effectiveLeftPanelWidth - viewState.offsetX) / scaledDayWidth);
      if (timeAxisMode === 'weeks') {
        day *= 5;
      }
      
      let startDay = findNextWorkDay(day, getTotalProjectDays());

      // تصحيح: استخدام newTask بدلاً من task
      const originalDuration = newTask.type === 'milestone' ? 0 : (newTask.duration || 5);

      let duration = calculateAdjustedDuration(startDay, originalDuration, getTotalProjectDays());

      const finalTask: Task = {
          id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content: newTask.content || 'مهمة جديدة',
          startDay: Math.max(0, Math.min(getTotalProjectDays() - duration, startDay)),
          duration,
          color: newTask.color || '#3b82f6',
          progress: 0,
          author: newTask.name,
          managerId: newTask.managerId,
          row: Math.max(0, targetRow),
          type: duration === 0 ? 'milestone' : 'task'
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
  }, [hierarchyTree, flattenTree, scaledDayWidth, scaledTaskHeight, CANVAS_CONFIG, viewState, getTotalProjectDays,getEffectiveLeftPanelWidth, timeAxisMode]);

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



  const getTaskColor = useCallback((task: Task) => {
    if (!showColors) {
      return task.color; // الألوان الطبيعية إذا كان التلوين معطل
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taskStartDate = dayToDate(task.startDay);
    taskStartDate.setHours(0, 0, 0, 0);

    const taskEndDate = dayToDate(task.startDay + task.duration);
    taskEndDate.setHours(23, 59, 59, 999);

    const progress = task.progress || 0;

    // الأشرطة الخضراء: مهام منتهية بنسبة 100% (ماضي/حاضر/مستقبل)
    if (progress >= 100) {
      return '#10b981'; // أخضر
    }

    // الأشرطة الفضية: مهام مستقبلية لم تبدأ بعد
    if (taskStartDate > today) {
      return '#94a3b8'; // فضي
    }

    // للمهام الجارية: حساب التقدم المتوقع ومقارنته بالتقدم الفعلي
    
    
    if (taskStartDate <= today && taskEndDate >= today) {
      // اخذ عدد الايام الفعلية بدون العطل 
      const totalDays = Math.max(1, Math.ceil((taskEndDate.getTime() - taskStartDate.getTime()) / (1000 * 60 * 60 * 24)));
      const elapsedDays = Math.max(0, Math.ceil((today.getTime() - taskStartDate.getTime()) / (1000 * 60 * 60 * 24))) + 1;
      const expectedProgress = Math.min(100, (elapsedDays / totalDays) * 100);
      
      // الأشرطة الزرقاء: مهام متقدمة على الخطة (التقدم الفعلي > التقدم المتوقع)
      if (progress > expectedProgress) {
        return '#3b82f6'; // أزرق
      }
      
      // الأشرطة الصفراء: مهام متأخرة عن الخطة (التقدم الفعلي < التقدم المتوقع)
      if (progress < expectedProgress) {
        return '#f59e0b'; // اصفر
      }
      
      // مهام في الموعد المحدد
      return '#FF6820'; // برتقالي 
    }

    // الأشرطة الحمراء: مهام لم يبدأ العمل فيها إطلاقاً رغم مرور وقت عليها (نسبة الإنجاز = 0%)
    if (taskEndDate < today && progress === 0) {
      return '#ef4444'; // أحمر
    }

    return '#FF6820'; // برتقالي 
  }, [showColors, dayToDate]);

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




   // رسم الشريط الجانبي المحسن مع وضع التحرير
    const drawSidebar = useCallback((ctx: CanvasRenderingContext2D, rect: DOMRect, flattened: HierarchyNode[]) => {
    ctx.save();
    
    if (sidebarCollapsed) {
    // رسم شريط مصغر يحتوي على الأقسام الورقية التي لها مهام في مواقعها الدقيقة
    
    // خلفية الشريط المصغر
    const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_CONFIG.leftPanelWidth, rect.height);
    
    // حد جانبي
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CANVAS_CONFIG.leftPanelWidth, 0);
    ctx.lineTo(CANVAS_CONFIG.leftPanelWidth, rect.height);
    ctx.stroke();
    
    // جمع الأقسام الورقية التي لها مهام واستخدام yPosition الدقيقة
    const leafNodesWithTasks = flattened.filter(node => node.isLeaf && node.tasks.length > 0);
    
    leafNodesWithTasks.forEach(node => {
      if (!node.yPosition || !node.height) return;
      
      const centerY = node.yPosition + node.height / 2;
      
      if (centerY < CANVAS_CONFIG.headerHeight || centerY > rect.height) return;
      
      // حساب النص المختصر (أول 10 حروف أو حسب العرض المتاح)
      let shortName = node.content;
      ctx.font = 'bold 12px Inter, sans-serif';
      const maxWidth = CANVAS_CONFIG.leftPanelWidth - 20;
      let textWidth = ctx.measureText(shortName).width;
      
      while (textWidth > maxWidth && shortName.length > 3) {
        shortName = shortName.slice(0, -1);
        textWidth = ctx.measureText(shortName + '...').width;
      }
      
      if (textWidth > maxWidth) {
        shortName = shortName.slice(0, 3) + '...';
      } else if (shortName !== node.content) {
        shortName += '...';
      }
      
      // رسم النص بلون القسم
      ctx.fillStyle = node.color || '#2563eb';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(shortName, 10, centerY);
    });
    
  } else {

    // خلفية متدرجة أنيقة
    const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_CONFIG.leftPanelWidth, rect.height);
    
    // حد جانبي أنيق
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CANVAS_CONFIG.leftPanelWidth, 0);
    ctx.lineTo(CANVAS_CONFIG.leftPanelWidth, rect.height);
    ctx.stroke();
    
    // رأس محسّن
    const headerGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_CONFIG.headerHeight);
    headerGradient.addColorStop(0, '#1e293b');
    headerGradient.addColorStop(1, '#334155');
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, CANVAS_CONFIG.leftPanelWidth, CANVAS_CONFIG.headerHeight);
    
    // ظل للرأس
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;
    ctx.fillRect(0, CANVAS_CONFIG.headerHeight - 2, CANVAS_CONFIG.leftPanelWidth, 2);
    ctx.shadowColor = 'transparent';
    
    // محتوى الرأس
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 15px "Inter", "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Project Hierarchy', 15, 25);
    
    ctx.font = '400 11px "Inter", "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('Structure Management', 15, 42);
    
    // زر وضع التحرير
    const editBtnX = CANVAS_CONFIG.leftPanelWidth - 95;
    const editBtnY = 40;
    const editBtnWidth = 85;
    const editBtnHeight = 28;
    
    if (treeEditMode) {
      // زر في حالة نشط
      const activeGradient = ctx.createLinearGradient(editBtnX, editBtnY, editBtnX, editBtnY + editBtnHeight);
      activeGradient.addColorStop(0, '#3b82f6');
      activeGradient.addColorStop(1, '#2563eb');
      ctx.fillStyle = activeGradient;
    } else {
      // زر في حالة غير نشط
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    }
    
    ctx.beginPath();
    ctx.roundRect(editBtnX, editBtnY, editBtnWidth, editBtnHeight, 6);
    ctx.fill();
    
    // حدود الزر
    ctx.strokeStyle = treeEditMode ? '#60a5fa' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // نص الزر
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 11px "Inter", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(treeEditMode ? '✓ Edit Mode' : '✎ Edit Tree', editBtnX + editBtnWidth / 2, editBtnY + editBtnHeight / 2);
    
    // أزرار التحكم بالمحور الزمني
    drawTimeAxisControls(ctx);
    
    // رسم شجرة العقد
    drawTreeNodes(ctx, rect, flattened);
    
    
  }
  ctx.restore();
  
  }, [CANVAS_CONFIG, viewState.zoom, treeEditMode , sidebarCollapsed , viewState.offsetY]);
  
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

  statsClickAreasRef.current = [];


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

  imageHitRectsRef.current = [];

  const flattened = flattenTree(hierarchyTree);
  const totalDays = getTotalProjectDays();

  // ★ استخدام الدالة المركزية هنا
  const effectiveLeftPanelWidth = getEffectiveLeftPanelWidth();

  let startDay = Math.floor(-viewState.offsetX / scaledDayWidth);
  let endDay = Math.ceil((rect.width - effectiveLeftPanelWidth - viewState.offsetX) / scaledDayWidth);
  let visibleStartDay = Math.max(0, startDay);
  let visibleEndDay = Math.min(totalDays, endDay);

  if (timeAxisMode === 'weeks') {
    visibleStartDay = Math.floor(visibleStartDay / 5) * 5;
    visibleEndDay = Math.ceil(visibleEndDay / 5) * 5;
  }

  const projectStartX = effectiveLeftPanelWidth + viewState.offsetX;
  const projectEndX = effectiveLeftPanelWidth + viewState.offsetX + totalDays * scaledDayWidth;
  const workAreaTop = CANVAS_CONFIG.headerHeight;

  // حساب workAreaBottom بناءً على العقد المرئية فقط
  const workAreaBottom = flattened.reduce((maxY, node) => 
    node.yPosition && node.height ? Math.max(maxY, node.yPosition + node.height) : maxY, workAreaTop);

  // تأكد من أن كل قسم له حد أدنى من الارتفاع
  flattened.forEach(node => {
    if (node.isLeaf && node.tasks.length > 0 && node.height) {
      const requiredHeight = calculateNodeHeight(node);
      if (node.height < requiredHeight) {
        node.height = requiredHeight;
      }
    }
  });

  const firstTaskNode = flattened.find(node => node.isLeaf && node.tasks.length > 0);
  const actualWorkAreaTop = firstTaskNode && firstTaskNode.yPosition ? 
    firstTaskNode.yPosition + CANVAS_CONFIG.taskPadding : workAreaTop;

  // إذا لم يكن هناك أي عقد أوراق مع مهام (كل الأقسام مغلقة)، اجعل workAreaBottom = workAreaTop لعدم رسم أي شبكة
  let adjustedWorkAreaBottom = workAreaBottom;
  if (!firstTaskNode) {
    adjustedWorkAreaBottom = workAreaTop;
  }

  // رسم خلفية منطقة العمل
  ctx.save();
  ctx.fillStyle = '#E3F2FB';
  ctx.fillRect(effectiveLeftPanelWidth, CANVAS_CONFIG.headerHeight, 
              rect.width - effectiveLeftPanelWidth, rect.height - CANVAS_CONFIG.headerHeight);
  
  const workAreaStartX = Math.max(effectiveLeftPanelWidth, projectStartX);
  const workAreaEndX = Math.min(rect.width, projectEndX);
  
  if (workAreaEndX > workAreaStartX && adjustedWorkAreaBottom > actualWorkAreaTop) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(workAreaStartX, actualWorkAreaTop, 
                workAreaEndX - workAreaStartX, adjustedWorkAreaBottom - actualWorkAreaTop);
  }
  ctx.restore();


    // رسم خطوط الشبكة (إذا كانت مفعلة وهناك محتوى مرئي)
  if (showGrid && firstTaskNode) {
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
        ctx.lineTo(x, adjustedWorkAreaBottom);
        ctx.stroke();
      }
    }
    
    // خطوط الصفوف الأفقية (فقط الفواصل بين الأقسام مع تغميقها)
    flattened.forEach(node => {
      if (node.yPosition && node.height && node.isLeaf && node.tasks.length > 0) {
        const lineY = node.yPosition + node.height;
        if (lineY >= actualWorkAreaTop && lineY <= adjustedWorkAreaBottom) {
          ctx.strokeStyle = '#94a3b8'; // تغميق اللون
          ctx.lineWidth = 2; // زيادة السماكة قليلاً
          ctx.beginPath();
          ctx.moveTo(Math.max(effectiveLeftPanelWidth, projectStartX), lineY);
          ctx.lineTo(Math.min(rect.width, projectEndX), lineY);
          ctx.stroke();
          ctx.strokeStyle = '#e5e7eb'; // إعادة اللون الأصلي
          ctx.lineWidth = 1.5; // إعادة السماكة
        }
        
      }
    });
    ctx.restore();
  }

    // تمييز عطل الأسبوع (إذا كانت مفعلة)
    if (showWeekends && firstTaskNode && timeAxisMode === 'days') {
    ctx.save();
    for (let day = visibleStartDay; day <= visibleEndDay; day++) {
      const date = dayToDate(day);
      const formatted = formatDate(date);
      
      if (formatted.isWeekend) {
        const x = effectiveLeftPanelWidth + viewState.offsetX + day * scaledDayWidth;
        const startX = Math.max(Math.max(effectiveLeftPanelWidth, projectStartX), x);
        const endX = Math.min(Math.min(rect.width, projectEndX), x + scaledDayWidth);
        
        if (endX > startX) {
          ctx.fillStyle = 'rgba(255, 192, 203, 0.2)';
          ctx.fillRect(startX, actualWorkAreaTop, endX - startX, adjustedWorkAreaBottom - actualWorkAreaTop);
        }
      }
    }
    ctx.restore();
  }

    // تمييز اليوم الحالي عمودياً
    if(showTodayLine && firstTaskNode){
    ctx.save();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = visibleStartDay; day <= visibleEndDay; day++) {
      const date = dayToDate(day);
      date.setHours(0, 0, 0, 0);

      if (date.getTime() === today.getTime()) {
        const x = effectiveLeftPanelWidth + viewState.offsetX + day * scaledDayWidth;
        const startX = Math.max(effectiveLeftPanelWidth, x);
        const endX = Math.min(rect.width, x + scaledDayWidth);

        if (endX > startX) {
          ctx.strokeStyle = '#ec4899';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x + scaledDayWidth / 2, actualWorkAreaTop);
          ctx.lineTo(x + scaledDayWidth / 2, adjustedWorkAreaBottom);
          ctx.stroke();
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

          const scaleFactor = timeAxisMode === 'weeks' ? 0.2 : 1;
          const displayStartDay = displayTask.startDay * scaleFactor;
          const displayDuration = displayTask.duration * scaleFactor;

          const taskX = effectiveLeftPanelWidth + viewState.offsetX + displayStartDay * scaledDayWidth;
          const rowSpacing = CANVAS_CONFIG.rowHeight * viewState.zoom;
          const taskY = nodeY + (CANVAS_CONFIG.taskPadding * viewState.zoom) + 
                        (displayTask.row || 0) * rowSpacing;

          // التحقق مما إذا كانت المهمة محددة
          const isSelected = selectedTasks.has(displayTask.id);

          // رسم المعالم (إذا كانت مفعلة)
          if (displayTask.type === 'milestone' && showMilestones) {
            const baseSize = CANVAS_CONFIG.milestoneSize * 1.5;
            const size = baseSize * viewState.zoom;
            const milestoneY = taskY + scaledTaskHeight / 2;

            ctx.save();

            // تطبيق الشفافية للمهام غير المحددة
            if (!isSelected && selectedTasks.size > 0) {
              ctx.globalAlpha = 0.3; // المهام غير المحددة شفافة
            } else {
              ctx.globalAlpha = 1; // المهمة المحددة غير شفافة
            }

            // رسم ظل للمعلم لإعطاء عمق
            if (viewState.zoom >= 0.3) {
              ctx.save();
              ctx.globalAlpha = 0.3; // ظل شفاف دائمًا
              ctx.fillStyle = '#000000';
              ctx.beginPath();
              ctx.arc(taskX + 2, milestoneY + 2, size / 2, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }

            // رسم الخلفية الرئيسية للمعلم
            const milestoneColor = getTaskColor(displayTask);
            const isDragging = taskDragState.isDragging && taskDragState.task?.id === displayTask.id;

            ctx.fillStyle = milestoneColor;
            ctx.strokeStyle = isDragging ? '#3b82f6' : 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = Math.max(2, 3 * viewState.zoom);

            ctx.beginPath();
            ctx.arc(taskX, milestoneY, size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // إعادة تعيين globalAlpha للعناصر الأخرى
            ctx.globalAlpha = 1;

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
              const maxTextLength = Math.floor(size / 8);
              const displayText = displayTask.content.length > maxTextLength 
                ? displayTask.content.substring(0, maxTextLength) + '...'
                : displayTask.content;

              ctx.fillStyle = '#ffffff';
              ctx.font = `700 ${Math.max(8, Math.min(14, size / 4))}px Inter, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';

              ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
              ctx.lineWidth = 1;
              ctx.strokeText(displayText, taskX, milestoneY);
              ctx.fillText(displayText, taskX, milestoneY);
            }

            // تحسين عرض الطوابع الزمنية
            if (showTimestamps && viewState.zoom >= 0.5) {
              const startDate = dayToDate(displayTask.startDay);
              const dateText = startDate.toLocaleDateString('ar-SA');

              ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
              ctx.font = `600 ${Math.max(8, 9 * viewState.zoom)}px Inter, sans-serif`;
              ctx.textAlign = 'center';

              const textMetrics: TextMetrics = ctx.measureText(dateText);
              const textWidth = textMetrics.width;
              const textHeight = 14 * viewState.zoom;
              const timestampY = milestoneY + size / 2 + 20;

              ctx.beginPath();
              ctx.roundRect(taskX - textWidth / 2 - 4, timestampY - textHeight / 2 - 2, 
                            textWidth + 8, textHeight + 4, 4);
              ctx.fill();

              ctx.fillStyle = '#ffffff';
              ctx.fillText(dateText, taskX, timestampY);
            }

            // تحسين عرض معرف المعلم
            if (showTaskIds && viewState.zoom >= 0.6) {
              const idText = `#${displayTask.id.slice(-4)}`;

              ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
              ctx.font = `600 ${Math.max(7, 8 * viewState.zoom)}px Inter, sans-serif`;
              ctx.textAlign = 'center';

              const textMetrics: TextMetrics = ctx.measureText(idText);
              const textWidth = textMetrics.width;
              const textHeight = 12 * viewState.zoom;
              const idY = milestoneY - size / 2 - 15;

              ctx.beginPath();
              ctx.roundRect(taskX - textWidth / 2 - 3, idY - textHeight / 2 - 1, 
                            textWidth + 6, textHeight + 2, 3);
              ctx.fill();

              ctx.fillStyle = '#ffffff';
              ctx.fillText(idText, taskX, idY);
            }

            // إضافة مؤشر بصري عند التحويم
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
            const taskWidth = displayDuration * scaledDayWidth;

            if (taskX + taskWidth >= effectiveLeftPanelWidth && taskX <= rect.width) {
              const isBeingDragged = taskDragState.isDragging && taskDragState.task?.id === displayTask.id;

              ctx.save();

              // تطبيق الشفافية للمهام غير المحددة
              if (!isSelected && selectedTasks.size > 0) {
                ctx.globalAlpha = 0.3; // المهام غير المحددة شفافة
              } else {
                ctx.globalAlpha = 1; // المهمة المحددة غير شفافة
              }

              // رسم ظل خفيف
              if (isBeingDragged) {
                ctx.globalAlpha = 0.8;
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
              }

              // لون المهمة
              ctx.fillStyle = getTaskColor(displayTask);
              ctx.beginPath();
              ctx.roundRect(taskX, taskY, taskWidth, scaledTaskHeight, CANVAS_CONFIG.taskBorderRadius);
              ctx.fill();

              // إطار أسود جمالي
              ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
              ctx.lineWidth = Math.max(1, 1.2 * viewState.zoom);
              ctx.beginPath();
              ctx.roundRect(taskX, taskY, taskWidth, scaledTaskHeight, CANVAS_CONFIG.taskBorderRadius);
              ctx.stroke();

              // إعادة تعيين globalAlpha للعناصر الأخرى
              ctx.globalAlpha = 1;

              // شريط التقدم
              if (showProgress && displayTask.progress !== undefined && displayTask.progress > 0) {
                const progressWidth = (taskWidth * displayTask.progress) / 100;
                ctx.save();
                ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.beginPath();
                ctx.roundRect(taskX, taskY, progressWidth, scaledTaskHeight, CANVAS_CONFIG.taskBorderRadius);
                ctx.fill();
                ctx.restore();

                if (viewState.zoom >= 0.5 && taskWidth > 50) {
                  ctx.fillStyle = '#ffffff';
                  ctx.font = `600 ${Math.max(8, 10 * viewState.zoom)}px Inter, sans-serif`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(`${displayTask.progress}%`, taskX + taskWidth / 2, taskY + scaledTaskHeight / 2);
                }
              }

              // نص المهمة
              if (viewState.zoom >= 0.3 && taskWidth > 30) {
                ctx.fillStyle = '#ffffff';
                ctx.font = `600 ${Math.max(8, 10 * viewState.zoom)}px Inter, sans-serif`;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';

                let displayText = displayTask.content;
                const maxTextWidth = taskWidth - 10;
                const textMetrics: TextMetrics = ctx.measureText(displayText);
                const textWidth = textMetrics.width;

                if (textWidth > maxTextWidth && maxTextWidth > 20) {
                  const ratio = maxTextWidth / textWidth;
                  const maxChars = Math.floor(displayText.length * ratio) - 3;
                  displayText = displayText.substring(0, Math.max(0, maxChars)) + '...';
                }

                ctx.fillText(displayText, taskX + 5, taskY + scaledTaskHeight / 2);

                // اسم المؤلف
                if (showAuthors && viewState.zoom >= 0.6 && displayTask.author) {
                  ctx.font = `400 ${Math.max(6, 8 * viewState.zoom)}px Inter, sans-serif`;
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                  ctx.textAlign = 'right';

                  const authorText = displayTask.author;
                  const authorTextWidth = ctx.measureText(authorText).width;

                  if (taskWidth > authorTextWidth + 15) {
                    ctx.fillText(authorText, taskX + taskWidth - 5, taskY + scaledTaskHeight / 2);
                  } else if (taskWidth > 50) {
                    const shortAuthor = authorText.substring(0, 3) + '...';
                    ctx.fillText(shortAuthor, taskX + taskWidth - 5, taskY + scaledTaskHeight / 2);
                  }
                }

                // معرف المهمة
                if (showTaskIds && viewState.zoom >= 0.8) {
                  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                  ctx.font = `400 ${Math.max(6, 8 * viewState.zoom)}px Inter, sans-serif`;
                  ctx.fillText(`#${displayTask.id.slice(-4)}`, taskX + 2, taskY + 10);
                }
              }

              // الطوابع الزمنية
              if (showTimestamps && viewState.zoom >= 0.7) {
                const startDate = dayToDate(displayTask.startDay);
                const endDate = dayToDate(displayTask.startDay + displayTask.duration);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.font = `400 ${Math.max(6, 7 * viewState.zoom)}px Inter, sans-serif`;
                ctx.textAlign = 'left';

                ctx.fillText(startDate.toLocaleDateString('ar-SA'), taskX + 2, taskY + scaledTaskHeight + 12);

                if (taskWidth > 120) {
                  ctx.textAlign = 'right';
                  ctx.fillText(endDate.toLocaleDateString('ar-SA'), taskX + taskWidth - 2, taskY + scaledTaskHeight + 12);
                }
              }

              ctx.restore();

              if (showLinks) {
                drawConnectionPoints(ctx, displayTask, node);
              }
            }
          }

          // إطار التحديد للمهام المحددة
          const isMultiSelected = selectedTasks.has(task.id);
          const isBeingDragged = taskDragState.isDragging && taskDragState.task?.id === task.id;

          if (isMultiSelected || isSelected || isBeingDragged) {
            ctx.save();

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);

            // استخدم نفس الحسابات الجديدة للإحداثيات
            const scaleFactor = timeAxisMode === 'weeks' ? 0.2 : 1;
            const displayStartDay = displayTask.startDay * scaleFactor;
            const displayDuration = displayTask.duration * scaleFactor;

            const currentTaskX = effectiveLeftPanelWidth + viewState.offsetX + displayStartDay * scaledDayWidth;
            
            // استخدم الحساب الجديد لـ Y
            const rowSpacing = CANVAS_CONFIG.rowHeight * viewState.zoom;
            const currentTaskY = nodeY + (CANVAS_CONFIG.taskPadding * viewState.zoom) + 
                                (displayTask.row || 0) * rowSpacing;

            if (displayTask.type === 'milestone') {
              const baseSize = CANVAS_CONFIG.milestoneSize * 1.5;
              const size = baseSize * viewState.zoom;
              const milestoneY = currentTaskY + scaledTaskHeight / 2;

              ctx.beginPath();
              ctx.arc(currentTaskX, milestoneY, (size / 2) + 2, 0, Math.PI * 2);
              ctx.stroke();
            } else {
              const currentTaskWidth = displayDuration * scaledDayWidth;

              ctx.beginPath();
              ctx.roundRect(
                currentTaskX - 1,
                currentTaskY - 1,
                currentTaskWidth + 2,
                scaledTaskHeight + 2,
                CANVAS_CONFIG.taskBorderRadius
              );
              ctx.stroke();
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

    
    drawSidebar(ctx, rect, flattened);
    

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
    CANVAS_CONFIG.headerHeight, 
    viewState.offsetY,
    dayToDate, 
    formatDate, 
    getTotalProjectDays, 
    getEffectiveLeftPanelWidth,
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
    showTodayLine,
    showHoverTask,
    timeAxisMode,
    drawEnhancedTimeAxis,
    drawSidebar,
    imageTick,
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


    // معالج النقر على زر وضع التحرير
  const handleEditModeButtonClick = useCallback((mouseX: number, mouseY: number) => {
    const editBtnX = CANVAS_CONFIG.leftPanelWidth - 95;
    const editBtnY = 40;
    const editBtnWidth = 85;
    const editBtnHeight = 28;
    
    if (mouseX >= editBtnX && mouseX <= editBtnX + editBtnWidth &&
        mouseY >= editBtnY && mouseY <= editBtnY + editBtnHeight) {
      setTreeEditMode(prev => !prev);
      setEditingNodeId(null);
      return true;
    }
    
    return false;
  }, [CANVAS_CONFIG]);


  // إضافة دوال جديدة للعثور على العقدة والتحريك
type FindResult = { parent: HierarchyNode | null, index: number, siblings: HierarchyNode[] };

const findNodeAndParent = (nodes: HierarchyNode[], nodeId: string, parent: HierarchyNode | null = null): FindResult | null => {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === nodeId) {
      return { parent, index: i, siblings: nodes };
    }
    const found = findNodeAndParent(nodes[i].children, nodeId, nodes[i]);
    if (found) return found;
  }
  return null;
};

const moveNodeUp = useCallback((nodeId: string) => {
  const found = findNodeAndParent(hierarchyTree, nodeId);
  if (!found || found.index === 0) return;
  const previousSibling = found.siblings[found.index - 1];
  moveNodeInTree(nodeId, previousSibling.id, 'before');
}, [hierarchyTree, moveNodeInTree]);

const moveNodeDown = useCallback((nodeId: string) => {
  const found = findNodeAndParent(hierarchyTree, nodeId);
  if (!found || found.index === found.siblings.length - 1) return;
  const nextSibling = found.siblings[found.index + 1];
  moveNodeInTree(nodeId, nextSibling.id, 'after');
}, [hierarchyTree, moveNodeInTree]);

  // معالج النقر على أزرار التحكم في وضع التحرير
  const handleEditControlsClick = useCallback((mouseX: number, mouseY: number, flattened: HierarchyNode[]) => {
  if (!treeEditMode) return false;
  
  for (const node of flattened) {
    if (!node.yPosition || !node.height) continue;
    
    const nodeY = node.yPosition;
    const nodeHeight = node.height;
    const centerY = nodeY + Math.min(nodeHeight, scaledRowHeight) / 2;
    
    const buttonSize = 20;
    const spacing = 5;
    let currentX = CANVAS_CONFIG.leftPanelWidth - buttonSize - 10;
    
    // زر الحذف
    if (mouseX >= currentX && mouseX <= currentX + buttonSize &&
        mouseY >= centerY - buttonSize / 2 && mouseY <= centerY + buttonSize / 2) {
      deleteNodeFromTree(node.id);
      return true;
    }
    
    currentX -= (buttonSize + spacing);
    
    // زر الإضافة
    if (mouseX >= currentX && mouseX <= currentX + buttonSize &&
        mouseY >= centerY - buttonSize / 2 && mouseY <= centerY + buttonSize / 2) {
      addNodeToTree(node.id, 'inside');
      return true;
    }
    
    if (node.level > 0) {
      currentX -= (buttonSize + spacing);
      
      // زر التحريك لأعلى
      if (mouseX >= currentX && mouseX <= currentX + buttonSize &&
          mouseY >= centerY - buttonSize / 2 && mouseY <= centerY + buttonSize / 2) {
        moveNodeUp(node.id);
        return true;
      }
      
      currentX -= (buttonSize + spacing);
      
      // زر التحريك لأسفل
      if (mouseX >= currentX && mouseX <= currentX + buttonSize &&
          mouseY >= centerY - buttonSize / 2 && mouseY <= centerY + buttonSize / 2) {
        moveNodeDown(node.id);
        return true;
      }
    }
    
    // النقر على نص العقدة للتعديل
    const indent = 15 + node.level * 25;
    if (mouseX >= indent + 20 && mouseX <= indent + 140 &&
        mouseY >= centerY - 12 && mouseY <= centerY + 12) {
      setEditingNodeId(node.id);
      setEditingNodeContent(node.content);
      return true;
    }
  }
  
  return false;
}, [treeEditMode, CANVAS_CONFIG, scaledRowHeight, deleteNodeFromTree, addNodeToTree, moveNodeUp, moveNodeDown]);


   
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
                    ctx.fillStyle = 'rgba(255, 192, 203, 0.4)';
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
        const weekWidth = scaledDayWidth * 5; // عرض الأسبوع
        
        // حساب الأسبوع الأول والأخير المرئيين
        const firstWeekStart = Math.floor(visibleStartDay / 5) * 5;
        const lastWeekStart = Math.floor(visibleEndDay / 5) * 5;
        
        for (let weekStart = firstWeekStart; weekStart <= lastWeekStart; weekStart += 5) {
            const x = effectiveLeftPanelWidth + viewState.offsetX + weekStart * scaledDayWidth;
            if (x + weekWidth >= effectiveLeftPanelWidth && x <= rect.width) {
                const startDate = dayToDate(weekStart);
                const endDate = dayToDate(weekStart + 4);
                
                // خلفية الأسبوع
                ctx.fillStyle = weekStart % 14 === 0 ? 'rgba(248, 250, 252, 0.8)' : 'rgba(241, 245, 249, 0.5)';
                ctx.fillRect(x, 0, weekWidth, CANVAS_CONFIG.headerHeight);
                
                // رقم الأسبوع
                const weekNumber = Math.floor(weekStart / 5) + 1;
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

  // إضافة دالة للحصول على مستويات التفصيل حسب الزوم
  const getDetailLevel = useCallback((zoom: number) => {
    if (zoom >= 2.0) return 'minimal';      // زوم كبير جداً - إخفاء معظم التفاصيل
    if (zoom >= 1.5) return 'basic';        // زوم كبير - إخفاء الصور والتفاصيل الثانوية
    if (zoom >= 1.0) return 'normal';       // زوم عادي - عرض معظم العناصر
    if (zoom >= 0.5) return 'detailed';     // زوم صغير - عرض كل شيء
    return 'ultra-detailed';                // زوم صغير جداً - عرض كل التفاصيل
  }, []);

  
  // دالة رسم أزرار التحكم في وضع التحرير
  const drawEditControls = useCallback((ctx: CanvasRenderingContext2D, node: HierarchyNode, centerY: number) => {
  const detailLevel = getDetailLevel(viewState.zoom);
  
  // إخفاء أزرار التحكم في الزوم الكبير جداً
  if (detailLevel === 'minimal') return;
  
  ctx.save();
  
  const buttonSize = Math.max(16, Math.min(24, 20 * Math.min(viewState.zoom, 1.2)));
  const spacing = Math.max(3, Math.min(8, 5 * viewState.zoom));
  const fontSize = Math.max(10, Math.min(16, 12 * Math.min(viewState.zoom, 1.2)));
  
  let currentX = CANVAS_CONFIG.leftPanelWidth - buttonSize - 10;
  
  // زر الحذف
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.roundRect(currentX, centerY - buttonSize / 2, buttonSize, buttonSize, 3);
  ctx.fill();
  
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('×', currentX + buttonSize / 2, centerY);
  
  currentX -= (buttonSize + spacing);
  
  // زر الإضافة
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.roundRect(currentX, centerY - buttonSize / 2, buttonSize, buttonSize, 3);
  ctx.fill();
  
  ctx.fillStyle = '#ffffff';
  ctx.fillText('+', currentX + buttonSize / 2, centerY);
  
  // أزرار التحريك فقط في التفاصيل العادية والعالية
  if (node.level > 0 && detailLevel !== 'basic') {
    currentX -= (buttonSize + spacing);
    
    // زر التحريك لأعلى
    ctx.fillStyle = '#6b7280';
    ctx.beginPath();
    ctx.roundRect(currentX, centerY - buttonSize / 2, buttonSize, buttonSize, 3);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.fillText('↑', currentX + buttonSize / 2, centerY);
    
    currentX -= (buttonSize + spacing);
    
    // زر التحريك لأسفل
    ctx.fillStyle = '#6b7280';
    ctx.beginPath();
    ctx.roundRect(currentX, centerY - buttonSize / 2, buttonSize, buttonSize, 3);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.fillText('↓', currentX + buttonSize / 2, centerY);
  }
  
  ctx.restore();
}, [CANVAS_CONFIG, viewState.zoom, getDetailLevel]);


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
  
  const detailLevel = getDetailLevel(viewState.zoom);
  
  // حساب الحجم بناءً على الزوم مع حدود معقولة
  let buttonSize: number;
  let iconSize: number;
  
  if (detailLevel === 'minimal') {
    buttonSize = Math.max(10, Math.min(16, 12 * viewState.zoom));
    iconSize = Math.max(2, Math.min(4, 3 * viewState.zoom));
  } else if (detailLevel === 'basic') {
    buttonSize = Math.max(12, Math.min(18, 14 * viewState.zoom));
    iconSize = Math.max(2.5, Math.min(5, 3.5 * viewState.zoom));
  } else {
    buttonSize = Math.max(14, Math.min(22, 16 * viewState.zoom));
    iconSize = Math.max(3, Math.min(6, 4 * viewState.zoom));
  }
  
  const buttonX = CANVAS_CONFIG.leftPanelWidth - buttonSize - 10;
  const buttonY = centerY - buttonSize / 2;
  const isExpanded = node.isExpanded;
  
  // خلفية مبسطة في الزوم الكبير
  if (detailLevel === 'minimal') {
    ctx.fillStyle = isExpanded ? '#0ea5e9' : '#94a3b8';
    ctx.beginPath();
    ctx.roundRect(buttonX, buttonY, buttonSize, buttonSize, 2);
    ctx.fill();
  } else {
    // خلفية عادية
    ctx.fillStyle = isExpanded ? '#e0f2fe' : '#f1f5f9';
    ctx.beginPath();
    ctx.roundRect(buttonX, buttonY, buttonSize, buttonSize, 3);
    ctx.fill();
    
    // حدود
    ctx.strokeStyle = isExpanded ? '#0ea5e9' : '#94a3b8';
    ctx.lineWidth = Math.max(0.5, 1 * Math.min(viewState.zoom, 1.2));
    ctx.stroke();
  }
  
  // الأيقونة
  ctx.strokeStyle = detailLevel === 'minimal' ? '#ffffff' : (isExpanded ? '#0369a1' : '#475569');
  ctx.lineWidth = Math.max(1, 1.5 * Math.min(viewState.zoom, 1.2));
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
}, [CANVAS_CONFIG, viewState.zoom, getDetailLevel]);


  // دالة رسم نص العقدة
  const drawNodeText = useCallback(
  (ctx: CanvasRenderingContext2D, node: HierarchyNode, indent: number, centerY: number) => {
    ctx.save();

    const baseX = indent + 20;
    const maxTextWidth = CANVAS_CONFIG.leftPanelWidth - baseX - 20;
    const detailLevel = getDetailLevel(viewState.zoom);

    // 🎨 النص - تحديد الخط حسب الزوم
    let fontSize: number;
    let fontWeight: string;
    
    if (node.type === 'project') {
      fontSize = Math.max(10, Math.min(18, 14 * viewState.zoom));
      fontWeight = viewState.zoom > 1.5 ? '800' : '700';
      ctx.fillStyle = '#1e293b';
    } else if (node.type === 'section') {
      fontSize = Math.max(9, Math.min(16, 13 * viewState.zoom));
      fontWeight = viewState.zoom > 1.5 ? '700' : '600';
      ctx.fillStyle = '#334155';
    } else {
      fontSize = Math.max(8, Math.min(14, 12 * viewState.zoom));
      fontWeight = viewState.zoom > 1.5 ? '600' : '500';
      ctx.fillStyle = '#475569';
    }

    ctx.font = `${fontWeight} ${fontSize}px "Inter","Segoe UI",sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // ✏️ النص - تقصير أكثر في الزوم الكبير
    let displayText = node.content;
    const textMetrics: TextMetrics = ctx.measureText(displayText);
    const textWidth = textMetrics.width;
    
    if (textWidth > maxTextWidth) {
      const ratio = maxTextWidth / textWidth;
      let maxChars = Math.floor(displayText.length * ratio) - 3;
      
      // تقصير إضافي في الزوم الكبير
      if (detailLevel === 'minimal') {
        maxChars = Math.min(maxChars, 8);
      } else if (detailLevel === 'basic') {
        maxChars = Math.min(maxChars, 12);
      }
      
      displayText = displayText.substring(0, Math.max(0, maxChars)) + '...';
    }
    
    ctx.fillText(displayText, baseX, centerY);

    // 🖼️ إدارة الصورة حسب مستوى التفصيل
    if (detailLevel !== 'minimal' && detailLevel !== 'basic') {
      // حساب حجم الصورة حسب الزوم
      let imageBoxW = 80 * Math.min(viewState.zoom, 1.2); // حد أقصى للتكبير
      let imageBoxH = 60 * Math.min(viewState.zoom, 1.2);
      
      // تصغير الصورة في الزوم الكبير
      if (viewState.zoom > 1.0) {
        imageBoxW = Math.max(40, imageBoxW * 0.7);
        imageBoxH = Math.max(30, imageBoxH * 0.7);
      }
      
      const imageBoxX = baseX;
      const imageBoxY = centerY + (viewState.zoom > 1.2 ? 15 : 20);

      const img = getCachedImage(node.imageUrl);
      if (img && img.complete) {
        // إضافة شفافية للصورة في الزوم الكبير
        if (viewState.zoom > 1.2) {
          ctx.globalAlpha = Math.max(0.3, 1.5 - viewState.zoom);
        }
        
        ctx.drawImage(img, imageBoxX, imageBoxY, imageBoxW, imageBoxH);
        ctx.globalAlpha = 1.0; // إعادة تعيين الشفافية
      } else {
        // Placeholder إذا لم تكن هناك صورة
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(imageBoxX, imageBoxY, imageBoxW, imageBoxH);
        
        // إضافة أيقونة صغيرة للصورة المفقودة
        ctx.fillStyle = '#94a3b8';
        ctx.font = `400 ${Math.max(12, 16 * Math.min(viewState.zoom, 1.0))}px "Inter"`;
        ctx.textAlign = 'center';
        ctx.fillText('', imageBoxX + imageBoxW/2, imageBoxY + imageBoxH/2);
      }

      // حفظ الـ hit-rect مع الأحجام المحدثة (دائماً، حتى لو placeholder)
      imageHitRectsRef.current.push({
        nodeId: node.id,
        x: imageBoxX,
        y: imageBoxY,
        w: imageBoxW,
        h: imageBoxH,
        url: node.imageUrl
      });
    }

    ctx.restore();
  }, 
  [CANVAS_CONFIG, viewState.zoom, getCachedImage, getDetailLevel]
);

  
  const statsClickAreasRef = useRef<Array<{ nodeId: string; x: number; y: number; width: number; height: number }>>([]);


  // دالة رسم إحصائيات المهام
  const drawTaskStats = useCallback((ctx: CanvasRenderingContext2D, node: HierarchyNode, centerY: number) => {
  if (node.tasks.length === 0) return;
  
  const detailLevel = getDetailLevel(viewState.zoom);
  
  // إخفاء الإحصائيات في الزوم الكبير جداً
  if (detailLevel === 'minimal') return;
  
  ctx.save();
  
  const statsX = CANVAS_CONFIG.leftPanelWidth - 80;
  // @ts-ignore
  const completedTasks = node.tasks.filter(t => t.progress >= 100).length;
  const totalTasks = node.tasks.length;
  
  // تكييف حجم وموضع الإحصائيات
  const statsWidth = detailLevel === 'basic' ? 50 : 70;
  const statsHeight = Math.max(12, Math.min(20, 16 * viewState.zoom));
  const fontSize = Math.max(7, Math.min(11, 9 * viewState.zoom));
  
  // خلفية الإحصائيات
  ctx.fillStyle = 'rgba(241, 245, 249, 0.8)';
  ctx.beginPath();
  ctx.roundRect(statsX - 5, centerY - statsHeight/2, statsWidth, statsHeight, 6);
  ctx.fill();
  
  // نص الإحصائيات
  ctx.fillStyle = '#64748b';
  ctx.font = `500 ${fontSize}px "Inter", "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  let statsText: string;
  if (detailLevel === 'basic') {
    statsText = `${completedTasks}/${totalTasks}`;
  } else {
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    statsText = `${completedTasks}/${totalTasks} (${percentage}%)`;
  }
  
  ctx.fillText(statsText, statsX + statsWidth/2 - 5, centerY);
  
  // مؤشر ملون للتقدم - أصغر في الزوم الكبير
  if (detailLevel !== 'basic') {
    const progressRatio = totalTasks > 0 ? completedTasks / totalTasks : 0;
    let progressColor = '#ef4444';
    if (progressRatio >= 0.5) progressColor = '#f59e0b';
    if (progressRatio >= 0.8) progressColor = '#10b981';
    
    const dotSize = Math.max(2, Math.min(4, 3 * viewState.zoom));
    ctx.fillStyle = progressColor;
    ctx.beginPath();
    ctx.arc(statsX - 8, centerY, dotSize, 0, Math.PI * 2);
    ctx.fill();
  }

  const statsClickArea = {
  x: statsX - 15,
  y: centerY - statsHeight/2 - 5,
  width: statsWidth + 20,
  height: statsHeight + 10
};


// حفظ منطقة النقر (أضف ref جديد)
if (!statsClickAreasRef.current) {
  statsClickAreasRef.current = [];
}
statsClickAreasRef.current.push({
  nodeId: node.id,
  ...statsClickArea
});

  
  ctx.restore();
}, [CANVAS_CONFIG, viewState.zoom, getDetailLevel]);



// دالة رسم عقد الشجرة المحسنة
      const drawTreeNodes = useCallback((ctx: CanvasRenderingContext2D, rect: DOMRect, flattened: HierarchyNode[]) => {
    const baseIndent = 15;
    const levelIndent = Math.max(15, Math.min(35, 25 * Math.min(viewState.zoom, 1.5))); // تكييف المسافة البادئة
    const lineHeight = Math.max(25, Math.min(50, scaledRowHeight * 0.8));
    const detailLevel = getDetailLevel(viewState.zoom);
    
    // تنظيف imageHitRectsRef في بداية كل رسم
    imageHitRectsRef.current = [];
    
    flattened.forEach((node, index) => {
      if (!node.yPosition || !node.height) return;
      
      const nodeY = node.yPosition;
      const nodeHeight = node.height;
      
      if (nodeY + nodeHeight > CANVAS_CONFIG.headerHeight && nodeY < rect.height) {
        const indent = baseIndent + node.level * levelIndent;
        const centerY = Math.max(nodeY + Math.min(nodeHeight, lineHeight) / 2, CANVAS_CONFIG.headerHeight + 20);
        
        // خلفية العقدة - مبسطة في الزوم الكبير
        const bgY = Math.max(nodeY, CANVAS_CONFIG.headerHeight);
        const bgHeight = Math.min(nodeHeight, rect.height - bgY);
        
        let nodeColor = 'rgba(248, 250, 252, 0.6)';
        
        if (draggedNodeId === node.id) {
          nodeColor = 'rgba(59, 130, 246, 0.2)';
        } else if (dragOverNodeId === node.id) {
          if (dropPosition === 'before') {
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(0, bgY - 2, CANVAS_CONFIG.leftPanelWidth, 2);
          } else if (dropPosition === 'after') {
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(0, bgY + bgHeight, CANVAS_CONFIG.leftPanelWidth, 2);
          } else if (dropPosition === 'inside') {
            nodeColor = 'rgba(34, 197, 94, 0.1)';
          }
        } else if (node.type === 'project') {
          nodeColor = detailLevel === 'minimal' ? 'rgba(219, 234, 254, 0.3)' : 'rgba(219, 234, 254, 0.5)';
        } else if (node.type === 'section') {
          nodeColor = detailLevel === 'minimal' ? 'rgba(243, 244, 246, 0.3)' : 'rgba(243, 244, 246, 0.5)';
        }
        
        ctx.fillStyle = nodeColor;
        ctx.fillRect(0, bgY, CANVAS_CONFIG.leftPanelWidth, bgHeight);
        
        // خط فاصل - أرق في الزوم الكبير
        if (node.level === 0 && detailLevel !== 'minimal') {
          ctx.fillStyle = 'rgba(203, 213, 225, 0.4)';
          ctx.fillRect(0, nodeY + nodeHeight - 1, CANVAS_CONFIG.leftPanelWidth, 1);
        }
        
        // خطوط الاتصال - مبسطة في الزوم الكبير
        if (detailLevel !== 'minimal') {
          drawTreeConnections(ctx, node, indent, centerY, flattened);
        }
        
        // أزرار التوسيع/الطي
        if (node.children.length > 0 && !treeEditMode) {
          drawExpandCollapseButton(ctx, node, centerY);
        }
        
        // أزرار التحكم في وضع التحرير
        if (treeEditMode) {
          drawEditControls(ctx, node, centerY);
        }
        
        // نص العقدة
        if (editingNodeId === node.id) {
          // رسم حقل الإدخال - حجم متكيف
          const inputWidth = Math.max(80, Math.min(150, 120 * Math.min(viewState.zoom, 1.3)));
          const inputHeight = Math.max(20, Math.min(30, 24 * Math.min(viewState.zoom, 1.2)));
          
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(indent + 20, centerY - inputHeight/2, inputWidth, inputHeight);
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = Math.max(1, 2 * Math.min(viewState.zoom, 1.0));
          ctx.strokeRect(indent + 20, centerY - inputHeight/2, inputWidth, inputHeight);
        } else {
          drawNodeText(ctx, node, indent, centerY);
        }
        
        // إحصائيات المهام
        if (viewState.zoom >= 0.4 && !treeEditMode) {
          drawTaskStats(ctx, node, centerY);
        }
      }
    });
  }, [
    CANVAS_CONFIG, 
    scaledRowHeight, 
    viewState.zoom, 
    treeEditMode, 
    editingNodeId, 
    draggedNodeId, 
    dragOverNodeId, 
    dropPosition,
    drawTreeConnections,
    drawExpandCollapseButton,
    drawEditControls,
    drawNodeText,
    drawTaskStats,
    getDetailLevel
  ]);


  // تحديث معالج النقر للتعامل مع الشريط الجانبي المحسن وأزرار المحور الزمني
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
  e.preventDefault();
  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  
  // إخفاء قائمة السياق إذا كانت مفتوحة
  if (contextMenu?.visible) {
    setContextMenu(null);
  }

  if (isLinkMode) {
    
    for (const hit of linkDeleteHitRectsRef.current) {
      if (
        mouseX >= hit.x &&
        mouseX <= hit.x + hit.w &&
        mouseY >= hit.y &&
        mouseY <= hit.y + hit.h
      ) {
        // حذف الـ link عند النقر فقط
        setHierarchyTree(prev => {
          const updateLinksInTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
            return nodes.map(node => ({
              ...node,
              links: node.id === hit.nodeId 
                ? node.links.filter(l => l.id !== hit.linkId)
                : node.links,
              children: updateLinksInTree(node.children)
            }));
          };
          return updateLinksInTree(prev);
        });
        return; // منع أي إجراءات أخرى بعد الحذف
      }
    }
  }


  // التحقق من النقر على زر وضع التحرير
  if (!sidebarCollapsed && handleEditModeButtonClick(mouseX, mouseY)) {
    return;
  }

  // التحقق من النقر على أزرار التحكم في وضع التحرير
  if (treeEditMode && !sidebarCollapsed) {
    const flattened = flattenTree(hierarchyTree);
    if (handleEditControlsClick(mouseX, mouseY, flattened)) {
      return;
    }
  }

  // فحص أزرار المحور الزمني
  if (!sidebarCollapsed && handleTimeAxisButtonClick(mouseX, mouseY)) {
    return;
  }

  // التحقق من الضغط على Ctrl أو Cmd للتحديد المتعدد
  const isCtrlPressed = e.ctrlKey || e.metaKey;
  const isShiftPressed = e.shiftKey;

  // ★ استخدام العرض الفعلي الصحيح
  const effectiveLeftPanelWidth = getEffectiveLeftPanelWidth();
  

  
  const flattened = flattenTree(hierarchyTree);
  // إذا كان النقر في منطقة المهام (وليس في الشريط الجانبي)
  if (mouseX >= effectiveLeftPanelWidth) {
    
    // البحث عن المهمة المنقورة
    let clickedTask: Task | null = null;
    let clickedNode: HierarchyNode | null = null;

    for (const node of flattened) {
      if (!node.isLeaf || !node.tasks || !node.yPosition || !node.height) continue;
      
      const nodeY = node.yPosition;
      
      for (const task of node.tasks) {
        const scaleFactor = timeAxisMode === 'weeks' ? 0.2 : 1;
        const displayStartDay = task.startDay * scaleFactor;
        const displayDuration = task.duration * scaleFactor;

        const taskX = effectiveLeftPanelWidth + viewState.offsetX + displayStartDay * scaledDayWidth;
        
        // استخدم نفس الحساب الجديد
        const rowSpacing = CANVAS_CONFIG.rowHeight * viewState.zoom;
        const taskY = node.yPosition + (CANVAS_CONFIG.taskPadding * viewState.zoom) + 
                      (task.row || 0) * rowSpacing;
        
        if (task.type === 'milestone') {
          const size = CANVAS_CONFIG.milestoneSize * 1.5 * viewState.zoom;
          const milestoneY = taskY + scaledTaskHeight / 2;
          const dx = Math.abs(mouseX - taskX);
          const dy = Math.abs(mouseY - milestoneY);
          
          if (dx <= size / 2 && dy <= size / 2) {
            clickedTask = task;
            clickedNode = node;
            break;
          }
        } else {
          const taskWidth = displayDuration * scaledDayWidth;
          
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

    // معالجة المهام المنقورة
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
      
      if (onTaskSelected) {
        onTaskSelected(clickedTask, clickedNode.id);
      }
      
      // التحديد المتعدد مع Ctrl
      if (isCtrlPressed) {
        const taskKey = clickedTask.id;
        setSelectedTasks(prev => {
          const newMap = new Map(prev);
          if (newMap.has(taskKey)) {
            newMap.delete(taskKey);
          } else {
            newMap.set(taskKey, { task: clickedTask, nodeId: clickedNode.id });
          }
          return newMap;
        });
        return;
      } 
      else if (isShiftPressed && selectedTasks.size > 0) {
        setSelectedTasks(prev => {
          const newMap = new Map(prev);
          newMap.set(clickedTask.id, { task: clickedTask, nodeId: clickedNode.id });
          return newMap;
        });
        return;
      } 
      else {
        if (!selectedTasks.has(clickedTask.id)) {
          setSelectedTasks(new Map([[clickedTask.id, { task: clickedTask, nodeId: clickedNode.id }]]));
        }
      }

      // وضع سحب المهام
      const scaleFactor = timeAxisMode === 'weeks' ? 0.2 : 1;
      const displayStartDay = clickedTask.startDay * scaleFactor;

      const taskX = effectiveLeftPanelWidth + viewState.offsetX + displayStartDay * scaledDayWidth;
      const taskY = clickedNode.yPosition! + CANVAS_CONFIG.taskPadding + (clickedTask.row || 0) * (scaledTaskHeight + CANVAS_CONFIG.taskPadding);
      
      let dragType: 'move' | 'resize-left' | 'resize-right' = 'move';
      
      if (clickedTask.type === 'milestone') {
        const size = CANVAS_CONFIG.milestoneSize * 1.5 * viewState.zoom;
        const moveZoneWidth = size * 0.4;

        if (mouseX < taskX - moveZoneWidth / 2) {
          dragType = 'resize-left';
        } else if (mouseX > taskX + moveZoneWidth / 2) {
          dragType = 'resize-right';
        } else {
          dragType = 'move';
        }
      } else {
        const displayDuration = clickedTask.duration * scaleFactor;
        const taskWidth = displayDuration * scaledDayWidth;
        const resizeZone = Math.min(20, taskWidth * 0.2);
        if (mouseX - taskX < resizeZone) {
          dragType = 'resize-left';
        } else if (taskX + taskWidth - mouseX < resizeZone) {
          dragType = 'resize-right';
        }
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
    } else {
        
        // حفظ موقع الماوس الأولي
        setInitialMousePosition({ x: mouseX, y: mouseY });
        
        // if (!isCtrlPressed && !isShiftPressed) {
        //   setSelectedTasks(new Map());
        // }
        
        if (linkState.isCreating) {
          setLinkState({
            isCreating: false,
            sourceTask: null,
            sourcePoint: null,
            mouseX: 0,
            mouseY: 0
          });
        } else {
          // بدء السحب بدون إلغاء تحديد المهمة
          setViewState(prev => ({
            ...prev,
            isDragging: true
          }));
          setIsDraggingView(false); // لم نتحرك بعد
          canvas.style.cursor = 'grabbing';
        }
      }
          
    return;
  }

  if (!sidebarCollapsed && mouseX < effectiveLeftPanelWidth) {
  // فحص النقر على منطقة الإحصائيات
  for (const area of statsClickAreasRef.current) {
    if (mouseX >= area.x && mouseX <= area.x + area.width &&
        mouseY >= area.y && mouseY <= area.y + area.height) {
      
      const clickedNode = flattened.find(n => n.id === area.nodeId);
      if (clickedNode) {
        const allTasks = collectAllTasks(clickedNode);
        setTasksSummaryModal({
          isOpen: true,
          node: clickedNode,
          allTasks
        });
        return;
      }
    }
  }
}

  

  // معالجة النقرات في الشريط الجانبي (إذا لم يكن مطوي)
  if (!sidebarCollapsed && mouseY >= CANVAS_CONFIG.headerHeight) {

    // إلغاء تحديد المهمة عند النقر في الشريط الجانبي
    if (onTaskSelected) {
      onTaskSelected(null);
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
          
          setExpandedNodes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(node.id)) {
              newSet.delete(node.id);
            } else {
              newSet.add(node.id);
            }
            return newSet;
          });
          
          setHierarchyTree(prev => {
            const updateNodeInTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
              return nodes.map(n => {
                if (n.id === node.id) {
                  return { ...n, isExpanded: !n.isExpanded };
                }
                return { ...n, children: updateNodeInTree(n.children) };
              });
            };
            return updateNodeInTree(prev);
          });
          
          return;
        }
      }
    }
  }
  
}, [
  getEffectiveLeftPanelWidth,
  contextMenu,
  sidebarCollapsed,
  handleEditModeButtonClick,
  treeEditMode,
  flattenTree,
  hierarchyTree,
  handleEditControlsClick,
  handleTimeAxisButtonClick,
  viewState,
  scaledDayWidth,
  scaledTaskHeight,
  CANVAS_CONFIG,
  isLinkMode,
  linkState,
  getTaskConnectionPoints,
  createLink,
  showLinks,
  selectedTasks,
  setSelectedTasks,
  scaledRowHeight,
  timeAxisMode
]);


// ★ إضافة معالج hover لأزرار المحور الزمني ★
const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  const effectiveLeftPanelWidth = getEffectiveLeftPanelWidth(); // ★ استخدام الدالة المركزية

    // تتبع إذا كان المستخدم يسحب الشبكة فعلاً
    if (viewState.isDragging && initialMousePosition) {
      const dragDistance = Math.sqrt(
        Math.pow(mouseX - initialMousePosition.x, 2) + 
        Math.pow(mouseY - initialMousePosition.y, 2)
      );
      
      // إذا تحرك المؤشر أكثر من 5 بكسل، نعتبرها عملية سحب
      if (dragDistance > 5 && !isDraggingView) {
        setIsDraggingView(true);
      }
    }
    
    // فحص hover على أزرار المحور الزمني
    if (!sidebarCollapsed && mouseY < CANVAS_CONFIG.headerHeight) {
      const buttonWidth = 35;
      const buttonHeight = 20;
      const spacing = 5;
      const startX = CANVAS_CONFIG.leftPanelWidth - (buttonWidth * 2 + spacing + 10);
      const startY = 8;
      
      if (mouseX >= startX && mouseX <= startX + buttonWidth * 2 + spacing && 
          mouseY >= startY && mouseY <= startY + buttonHeight) {
        canvas.style.cursor = 'pointer';
        return;
      }

      const editBtnX = CANVAS_CONFIG.leftPanelWidth - 100;
      const editBtnY = 12;
      const editBtnWidth = 85;
      const editBtnHeight = 28;
      
      if (mouseX >= editBtnX && mouseX <= editBtnX + editBtnWidth &&
          mouseY >= editBtnY && mouseY <= editBtnY + editBtnHeight) {
        canvas.style.cursor = 'pointer';
        return;
      }
    }
    
    if (!taskDragState.isDragging && !viewState.isDragging) {
      const flattened = flattenTree(hierarchyTree);
      let hoveredTask: { task: Task; node: HierarchyNode } | null = null;

      // البحث عن المهمة تحت المؤشر
      for (const node of flattened) {
        if (!node.isLeaf || !node.tasks || !node.yPosition) continue;
        
        for (const task of node.tasks) {
          const scaleFactor = timeAxisMode === 'weeks' ? 0.2 : 1;
          const displayStartDay = task.startDay * scaleFactor;
          const displayDuration = task.duration * scaleFactor;

          const taskX = effectiveLeftPanelWidth + viewState.offsetX + displayStartDay * scaledDayWidth;
          
          // استخدم الحساب الجديد
          const rowSpacing = CANVAS_CONFIG.rowHeight * viewState.zoom;
          const taskY = node.yPosition + (CANVAS_CONFIG.taskPadding * viewState.zoom) + 
                        (task.row || 0) * rowSpacing;
          
          // فحص المعالم والمهام العادية
          let isHovering = false;
          if (task.type === 'milestone') {
            const size = CANVAS_CONFIG.milestoneSize * viewState.zoom;
            const milestoneY = taskY + scaledTaskHeight / 2;
            const dx = Math.abs(mouseX - taskX);
            const dy = Math.abs(mouseY - milestoneY);
            isHovering = dx <= size / 2 && dy <= size / 2;
          } else {
            const taskWidth = displayDuration * scaledDayWidth;
            isHovering = mouseX >= taskX && mouseX <= taskX + taskWidth && 
                        mouseY >= taskY && mouseY <= taskY + scaledTaskHeight;
          }
          
          if (isHovering) {
            hoveredTask = { task, node };
            break;
          }
        }

        if (hoveredTask) break;
      }

      // إدارة الـ hover timer
      if (showHoverTask && hoveredTask) {
        if (!hoverTimer) {
          const timer = setTimeout(() => {
            setHoverTooltip({
              taskId: hoveredTask!.task.id,
              nodeId: hoveredTask!.node.id,
              x: mouseX,
              y: mouseY,
              visible: true
            });
          }, 1500); // ثانية ونصف
          setHoverTimer(timer);
        }
      } else {
        if (hoverTimer) {
          clearTimeout(hoverTimer);
          setHoverTimer(null);
        }
        setHoverTooltip(null);
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
      
      const scaleFactor = timeAxisMode === 'weeks' ? 5 : 1;
      const daysDelta = (deltaX / scaledDayWidth) * scaleFactor;
      
      // حساب rowsDelta بناءً على rowSpacing الجديد
      const rowSpacing = CANVAS_CONFIG.rowHeight * viewState.zoom;
      const rowsDelta = deltaY / rowSpacing;

      let newTask = { ...taskDragState.originalTask };
      const totalDays = getTotalProjectDays();

      if (taskDragState.type === 'move') {
        newTask.startDay = taskDragState.originalTask.startDay + daysDelta;
        newTask.startDay = Math.max(0, Math.min(totalDays - newTask.duration, newTask.startDay));
        newTask.row = Math.max(0, (taskDragState.originalTask.row || 0) + rowsDelta);
      } else if (taskDragState.type === 'resize-left') {
          let newStartDay = taskDragState.originalTask.startDay + daysDelta;
          let rawDuration = taskDragState.originalTask.duration - (newStartDay - taskDragState.originalTask.startDay);
          newTask.startDay = newStartDay;
          newTask.duration = rawDuration;
          
        } else if (taskDragState.type === 'resize-right') {
          let rawDuration = taskDragState.originalTask.duration + daysDelta;
          newTask.duration = rawDuration;
        }

        // تغيير النوع مؤقتاً للعرض
        if (newTask.duration > 0 && newTask.type === 'milestone') {
          newTask.type = 'task';
        } else if (newTask.duration <= 0 && newTask.type === 'task') {
          newTask.type = 'milestone';
          newTask.duration = 0;
        }

        // حد أدنى للمهام
        if (newTask.type === 'task') {
          newTask.duration = Math.max(1, newTask.duration);
          if (taskDragState.type === 'resize-left') {
            newTask.startDay = Math.min(newTask.startDay, taskDragState.originalTask.startDay + taskDragState.originalTask.duration - 1);
          }
        }

        // ضمان البقاء في حدود المشروع
        newTask.startDay = Math.max(0, newTask.startDay);
        if (newTask.type === 'task') {
          newTask.startDay = Math.min(newTask.startDay, totalDays - newTask.duration);
        } else {
          newTask.startDay = Math.min(newTask.startDay, totalDays - 1);
        }

        setTaskDragState(prev => ({ ...prev, task: newTask }));
      }
    else if (viewState.isDragging) {
      setViewState(prev => ({
        ...prev,
        offsetX: prev.offsetX + e.movementX,
        offsetY: prev.offsetY + e.movementY
      }));
      
      // تأكيد أن هذا سحب وليس نقر
      if (initialMousePosition) {
        const dragDistance = Math.sqrt(
          Math.pow(mouseX - initialMousePosition.x, 2) + 
          Math.pow(mouseY - initialMousePosition.y, 2)
        );
        if (dragDistance > 5) {
          setIsDraggingView(true);
        }
      }
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
        let cursorSet = false;
        
        for (const node of flattened) {
          if (!node.isLeaf || !node.tasks || !node.yPosition) continue;
          
          for (const task of node.tasks) {
            const scaleFactor = timeAxisMode === 'weeks' ? 0.2 : 1;
            const displayStartDay = task.startDay * scaleFactor;
            const displayDuration = task.duration * scaleFactor;

            const taskX = effectiveLeftPanelWidth + viewState.offsetX + displayStartDay * scaledDayWidth;
            
            // استخدم الحساب الجديد
            const rowSpacing = CANVAS_CONFIG.rowHeight * viewState.zoom;
            const taskY = node.yPosition + (CANVAS_CONFIG.taskPadding * viewState.zoom) + 
                          (task.row || 0) * rowSpacing;
            
            if (task.type === 'milestone') {
              const size = CANVAS_CONFIG.milestoneSize * 1.5 * viewState.zoom;
              const milestoneY = taskY + scaledTaskHeight / 2;
              const dx = Math.abs(mouseX - taskX);
              const dy = Math.abs(mouseY - milestoneY);
              
              if (dx <= size / 2 && dy <= size / 2) {
                // تحديد cursor بناءً على الموقع داخل المعلم
                const moveZoneWidth = size * 0.4;
                const centerX = taskX;
                
                if (mouseX < centerX - moveZoneWidth / 2 || mouseX > centerX + moveZoneWidth / 2) {
                  canvas.style.cursor = 'col-resize';
                } else {
                  canvas.style.cursor = 'grab';
                }
                cursorSet = true;
                break;
              }
            } else {
              const taskWidth = displayDuration * scaledDayWidth;
              
              if (mouseX >= taskX && mouseX <= taskX + taskWidth && 
                  mouseY >= taskY && mouseY <= taskY + scaledTaskHeight) {
                const resizeZone = Math.min(20, taskWidth * 0.2);
                
                if (mouseX - taskX < resizeZone || taskX + taskWidth - mouseX < resizeZone) {
                  canvas.style.cursor = 'col-resize';
                } else {
                  canvas.style.cursor = 'grab';
                }
                cursorSet = true;
                break;
              }
            }
          }
          if (cursorSet) break;
        }
        
        if (!cursorSet) {
          canvas.style.cursor = 'default';
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
    sidebarCollapsed,
    getTotalProjectDays,
    getEffectiveLeftPanelWidth,
    treeEditMode,   
    editingNodeId,   
    draggedNodeId,    
    dragOverNodeId,    
    dropPosition,       
    timeAxisMode,
    initialMousePosition,
  isDraggingView
  ]);


  const handleCanvasMouseUp = useCallback(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  if (taskDragState.isDragging && taskDragState.task && taskDragState.nodeId) {
    const totalDays = getTotalProjectDays();
    
    let finalTask = { ...taskDragState.task };
    
    // التقريب
    finalTask.startDay = Math.round(finalTask.startDay);
    finalTask.duration = Math.round(finalTask.duration);
    finalTask.row = Math.max(0, Math.round(finalTask.row || 0));
    
    // معالجة أيام العطلة فقط عند الإفلات
    if (finalTask.type === 'task' && finalTask.duration > 0) {
      // إذا كانت البداية على عطلة، انقلها لأول يوم عمل
      finalTask.startDay = findNextWorkDay(finalTask.startDay, totalDays);
      
      // حساب كم يوم عطلة في نطاق المهمة
      let weekendCount = 0;
      let workDaysCount = 0;
      
      for (let day = finalTask.startDay; day < finalTask.startDay + finalTask.duration && day < totalDays; day++) {
        if (isWeekend(day)) {
          weekendCount++;
        } else {
          workDaysCount++;
        }
      }
      
      // إذا كانت هناك عطل، زد المدة لتعويضها
      if (weekendCount > 0) {
        // نريد نفس عدد أيام العمل الأصلية
        const targetWorkDays = workDaysCount;
        let newDuration = 0;
        let actualWorkDays = 0;
        let currentDay = finalTask.startDay;
        
        while (actualWorkDays < targetWorkDays && currentDay < totalDays) {
          if (!isWeekend(currentDay)) {
            actualWorkDays++;
          }
          newDuration++;
          currentDay++;
        }
        
        finalTask.duration = newDuration;
      }
      
      // تأكد من عدم تجاوز حدود المشروع
      if (finalTask.startDay + finalTask.duration > totalDays) {
        // حاول الرجوع للخلف
        let bestStart = finalTask.startDay;
        for (let testStart = finalTask.startDay - 1; testStart >= 0; testStart--) {
          if (!isWeekend(testStart)) {
            if (testStart + finalTask.duration <= totalDays) {
              bestStart = testStart;
              break;
            }
          }
        }
        finalTask.startDay = bestStart;
        
        // إذا ما زالت تتجاوز، قلص المدة
        if (finalTask.startDay + finalTask.duration > totalDays) {
          finalTask.duration = totalDays - finalTask.startDay;
        }
      }
    } else if (finalTask.type === 'milestone') {
      // للمعالم، فقط انقلها لأقرب يوم عمل
      finalTask.startDay = findNextWorkDay(finalTask.startDay, totalDays);
      finalTask.duration = 0;
    }
    
    // تحديث النوع النهائي
    if (finalTask.duration <= 0) {
      finalTask.duration = 0;
      finalTask.type = 'milestone';
    } else {
      finalTask.type = 'task';
    }
    
    // تحديث الشجرة
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

  // معالجة انتهاء سحب الشبكة
  if (viewState.isDragging) {
    // إذا لم يكن هناك سحب فعلي (نقر بسيط)، ألغي تحديد المهمة
    if (!isDraggingView && onTaskSelected) {
        // إلغاء تحديد الأزرار
        if (onTaskSelected) {
          onTaskSelected(null);
        }
        
        // إلغاء تحديد المهام والشفافية
        setSelectedTasks(new Map());
        
    }

  
    setViewState(prev => ({
      ...prev,
      isDragging: false
    }));
  }

    // إعادة تعيين متغيرات السحب
  setIsDraggingView(false);
  setInitialMousePosition(null);

  setTaskDragState({
    isDragging: false,
    task: null,
    type: 'move',
    startMouseX: 0,
    startMouseY: 0,
    originalTask: null,
    nodeId: undefined
  });


  canvas.style.cursor = 'default';
}, [taskDragState, getTotalProjectDays, findNextWorkDay, isWeekend , selectedTasks]);

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent) => {
  e.preventDefault();
  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (sidebarCollapsed || mouseX < CANVAS_CONFIG.leftPanelWidth) return;

  const effectiveLeftPanelWidth = getEffectiveLeftPanelWidth();
  const flattened = flattenTree(hierarchyTree);
  
  let clickedTask: Task | null = null;
  let clickedNode: HierarchyNode | null = null;

  for (const node of flattened) {
    if (!node.isLeaf || !node.tasks || !node.yPosition || !node.height) continue;
    
    for (const task of node.tasks) {
      const scaleFactor = timeAxisMode === 'weeks' ? 0.2 : 1;
      const displayStartDay = task.startDay * scaleFactor;
      const displayDuration = task.duration * scaleFactor;

      const taskX = effectiveLeftPanelWidth + viewState.offsetX + displayStartDay * scaledDayWidth;
      
      // استخدم نفس الحساب الجديد
      const rowSpacing = CANVAS_CONFIG.rowHeight * viewState.zoom;
      const taskY = node.yPosition + (CANVAS_CONFIG.taskPadding * viewState.zoom) + 
                    (task.row || 0) * rowSpacing;
        
      if (task.type === 'milestone') {
        const size = CANVAS_CONFIG.milestoneSize * viewState.zoom;
        const milestoneY = taskY + scaledTaskHeight / 2;
        const dx = Math.abs(mouseX - taskX);
        const dy = Math.abs(mouseY - milestoneY);
        
        if (dx <= size / 2 && dy <= size / 2) {
          clickedTask = task;
          clickedNode = node;
          break;
        }
      } else {
        const taskWidth = displayDuration * scaledDayWidth;
        
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

  if (clickedTask && clickedNode) {
    setInlineEditingTask({
      taskId: clickedTask.id,
      nodeId: clickedNode.id,
      field: 'content'
    });
  }
}, [hierarchyTree, viewState, scaledDayWidth, scaledTaskHeight, CANVAS_CONFIG, flattenTree, sidebarCollapsed, timeAxisMode]);

  // أضف معالج النقر بالزر الأيمن:
  const handleCanvasContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const effectiveLeftPanelWidth = sidebarCollapsed ? 0 : CANVAS_CONFIG.leftPanelWidth;
    const flattened = flattenTree(hierarchyTree);
    
    // البحث عن المهمة المنقورة
    for (const node of flattened) {
      if (!node.isLeaf || !node.tasks || !node.yPosition || !node.height) continue;
      
      for (const task of node.tasks) {
        const scaleFactor = timeAxisMode === 'weeks' ? 0.2 : 1;
        const displayStartDay = task.startDay * scaleFactor;
        const displayDuration = task.duration * scaleFactor;

        const taskX = effectiveLeftPanelWidth + viewState.offsetX + displayStartDay * scaledDayWidth;
        const rowSpacing = CANVAS_CONFIG.rowHeight * viewState.zoom;
        const taskY = node.yPosition + (CANVAS_CONFIG.taskPadding * viewState.zoom) + 
                      (task.row || 0) * rowSpacing;
                
        if (task.type === 'milestone') {
          const size = CANVAS_CONFIG.milestoneSize * viewState.zoom;
          const milestoneY = taskY + scaledTaskHeight / 2;
          const dx = Math.abs(mouseX - taskX);
          const dy = Math.abs(mouseY - milestoneY);
          
          if ((dx / (size / 2) + dy / (size / 2)) <= 1) {
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              task,
              nodeId: node.id,
              visible: true
            });
            return;
          }
        } else {
          const taskWidth = displayDuration * scaledDayWidth;
          
          if (mouseX >= taskX && mouseX <= taskX + taskWidth && 
              mouseY >= taskY && mouseY <= taskY + scaledTaskHeight) {
            setContextMenu({
              x: e.clientX,
              y: e.clientY,
              task,
              nodeId: node.id,
              visible: true
            });
            return;
          }
        }
      }
    }
  }, [hierarchyTree, viewState, scaledDayWidth, scaledTaskHeight, CANVAS_CONFIG, flattenTree, sidebarCollapsed, timeAxisMode]);



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



  
// دالة لتطبيق قالب المهام على عقدة معينة
const applyTemplateToNode = useCallback((template: any, dropX: number, dropY: number) => {
  const treeToRender = searchQuery ? filteredTree : hierarchyTree;
  const flattened = flattenTree(treeToRender);
  const effectiveLeftPanelWidth = getEffectiveLeftPanelWidth();

  let targetNode: HierarchyNode | null = null;
  
  // إيجاد العقدة المستهدفة
  for (const node of flattened) {
    if (!node.yPosition || !node.height) continue;
    
    if (dropY >= node.yPosition && dropY < node.yPosition + node.height) {
      if (node.isLeaf) {
        targetNode = node;
        break;
      }
    }
  }
  
  if (!targetNode) {
    targetNode = flattened.find(n => n.isLeaf && n.type === 'task') || null;
    if (!targetNode) {
      console.error('لا يمكن إيجاد مكان مناسب للقالب');
      return;
    }
  }
  
  // حساب نقطة البداية من موقع الإفلات
  let day = Math.floor((dropX - effectiveLeftPanelWidth - viewState.offsetX) / scaledDayWidth);
  if (timeAxisMode === 'weeks') {
    day *= 5;
  }
  let startDay = findNextWorkDay(day, getTotalProjectDays());
  
  // إنشاء المهام الجديدة من القالب
  const newTasks: Task[] = [];
  const taskIdMapping: { [oldId: string]: string } = {};
  
  template.tasks.forEach((templateTask: Task, index: number) => {
    const newTaskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`;
    taskIdMapping[templateTask.id] = newTaskId;
    
    // حساب اليوم الفعلي للمهمة
    const taskStartDay = startDay + templateTask.startDay;
    const adjustedStartDay = findNextWorkDay(taskStartDay, getTotalProjectDays());
    
    let duration = templateTask.duration || 0;
    if (templateTask.type === 'task' && duration > 0) {
      duration = calculateAdjustedDuration(adjustedStartDay, duration, getTotalProjectDays());
    }
    
    const newTask: Task = {
      id: newTaskId,
      content: templateTask.content,
      startDay: Math.max(0, Math.min(getTotalProjectDays() - duration, adjustedStartDay)),
      duration,
      color: templateTask.color,
      progress: templateTask.progress || 0,
      author: templateTask.author,
      row: (templateTask.row || 0) + (targetNode?.tasks.length || 0),
      type: duration === 0 ? 'milestone' : 'task',
      managerId: templateTask.managerId
    };
    
    newTasks.push(newTask);
  });
  
  // إنشاء الروابط الجديدة إذا كانت موجودة
  const newLinks: TaskLink[] = [];
  if (template.links) {
    template.links.forEach((templateLink: any) => {
      const sourceId = taskIdMapping[templateLink.sourceTaskId];
      const targetId = taskIdMapping[templateLink.targetTaskId];
      
      if (sourceId && targetId) {
        newLinks.push({
          id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          sourceTaskId: sourceId,
          targetTaskId: targetId,
          sourcePoint: templateLink.sourcePoint,
          targetPoint: templateLink.targetPoint,
          color: templateLink.color || CANVAS_CONFIG.linkColor
        });
      }
    });
  }
  
  // تحديث الشجرة بالمهام والروابط الجديدة
  setHierarchyTree(prev => {
    const updateNodeInTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
      return nodes.map(node => {
        if (node.id === targetNode?.id) {
          return { 
            ...node, 
            tasks: [...node.tasks, ...newTasks],
            links: [...(node.links || []), ...newLinks]
          };
        }
        return { ...node, children: updateNodeInTree(node.children) };
      });
    };
    
    return updateNodeInTree(prev);
  });
  
  console.log(`تم تطبيق القالب "${template.name}" مع ${newTasks.length} مهمة و ${newLinks.length} رابط`);
}, [hierarchyTree, flattenTree, scaledDayWidth, scaledTaskHeight, CANVAS_CONFIG, viewState, getTotalProjectDays, getEffectiveLeftPanelWidth, searchQuery, filteredTree, findNextWorkDay, calculateAdjustedDuration, timeAxisMode]);



  // أضف معالجات اختصارات لوحة المفاتيح:
  useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ctrl+A لتحديد الكل
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      const allTasks = new Map<string, { task: Task; nodeId: string }>();
      
      const collectAllTasks = (nodes: HierarchyNode[]) => {
        nodes.forEach(node => {
          node.tasks.forEach(task => {
            allTasks.set(task.id, { task, nodeId: node.id });
          });
          collectAllTasks(node.children);
        });
      };
      
      collectAllTasks(hierarchyTree);
      setSelectedTasks(allTasks);
      console.log('تم تحديد جميع المهام:', allTasks.size);
    }
    
    // Delete لحذف المهام المحددة
    if (e.key === 'Delete' && selectedTasks.size > 0) {
      e.preventDefault();
      deleteSelectedTasksMulti();
      console.log('تم حذف المهام المحددة');
    }
    
    
    // Ctrl+D لتكرار المهام المحددة
    if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedTasks.size > 0) {
      e.preventDefault();
      duplicateSelectedTasks();
      console.log('تم تكرار المهام المحددة');
    }
    
    
    
    // Escape لإلغاء التحديد
    if (e.key === 'Escape') {
      setSelectedTasks(new Map());
      setContextMenu(null);


      // إلغاء تحديد المهمة الحالية
      if (onTaskSelected) {
        onTaskSelected(null);
      }
      console.log('تم إلغاء التحديد');
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [selectedTasks, hierarchyTree, deleteSelectedTasksMulti, duplicateSelectedTasks]);


  useEffect(() => {
    const tree = generateData();
    setHierarchyTree(tree);
    setExpandedNodes(new Set(['project-tower-1', 'section-1', 'section-2']));
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
  const canvas = canvasRef.current;
  if (!canvas) return;

  const onClick = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // أولاً: أزرار الهيدر (لو عندك)
    if (handleTimeAxisButtonClick(x, y)) return;

    // نسمح بالنقر داخل الشريط الجانبي فقط
    if (x <= CANVAS_CONFIG.leftPanelWidth && y >= CANVAS_CONFIG.headerHeight) {
      for (let i = imageHitRectsRef.current.length - 1; i >= 0; i--) {
        const r = imageHitRectsRef.current[i];
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
          setPopupImage({ nodeId: r.nodeId, url: r.url });
          break;
        }
      }
    }
  };

  canvas.addEventListener('click', onClick);
  return () => canvas.removeEventListener('click', onClick);
}, [handleTimeAxisButtonClick, CANVAS_CONFIG.leftPanelWidth, CANVAS_CONFIG.headerHeight]);



  // دالة لتحديث imageUrl للعقدة
  const updateNodeImage = useCallback((nodeId: string, newImageUrl: string) => {
    setHierarchyTree(prev => {
      const updateInTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
        return nodes.map(node => {
          if (node.id === nodeId) {
            return { ...node, imageUrl: newImageUrl };
          }
          return { ...node, children: updateInTree(node.children) };
        });
      };
      return updateInTree(prev);
    });
  }, []);

  // معالج رفع الصورة
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, nodeId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newUrl = event.target?.result as string;
        updateNodeImage(nodeId, newUrl);
        setPopupImage({ nodeId, url: newUrl });
      };
      reader.readAsDataURL(file);
    }
  }, [updateNodeImage]);



useEffect(() => {
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const dragData = e.dataTransfer?.getData('application/json');
    if (!dragData) {
      // التعامل مع البيانات القديمة (المهام المفردة)
      const taskData = e.dataTransfer?.getData('task');
      if (taskData) {
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
      }
      return;
    }
    
    try {
      const draggedData = JSON.parse(dragData);
      const rect = canvasRef.current?.getBoundingClientRect();
      
      if (rect) {
        const dropX = e.clientX - rect.left;
        const dropY = e.clientY - rect.top;
        
        if (draggedData.type === 'template' && draggedData.template) {
          // التعامل مع القوالب
          applyTemplateToNode(draggedData.template, dropX, dropY);
          
          if (onTaskDrop) {
            onTaskDrop(draggedData.template);
          }
        } else if (draggedData.type === 'task' || !draggedData.type) {
          // التعامل مع المهام المفردة
          const task = draggedData.template || draggedData;
          addNewTaskToTree(task, dropX, dropY);
          
          if (onTaskDrop) {
            onTaskDrop(task);
          }
        }
      }
    } catch (error) {
      console.error('خطأ في معالجة البيانات المسحوبة:', error);
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
}, [addNewTaskToTree, applyTemplateToNode, onTaskDrop]);


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
  
  useEffect(() => {
  if (onSelectedTasksChange) {
    onSelectedTasksChange(selectedTasks);
  }
}, [selectedTasks, onSelectedTasksChange]);

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
          onDoubleClick={handleCanvasDoubleClick}
          onContextMenu={handleCanvasContextMenu}

        />
        

         {/* في return statement، أضف بعد canvas: */}
          {inlineEditingTask && inlineEditingTask.field === 'content' && (() => {
            const flattened = flattenTree(hierarchyTree);
            const targetNode = flattened.find(n => n.id === inlineEditingTask.nodeId);
            const targetTask = targetNode?.tasks.find(t => t.id === inlineEditingTask.taskId);
            
            if (!targetTask || !targetNode?.yPosition) return null;
            
            const effectiveLeftPanelWidth = getEffectiveLeftPanelWidth();
            const scaleFactor = timeAxisMode === 'weeks' ? 0.2 : 1;
            const displayStartDay = targetTask.startDay * scaleFactor;
            const displayDuration = targetTask.duration * scaleFactor;
            
            const taskX = effectiveLeftPanelWidth + viewState.offsetX + displayStartDay * scaledDayWidth;
            
            // استخدم الحساب الجديد
            const rowSpacing = CANVAS_CONFIG.rowHeight * viewState.zoom;
            const taskY = targetNode.yPosition + (CANVAS_CONFIG.taskPadding * viewState.zoom) + 
                          (targetTask.row || 0) * rowSpacing;
            
            const taskWidth = displayDuration * scaledDayWidth;
            
            return (
              <input
                autoFocus
                type="text"
                defaultValue={targetTask.content}
                className="absolute bg-white border-2 border-blue-500 rounded px-2 py-1 text-sm z-50"
                style={{
                  left: `${taskX - 2}px`, // تعديل الموضع
                  top: `${taskY - 2}px`,
                  width: `${Math.max(100, taskWidth + 4)}px`, // زيادة العرض قليلاً
                  height: `${scaledTaskHeight + 4}px`, // زيادة الارتفاع قليلاً
                  fontSize: `${Math.max(8, 10 * viewState.zoom)}px`,
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)' // إضافة ظل
                }}
                onBlur={(e) => {
                  const newContent = e.target.value.trim();
                  if (newContent && newContent !== targetTask.content) {
                    setHierarchyTree(prev => {
                      const updateInTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
                        return nodes.map(node => ({
                          ...node,
                          tasks: node.id === inlineEditingTask.nodeId 
                            ? node.tasks.map(t => t.id === targetTask.id ? { ...t, content: newContent } : t)
                            : node.tasks,
                          children: updateInTree(node.children)
                        }));
                      };
                      return updateInTree(prev);
                    });
                  }
                  setInlineEditingTask(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    setInlineEditingTask(null);
                  }
                }}
              />
            );
          })()}

    {hoverTooltip?.visible && (() => {
      const flattened = flattenTree(hierarchyTree);
      const targetNode = flattened.find(n => n.id === hoverTooltip.nodeId);
      const targetTask = targetNode?.tasks.find(t => t.id === hoverTooltip.taskId);
      
      if (!targetTask || !targetNode?.yPosition) return null;
      
      // حساب موضع المهمة الفعلي
      const effectiveLeftPanelWidth = getEffectiveLeftPanelWidth();
      const scaleFactor = timeAxisMode === 'weeks' ? 0.2 : 1;
      const displayStartDay = targetTask.startDay * scaleFactor;
      
      const taskX = effectiveLeftPanelWidth + viewState.offsetX + displayStartDay * scaledDayWidth;
      const rowSpacing = CANVAS_CONFIG.rowHeight * viewState.zoom;
      const taskY = targetNode.yPosition + (CANVAS_CONFIG.taskPadding * viewState.zoom) + 
                    (targetTask.row || 0) * rowSpacing;
      
      return (
        <div
          className="absolute bg-gray-800 text-white rounded-lg p-3 shadow-lg z-50 min-w-[200px] transition-opacity duration-300"
          style={{
            left: `${taskX + 10}px`,
            top: `${taskY - 80}px`,
            opacity: hoverTooltip.visible ? 1 : 0,
            pointerEvents: hoverTooltip.visible ? 'auto' : 'none'
          }}
        >
          <div className="text-sm font-medium mb-2">{targetTask.content}</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-300">Progress</span>
              <span className="text-xs">{targetTask.progress || 0}%</span>
            </div>
            <Slider
              name=''
              defaultValue={[targetTask.progress || 0]}
              onValueChange={(value) => {
                setHierarchyTree(prev => {
                  const updateInTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
                    return nodes.map(node => ({
                      ...node,
                      tasks: node.id === hoverTooltip.nodeId 
                        ? node.tasks.map(t => t.id === targetTask.id ? { ...t, progress: value[0] } : t)
                        : node.tasks,
                      children: updateInTree(node.children)
                    }));
                  };
                  return updateInTree(prev);
                });
              }}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
          </div>
        </div>
      );
    })()}


        {contextMenu?.visible && (
  <div
    className="fixed bg-white shadow-lg rounded-lg py-1 z-50 min-w-[150px] border border-gray-200"
    style={{ 
      left: `${contextMenu.x}px`, 
      top: `${contextMenu.y}px` 
    }}
  >

    <button
      className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 flex items-center gap-2"
      onClick={() => {
        const newTask = {
          ...contextMenu.task,
          id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content: `${contextMenu.task.content} (نسخة)`,
          row: (contextMenu.task.row || 0) + 1
        };
        
        setHierarchyTree(prev => {
          const updateTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
            return nodes.map(node => {
              if (node.id === contextMenu.nodeId) {
                return { ...node, tasks: [...node.tasks, newTask] };
              }
              return { ...node, children: updateTree(node.children) };
            });
          };
          return updateTree(prev);
        });
        
        setContextMenu(null);
      }}
    >
      تكرار
    </button>
    <div className="border-t border-gray-200 my-1"></div>
    <button
      className="w-full px-4 py-2 text-sm text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
      onClick={() => {
        deleteTask(contextMenu.task.id, contextMenu.nodeId);
        setContextMenu(null);
      }}
    >
      حذف
    </button>
  </div>
)}


{popupImage && (() => {
  const flattened = flattenTree(hierarchyTree);
  const targetNode = flattened.find(n => n.id === popupImage.nodeId);
  
  const handleEditClick = () => {
    // فتح file input لرفع صورة جديدة
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const newUrl = event.target?.result as string;
          updateNodeImage(popupImage.nodeId, newUrl);
          setPopupImage({ nodeId: popupImage.nodeId, url: newUrl });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-3 shadow-xl relative max-w-[90vw] max-h-[90vh]">
        {/* أيقونة إغلاق X */}
        <button
          onClick={() => setPopupImage(null)}
          className="absolute top-2 right-2 p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800"
        >
          ✕
        </button>
        
        {/* أيقونة تعديل */}
        <button
          onClick={handleEditClick}
          className="absolute top-2 left-2 p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800"
        >
          ✎
        </button>
        
        {popupImage.url ? (
          <img 
            src={popupImage.url} 
            alt="node" 
            className="max-w-[85vw] max-h-[80vh] object-contain" 
          />
        ) : (
          <div className="flex items-center justify-center h-[300px] w-[400px] bg-gray-100 text-gray-600">
            إمكانية رفع صورة جديدة لهذا القسم
          </div>
        )}
      </div>
    </div>
  );
})()}


        {editingNodeId && (() => {
          const flattened = flattenTree(hierarchyTree);
          const targetNode = flattened.find(n => n.id === editingNodeId);
          
          if (!targetNode || !targetNode.yPosition) return null;
          
          // حساب المسافة البادئة بنفس طريقة drawTreeNodes
          const baseIndent = 15;
          const levelIndent = Math.max(15, Math.min(35, 25 * Math.min(viewState.zoom, 1.5)));
          const indent = baseIndent + targetNode.level * levelIndent;
          
          // حساب centerY بنفس الطريقة
          const lineHeight = Math.max(25, Math.min(50, scaledRowHeight * 0.8));
          const centerY = Math.max(
            targetNode.yPosition + Math.min(targetNode.height || 0, lineHeight) / 2, 
            CANVAS_CONFIG.headerHeight + 20
          );

          return (
            <input
              autoFocus
              type="text"
              value={editingNodeContent}
              onChange={(e) => setEditingNodeContent(e.target.value)}
              className="absolute bg-white border-2 border-blue-500 rounded px-2 py-1"
              style={{
                left: `${indent + 20}px`,
                top: `${centerY - 12}px`,
                width: `${Math.max(80, Math.min(150, 120 * Math.min(viewState.zoom, 1.3)))}px`,
                height: `${Math.max(20, Math.min(30, 24 * Math.min(viewState.zoom, 1.2)))}px`,
                fontSize: `${Math.max(10, 12 * viewState.zoom)}px`
              }}
              onBlur={() => {
                if (editingNodeContent.trim()) {
                  updateNodeContent(editingNodeId, editingNodeContent.trim());
                }
                setEditingNodeId(null);
                setEditingNodeContent('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                } else if (e.key === 'Escape') {
                  setEditingNodeId(null);
                  setEditingNodeContent('');
                }
              }}
            />
          );
        })()}


        {/* Tasks Summary Modal */}
        {tasksSummaryModal.isOpen && tasksSummaryModal.node && (
          <TasksSummaryModal
            isOpen={tasksSummaryModal.isOpen}
            onClose={() => setTasksSummaryModal({ isOpen: false, node: null, allTasks: [] })}
            node={tasksSummaryModal.node}
            allTasks={tasksSummaryModal.allTasks}
            onUpdateTaskProgress={handleUpdateTaskProgress}
          />
        )} 


      </div>
    </div>
  );
};

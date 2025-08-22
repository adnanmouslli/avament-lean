"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GanttCanvas } from '@/components/projectManager/GanttCanvas';
import { ProjectHeader } from '@/components/projectManager/ProjectHeader';
import RightSidebar from '@/components/projectManager/RightSidebar';
import { TreeEditorModal } from '@/components/projectManager/TreeEditorModal';
import { ViewSettingsModal, ViewSettings } from '@/components/projectManager/ViewSettingsModal';

import { HierarchyNode } from '@/components/projectManager/GanttCanvas';

import { FilterModal, FilterCriteria } from '@/components/projectManager/filter/FilterModal';
import { applyFilterToTree, getFilterStatistics, hasActiveFilters } from '@/components/projectManager/filter/FilterUtils';
import { ActiveFiltersDisplay } from '@/components/projectManager/filter/ActiveFiltersDisplay';

// أضف هذه الـ interfaces
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

const COLORS = {
  hierarchyColors: [
    '#2563eb', '#0ea5e9', '#16a34a', '#ca8a04', '#e11d48', '#7c3aed'
  ]
};

interface ViewState {
  zoom: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
}

const ProjectManager: React.FC = () => {

  const [hierarchyTree, setHierarchyTree] = useState<HierarchyNode[]>([]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  
  const [showTreeEditor, setShowTreeEditor] = useState(false);

  // إضافة states جديدة لإعدادات العرض
  const [showViewSettings, setShowViewSettings] = useState(false);
  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    showLinks: true,
    isLinkMode: false,
    showGrid: true,
    showWeekends: true,
    showProgress: true,
    showAuthors: true,
    showMilestones: true,
    showTimestamps: false,
    showColors: true,
    showTaskIds: false
  });

  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterCriteria>({});
  const [filteredHierarchyTree, setFilteredHierarchyTree] = useState<HierarchyNode[]>([]);
  const [filterStats, setFilterStats] = useState({
    originalTaskCount: 0,
    filteredTaskCount: 0,
    originalNodeCount: 0,
    filteredNodeCount: 0
  });

  // معالج تغيير إعدادات العرض
  const handleViewSettingsChange = useCallback((newSettings: ViewSettings) => {
    setViewSettings(newSettings);
    
    // حفظ الإعدادات في localStorage للاحتفاظ بها
    try {
      localStorage.setItem('gantt-view-settings', JSON.stringify(newSettings));
    } catch (error) {
      console.warn('لا يمكن حفظ إعدادات العرض:', error);
    }
  }, []);

  // تحميل الإعدادات من localStorage عند بدء التشغيل
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('gantt-view-settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setViewSettings(prev => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.warn('لا يمكن تحميل إعدادات العرض المحفوظة:', error);
    }
  }, []);

  const handleApplyFilter = useCallback((criteria: FilterCriteria) => {
    setActiveFilters(criteria);
    
    if (hasActiveFilters(criteria)) {
      const filtered = applyFilterToTree(hierarchyTree, criteria);
      setFilteredHierarchyTree(filtered);
      
      const stats = getFilterStatistics(hierarchyTree, filtered);
      setFilterStats(stats);
    } else {
      setFilteredHierarchyTree(hierarchyTree);
      setFilterStats({
        originalTaskCount: 0,
        filteredTaskCount: 0,
        originalNodeCount: 0,
        filteredNodeCount: 0
      });
    }
  }, [hierarchyTree]);

  const handleRemoveFilter = useCallback((filterKey: keyof FilterCriteria) => {
    const newFilters = { ...activeFilters };
    
    if (filterKey === 'dateRange') {
      delete newFilters.dateRange;
    } else if (filterKey === 'progress') {
      delete newFilters.progress;
    } else if (filterKey === 'duration') {
      delete newFilters.duration;
    } else if (filterKey === 'colors') {
      delete newFilters.colors;
    } else {
      delete newFilters[filterKey];
    }
    
    setActiveFilters(newFilters);
    handleApplyFilter(newFilters);
  }, [activeFilters, handleApplyFilter]);

  const clearAllFilters = useCallback(() => {
    setActiveFilters({});
    setFilteredHierarchyTree(hierarchyTree);
    setFilterStats({
      originalTaskCount: 0,
      filteredTaskCount: 0,
      originalNodeCount: 0,
      filteredNodeCount: 0
    });
  }, [hierarchyTree]);

  const getDisplayTree = useCallback(() => {
    return hasActiveFilters(activeFilters) ? filteredHierarchyTree : hierarchyTree;
  }, [activeFilters, filteredHierarchyTree, hierarchyTree]);

  // تحديث useEffect لتطبيق الفلاتر عند تغيير البيانات
  useEffect(() => {
    if (hasActiveFilters(activeFilters)) {
      handleApplyFilter(activeFilters);
    } else {
      setFilteredHierarchyTree(hierarchyTree);
    }
  }, [hierarchyTree, activeFilters, handleApplyFilter]);

  // Add handler for opening tree editor
  const handleOpenTreeEditor = useCallback(() => {
    setShowTreeEditor(true);
  }, []);

  // Add handler for opening view settings
  const handleOpenViewSettings = useCallback(() => {
    setShowViewSettings(true);
  }, []);

  // Add new section
  const addNewSection = useCallback((parentId: string, name: string) => {
    const newNode: HierarchyNode = {
      id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'section',
      content: name || 'New Section',
      level: 0,
      children: [],
      tasks: [],
      links: [],
      parent: parentId,
      color: COLORS.hierarchyColors[Math.floor(Math.random() * COLORS.hierarchyColors.length)],
      isLeaf: true,
      isExpanded: true,
      progress: 0,
      author: 'Current User'
    };

    setHierarchyTree(prevTree => {
      const addToTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
        return nodes.map(node => {
          if (node.id === parentId) {
            newNode.level = node.level + 1;
            return {
              ...node,
              children: [...node.children, newNode],
              isLeaf: false
            };
          }
          return {
            ...node,
            children: addToTree(node.children)
          };
        });
      };

      if (!parentId || parentId === 'root') {
        newNode.level = 0;
        newNode.parent = null;
        return [...prevTree, newNode];
      }
      
      return addToTree(prevTree);
    });

    return newNode;
  }, []);

  // Add new task to a node
  const addNewTaskToNode = useCallback((nodeId: string, newTask: Partial<Task>) => {
    const finalTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: newTask.content || 'New Task',
      startDay: newTask.startDay || 0,
      duration: newTask.type === 'milestone' ? 0 : (newTask.duration || 5),
      color: newTask.color || '#3b82f6',
      progress: newTask.progress || 0,
      author: newTask.author || 'Current User',
      row: newTask.row || 0,
      type: newTask.type || 'task'
    };

    setHierarchyTree(prev => {
      const updateTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
        return nodes.map(node => {
          if (node.id === nodeId && node.type === 'task') {
            const maxRow = Math.max(...node.tasks.map(t => t.row || 0), -1);
            finalTask.row = Math.max(0, finalTask.row || maxRow + 1);
            return {
              ...node,
              tasks: [...node.tasks, finalTask]
            };
          }
          return {
            ...node,
            children: updateTree(node.children)
          };
        });
      };
      return updateTree(prev);
    });
  }, []);

  // Edit node content
  const editNodeContent = useCallback((nodeId: string, newContent: string) => {
    setHierarchyTree(prev => {
      const updateTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
        return nodes.map(node => {
          if (node.id === nodeId) {
            return { ...node, content: newContent };
          }
          return { ...node, children: updateTree(node.children) };
        });
      };
      return updateTree(prev);
    });
  }, []);

  // Delete node
  const deleteNode = useCallback((nodeId: string) => {
    setHierarchyTree(prev => {
      const removeFromTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
        return nodes.filter(node => node.id !== nodeId).map(node => ({
          ...node,
          children: removeFromTree(node.children)
        }));
      };
      return removeFromTree(prev);
    });
  }, []);

  const projectName = "مشروع النظام الجديد";

  // Zoom controls
  const zoomIn = () => setViewState(prev => ({ 
    ...prev, 
    zoom: Math.min(5, prev.zoom * 1.2) 
  }));
  
  const zoomOut = () => setViewState(prev => ({ 
    ...prev, 
    zoom: Math.max(0.1, prev.zoom / 1.2) 
  }));
  
  const resetView = () => setViewState({ 
    zoom: 1, 
    offsetX: 0, 
    offsetY: 0, 
    isDragging: false
  });

  // معالجات التواصل مع RightSidebar
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    console.log('البحث عن:', query);
  }, []);

  const handleTasksSelected = useCallback((taskIds: string[]) => {
    setSelectedTaskIds(taskIds);
    console.log('المهام المحددة:', taskIds);
  }, []);

  const handleAddTask = useCallback((task: Partial<any>) => {
    console.log('إضافة مهمة جديدة:', task);
    
   
  }, []);

  const handleDeleteTasks = useCallback(() => {
    if (window && (window as any).ganttActions) {
      (window as any).ganttActions.deleteSelectedTasks();
      setSelectedTaskIds([]);
      console.log('تم حذف المهام المحددة');
    }
  }, []);

  const handleLinkTasks = useCallback(() => {
    if (window && (window as any).ganttActions) {
      (window as any).ganttActions.linkSelectedTasks();
      console.log('تم ربط المهام المحددة');
    }
  }, []);

  const handleUpdateTree = useCallback((newTree: HierarchyNode[]) => {
    setHierarchyTree(newTree);
  }, []);

  // 1. إضافة state للتحكم في الشريط الجانبي الأيمن
const [rightSidebarVisible, setRightSidebarVisible] = useState(true);

// 2. إضافة دالة للتحكم في إظهار/إخفاء الشريط
const handleToggleRightSidebar = useCallback(() => {
  setRightSidebarVisible(prev => !prev);
}, []);

const handleCloseRightSidebar = useCallback(() => {
  setRightSidebarVisible(false);
}, []);

  

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <ProjectHeader
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        rightSidebarVisible={rightSidebarVisible}
        onToggleRightSidebar={handleToggleRightSidebar}


        viewState={viewState}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        resetView={resetView}
        onOpenTreeEditor={handleOpenTreeEditor}
        onOpenFilter={() => setShowFilterModal(true)}
        activeFilters={activeFilters}
        onClearFilters={clearAllFilters}
        filterStats={filterStats}
        onOpenViewSettings={handleOpenViewSettings}
        viewSettings={viewSettings}
      />

      <ActiveFiltersDisplay
        filters={activeFilters}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={clearAllFilters}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Main Canvas Area */}
        <div className="flex-1 flex relative">
          <GanttCanvas
            sidebarCollapsed={sidebarCollapsed}
            viewState={viewState}
            setViewState={setViewState}
            searchQuery={searchQuery}
            selectedTaskIds={selectedTaskIds}
            onTaskDrop={handleAddTask}
            onTasksSelected={setSelectedTaskIds}
            showTreeEditor={showTreeEditor}
            setShowTreeEditor={setShowTreeEditor}
            hierarchyTree={getDisplayTree()}
            setHierarchyTree={setHierarchyTree}
            viewSettings={viewSettings}
          />
      
        </div>
        
        <div 
          className={`
            fixed top-16 right-0 h-[calc(100vh-4rem)] w-80 z-20
            transition-transform duration-300 ease-in-out
            ${rightSidebarVisible ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
          <RightSidebar
            viewState={viewState}
            setViewState={setViewState}
            onSearch={handleSearch}
            onTasksSelected={handleTasksSelected}
            onAddTask={handleAddTask}
            onDeleteTasks={handleDeleteTasks}
            onLinkTasks={handleLinkTasks}
            hierarchyTree={hierarchyTree}
            isVisible={rightSidebarVisible}
            onClose={handleCloseRightSidebar}
          />
        </div>


        {/* Tree Editor Modal */}
        {showTreeEditor && (
          <TreeEditorModal
            isOpen={showTreeEditor}
            onClose={() => setShowTreeEditor(false)}
            hierarchyTree={hierarchyTree}
            onUpdateTree={handleUpdateTree}
            onAddSection={addNewSection}
            onAddTask={addNewTaskToNode}
            onEditNode={editNodeContent}
            onDeleteNode={deleteNode}
          />
        )}

        {/* View Settings Modal */}
        {showViewSettings && (
          <ViewSettingsModal
            isOpen={showViewSettings}
            onClose={() => setShowViewSettings(false)}
            settings={viewSettings}
            onSettingsChange={handleViewSettingsChange}
          />
        )}

        {/* Filter Modal */}
        {showFilterModal && (
          <FilterModal
            isOpen={showFilterModal}
            onClose={() => setShowFilterModal(false)}
            onApplyFilter={handleApplyFilter}
            hierarchyTree={hierarchyTree}
            currentFilter={activeFilters}
          />
        )}

      </div>
    </div>
  );
};

export default ProjectManager;
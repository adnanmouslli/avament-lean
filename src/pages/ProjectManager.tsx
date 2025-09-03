"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GanttCanvas } from '@/components/projectManager/GanttCanvas';
import { ProjectHeader, ActiveTab } from '@/components/projectManager/ProjectHeader';
import { ProjectSettings, ProjectConfig, DelayReason } from '@/components/projectManager/ProjectSettings';
import RightSidebar from '@/components/projectManager/RightSidebar';
import { TreeEditorModal } from '@/components/projectManager/TreeEditorModal';
import { ViewSettingsModal, ViewSettings } from '@/components/projectManager/ViewSettingsModal';
import { TemplatesSidebar } from '@/components/projectManager/TemplatesSidebar'; // استيراد جديد

import { HierarchyNode } from '@/components/projectManager/GanttCanvas';

import { FilterModal, FilterCriteria } from '@/components/projectManager/filter/FilterModal';
import { applyFilterToTree, getFilterStatistics, hasActiveFilters } from '@/components/projectManager/filter/FilterUtils';
import { ActiveFiltersDisplay } from '@/components/projectManager/filter/ActiveFiltersDisplay';
import  TaskTemplates, { TaskTemplate }  from '@/components/projectManager/TaskTemplates';
import ProjectAnalytics from '@/components/Analytics/ProjectAnalytics';

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

// إضافة interface للمسؤول
export interface Manager {
  id: string;
  name: string;
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
  // Tab system
  const [activeTab, setActiveTab] = useState<ActiveTab>('gantt');

  // Project configuration
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>({
    name: "مشروع النظام الجديد",
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 90 days from now
    description: "وصف المشروع الجديد"
  });

  // Delay reasons
  const [delayReasons, setDelayReasons] = useState<DelayReason[]>([
    { id: '1', name: 'نقص الموارد' },
    { id: '2', name: 'تغيير المتطلبات' },
    { id: '3', name: 'تسريع العمل' }
  ]);

  // Task templates
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([
    {
      id: '1',
      name: 'قالب تطوير التطبيق',
      color: '#3b82f6',
      description: 'قالب أساسي لتطوير التطبيقات',
      tasks: [
        { 
          id: '1', 
          content: 'التحليل والتصميم',
          startDay: 0,
          duration: 5, 
          color: '#3b82f6', 
          type: 'task' as 'task' | 'milestone',
          row: 0,
          progress: 0
        },
        { 
          id: '2', 
          content: 'البرمجة والتطوير',
          startDay: 5,
          duration: 10, 
          color: '#10b981', 
          type: 'task' as 'task' | 'milestone',
          row: 1,
          progress: 0
        },
        { 
          id: '3', 
          content: 'الاختبار والمراجعة',
          startDay: 15,
          duration: 0, 
          color: '#f59e0b', 
          type: 'milestone' as 'task' | 'milestone',
          row: 2,
          progress: 0
        }
      ]
    },
    {
      id: '2',
      name: 'قالب مشروع البناء',
      color: '#ef4444',
      description: 'قالب لمشاريع البناء والتشييد',
      tasks: [
        { 
          id: '4', 
          content: 'أعمال الحفر',
          startDay: 0,
          duration: 3, 
          color: '#ef4444', 
          type: 'task' as 'task' | 'milestone',
          row: 0,
          progress: 0,
          author: 'فريق التنفيذ'
        },
        { 
          id: '5', 
          content: 'الأساسات',
          startDay: 3,
          duration: 7, 
          color: '#8b5cf6', 
          type: 'task' as 'task' | 'milestone',
          row: 1,
          progress: 0,
          author: 'مهندس المدني'
        },
        { 
          id: '6', 
          content: 'الهيكل الخرساني',
          startDay: 10,
          duration: 15, 
          color: '#06b6d4', 
          type: 'task' as 'task' | 'milestone',
          row: 2,
          progress: 0,
          author: 'فريق التنفيذ'
        }
      ]
    }
  ]);

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
    showTaskIds: false,
    showTodayLine: false,
    showHoverTask: false
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

  // إضافة state للمسؤولين
  const [managers, setManagers] = useState<Manager[]>([
    { id: 'manager-1', name: 'أحمد محمد', color: '#3b82f6' },
    { id: 'manager-2', name: 'فاطمة علي', color: '#ef4444' },
    { id: 'manager-3', name: 'محمد حسن', color: '#10b981' }
  ]);

  // Right sidebar
  const [rightSidebarVisible, setRightSidebarVisible] = useState(false);

  // إضافة state جديد للـ Templates Sidebar
  const [leftSidebarVisible, setLeftSidebarVisible] = useState(false);

  // Tab change handler
  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
  }, []);

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
      author: newTask.author,
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

  const handleToggleRightSidebar = useCallback(() => {
    setRightSidebarVisible(prev => !prev);
  }, []);

  const handleCloseRightSidebar = useCallback(() => {
    setRightSidebarVisible(false);
  }, []);

  // إضافة معالجات جديدة للـ Left Sidebar
  const handleToggleLeftSidebar = useCallback(() => {
    setLeftSidebarVisible(prev => !prev);
  }, []);

  const handleCloseLeftSidebar = useCallback(() => {
    setLeftSidebarVisible(false);
  }, []);

  const handleMultipleTasksSelected = useCallback((taskIds: string[]) => {
    setSelectedTaskIds(taskIds);
    console.log('المهام المحددة:', taskIds);
  }, []);

  // دالة لتحديث جميع المهام المرتبطة بمسؤول معين
  const updateTasksByManager = useCallback((managerId: string, updatedManager: Manager) => {
    setHierarchyTree(prev => {
      const updateTasksInTree = (nodes: HierarchyNode[]): HierarchyNode[] => {
        return nodes.map(node => ({
          ...node,
          tasks: node.tasks.map(task => 
            (task as any).managerId === managerId 
              ? { ...task, color: updatedManager.color, author: updatedManager.name }
              : task
          ),
          children: updateTasksInTree(node.children)
        }));
      };
      return updateTasksInTree(prev);
    });
  }, []);

  // دالة تحديث الشركة
  const updateManager = useCallback((managerId: string, updatedData: Partial<Manager>) => {
    setManagers(prev => {
      const updated = prev.map(manager => 
        manager.id === managerId 
          ? { ...manager, ...updatedData }
          : manager
      );
      
      // تحديث المهام المرتبطة
      const updatedManager = updated.find(m => m.id === managerId);
      if (updatedManager) {
        updateTasksByManager(managerId, updatedManager);
      }
      
      return updated;
    });
  }, [updateTasksByManager]);

  // Project settings handlers
  const handleUpdateProject = useCallback((config: ProjectConfig) => {
    setProjectConfig(config);
  }, []);

  const handleUpdateDelayReasons = useCallback((reasons: DelayReason[]) => {
    setDelayReasons(reasons);
  }, []);

  const handleUpdateTaskTemplates = useCallback((templates: TaskTemplate[]) => {
    setTaskTemplates(templates);
  }, []);

  // إضافة معالج تطبيق القالب
  const handleApplyTemplate = useCallback((template: TaskTemplate) => {
    console.log('تطبيق القالب:', template.name);
    // يمكن إضافة منطق إضافي هنا مثل إظهار modal لاختيار المكان
  }, []);

  
  // تحويل projectConfig.startDate إلى Date object للتحليلات
  const projectStartDate = new Date(projectConfig.startDate);

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <ProjectHeader
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        rightSidebarVisible={rightSidebarVisible}
        onToggleRightSidebar={handleToggleRightSidebar}
        leftSidebarVisible={leftSidebarVisible}
        onToggleLeftSidebar={handleToggleLeftSidebar}
        activeTab={activeTab}
        onTabChange={handleTabChange}
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
        projectName={projectConfig.name}
      />

      {/* Active Filters Display - only show for Gantt tab */}
      {activeTab === 'gantt' && (
        <ActiveFiltersDisplay
          filters={activeFilters}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={clearAllFilters}
        />
      )}
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar للقوالب - only show for Gantt tab */}
        {activeTab === 'gantt' && (
          <TemplatesSidebar
            isVisible={leftSidebarVisible}
            onClose={handleCloseLeftSidebar}
            taskTemplates={taskTemplates}
            onApplyTemplate={handleApplyTemplate}
          />
        )}

        {/* Main Content Area */}
        <div className="flex-1 relative">
          {activeTab === 'gantt' ? (
            <GanttCanvas
              sidebarCollapsed={sidebarCollapsed}
              viewState={viewState}
              setViewState={setViewState}
              searchQuery={searchQuery}
              selectedTaskIds={selectedTaskIds}
              onTaskDrop={handleAddTask}
              onTasksSelected={handleMultipleTasksSelected}
              showTreeEditor={showTreeEditor}
              setShowTreeEditor={setShowTreeEditor}
              hierarchyTree={getDisplayTree()}
              setHierarchyTree={setHierarchyTree}
              viewSettings={viewSettings}
            />
          ) : activeTab === 'analytics' ? (
            <ProjectAnalytics
              hierarchyTree={hierarchyTree}
              projectStartDate={projectStartDate}
            />
          ) : activeTab === 'templates' ? (
              <TaskTemplates
                taskTemplates={taskTemplates}
                onUpdateTaskTemplates={handleUpdateTaskTemplates}
                onApplyTemplate={(template) => {
                  console.log('Applying template:', template);
                }}
                managers={managers}
              />
            ) : (
            <ProjectSettings
              projectConfig={projectConfig}
              onUpdateProject={handleUpdateProject}
              delayReasons={delayReasons}
              onUpdateDelayReasons={handleUpdateDelayReasons}
            />
          )}
        </div>
        
        {/* Right Sidebar - محسن مثل TemplatesSidebar */}
        <div 
          className={`
            fixed top-14 right-0 h-[calc(100vh-3.5rem)] w-80 z-30
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
            managers={managers}
            onUpdateManager={updateManager}
            onAddManager={(newManager) => setManagers(prev => [...prev, newManager])}
            onDeleteManager={(managerId) => {
              setManagers(prev => prev.filter(m => m.id !== managerId));
            }}
          />
        </div>

        {/* Modals - only show for Gantt tab */}
        {activeTab === 'gantt' && (
          <>
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
          </>
        )}

      </div>
    </div>
  );
};

export default ProjectManager;
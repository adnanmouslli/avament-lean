"use client";

import React, { useState } from 'react';
import { GanttCanvas } from '@/components/projectManager/GanttCanvas';
import { ProjectHeader } from '@/components/projectManager/ProjectHeader';

interface ViewState {
  zoom: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
}

const ProjectManager: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    isDragging: false
  });

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

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
      <ProjectHeader
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        viewState={viewState}
        zoomIn={zoomIn}
        zoomOut={zoomOut}
        resetView={resetView}
        projectName={projectName}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <GanttCanvas
          sidebarCollapsed={sidebarCollapsed}
          viewState={viewState}
          setViewState={setViewState}
        />
      </div>
    </div>
  );
};

export default ProjectManager;
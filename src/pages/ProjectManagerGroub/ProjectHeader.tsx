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

// Header Component
export const ProjectHeader = ({ 
  sidebarCollapsed, 
  setSidebarCollapsed, 
  viewState, 
  zoomIn, 
  zoomOut, 
  resetView,
  projectName 
}: {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  viewState: ViewState;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  projectName: string;
}) => {
  return (
    <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-2 h-14">
      <div className="flex items-center justify-between h-full">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded hover:bg-gray-100"
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          
          <div className="flex items-center space-x-2">
            <img 
              src="/AVAMENT_big.png" 
              alt="AVAMENT Logo" 
              className="h-8 w-auto"
              onError={(e) => {
                // Fallback to gradient icon if image fails to load
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-1.5 rounded-lg hidden">
              <Target size={16} />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <h1 className="text-lg font-bold text-gray-900">
              AVAMENT
              <span className="text-blue-600 ml-1">- LEAN</span>
            </h1>
            <div className="h-4 w-px bg-gray-300" />
            <span className="text-sm text-gray-600 font-medium">{projectName}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 space-x-0.5">
            <button onClick={zoomOut} className="p-1.5 hover:bg-white rounded text-xs" title="تصغير">
              <ZoomOut size={14} />
            </button>
            <span className="px-2 text-xs font-medium min-w-12 text-center">
              {Math.round(viewState.zoom * 100)}%
            </span>
            <button onClick={zoomIn} className="p-1.5 hover:bg-white rounded text-xs" title="تكبير">
              <ZoomIn size={14} />
            </button>
            <button onClick={resetView} className="p-1.5 hover:bg-white rounded text-blue-600 text-xs" title="إعادة تعيين">
              <RotateCcw size={14} />
            </button>
          </div>

          <button className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center space-x-1.5 text-sm">
            <Plus size={14} />
            <span>مهمة جديدة</span>
          </button>

          <div className="flex items-center bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5" />
            Pro
          </div>
        </div>
      </div>
    </div>
  );
};
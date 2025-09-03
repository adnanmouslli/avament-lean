"use client";

import React, { useState, useCallback } from 'react';
import {
  Settings,
  Calendar,
  Type,
  AlertTriangle,
  Layers,
  Plus,
  X,
  Save,
  RotateCcw,
  ChevronRight,
  Edit,
  Trash2,
  CalendarOff,
  Clock
} from 'lucide-react';
import { DelayReasonsSettings } from '../settings/DelayReasonsSettings';
import { GeneralSettings } from '../settings/GeneralSettings';

// Types
export interface ProjectConfig {
  name: string;
  startDate: string;
  endDate: string;
  description?: string;
}

export interface DelayReason {
  id: string;
  name: string;
}


interface ProjectSettingsProps {
  projectConfig: ProjectConfig;
  onUpdateProject: (config: ProjectConfig) => void;
  delayReasons: DelayReason[];
  onUpdateDelayReasons: (reasons: DelayReason[]) => void;
}

// Updated ProjectHeader interface
export interface TabType {
  id: 'gantt' | 'settings';
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

export const ProjectSettings: React.FC<ProjectSettingsProps> = ({
  projectConfig,
  onUpdateProject,
  delayReasons,
  onUpdateDelayReasons,
  
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'reasons' | 'templates'>('general');
  const [editingProject, setEditingProject] = useState<ProjectConfig>(projectConfig);
  const [editingReasons, setEditingReasons] = useState<DelayReason[]>(delayReasons);




  const handleSaveProject = useCallback(() => {
    onUpdateProject(editingProject);
  }, [editingProject, onUpdateProject]);

  const handleResetProject = useCallback(() => {
    setEditingProject(projectConfig);
  }, [projectConfig]);


  const handleDeleteReason = useCallback((reasonId: string) => {
    const updatedReasons = editingReasons.filter(r => r.id !== reasonId);
    setEditingReasons(updatedReasons);
    onUpdateDelayReasons(updatedReasons);
  }, [editingReasons, onUpdateDelayReasons]);



  function calculateDuration(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }





  return (
  <div className="h-full w-full flex bg-gray-50">
    {/* Settings Sidebar */}
    <div className="w-64 bg-white border-r border-gray-200 h-full flex flex-col">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Settings size={20} />
          إعدادات المشروع
        </h2>
      </div>
      
      <nav className="flex-1 p-3">
        {[
          { id: 'general', label: 'الإعدادات العامة', icon: Settings, color: 'blue' },
          { id: 'reasons', label: 'مسببات', icon: AlertTriangle, color: 'orange' }
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all mb-1 ${
                isActive
                  ? `bg-${item.color}-50 text-${item.color}-600 shadow-sm border-r-3 border-${item.color}-500`
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon size={18} className={isActive ? `text-${item.color}-500` : 'text-gray-400'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>

    {/* Settings Content - Full Width */}
    <div className="flex-1 h-full overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="p-8">
          {activeTab === 'general' && (
            <GeneralSettings 
            />
          )}
          
          {activeTab === 'reasons' && (
            <DelayReasonsSettings
              editingReasons={editingReasons}
              handleDeleteReason={handleDeleteReason}
              onUpdateDelayReasons={onUpdateDelayReasons}
            />
          )}
        </div>
      </div>
    </div>
  </div>
);

  
};


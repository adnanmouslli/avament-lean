"use client";

import React from 'react';
import { 
  Plus,
  Target,
  PanelLeftOpen,
  PanelLeftClose,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  ChevronLeft,
  GitBranch,
  Settings,
  X,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';
import { FilterCriteria } from './filter/FilterModal';
import { hasActiveFilters } from './filter/FilterUtils';
import { ViewSettings } from './ViewSettingsModal';

interface ViewState {
  zoom: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
}

interface ProjectHeaderProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;

    rightSidebarVisible?: boolean;
  onToggleRightSidebar?: () => void;


  viewState: ViewState;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;

  onOpenTreeEditor?: () => void;

  onOpenFilter?: () => void;
  activeFilters?: FilterCriteria;
  onClearFilters?: () => void;
  filterStats?: {
    originalTaskCount: number;
    filteredTaskCount: number;
    originalNodeCount: number;
    filteredNodeCount: number;
  };

  // إضافة الخصائص الجديدة لإعدادات العرض
  onOpenViewSettings?: () => void;
  viewSettings?: ViewSettings;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({ 
  sidebarCollapsed, 
  setSidebarCollapsed, 

    rightSidebarVisible = false,
  onToggleRightSidebar,


  viewState, 
  zoomIn, 
  zoomOut, 
  resetView,
  onOpenTreeEditor,
  activeFilters,
  filterStats,
  onClearFilters,
  onOpenFilter,
  onOpenViewSettings,
  viewSettings
}) => {

  // حساب عدد الإعدادات النشطة
  const getActiveViewSettingsCount = (): number => {
    if (!viewSettings) return 0;
    return Object.values(viewSettings).filter(Boolean).length;
  };

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
          </div>
        </div>

        <div className="flex items-center space-x-2">
          
          {/* الفلاتر */}
          <div className="flex items-center space-x-2">
            {hasActiveFilters(activeFilters || {}) && (
              <>
                {filterStats && (
                  <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                    {filterStats.filteredTaskCount} من {filterStats.originalTaskCount} مهمة
                  </div>
                )}
                <button
                  onClick={onClearFilters}
                  className="flex items-center space-x-1 px-2 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  title="مسح جميع الفلاتر"
                >
                  <X size={14} />
                  <span>مسح</span>
                </button>
              </>
            )}

            <button
              onClick={onOpenFilter}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                hasActiveFilters(activeFilters || {})
                  ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
              title="فتح الفلاتر"
            >
              <Filter size={16} />
              <span>فلتر</span>
              {hasActiveFilters(activeFilters || {}) && (
                <span className="bg-white text-blue-600 text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {Object.keys(activeFilters || {}).length}
                </span>
              )}
            </button>
          </div>


          {/* إعدادات العرض - أيقونة العين */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 space-x-0.5">    

            {onOpenViewSettings && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={onOpenViewSettings}
                  className="flex items-center justify-center w-9 h-7 hover:bg-white/50 rounded-lg transition-colors"
                  title="إعدادات العرض"
                >
                  <Eye size={16} />
                </button>
            
              </div>
            )}
          </div>


          {/* أدوات التحرير */}
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 space-x-0.5">    
            {onOpenTreeEditor && (
              <button
                onClick={onOpenTreeEditor}
                className="flex items-center justify-center w-9 h-7 hover:bg-white/50 rounded-lg transition-colors"
                title="تحرير هيكل المشروع"
              >
                <GitBranch size={16} />
              </button>
            )}
          </div>
          
          {/* أدوات التكبير والتصغير */}
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

          {/* شريط الأدوات الجانبي */}
          {/* <button
            onClick={toggleRightSidebar}
            className="flex items-center gap-1 p-2 hover:bg-white/50 rounded-lg transition-colors"
            title={rightSidebarVisible ? "إخفاء شريط الأدوات" : "إظهار شريط الأدوات"}
          >
            <Settings size={16} />
            {rightSidebarVisible ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button> */}

          <button
          onClick={onToggleRightSidebar}
          className={`p-2 rounded-lg transition-colors ${
            rightSidebarVisible 
              ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
              : 'hover:bg-gray-100 text-gray-600'
          }`}
          title={rightSidebarVisible ? "إخفاء لوحة الأدوات" : "إظهار لوحة الأدوات"}
        >
           <Settings size={18} />
        </button>

        </div>
      </div>
    </div>
  );
};
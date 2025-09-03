"use client";

import React, { useState } from 'react';
import { 
  Package, 
  X, 
  ChevronDown, 
  ChevronRight, 
  GripVertical,
  Clock,
  User,
  Target
} from 'lucide-react';

interface Task {
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
}

interface TaskLink {
  id: string;
  sourceTaskId: string;
  targetTaskId: string;
  sourcePoint: 'start' | 'end';
  targetPoint: 'start' | 'end';
  color: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  description?: string;
  color: string;
  tasks: Task[];
  links?: TaskLink[];
}

interface TemplatesSidebarProps {
  isVisible: boolean;
  onClose: () => void;
  taskTemplates: TaskTemplate[];
  onApplyTemplate?: (template: TaskTemplate) => void;
}

interface TemplateCardProps {
  template: TaskTemplate;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  isExpanded,
  onToggleExpanded
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'template',
      template: template
    }));
    e.dataTransfer.effectAllowed = 'copy';
    
    // إنشاء صورة مصغرة للسحب
    const dragImage = document.createElement('div');
    dragImage.innerHTML = `
      <div style="
        background: white; 
        border: 2px solid ${template.color}; 
        border-radius: 8px; 
        padding: 8px 12px; 
        font-size: 14px; 
        font-weight: 600;
        color: ${template.color};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      ">
        📦 ${template.name} (${template.tasks.length} مهمة)
      </div>
    `;
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-1000px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    
    // إزالة العنصر بعد بدء السحب
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  return (
    <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden hover:shadow-md transition-shadow">
      {/* رأس البطاقة */}
      <div
        draggable
        onDragStart={handleDragStart}
        className="p-3 cursor-move hover:bg-gray-50 transition-colors"
        style={{ borderLeft: `4px solid ${template.color}` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <GripVertical size={16} className="text-gray-400" />
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{template.name}</h3>
              {template.description && (
                <p className="text-xs text-gray-500 mt-1">{template.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {template.tasks.length} مهمة
            </span>
            <button
              onClick={onToggleExpanded}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* تفاصيل المهام - قابلة للطي */}
      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="p-3 space-y-2">
            <div className="text-xs font-medium text-gray-700 mb-2">
              المهام المتضمنة:
            </div>
            {template.tasks.slice(0, 5).map((task, index) => (
              <div
                key={task.id}
                className="flex items-center justify-between text-xs p-2 bg-white rounded border"
                style={{ borderLeft: `3px solid ${task.color}` }}
              >
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full text-center text-white text-xs leading-5"
                        style={{ backgroundColor: task.color }}>
                    {index + 1}
                  </span>
                  <span className="font-medium">{task.content}</span>
                  {task.type === 'milestone' && (
                    <Target size={12} className="text-orange-500" />
                  )}
                </div>
                <div className="flex items-center space-x-1 text-gray-500">
                  {task.type !== 'milestone' && (
                    <>
                      <Clock size={10} />
                      <span>{task.duration}د</span>
                    </>
                  )}
                  {task.author && (
                    <>
                      <User size={10} />
                      <span className="truncate max-w-16" title={task.author}>
                        {task.author}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
            
            {template.tasks.length > 5 && (
              <div className="text-xs text-gray-500 text-center py-1">
                و {template.tasks.length - 5} مهمة أخرى...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const TemplatesSidebar: React.FC<TemplatesSidebarProps> = ({
  isVisible,
  onClose,
  taskTemplates,
  onApplyTemplate
}) => {
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggleExpanded = (templateId: string) => {
    setExpandedTemplates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(templateId)) {
        newSet.delete(templateId);
      } else {
        newSet.add(templateId);
      }
      return newSet;
    });
  };

  // فلترة القوالب حسب البحث
  const filteredTemplates = taskTemplates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.tasks.some(task => 
      task.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className={`
      fixed top-14 left-0 h-[calc(100vh-3.5rem)] w-80 z-30
      bg-white border-r border-gray-200 shadow-sm
      transition-transform duration-300 ease-in-out
      ${isVisible ? 'translate-x-0' : '-translate-x-full'}
    `}>
      {/* رأس الشريط الجانبي */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="bg-gray-700 p-1.5 rounded">
              <Package size={16} className="text-white" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">القوالب</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* شريط البحث */}
        <input
          type="text"
          placeholder="بحث..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm 
                   focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* محتوى القوالب */}
      <div className="p-4 h-full overflow-y-auto">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-16">
            <Package size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {searchQuery ? 'لا توجد نتائج' : 'لا توجد قوالب'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-xs text-gray-500 mb-3 font-medium">
              {filteredTemplates.length} قالب
            </div>
            {filteredTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                isExpanded={expandedTemplates.has(template.id)}
                onToggleExpanded={() => handleToggleExpanded(template.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
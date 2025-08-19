"use client";

import { 
  ChevronDown, 
  ChevronRight, 
  Building2,
  Layers3,

} from 'lucide-react';



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




// Sidebar Component
export const ProjectSidebar = ({ 
  hierarchyTree, 
  selectedNode, 
  setSelectedNode, 
  expandedNodes, 
  setExpandedNodes,
  sidebarCollapsed,
  sidebarWidth,
  setSidebarWidth
}: {
  hierarchyTree: HierarchyNode[];
  selectedNode: HierarchyNode | null;
  setSelectedNode: (node: HierarchyNode) => void;
  expandedNodes: Set<string>;
  setExpandedNodes: React.Dispatch<React.SetStateAction<Set<string>>>;
  sidebarCollapsed: boolean;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
}) => {
  
  const SidebarNode = ({ node, level = 0 }: { node: HierarchyNode; level?: number }) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNode?.id === node.id;
    
    return (
      <div className="w-full">
        <div 
          className={`
            group cursor-pointer transition-all duration-200 border-l-2 hover:bg-gray-50
            ${isSelected ? 'bg-blue-50 border-l-blue-500' : 'border-l-transparent'}
          `}
          onClick={() => setSelectedNode(node)}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
        >
          <div className="flex items-center py-2 px-2">
            {hasChildren && (
              <button 
                className="mr-1.5 p-0.5 rounded hover:bg-white"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedNodes(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(node.id)) {
                      newSet.delete(node.id);
                    } else {
                      newSet.add(node.id);
                    }
                    return newSet;
                  });
                }}
              >
                {isExpanded ? 
                  <ChevronDown size={14} className="text-gray-600" /> : 
                  <ChevronRight size={14} className="text-gray-600" />
                }
              </button>
            )}

            <div className="mr-2">
              {node.type === 'project' && <Building2 className="text-blue-600" size={16} />}
              {node.type === 'section' && <Layers3 className="text-purple-600" size={14} />}
              {node.type === 'task' && (
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: node.color }} />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className={`truncate text-sm ${isSelected ? 'text-blue-700 font-semibold' : 'text-gray-800'}`}>
                {node.content}
              </div>
              {!sidebarCollapsed && node.tasks && (
                <div className="text-xs text-gray-500">
                  {node.tasks.length} مهام
                </div>
              )}
            </div>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {node.children.map((child: HierarchyNode) => (
              <SidebarNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className="bg-white border-r border-gray-200 flex flex-col transition-all duration-300 relative"
      style={{ width: sidebarCollapsed ? '50px' : `${sidebarWidth}px` }}
    >
      {!sidebarCollapsed && (
        <div className="px-3 py-2 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center">
            <Layers3 className="mr-2 text-purple-600" size={16} />
            الهيكل الهرمي
          </h3>
        </div>
      )}
      
      <div className="flex-1 overflow-auto">
        {sidebarCollapsed ? (
          <div className="p-1">
            {hierarchyTree.map((project) => (
              <button
                key={project.id}
                onClick={() => setSelectedNode(project)}
                className={`w-full p-2 rounded mb-1 transition-all ${
                  selectedNode?.id === project.id ? 'bg-blue-100' : 'hover:bg-gray-100'
                }`}
                title={project.content}
              >
                <Building2 size={16} className="text-blue-600" />
              </button>
            ))}
          </div>
        ) : (
          <div className="py-1">
            {hierarchyTree.map((project) => (
              <SidebarNode key={project.id} node={project} level={0} />
            ))}
          </div>
        )}
      </div>

      {/* مقبض تغيير حجم الشريط الجانبي */}
      {!sidebarCollapsed && (
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-gray-200 hover:bg-blue-400 transition-colors"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = sidebarWidth;
            
            const handleResize = (e: MouseEvent) => {
              const newWidth = Math.max(200, Math.min(500, startWidth + (e.clientX - startX)));
              setSidebarWidth(newWidth);
            };
            
            const handleResizeEnd = () => {
              document.removeEventListener('mousemove', handleResize);
              document.removeEventListener('mouseup', handleResizeEnd);
            };
            
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', handleResizeEnd);
          }}
        />
      )}
    </div>
  );
};
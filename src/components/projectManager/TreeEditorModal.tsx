import React, { useState, useCallback } from 'react';
import { 
  X, Plus, Trash2, Edit2, ChevronRight, ChevronDown,
  Save, GripVertical
} from 'lucide-react';
import { HierarchyNode } from './GanttCanvas';

interface TreeEditorSidebarProps {
  isVisible: boolean;
  onClose: () => void;
  hierarchyTree: HierarchyNode[];
  onUpdateTree: (newTree: HierarchyNode[]) => void;
  onAddSection: (parentId: string, name: string) => HierarchyNode;
  onEditNode: (nodeId: string, newContent: string) => void;
  onDeleteNode: (nodeId: string) => void;
}

export const TreeEditorSidebar: React.FC<TreeEditorSidebarProps> = ({
  isVisible,
  onClose,
  hierarchyTree,
  onUpdateTree,
  onAddSection,
  onEditNode,
  onDeleteNode
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  const toggleExpanded = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      newSet.has(nodeId) ? newSet.delete(nodeId) : newSet.add(nodeId);
      return newSet;
    });
  }, []);

  const handleEditStart = useCallback((node: HierarchyNode) => {
    setEditingNodeId(node.id);
    setEditContent(node.content);
  }, []);

  const handleEditSave = useCallback(() => {
    if (editingNodeId && editContent.trim()) {
      onEditNode(editingNodeId, editContent.trim());
      setEditingNodeId(null);
      setEditContent('');
    }
  }, [editingNodeId, editContent, onEditNode]);

  const handleEditCancel = useCallback(() => {
    setEditingNodeId(null);
    setEditContent('');
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, nodeId: string) => {
    setDraggedNodeId(nodeId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', nodeId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, nodeId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    if (y < height * 0.33) {
      setDropPosition('before');
    } else if (y > height * 0.66) {
      setDropPosition('after');
    } else {
      setDropPosition('inside');
    }
    
    setDragOverNodeId(nodeId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverNodeId(null);
    setDropPosition(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetNodeId: string) => {
    e.preventDefault();
    
    if (!draggedNodeId || draggedNodeId === targetNodeId) {
      setDraggedNodeId(null);
      setDragOverNodeId(null);
      setDropPosition(null);
      return;
    }

    moveNode(draggedNodeId, targetNodeId, dropPosition || 'inside');
    
    setDraggedNodeId(null);
    setDragOverNodeId(null);
    setDropPosition(null);
  }, [draggedNodeId, dropPosition]);

  const moveNode = useCallback((sourceId: string, targetId: string, position: 'before' | 'after' | 'inside') => {
    const newTree = JSON.parse(JSON.stringify(hierarchyTree));
    
    let sourceNode: HierarchyNode | null = null;
    
    const removeNode = (nodes: HierarchyNode[]): HierarchyNode[] => {
      return nodes.filter(node => {
        if (node.id === sourceId) {
          sourceNode = node;
          return false;
        }
        node.children = removeNode(node.children);
        return true;
      });
    };
    
    const treeWithoutSource = removeNode(newTree);
    
    if (!sourceNode) return;
    
    const insertNode = (nodes: HierarchyNode[]): HierarchyNode[] => {
      const result: HierarchyNode[] = [];
      
      for (const node of nodes) {
        if (node.id === targetId) {
          if (position === 'before') {
            result.push(sourceNode!);
            result.push({ ...node, children: insertNode(node.children) });
          } else if (position === 'after') {
            result.push({ ...node, children: insertNode(node.children) });
            result.push(sourceNode!);
          } else {
            result.push({
              ...node,
              children: [...insertNode(node.children), sourceNode!]
            });
          }
        } else {
          result.push({
            ...node,
            children: insertNode(node.children)
          });
        }
      }
      
      return result;
    };
    
    const finalTree = insertNode(treeWithoutSource);
    onUpdateTree(finalTree);
  }, [hierarchyTree, onUpdateTree]);

  const handleAddNewSection = useCallback((parentId: string) => {
    const newNode = onAddSection(parentId, 'قسم جديد');
    setExpandedNodes(prev => new Set([...prev, parentId]));
  }, [onAddSection]);

  const renderDropIndicator = useCallback((nodeId: string) => {
    if (dragOverNodeId !== nodeId || !dropPosition) return null;
    
    const indicatorClass = dropPosition === 'before' 
      ? 'absolute top-0 left-0 right-0 h-0.5 bg-blue-500'
      : dropPosition === 'after'
      ? 'absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500'
      : 'absolute inset-0 border-2 border-blue-500 border-dashed bg-blue-50/30 rounded';
    
    return <div className={indicatorClass} />;
  }, [dragOverNodeId, dropPosition]);

  const renderTreeNode = useCallback((node: HierarchyNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isEditing = editingNodeId === node.id;
    const isDragging = draggedNodeId === node.id;

    return (
      <div key={node.id} className="relative">
        <div
          className={`
            relative flex items-center py-2 px-3 hover:bg-gray-50 group transition-all duration-200
            ${isDragging ? 'opacity-50' : ''}
            ${node.type === 'project' ? 'bg-gray-50 border-l-4 border-gray-400' : ''}
          `}
          style={{ paddingLeft: `${level * 20 + 12}px` }}
          draggable={!isEditing}
          onDragStart={(e) => handleDragStart(e, node.id)}
          onDragOver={(e) => handleDragOver(e, node.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, node.id)}
        >
          {renderDropIndicator(node.id)}
          
          {/* مقبض السحب */}
          <div className="opacity-0 group-hover:opacity-100 mr-3 cursor-grab">
            <GripVertical size={16} className="text-gray-400" />
          </div>

          {/* زر الطي/الفتح */}
          <button
            onClick={() => toggleExpanded(node.id)}
            className="p-1 hover:bg-gray-200 rounded mr-3"
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown size={16} className="text-gray-600" />
              ) : (
                <ChevronRight size={16} className="text-gray-600" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
          </button>

          {/* محتوى العقدة */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 px-3 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditSave();
                    if (e.key === 'Escape') handleEditCancel();
                  }}
                />
                <button 
                  onClick={handleEditSave} 
                  className="p-2 text-green-600 hover:bg-green-100 rounded"
                >
                  <Save size={16} />
                </button>
                <button 
                  onClick={handleEditCancel} 
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className={`text-base leading-relaxed ${
                  node.type === 'project' ? 'font-bold text-gray-900' :
                  node.type === 'section' ? 'font-semibold text-gray-800' :
                  'font-medium text-gray-700'
                }`}>
                  {node.content}
                </span>
                
                {/* أزرار التحكم */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                  <button
                    onClick={() => handleAddNewSection(node.id)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded"
                    title="إضافة قسم فرعي"
                  >
                    <Plus size={16} />
                  </button>
                  <button
                    onClick={() => handleEditStart(node)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                    title="تعديل"
                  >
                    <Edit2 size={16} />
                  </button>
                  {node.type !== 'project' && (
                    <button
                      onClick={() => onDeleteNode(node.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded"
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* الأطفال */}
        {isExpanded && hasChildren && (
          <div className="border-l-2 border-gray-200 ml-8">
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  }, [
    expandedNodes, editingNodeId, editContent, draggedNodeId, dragOverNodeId, dropPosition,
    toggleExpanded, handleEditStart, handleEditSave, handleEditCancel, 
    handleDragStart, handleDragOver, handleDragLeave, handleDrop,
    handleAddNewSection, onDeleteNode, renderDropIndicator
  ]);

  if (!isVisible) return null;

  return (
    <div className={`
      fixed top-14 left-0 h-[calc(100vh-3.5rem)] w-96 bg-white shadow-xl z-30
      transition-transform duration-300 ease-in-out
      ${isVisible ? 'translate-x-0' : '-translate-x-full'}
      border-r border-gray-200
    `}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div>
          <h2 className="text-lg font-bold text-gray-900">محرر هيكل المشروع</h2>
          <p className="text-sm text-gray-600 mt-1">سحب وإفلات لإعادة الترتيب</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X size={20} className="text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {hierarchyTree.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-bold text-gray-900 mb-3">لا توجد مشاريع بعد</h3>
            <p className="text-base text-gray-600 mb-8">ابدأ بإنشاء مشروعك الأول</p>
            <button 
              onClick={() => handleAddNewSection('root')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg text-base font-semibold hover:bg-blue-700 transition-colors"
            >
              إضافة مشروع جديد
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {hierarchyTree.map(node => renderTreeNode(node, 0))}
          </div>
        )}
      </div>
    </div>
  );
};
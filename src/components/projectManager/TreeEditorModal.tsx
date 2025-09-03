import React, { useState, useCallback } from 'react';
import { 
  X, Plus, Trash2, Edit2, ChevronRight, ChevronDown,
  FolderPlus, Save, Building2, AlertTriangle
} from 'lucide-react';
import { HierarchyNode } from './GanttCanvas';

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

interface TreeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  hierarchyTree: HierarchyNode[];
  onUpdateTree: (newTree: HierarchyNode[]) => void;
  onAddSection: (parentId: string, name: string) => HierarchyNode;
  onAddTask: (nodeId: string, task: Partial<Task>) => void;
  onEditNode: (nodeId: string, newContent: string) => void;
  onDeleteNode: (nodeId: string) => void;
}

const DeleteConfirmationModal: React.FC<{
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  itemName: string;
  itemType: string;
}> = ({ isOpen, onConfirm, onCancel, itemName, itemType }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-red-200">
        <div className="flex items-center justify-between p-4 border-b border-red-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">تأكيد الحذف</h3>
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm text-slate-700 mb-2">
            هل أنت متأكد من حذف {itemType}:
          </p>
          <p className="text-sm font-semibold text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-200">
            "{itemName}"
          </p>
          <p className="text-xs text-red-600 mt-3 font-medium">
            تحذير: لا يمكن التراجع عن هذا الإجراء
          </p>
        </div>
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-slate-100">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-300 transition-all duration-200"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            حذف نهائياً
          </button>
        </div>
      </div>
    </div>
  );
};

export const TreeEditorModal: React.FC<TreeEditorModalProps> = ({
  isOpen,
  onClose,
  hierarchyTree,
  onUpdateTree,
  onAddSection,
  onAddTask,
  onEditNode,
  onDeleteNode
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [showAddSection, setShowAddSection] = useState<string | null>(null);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    nodeId: string;
    nodeName: string;
    nodeType: string;
  }>({
    isOpen: false,
    nodeId: '',
    nodeName: '',
    nodeType: ''
  });

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

  const handleAddSection = useCallback((parentId: string) => {
    if (newSectionName.trim()) {
      onAddSection(parentId, newSectionName.trim());
      setNewSectionName('');
      setShowAddSection(null);
      setExpandedNodes(prev => new Set([...prev, parentId]));
    }
  }, [newSectionName, onAddSection]);

  const handleDeleteClick = useCallback((node: HierarchyNode) => {
    const nodeType = node.type === 'section' ? 'القسم' : 'العنصر';
    setDeleteConfirmation({
      isOpen: true,
      nodeId: node.id,
      nodeName: node.content,
      nodeType
    });
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    onDeleteNode(deleteConfirmation.nodeId);
    setDeleteConfirmation({
      isOpen: false,
      nodeId: '',
      nodeName: '',
      nodeType: ''
    });
  }, [deleteConfirmation.nodeId, onDeleteNode]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmation({
      isOpen: false,
      nodeId: '',
      nodeName: '',
      nodeType: ''
    });
  }, []);

  const renderTreeNode = useCallback((node: HierarchyNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isEditing = editingNodeId === node.id;
    const isShowingAddSection = showAddSection === node.id;

    
    return (
      <div key={node.id} className="relative">
        {/* صف العقدة */}
        <div
          className={`relative flex items-center py-3 px-4 hover:bg-slate-50/80 group transition-all duration-200
            ${level > 0 ? 'before:absolute before:top-1/2 before:-left-6 before:w-6 before:h-0.5 before:bg-slate-300' : ''}
            ${node.type === 'project' ? 'bg-gradient-to-r from-blue-50/50 to-indigo-50/30' : ''}
          `}
            style={{ paddingLeft: `${level === 0 ? 0 : level * 24}px` }}
        >
          {/* زر الطي/الفتح */}
          {hasChildren && (
            <button
              onClick={() => toggleExpanded(node.id)}
              className="p-1.5 hover:bg-slate-200/70 rounded-md transition-all duration-200 mr-3 shadow-sm"
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-slate-600" />
              ) : (
                <ChevronRight size={16} className="text-slate-600" />
              )}
            </button>
          )}

          {/* محتوى العقدة */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 px-4 py-2.5 border-2 border-blue-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white shadow-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditSave();
                    if (e.key === 'Escape') handleEditCancel();
                  }}
                />
                <button onClick={handleEditSave} className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg">
                  <Save size={16} />
                </button>
                <button onClick={handleEditCancel} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className={`text-sm truncate ${
                  node.type === 'project' ? 'font-semibold text-slate-900' :
                  node.type === 'section' ? 'font-medium text-slate-800' :
                  'font-normal text-slate-700'
                }`}>
                  {node.content}
                </span>
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2">
                  {(node.type === 'project' || node.type === 'section') && (
                    <button
                      onClick={() => setShowAddSection(node.id)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                      title="إضافة قسم"
                    >
                      <FolderPlus size={14} />
                    </button>
                  )}
                  <button onClick={() => handleEditStart(node)} className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg" title="تعديل">
                    <Edit2 size={14} />
                  </button>
                  {node.type !== 'project' && (
                    <button onClick={() => handleDeleteClick(node)} className="p-2 text-red-600 hover:bg-red-100 rounded-lg" title="حذف">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* نموذج إضافة قسم تحت هذه العقدة */}
        {isShowingAddSection && (
          <div className="mx-8 mt-2 mb-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-lg shadow-sm">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="اسم القسم الجديد"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-blue-300/70 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white/80 shadow-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSection(node.id);
                  if (e.key === 'Escape') setShowAddSection(null);
                }}
              />
              <button
                onClick={() => handleAddSection(node.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                إضافة
              </button>
              <button
                onClick={() => setShowAddSection(null)}
                className="px-4 py-2 bg-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-400 transition-all duration-200"
              >
                إلغاء
              </button>
            </div>
          </div>
        )}

        {/* الأبناء + الخط العمودي */}
        {isExpanded && node.children.length > 0 && (
          <div className="relative ml-6 pl-6 border-l-2 border-slate-300">
            {node.children.map(child => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  }, [expandedNodes, editingNodeId, editContent, showAddSection, toggleExpanded, handleEditStart, handleEditSave, handleEditCancel, handleAddSection, handleDeleteClick]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <img src="/AVAMENT_big.png" alt="Avament" className="w-8 h-8 object-contain" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">محرر هيكل المشروع</h2>
                <p className="text-xs text-slate-600">إدارة وتنظيم الأقسام والمهام</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X size={18} className="text-slate-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {hierarchyTree.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Building2 size={28} className="text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">لا توجد مشاريع بعد</h3>
                <p className="text-sm text-slate-500 mb-4">ابدأ بإنشاء مشروعك الأول</p>
                <button onClick={() => setShowAddSection('root')} className="px-6 py-3 bg-blue-600 text-white rounded-lg">
                  إضافة مشروع جديد
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {hierarchyTree.map(node => renderTreeNode(node, 0))}
              </div>
            )}

            {/* نموذج إضافة مشروع في الجذر */}
            {showAddSection === 'root' && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-lg shadow-sm">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="اسم المشروع الجديد"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    className="flex-1 px-3 py-2 border-2 border-blue-300/70 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white/80 shadow-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddSection('root');
                      if (e.key === 'Escape') setShowAddSection(null);
                    }}
                  />
                  <button
                    onClick={() => handleAddSection('root')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    إضافة
                  </button>
                  <button
                    onClick={() => setShowAddSection(null)}
                    className="px-6 py-2 bg-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-400 transition-all duration-200"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4">
            <button onClick={() => setShowAddSection('root')} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
              <Plus size={16} />
              <span>إضافة مشروع</span>
            </button>
            <button onClick={onClose} className="px-6 py-2 bg-slate-600 text-white rounded-lg">إغلاق</button>
          </div>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        itemName={deleteConfirmation.nodeName}
        itemType={deleteConfirmation.nodeType}
      />
    </>
  );
};

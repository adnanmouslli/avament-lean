import React, { useState, useCallback } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Edit2, 
  ChevronRight, 
  ChevronDown,
  FolderPlus,
  Target,
  Save,
  Undo,
  Building2,
  Users,
  Calendar
} from 'lucide-react';
import { HierarchyNode } from '@/components/projectManager/GanttCanvas';


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

const COLORS = [
  '#1e40af', '#0c4a6e', '#166534', '#a16207', '#be123c', '#6b21a8',
  '#dc2626', '#c2410c', '#4d7c0f', '#0e7490', '#92400e', '#581c87'
];

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
  const [newTaskData, setNewTaskData] = useState({
    content: '',
    duration: 5,
    color: COLORS[0],
    type: 'task' as 'task' | 'milestone'
  });
  const [showAddTask, setShowAddTask] = useState<string | null>(null);

  const toggleExpanded = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
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

  const handleAddTask = useCallback((nodeId: string) => {
    if (newTaskData.content.trim()) {
      onAddTask(nodeId, {
        ...newTaskData,
        content: newTaskData.content.trim()
      });
      setNewTaskData({
        content: '',
        duration: 5,
        color: COLORS[0],
        type: 'task'
      });
      setShowAddTask(null);
    }
  }, [newTaskData, onAddTask]);

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'project':
        return <Building2 size={12} className="text-white" />;
      case 'section':
        return <Users size={10} className="text-white" />;
      case 'task':
        return <Target size={9} className="text-white" />;
      default:
        return <Calendar size={9} className="text-white" />;
    }
  };

  const renderTreeNode = useCallback((node: HierarchyNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    const isEditing = editingNodeId === node.id;
    const isShowingAddSection = showAddSection === node.id;
    const isShowingAddTask = showAddTask === node.id;

    return (
      <div key={node.id} className="w-full">
        {/* Node Row */}
        <div 
          className={`flex items-center py-3 px-4 hover:bg-slate-50/80 group transition-all duration-200 ${
            level > 0 ? 'border-l-2 border-slate-200/60 ml-6' : ''
          } ${
            node.type === 'project' ? 'bg-gradient-to-r from-blue-50/50 to-indigo-50/30' : ''
          }`}
          style={{ paddingLeft: `${level * 24 + 16}px` }}
        >
          {/* Expand/Collapse Button */}
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

          {/* Node Icon */}
          <div 
            className={`w-6 h-6 rounded-lg mr-3 flex-shrink-0 flex items-center justify-center shadow-sm ${
              !hasChildren ? 'ml-9' : ''
            } ${
              node.type === 'project' ? 'shadow-md' : 'shadow-sm'
            }`}
            style={{ backgroundColor: node.color }}
          >
            {getNodeIcon(node.type)}
          </div>

          {/* Node Content */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 px-4 py-2.5 border-2 border-blue-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 bg-white shadow-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditSave();
                    if (e.key === 'Escape') handleEditCancel();
                  }}
                />
                <button
                  onClick={handleEditSave}
                  className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all duration-200 shadow-sm"
                >
                  <Save size={16} />
                </button>
                <button
                  onClick={handleEditCancel}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-all duration-200"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className={`text-sm truncate transition-colors duration-200 ${
                  node.type === 'project' ? 'font-semibold text-slate-900' :
                  node.type === 'section' ? 'font-medium text-slate-800' :
                  'font-normal text-slate-700'
                }`}>
                  {node.content}
                </span>

                {/* Action Buttons */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-2 transition-all duration-300">
                  {(node.type === 'project' || node.type === 'section') && (
                    <button
                      onClick={() => setShowAddSection(node.id)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                      title="إضافة قسم"
                    >
                      <FolderPlus size={14} />
                    </button>
                  )}
                  
                  {node.type !== 'project' && (
                    <button
                      onClick={() => setShowAddTask(node.id)}
                      className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                      title="إضافة مهمة"
                    >
                      <Plus size={14} />
                    </button>
                  )}

                  <button
                    onClick={() => handleEditStart(node)}
                    className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                    title="تعديل"
                  >
                    <Edit2 size={14} />
                  </button>

                  {node.type !== 'project' && (
                    <button
                      onClick={() => onDeleteNode(node.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                      title="حذف"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Section Form */}
        {isShowingAddSection && (
          <div className="mx-4 mb-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3">
              <input
                type="text"
                placeholder="اسم القسم الجديد"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                className="flex-1 px-3 py-2 border-2 border-blue-300/70 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 bg-white/80 shadow-sm"
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

        {/* Add Task Form */}
        {isShowingAddTask && (
          <div className="mx-6 mb-4 p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 rounded-xl shadow-sm">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="اسم المهمة الجديدة"
                value={newTaskData.content}
                onChange={(e) => setNewTaskData(prev => ({ ...prev, content: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-emerald-300/70 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 bg-white/80 shadow-sm"
                autoFocus
              />
              
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-semibold text-slate-700">النوع:</label>
                  <select
                    value={newTaskData.type}
                    onChange={(e) => setNewTaskData(prev => ({ ...prev, type: e.target.value as 'task' | 'milestone' }))}
                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium bg-white shadow-sm"
                  >
                    <option value="task">مهمة</option>
                    <option value="milestone">معلم</option>
                  </select>
                </div>

                {newTaskData.type === 'task' && (
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-semibold text-slate-700">المدة:</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={newTaskData.duration}
                      onChange={(e) => setNewTaskData(prev => ({ ...prev, duration: parseInt(e.target.value) || 1 }))}
                      className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium bg-white shadow-sm"
                    />
                    <span className="text-sm font-medium text-slate-600">أيام</span>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <label className="text-sm font-semibold text-slate-700">اللون:</label>
                  <div className="flex space-x-2">
                    {COLORS.slice(0, 6).map(color => (
                      <button
                        key={color}
                        onClick={() => setNewTaskData(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 shadow-sm hover:shadow-md ${
                          newTaskData.color === color ? 'border-slate-500 scale-110' : 'border-slate-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => handleAddTask(node.id)}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  إضافة مهمة
                </button>
                <button
                  onClick={() => setShowAddTask(null)}
                  className="px-6 py-3 bg-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-400 transition-all duration-200"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tasks List */}
        {isExpanded && node.tasks.length > 0 && (
          <div className="ml-12 border-l-2 border-slate-200/60">
            {node.tasks.map((task, index) => (
              <div 
                key={task.id}
                className="flex items-center py-2.5 px-4 hover:bg-slate-50/60 group transition-all duration-200"
              >
                <div 
                  className="w-6 h-6 rounded-lg mr-4 flex-shrink-0 flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: task.color }}
                >
                  {task.type === 'milestone' ? (
                    <Calendar size={8} className="text-white" />
                  ) : (
                    <Target size={8} className="text-white" />
                  )}
                </div>
                <span className="text-sm font-medium text-slate-700 flex-1">{task.content}</span>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    {task.type === 'milestone' ? 'معلم' : `${task.duration} أيام`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Render Children */}
        {isExpanded && node.children.map(child => renderTreeNode(child, level + 1))}
      </div>
    );
  }, [
    expandedNodes, editingNodeId, editContent, showAddSection, showAddTask, 
    newSectionName, newTaskData, toggleExpanded, handleEditStart, handleEditSave, 
    handleEditCancel, handleAddSection, handleAddTask, onDeleteNode
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-white/30">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200/60">
          <div className="flex items-center space-x-3">
            <img 
              src="/AVAMENT_big.png" 
              alt="Avament" 
              className="w-8 h-8 object-contain"
            />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">محرر هيكل المشروع</h2>
              <p className="text-xs font-medium text-slate-600">إدارة وتنظيم الأقسام والمهام</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-all duration-200 group"
          >
            <X size={18} className="text-slate-500 group-hover:text-slate-700" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {hierarchyTree.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
                  <Building2 size={28} className="text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">لا توجد مشاريع بعد</h3>
                <p className="text-sm text-slate-500 mb-4 font-medium">ابدأ بإنشاء مشروعك الأول</p>
                <button
                  onClick={() => setShowAddSection('root')}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  إضافة مشروع جديد
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {hierarchyTree.map(node => renderTreeNode(node, 0))}
              </div>
            )}

            {/* Add Root Section */}
            {showAddSection === 'root' && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-lg shadow-sm">
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    placeholder="اسم المشروع الجديد"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    className="flex-1 px-3 py-2 border-2 border-blue-300/70 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 bg-white/80 shadow-sm"
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-slate-100/60">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddSection('root')}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Plus size={16} />
              <span>إضافة مشروع</span>
            </button>
          </div>
          
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-600 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
import React, { useState, useCallback, useEffect } from 'react';
import { 
  X, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle, 
  AlertCircle,
  Target,
  Palette,
  RotateCcw,
  Search,
  ChevronDown,
  Bookmark,
  BookmarkPlus,
  Trash2,
  Edit3,
  Star,
  History,
  Save,
  Heart,
  Eye,
  ChevronRight
} from 'lucide-react';
import { HierarchyNode } from '@/components/projectManager/GanttCanvas';

export interface FilterCriteria {
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  status?: 'all' | 'completed' | 'in-progress' | 'not-started' | 'overdue';
  priority?: 'all' | 'high' | 'medium' | 'low';
  author?: string;
  taskType?: 'all' | 'task' | 'milestone';
  progress?: {
    min: number;
    max: number;
  };
  colors?: string[];
  searchText?: string;
  duration?: {
    min: number;
    max: number;
  };
}

export interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  criteria: FilterCriteria;
  createdAt: Date;
  updatedAt: Date;
  isFavorite?: boolean;
  tags?: string[];
  usageCount?: number;
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilter: (criteria: FilterCriteria) => void;
  hierarchyTree: HierarchyNode[];
  currentFilter?: FilterCriteria;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string, description: string, criteria: FilterCriteria) => void;
  onDeleteSavedFilter?: (filterId: string) => void;
  onUpdateSavedFilter?: (filterId: string, updates: Partial<SavedFilter>) => void;
  onLoadSavedFilter?: (criteria: FilterCriteria) => void;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'الكل', icon: Target },
  { value: 'completed', label: 'مكتملة', icon: CheckCircle },
  { value: 'in-progress', label: 'قيد التنفيذ', icon: Clock },
  { value: 'not-started', label: 'لم تبدأ', icon: AlertCircle },
  { value: 'overdue', label: 'متأخرة', icon: AlertCircle }
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'high', label: 'عالية' },
  { value: 'medium', label: 'متوسطة' },
  { value: 'low', label: 'منخفضة' }
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'task', label: 'مهام' },
  { value: 'milestone', label: 'معالم' }
];

export const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  onApplyFilter,
  hierarchyTree,
  currentFilter,
  savedFilters = [],
  onSaveFilter,
  onDeleteSavedFilter,
  onUpdateSavedFilter,
  onLoadSavedFilter
}) => {
  const [filters, setFilters] = useState<FilterCriteria>({
    dateRange: { startDate: '', endDate: '' },
    status: 'all',
    priority: 'all',
    author: '',
    taskType: 'all',
    progress: { min: 0, max: 100 },
    colors: [],
    searchText: '',
    duration: { min: 1, max: 30 }
  });

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['general']));
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [saveFilterDescription, setSaveFilterDescription] = useState('');

  // استخراج جميع المؤلفين من الشجرة
  const getAllAuthors = useCallback(() => {
    const authors = new Set<string>();
    const extractAuthors = (nodes: HierarchyNode[]) => {
      nodes.forEach(node => {
        node.tasks.forEach(task => {
          if (task.author) authors.add(task.author);
        });
        extractAuthors(node.children);
      });
    };
    extractAuthors(hierarchyTree);
    return Array.from(authors);
  }, [hierarchyTree]);

  // استخراج جميع الألوان المستخدمة
  const getUsedColors = useCallback(() => {
    const colors = new Set<string>();
    const extractColors = (nodes: HierarchyNode[]) => {
      nodes.forEach(node => {
        node.tasks.forEach(task => {
          if (task.color) colors.add(task.color);
        });
        extractColors(node.children);
      });
    };
    extractColors(hierarchyTree);
    return Array.from(colors);
  }, [hierarchyTree]);

  // تحديث الفلاتر عند تغيير الفلتر الحالي
  useEffect(() => {
    if (currentFilter) {
      setFilters(currentFilter);
    }
  }, [currentFilter]);

  const handleFilterChange = (key: keyof FilterCriteria, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleColorToggle = (color: string) => {
    setFilters(prev => ({
      ...prev,
      colors: prev.colors?.includes(color)
        ? prev.colors.filter(c => c !== color)
        : [...(prev.colors || []), color]
    }));
  };

  const resetFilters = () => {
    setFilters({
      dateRange: { startDate: '', endDate: '' },
      status: 'all',
      priority: 'all',
      author: '',
      taskType: 'all',
      progress: { min: 0, max: 100 },
      colors: [],
      searchText: '',
      duration: { min: 1, max: 30 }
    });
  };

  const applyFilters = () => {
    onApplyFilter(filters);
    onClose();
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.dateRange?.startDate || filters.dateRange?.endDate) count++;
    if (filters.status !== 'all') count++;
    if (filters.priority !== 'all') count++;
    if (filters.author) count++;
    if (filters.taskType !== 'all') count++;
    if (filters.progress?.min !== 0 || filters.progress?.max !== 100) count++;
    if (filters.colors && filters.colors.length > 0) count++;
    if (filters.searchText) count++;
    if (filters.duration?.min !== 1 || filters.duration?.max !== 30) count++;
    return count;
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleSaveFilter = () => {
    if (!saveFilterName.trim()) return;
    if (onSaveFilter) {
      onSaveFilter(saveFilterName.trim(), saveFilterDescription.trim(), filters);
    }
    setSaveFilterName('');
    setSaveFilterDescription('');
    setShowSaveDialog(false);
  };

  const handleLoadSavedFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.criteria);
    if (onLoadSavedFilter) {
      onLoadSavedFilter(savedFilter.criteria);
    }
    if (onUpdateSavedFilter) {
      onUpdateSavedFilter(savedFilter.id, {
        usageCount: (savedFilter.usageCount || 0) + 1,
        updatedAt: new Date()
      });
    }
  };

  const toggleFavorite = (savedFilter: SavedFilter) => {
    if (onUpdateSavedFilter) {
      onUpdateSavedFilter(savedFilter.id, {
        isFavorite: !savedFilter.isFavorite,
        updatedAt: new Date()
      });
    }
  };

  const getFilterSummary = (criteria: FilterCriteria): string => {
    const parts: string[] = [];
    if (criteria.status && criteria.status !== 'all') {
      const statusLabel = STATUS_OPTIONS.find(opt => opt.value === criteria.status)?.label;
      if (statusLabel) parts.push(statusLabel);
    }
    if (criteria.priority && criteria.priority !== 'all') {
      const priorityLabel = PRIORITY_OPTIONS.find(opt => opt.value === criteria.priority)?.label;
      if (priorityLabel) parts.push(`أولوية ${priorityLabel}`);
    }
    if (criteria.author) parts.push(`بواسطة ${criteria.author}`);
    if (criteria.searchText) parts.push(`"${criteria.searchText}"`);
    if (criteria.colors && criteria.colors.length > 0) parts.push(`${criteria.colors.length} ألوان`);
    return parts.slice(0, 3).join(' • ') + (parts.length > 3 ? '...' : '');
  };

  if (!isOpen) return null;

  const authors = getAllAuthors();
  const usedColors = getUsedColors();

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`
          fixed inset-0 bg-black transition-opacity duration-300 z-30
          ${isOpen ? 'opacity-20' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className={`
        fixed top-14 right-0 h-[calc(100vh-3.5rem)] w-96 z-40
        bg-white shadow-2xl border-l border-gray-200
        transition-all duration-500 ease-out
        ${isOpen ? 
          'translate-x-0 opacity-100' : 
          'translate-x-full opacity-0'
        }
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`
            flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50
            transition-all duration-700 delay-100 ease-out
            ${isOpen ? 
              'transform translate-y-0 opacity-100' : 
              'transform -translate-y-4 opacity-0'
            }
          `}>
            <div className="flex items-center space-x-3">
              <div className={`
                transition-all duration-500 delay-200 ease-out
                ${isOpen ? 
                  'transform rotate-0 scale-100' : 
                  'transform rotate-180 scale-0'
                }
              `}>
                <Filter className="text-blue-600" size={20} />
              </div>
              <div>
                <h3 className={`
                  text-lg font-semibold text-gray-900
                  transition-all duration-500 delay-300 ease-out
                  ${isOpen ? 
                    'transform translate-x-0 opacity-100' : 
                    'transform translate-x-4 opacity-0'
                  }
                `}>
                  فلتر المهام
                </h3>
                <p className="text-xs text-gray-500">
                  {getActiveFiltersCount() > 0 ? `${getActiveFiltersCount()} فلاتر نشطة` : 'لا توجد فلاتر'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {getActiveFiltersCount() > 0 && onSaveFilter && (
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                  title="حفظ الفلتر"
                >
                  <BookmarkPlus size={16} />
                </button>
              )}
              <button
                onClick={onClose}
                className={`
                  p-2 hover:bg-gray-200 rounded-lg transition-all duration-300
                  ${isOpen ? 
                    'transform rotate-0 scale-100 opacity-100' : 
                    'transform rotate-90 scale-0 opacity-0'
                  }
                `}
                style={{ transitionDelay: isOpen ? '400ms' : '0ms' }}
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* البحث العام */}
            <div className={`
              transition-all duration-600 ease-out
              ${isOpen ? 
                'transform translate-x-0 opacity-100' : 
                'transform translate-x-8 opacity-0'
              }
            `}
            style={{ transitionDelay: isOpen ? '500ms' : '0ms' }}
            >
              <button
                onClick={() => toggleSection('general')}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Search size={16} className="text-gray-600" />
                  <span className="font-medium text-gray-900">البحث العام</span>
                </div>
                <ChevronRight 
                  size={16} 
                  className={`text-gray-400 transition-transform duration-200 ${
                    expandedSections.has('general') ? 'rotate-90' : ''
                  }`} 
                />
              </button>
              
              {expandedSections.has('general') && (
                <div className="mt-3 space-y-3 px-3">
                  <input
                    type="text"
                    value={filters.searchText || ''}
                    onChange={(e) => handleFilterChange('searchText', e.target.value)}
                    placeholder="ابحث في أسماء المهام..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  
                  <select
                    value={filters.author || ''}
                    onChange={(e) => handleFilterChange('author', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">جميع المؤلفين</option>
                    {authors.map(author => (
                      <option key={author} value={author}>{author}</option>
                    ))}
                  </select>
                  
                  <select
                    value={filters.taskType || 'all'}
                    onChange={(e) => handleFilterChange('taskType', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {TYPE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* الحالة والتقدم */}
            <div className={`
              transition-all duration-600 ease-out
              ${isOpen ? 
                'transform translate-x-0 opacity-100' : 
                'transform translate-x-8 opacity-0'
              }
            `}
            style={{ transitionDelay: isOpen ? '550ms' : '0ms' }}
            >
              <button
                onClick={() => toggleSection('status')}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle size={16} className="text-gray-600" />
                  <span className="font-medium text-gray-900">الحالة والتقدم</span>
                </div>
                <ChevronRight 
                  size={16} 
                  className={`text-gray-400 transition-transform duration-200 ${
                    expandedSections.has('status') ? 'rotate-90' : ''
                  }`} 
                />
              </button>
              
              {expandedSections.has('status') && (
                <div className="mt-3 space-y-3 px-3">
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleFilterChange('status', option.value)}
                        className={`flex items-center space-x-2 p-2 rounded-lg border text-sm transition-all ${
                          filters.status === option.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <option.icon size={14} />
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {PRIORITY_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleFilterChange('priority', option.value)}
                        className={`p-2 rounded-lg border text-sm transition-all ${
                          filters.priority === option.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">نسبة الإنجاز (%)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={filters.progress?.min || 0}
                        onChange={(e) => handleFilterChange('progress', {
                          ...filters.progress,
                          min: parseInt(e.target.value) || 0
                        })}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="من"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={filters.progress?.max || 100}
                        onChange={(e) => handleFilterChange('progress', {
                          ...filters.progress,
                          max: parseInt(e.target.value) || 100
                        })}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="إلى"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* التواريخ والمدة */}
            <div className={`
              transition-all duration-600 ease-out
              ${isOpen ? 
                'transform translate-x-0 opacity-100' : 
                'transform translate-x-8 opacity-0'
              }
            `}
            style={{ transitionDelay: isOpen ? '600ms' : '0ms' }}
            >
              <button
                onClick={() => toggleSection('dates')}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Calendar size={16} className="text-gray-600" />
                  <span className="font-medium text-gray-900">التواريخ والمدة</span>
                </div>
                <ChevronRight 
                  size={16} 
                  className={`text-gray-400 transition-transform duration-200 ${
                    expandedSections.has('dates') ? 'rotate-90' : ''
                  }`} 
                />
              </button>
              
              {expandedSections.has('dates') && (
                <div className="mt-3 space-y-3 px-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">نطاق التواريخ</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={filters.dateRange?.startDate || ''}
                        onChange={(e) => handleFilterChange('dateRange', {
                          ...filters.dateRange,
                          startDate: e.target.value
                        })}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <input
                        type="date"
                        value={filters.dateRange?.endDate || ''}
                        onChange={(e) => handleFilterChange('dateRange', {
                          ...filters.dateRange,
                          endDate: e.target.value
                        })}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-500 mb-2">مدة المهمة (أيام)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min="1"
                        value={filters.duration?.min || 1}
                        onChange={(e) => handleFilterChange('duration', {
                          ...filters.duration,
                          min: parseInt(e.target.value) || 1
                        })}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="من"
                      />
                      <input
                        type="number"
                        min="1"
                        value={filters.duration?.max || 30}
                        onChange={(e) => handleFilterChange('duration', {
                          ...filters.duration,
                          max: parseInt(e.target.value) || 30
                        })}
                        className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="إلى"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* الألوان */}
            <div className={`
              transition-all duration-600 ease-out
              ${isOpen ? 
                'transform translate-x-0 opacity-100' : 
                'transform translate-x-8 opacity-0'
              }
            `}
            style={{ transitionDelay: isOpen ? '650ms' : '0ms' }}
            >
              <button
                onClick={() => toggleSection('colors')}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Palette size={16} className="text-gray-600" />
                  <span className="font-medium text-gray-900">الألوان</span>
                  {filters.colors && filters.colors.length > 0 && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {filters.colors.length}
                    </span>
                  )}
                </div>
                <ChevronRight 
                  size={16} 
                  className={`text-gray-400 transition-transform duration-200 ${
                    expandedSections.has('colors') ? 'rotate-90' : ''
                  }`} 
                />
              </button>
              
              {expandedSections.has('colors') && (
                <div className="mt-3 px-3">
                  <div className="grid grid-cols-8 gap-2">
                    {usedColors.map(color => (
                      <button
                        key={color}
                        onClick={() => handleColorToggle(color)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          filters.colors?.includes(color)
                            ? 'border-gray-800 scale-110'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                        title={`اللون ${color}`}
                      >
                        {filters.colors?.includes(color) && (
                          <CheckCircle size={12} className="text-white mx-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* الفلاتر المحفوظة */}
            {savedFilters.length > 0 && (
              <div className={`
                transition-all duration-600 ease-out
                ${isOpen ? 
                  'transform translate-x-0 opacity-100' : 
                  'transform translate-x-8 opacity-0'
                }
              `}
              style={{ transitionDelay: isOpen ? '700ms' : '0ms' }}
              >
                <button
                  onClick={() => toggleSection('saved')}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <History size={16} className="text-gray-600" />
                    <span className="font-medium text-gray-900">الفلاتر المحفوظة</span>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      {savedFilters.length}
                    </span>
                  </div>
                  <ChevronRight 
                    size={16} 
                    className={`text-gray-400 transition-transform duration-200 ${
                      expandedSections.has('saved') ? 'rotate-90' : ''
                    }`} 
                  />
                </button>
                
                {expandedSections.has('saved') && (
                  <div className="mt-3 space-y-2 px-3 max-h-48 overflow-y-auto">
                    {savedFilters.map(savedFilter => (
                      <div
                        key={savedFilter.id}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="text-sm font-medium text-gray-900 truncate">
                                {savedFilter.name}
                              </h4>
                              {savedFilter.isFavorite && (
                                <Star size={12} className="text-yellow-500 fill-current flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {getFilterSummary(savedFilter.criteria) || 'فلتر فارغ'}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                            <button
                              onClick={() => toggleFavorite(savedFilter)}
                              className={`p-1 rounded transition-colors ${
                                savedFilter.isFavorite
                                  ? 'text-yellow-500 hover:bg-yellow-100'
                                  : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-200'
                              }`}
                            >
                              <Star size={12} className={savedFilter.isFavorite ? 'fill-current' : ''} />
                            </button>
                            
                            <button
                              onClick={() => handleLoadSavedFilter(savedFilter)}
                              className="p-1 text-blue-500 hover:bg-blue-100 rounded transition-colors"
                            >
                              <Filter size={12} />
                            </button>
                            
                            {onDeleteSavedFilter && (
                              <button
                                onClick={() => {
                                  if (window.confirm('هل أنت متأكد من حذف هذا الفلتر؟')) {
                                    onDeleteSavedFilter(savedFilter.id);
                                  }
                                }}
                                className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`
            border-t border-gray-200 p-4 bg-gray-50 space-y-3
            transition-all duration-700 ease-out
            ${isOpen ? 
              'transform translate-y-0 opacity-100' : 
              'transform translate-y-4 opacity-0'
            }
          `}
          style={{ transitionDelay: isOpen ? '750ms' : '0ms' }}
          >
            <button
              onClick={resetFilters}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-all duration-300 border border-gray-300 hover:border-gray-400 hover:shadow-sm transform hover:scale-[1.02]"
            >
              <RotateCcw size={14} />
              <span>إعادة تعيين</span>
            </button>
            
            <button
              onClick={applyFilters}
              className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-300 hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
            >
              تطبيق الفلاتر ({getActiveFiltersCount()})
            </button>
          </div>
        </div>
      </div>

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BookmarkPlus size={18} className="ml-2" />
                حفظ الفلتر
              </h3>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={16} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم الفلتر *
                </label>
                <input
                  type="text"
                  value={saveFilterName}
                  onChange={(e) => setSaveFilterName(e.target.value)}
                  placeholder="مثل: مهام عالية الأولوية"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الوصف (اختياري)
                </label>
                <textarea
                  value={saveFilterDescription}
                  onChange={(e) => setSaveFilterDescription(e.target.value)}
                  placeholder="وصف موجز للفلتر..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">معاينة الفلتر:</h4>
                <p className="text-sm text-gray-600">
                  {getFilterSummary(filters) || 'فلتر فارغ'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveFilter}
                disabled={!saveFilterName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
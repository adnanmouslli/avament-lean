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
  Eye
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
  // New props for filter history
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string, description: string, criteria: FilterCriteria) => void;
  onDeleteSavedFilter?: (filterId: string) => void;
  onUpdateSavedFilter?: (filterId: string, updates: Partial<SavedFilter>) => void;
  onLoadSavedFilter?: (criteria: FilterCriteria) => void;
}

const COLORS = [
  '#1e40af', '#0c4a6e', '#166534', '#a16207', '#be123c', '#6b21a8',
  '#dc2626', '#c2410c', '#4d7c0f', '#0e7490', '#92400e', '#581c87'
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'جميع الحالات', icon: Target },
  { value: 'completed', label: 'مكتملة', icon: CheckCircle },
  { value: 'in-progress', label: 'قيد التنفيذ', icon: Clock },
  { value: 'not-started', label: 'لم تبدأ', icon: AlertCircle },
  { value: 'overdue', label: 'متأخرة', icon: AlertCircle }
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'جميع الأولويات' },
  { value: 'high', label: 'عالية' },
  { value: 'medium', label: 'متوسطة' },
  { value: 'low', label: 'منخفضة' }
];

const TYPE_OPTIONS = [
  { value: 'all', label: 'جميع الأنواع' },
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
    dateRange: {
      startDate: '',
      endDate: ''
    },
    status: 'all',
    priority: 'all',
    author: '',
    taskType: 'all',
    progress: {
      min: 0,
      max: 100
    },
    colors: [],
    searchText: '',
    duration: {
      min: 1,
      max: 30
    }
  });

  const [activeSection, setActiveSection] = useState<string>('general');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [saveFilterDescription, setSaveFilterDescription] = useState('');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'usage'>('date');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // استخراج جميع المؤلفين من الشجرة
  const getAllAuthors = useCallback(() => {
    const authors = new Set<string>();
    
    const extractAuthors = (nodes: HierarchyNode[]) => {
      nodes.forEach(node => {
        node.tasks.forEach(task => {
          if (task.author) {
            authors.add(task.author);
          }
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
          if (task.color) {
            colors.add(task.color);
          }
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
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
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
      dateRange: {
        startDate: '',
        endDate: ''
      },
      status: 'all',
      priority: 'all',
      author: '',
      taskType: 'all',
      progress: {
        min: 0,
        max: 100
      },
      colors: [],
      searchText: '',
      duration: {
        min: 1,
        max: 30
      }
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

  // معالجة حفظ الفلتر
  const handleSaveFilter = () => {
    if (!saveFilterName.trim()) return;
    
    if (onSaveFilter) {
      onSaveFilter(saveFilterName.trim(), saveFilterDescription.trim(), filters);
    }
    
    setSaveFilterName('');
    setSaveFilterDescription('');
    setShowSaveDialog(false);
  };

  // معالجة تحميل فلتر محفوظ
  const handleLoadSavedFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.criteria);
    if (onLoadSavedFilter) {
      onLoadSavedFilter(savedFilter.criteria);
    }
    
    // تحديث عداد الاستخدام
    if (onUpdateSavedFilter) {
      onUpdateSavedFilter(savedFilter.id, {
        usageCount: (savedFilter.usageCount || 0) + 1,
        updatedAt: new Date()
      });
    }
  };

  // تبديل المفضلة
  const toggleFavorite = (savedFilter: SavedFilter) => {
    if (onUpdateSavedFilter) {
      onUpdateSavedFilter(savedFilter.id, {
        isFavorite: !savedFilter.isFavorite,
        updatedAt: new Date()
      });
    }
  };

  // فلترة وترتيب الفلاتر المحفوظة
  const getFilteredSavedFilters = () => {
    let filtered = savedFilters;

    // فلترة بالبحث
    if (historySearchQuery.trim()) {
      const query = historySearchQuery.toLowerCase();
      filtered = filtered.filter(filter => 
        filter.name.toLowerCase().includes(query) ||
        filter.description?.toLowerCase().includes(query) ||
        filter.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // فلترة المفضلة فقط
    if (showFavoritesOnly) {
      filtered = filtered.filter(filter => filter.isFavorite);
    }

    // ترتيب
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'usage':
          return (b.usageCount || 0) - (a.usageCount || 0);
        case 'date':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return filtered;
  };

  // وصف مختصر للفلتر
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
    
    if (criteria.author) {
      parts.push(`بواسطة ${criteria.author}`);
    }
    
    if (criteria.searchText) {
      parts.push(`"${criteria.searchText}"`);
    }
    
    if (criteria.colors && criteria.colors.length > 0) {
      parts.push(`${criteria.colors.length} ألوان`);
    }

    return parts.slice(0, 3).join(' • ') + (parts.length > 3 ? '...' : '');
  };

  if (!isOpen) return null;

  const authors = getAllAuthors();
  const usedColors = getUsedColors();
  const filteredSavedFilters = getFilteredSavedFilters();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Filter size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">فلتر المهام المتقدم</h2>
              <p className="text-sm text-gray-500">
                {getActiveFiltersCount() > 0 ? `${getActiveFiltersCount()} فلاتر نشطة` : 'لا توجد فلاتر مطبقة'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getActiveFiltersCount() > 0 && onSaveFilter && (
              <button
                onClick={() => setShowSaveDialog(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
              >
                <BookmarkPlus size={16} />
                <span>حفظ الفلتر</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
            <div className="space-y-2">
              {[
                { id: 'general', label: 'عام', icon: Search },
                { id: 'dates', label: 'التواريخ', icon: Calendar },
                { id: 'status', label: 'الحالة والتقدم', icon: CheckCircle },
                { id: 'properties', label: 'الخصائص', icon: Target },
                { id: 'appearance', label: 'المظهر', icon: Palette },
                { id: 'history', label: 'الفلاتر المحفوظة', icon: History, badge: savedFilters.length }
              ].map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <section.icon size={16} />
                    <span>{section.label}</span>
                  </div>
                  {section.badge !== undefined && section.badge > 0 && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full min-w-[1.5rem] text-center">
                      {section.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeSection === 'general' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    البحث في النص
                  </label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={filters.searchText || ''}
                      onChange={(e) => handleFilterChange('searchText', e.target.value)}
                      placeholder="ابحث في أسماء المهام..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    المؤلف
                  </label>
                  <select
                    value={filters.author || ''}
                    onChange={(e) => handleFilterChange('author', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">جميع المؤلفين</option>
                    {authors.map(author => (
                      <option key={author} value={author}>{author}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    نوع المهمة
                  </label>
                  <select
                    value={filters.taskType || 'all'}
                    onChange={(e) => handleFilterChange('taskType', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {TYPE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {activeSection === 'dates' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    نطاق التواريخ
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">من تاريخ</label>
                      <input
                        type="date"
                        value={filters.dateRange?.startDate || ''}
                        onChange={(e) => handleFilterChange('dateRange', {
                          ...filters.dateRange,
                          startDate: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">إلى تاريخ</label>
                      <input
                        type="date"
                        value={filters.dateRange?.endDate || ''}
                        onChange={(e) => handleFilterChange('dateRange', {
                          ...filters.dateRange,
                          endDate: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    مدة المهمة (أيام)
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">الحد الأدنى</label>
                      <input
                        type="number"
                        min="1"
                        value={filters.duration?.min || 1}
                        onChange={(e) => handleFilterChange('duration', {
                          ...filters.duration,
                          min: parseInt(e.target.value) || 1
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">الحد الأقصى</label>
                      <input
                        type="number"
                        min="1"
                        value={filters.duration?.max || 30}
                        onChange={(e) => handleFilterChange('duration', {
                          ...filters.duration,
                          max: parseInt(e.target.value) || 30
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'status' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    حالة المهمة
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {STATUS_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleFilterChange('status', option.value)}
                        className={`flex items-center space-x-3 p-3 rounded-xl border transition-all ${
                          filters.status === option.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <option.icon size={16} />
                        <span className="text-sm font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    نسبة الإنجاز (%)
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">من</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={filters.progress?.min || 0}
                        onChange={(e) => handleFilterChange('progress', {
                          ...filters.progress,
                          min: parseInt(e.target.value) || 0
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">إلى</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={filters.progress?.max || 100}
                        onChange={(e) => handleFilterChange('progress', {
                          ...filters.progress,
                          max: parseInt(e.target.value) || 100
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'properties' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    الأولوية
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {PRIORITY_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleFilterChange('priority', option.value)}
                        className={`flex items-center justify-center p-3 rounded-xl border transition-all ${
                          filters.priority === option.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-sm font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    ألوان المهام
                  </label>
                  <div className="grid grid-cols-6 gap-3">
                    {usedColors.map(color => (
                      <button
                        key={color}
                        onClick={() => handleColorToggle(color)}
                        className={`w-12 h-12 rounded-xl border-2 transition-all ${
                          filters.colors?.includes(color)
                            ? 'border-gray-800 scale-110'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                        title={`اللون ${color}`}
                      >
                        {filters.colors?.includes(color) && (
                          <CheckCircle size={16} className="text-white mx-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                  {filters.colors && filters.colors.length > 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      تم تحديد {filters.colors.length} لون
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeSection === 'history' && (
              <div className="space-y-6">
                {/* Header Controls */}
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <History size={20} className="ml-2" />
                      الفلاتر المحفوظة
                    </h3>
                    <div className="text-sm text-gray-500">
                      {filteredSavedFilters.length} من {savedFilters.length}
                    </div>
                  </div>

                  {/* Search and Controls */}
                  <div className="flex items-center space-x-4">
                    <div className="flex-1 relative">
                      <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={historySearchQuery}
                        onChange={(e) => setHistorySearchQuery(e.target.value)}
                        placeholder="ابحث في الفلاتر المحفوظة..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'usage')}
                      className="px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="date">الأحدث</option>
                      <option value="name">الاسم</option>
                      <option value="usage">الأكثر استخداماً</option>
                    </select>

                    <button
                      onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-xl border transition-colors ${
                        showFavoritesOnly
                          ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <Star size={16} className={showFavoritesOnly ? 'fill-current' : ''} />
                      <span>المفضلة</span>
                    </button>
                  </div>
                </div>

                {/* Saved Filters List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredSavedFilters.length === 0 ? (
                    <div className="text-center py-12">
                      <Bookmark size={48} className="mx-auto text-gray-300 mb-4" />
                      <h4 className="text-lg font-medium text-gray-500 mb-2">
                        {historySearchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد فلاتر محفوظة'}
                      </h4>
                      <p className="text-gray-400">
                        {historySearchQuery 
                          ? 'جرب كلمات بحث مختلفة' 
                          : 'قم بإنشاء فلتر وحفظه للاستخدام لاحقاً'
                        }
                      </p>
                    </div>
                  ) : (
                    filteredSavedFilters.map(savedFilter => (
                      <div
                        key={savedFilter.id}
                        className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="text-sm font-semibold text-gray-900 truncate">
                                {savedFilter.name}
                              </h4>
                              {savedFilter.isFavorite && (
                                <Star size={14} className="text-yellow-500 fill-current flex-shrink-0" />
                              )}
                            </div>
                            
                            {savedFilter.description && (
                              <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                {savedFilter.description}
                              </p>
                            )}
                            
                            <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                              <span className="flex items-center">
                                <Clock size={12} className="ml-1" />
                                {new Date(savedFilter.updatedAt).toLocaleDateString('ar')}
                              </span>
                              {savedFilter.usageCount !== undefined && (
                                <span className="flex items-center">
                                  <Eye size={12} className="ml-1" />
                                  {savedFilter.usageCount} مرة
                                </span>
                              )}
                            </div>
                            
                            <div className="text-xs text-gray-500 truncate">
                              {getFilterSummary(savedFilter.criteria) || 'فلتر فارغ'}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 flex-shrink-0 ml-3">
                            <button
                              onClick={() => toggleFavorite(savedFilter)}
                              className={`p-1.5 rounded-xl transition-colors ${
                                savedFilter.isFavorite
                                  ? 'text-yellow-500 hover:bg-yellow-100'
                                  : 'text-gray-400 hover:text-yellow-500 hover:bg-gray-200'
                              }`}
                              title={savedFilter.isFavorite ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                            >
                              <Star size={14} className={savedFilter.isFavorite ? 'fill-current' : ''} />
                            </button>
                            
                            <button
                              onClick={() => handleLoadSavedFilter(savedFilter)}
                              className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-xl transition-colors"
                              title="تحميل الفلتر"
                            >
                              <Filter size={14} />
                            </button>
                            
                            {onDeleteSavedFilter && (
                              <button
                                onClick={() => {
                                  if (window.confirm('هل أنت متأكد من حذف هذا الفلتر؟')) {
                                    onDeleteSavedFilter(savedFilter.id);
                                  }
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-100 rounded-xl transition-colors"
                                title="حذف الفلتر"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            onClick={resetFilters}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <RotateCcw size={16} />
            <span>إعادة تعيين</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={applyFilters}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              تطبيق الفلاتر
            </button>
          </div>
        </div>
      </div>

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 rounded-t-xl">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <BookmarkPlus size={20} className="ml-2" />
                حفظ الفلتر
              </h3>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="p-1 hover:bg-gray-100 rounded-xl transition-colors"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>
              
              <div className="bg-gray-50 p-3 rounded-xl">
                <h4 className="text-sm font-medium text-gray-700 mb-2">معاينة الفلتر:</h4>
                <p className="text-sm text-gray-600">
                  {getFilterSummary(filters) || 'فلتر فارغ'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveFilter}
                disabled={!saveFilterName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
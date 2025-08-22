import React from 'react';
import { X, Calendar, User, Target, Palette, Clock, CheckCircle } from 'lucide-react';
import { FilterCriteria } from './FilterModal';
import { hasActiveFilters } from './FilterUtils';

interface ActiveFiltersDisplayProps {
  filters: FilterCriteria;
  onRemoveFilter: (filterKey: keyof FilterCriteria) => void;
  onClearAll: () => void;
}

export const ActiveFiltersDisplay: React.FC<ActiveFiltersDisplayProps> = ({
  filters,
  onRemoveFilter,
  onClearAll
}) => {
  if (!hasActiveFilters(filters)) {
    return null;
  }

  const getFilterDisplayInfo = () => {
    const activeFilters = [];

    if (filters.searchText) {
      activeFilters.push({
        key: 'searchText' as keyof FilterCriteria,
        label: `البحث: "${filters.searchText}"`,
        icon: Target,
        color: 'bg-blue-100 text-blue-800'
      });
    }

    if (filters.dateRange?.startDate || filters.dateRange?.endDate) {
      const dateText = filters.dateRange.startDate && filters.dateRange.endDate
        ? `${filters.dateRange.startDate} إلى ${filters.dateRange.endDate}`
        : filters.dateRange.startDate
        ? `من ${filters.dateRange.startDate}`
        : `حتى ${filters.dateRange.endDate}`;
      
      activeFilters.push({
        key: 'dateRange' as keyof FilterCriteria,
        label: `التاريخ: ${dateText}`,
        icon: Calendar,
        color: 'bg-green-100 text-green-800'
      });
    }

    if (filters.status && filters.status !== 'all') {
      const statusLabels = {
        'completed': 'مكتملة',
        'in-progress': 'قيد التنفيذ',
        'not-started': 'لم تبدأ',
        'overdue': 'متأخرة'
      };
      
      activeFilters.push({
        key: 'status' as keyof FilterCriteria,
        label: `الحالة: ${statusLabels[filters.status]}`,
        icon: CheckCircle,
        color: 'bg-purple-100 text-purple-800'
      });
    }

    if (filters.author) {
      activeFilters.push({
        key: 'author' as keyof FilterCriteria,
        label: `المؤلف: ${filters.author}`,
        icon: User,
        color: 'bg-orange-100 text-orange-800'
      });
    }

    if (filters.taskType && filters.taskType !== 'all') {
      const typeLabels = {
        'task': 'مهام',
        'milestone': 'معالم'
      };
      
      activeFilters.push({
        key: 'taskType' as keyof FilterCriteria,
        label: `النوع: ${typeLabels[filters.taskType]}`,
        icon: Target,
        color: 'bg-indigo-100 text-indigo-800'
      });
    }

    if (filters.priority && filters.priority !== 'all') {
      const priorityLabels = {
        'high': 'عالية',
        'medium': 'متوسطة',
        'low': 'منخفضة'
      };
      
      activeFilters.push({
        key: 'priority' as keyof FilterCriteria,
        label: `الأولوية: ${priorityLabels[filters.priority]}`,
        icon: Target,
        color: 'bg-red-100 text-red-800'
      });
    }

    if (filters.progress && (filters.progress.min !== 0 || filters.progress.max !== 100)) {
      activeFilters.push({
        key: 'progress' as keyof FilterCriteria,
        label: `الإنجاز: ${filters.progress.min}% - ${filters.progress.max}%`,
        icon: CheckCircle,
        color: 'bg-teal-100 text-teal-800'
      });
    }

    if (filters.colors && filters.colors.length > 0) {
      activeFilters.push({
        key: 'colors' as keyof FilterCriteria,
        label: `الألوان: ${filters.colors.length} لون محدد`,
        icon: Palette,
        color: 'bg-pink-100 text-pink-800'
      });
    }

    if (filters.duration && (filters.duration.min !== 1 || filters.duration.max !== 30)) {
      activeFilters.push({
        key: 'duration' as keyof FilterCriteria,
        label: `المدة: ${filters.duration.min} - ${filters.duration.max} أيام`,
        icon: Clock,
        color: 'bg-yellow-100 text-yellow-800'
      });
    }

    return activeFilters;
  };

  const activeFilters = getFilterDisplayInfo();

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-600">الفلاتر النشطة:</span>
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.map((filter, index) => (
              <div
                key={index}
                className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${filter.color}`}
              >
                <filter.icon size={12} />
                <span>{filter.label}</span>
                <button
                  onClick={() => onRemoveFilter(filter.key)}
                  className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onClearAll}
          className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
        >
          مسح جميع الفلاتر
        </button>
      </div>
    </div>
  );
};
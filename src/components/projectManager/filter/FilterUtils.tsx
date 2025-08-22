import { HierarchyNode, Task } from '@/components/projectManager/GanttCanvas';
import { FilterCriteria } from './FilterModal';

// دالة لتحويل رقم اليوم إلى تاريخ
const dayToDate = (dayIndex: number, projectStartDate: Date): Date => {
  const date = new Date(projectStartDate);
  date.setDate(date.getDate() + dayIndex);
  return date;
};

// دالة لحساب حالة المهمة
const getTaskStatus = (task: Task, projectStartDate: Date): 'completed' | 'in-progress' | 'not-started' | 'overdue' => {
  const progress = task.progress || 0;
  const today = new Date();
  const taskStartDate = dayToDate(task.startDay, projectStartDate);
  const taskEndDate = dayToDate(task.startDay + task.duration, projectStartDate);

  if (progress >= 100) {
    return 'completed';
  }

  if (today > taskEndDate && progress < 100) {
    return 'overdue';
  }

  if (today >= taskStartDate && today <= taskEndDate && progress > 0 && progress < 100) {
    return 'in-progress';
  }

  return 'not-started';
};

// دالة فلترة المهام
const filterTasks = (tasks: Task[], criteria: FilterCriteria, projectStartDate: Date): Task[] => {
  return tasks.filter(task => {
    // فلترة النص
    if (criteria.searchText) {
      const searchLower = criteria.searchText.toLowerCase();
      const matchesText = task.content.toLowerCase().includes(searchLower) ||
                         (task.author && task.author.toLowerCase().includes(searchLower));
      if (!matchesText) return false;
    }

    // فلترة التواريخ
    if (criteria.dateRange?.startDate || criteria.dateRange?.endDate) {
      const taskStartDate = dayToDate(task.startDay, projectStartDate);
      const taskEndDate = dayToDate(task.startDay + task.duration, projectStartDate);

      if (criteria.dateRange.startDate) {
        const filterStartDate = new Date(criteria.dateRange.startDate);
        if (taskEndDate < filterStartDate) return false;
      }

      if (criteria.dateRange.endDate) {
        const filterEndDate = new Date(criteria.dateRange.endDate);
        if (taskStartDate > filterEndDate) return false;
      }
    }

    // فلترة الحالة
    if (criteria.status && criteria.status !== 'all') {
      const taskStatus = getTaskStatus(task, projectStartDate);
      if (taskStatus !== criteria.status) return false;
    }

    // فلترة الأولوية
    if (criteria.priority && criteria.priority !== 'all') {
      const taskPriority = task.priority || 'medium';
      const priorityMap: { [key: number]: string } = {
        1: 'low',
        2: 'medium',
        3: 'high'
      };
      const taskPriorityString = priorityMap[taskPriority as number] || 'medium';
      if (taskPriorityString !== criteria.priority) return false;
    }

    // فلترة المؤلف
    if (criteria.author) {
      if (task.author !== criteria.author) return false;
    }

    // فلترة نوع المهمة
    if (criteria.taskType && criteria.taskType !== 'all') {
      const taskType = task.type || 'task';
      if (taskType !== criteria.taskType) return false;
    }

    // فلترة نسبة الإنجاز
    if (criteria.progress) {
      const progress = task.progress || 0;
      if (progress < criteria.progress.min || progress > criteria.progress.max) {
        return false;
      }
    }

    // فلترة الألوان
    if (criteria.colors && criteria.colors.length > 0) {
      if (!criteria.colors.includes(task.color)) return false;
    }

    // فلترة المدة
    if (criteria.duration) {
      const duration = task.duration || 0;
      if (duration < criteria.duration.min || duration > criteria.duration.max) {
        return false;
      }
    }

    return true;
  });
};

// دالة فلترة الشجرة
export const applyFilterToTree = (
  nodes: HierarchyNode[], 
  criteria: FilterCriteria,
  projectStartDate: Date = new Date('2025-01-14')
): HierarchyNode[] => {
  return nodes.map(node => {
    // فلترة المهام في العقدة الحالية
    const filteredTasks = filterTasks(node.tasks, criteria, projectStartDate);

    // فلترة العقد الفرعية بشكل تكراري
    const filteredChildren = applyFilterToTree(node.children, criteria, projectStartDate);

    // إذا كانت العقدة تحتوي على مهام مفلترة أو عقد فرعية مفلترة، احتفظ بها
    const hasMatchingTasks = filteredTasks.length > 0;
    const hasMatchingChildren = filteredChildren.some(child => 
      child.tasks.length > 0 || child.children.length > 0
    );

    // فلترة اسم العقدة نفسها
    const matchesNodeName = criteria.searchText ? 
      node.content.toLowerCase().includes(criteria.searchText.toLowerCase()) : true;

    if (hasMatchingTasks || hasMatchingChildren || matchesNodeName) {
      return {
        ...node,
        tasks: filteredTasks,
        children: filteredChildren
      };
    }

    // إذا لم تطابق أي شروط، أرجع عقدة فارغة
    return {
      ...node,
      tasks: [],
      children: []
    };
  }).filter(node => 
    // إزالة العقد التي لا تحتوي على مهام أو عقد فرعية
    node.tasks.length > 0 || 
    node.children.length > 0 ||
    (criteria.searchText && node.content.toLowerCase().includes(criteria.searchText.toLowerCase()))
  );
};

// دالة لحساب إحصائيات الفلترة
export const getFilterStatistics = (
  originalTree: HierarchyNode[], 
  filteredTree: HierarchyNode[]
): {
  originalTaskCount: number;
  filteredTaskCount: number;
  originalNodeCount: number;
  filteredNodeCount: number;
} => {
  const countTasks = (nodes: HierarchyNode[]): number => {
    return nodes.reduce((count, node) => {
      return count + node.tasks.length + countTasks(node.children);
    }, 0);
  };

  const countNodes = (nodes: HierarchyNode[]): number => {
    return nodes.reduce((count, node) => {
      return count + 1 + countNodes(node.children);
    }, 0);
  };

  return {
    originalTaskCount: countTasks(originalTree),
    filteredTaskCount: countTasks(filteredTree),
    originalNodeCount: countNodes(originalTree),
    filteredNodeCount: countNodes(filteredTree)
  };
};

// دالة للتحقق من وجود فلاتر نشطة
export const hasActiveFilters = (criteria: FilterCriteria): boolean => {
  return !!(
    criteria.searchText ||
    criteria.dateRange?.startDate ||
    criteria.dateRange?.endDate ||
    (criteria.status && criteria.status !== 'all') ||
    (criteria.priority && criteria.priority !== 'all') ||
    criteria.author ||
    (criteria.taskType && criteria.taskType !== 'all') ||
    (criteria.progress && (criteria.progress.min !== 0 || criteria.progress.max !== 100)) ||
    (criteria.colors && criteria.colors.length > 0) ||
    (criteria.duration && (criteria.duration.min !== 1 || criteria.duration.max !== 30))
  );
};

// دالة لتنظيف الفلاتر الفارغة
export const cleanFilters = (criteria: FilterCriteria): FilterCriteria => {
  const cleaned: FilterCriteria = {};

  if (criteria.searchText?.trim()) {
    cleaned.searchText = criteria.searchText.trim();
  }

  if (criteria.dateRange?.startDate || criteria.dateRange?.endDate) {
    cleaned.dateRange = criteria.dateRange;
  }

  if (criteria.status && criteria.status !== 'all') {
    cleaned.status = criteria.status;
  }

  if (criteria.priority && criteria.priority !== 'all') {
    cleaned.priority = criteria.priority;
  }

  if (criteria.author?.trim()) {
    cleaned.author = criteria.author.trim();
  }

  if (criteria.taskType && criteria.taskType !== 'all') {
    cleaned.taskType = criteria.taskType;
  }

  if (criteria.progress && (criteria.progress.min !== 0 || criteria.progress.max !== 100)) {
    cleaned.progress = criteria.progress;
  }

  if (criteria.colors && criteria.colors.length > 0) {
    cleaned.colors = criteria.colors;
  }

  if (criteria.duration && (criteria.duration.min !== 1 || criteria.duration.max !== 30)) {
    cleaned.duration = criteria.duration;
  }

  return cleaned;
};
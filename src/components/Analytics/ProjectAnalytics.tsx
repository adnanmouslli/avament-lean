import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, Area, AreaChart
} from 'recharts';
import { 
  Users, CheckCircle, Clock, AlertTriangle, Target, TrendingUp,
  Calendar, User, Activity, BarChart3
} from 'lucide-react';

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
  priority?: number;
  isLeaf: boolean;
  isExpanded?: boolean;
}

interface ProjectAnalyticsProps {
  hierarchyTree: HierarchyNode[];
  projectStartDate: Date;
}

const ProjectAnalytics: React.FC<ProjectAnalyticsProps> = ({ 
  hierarchyTree,
  projectStartDate = new Date('2025-08-14')
}) => {
  
  // حساب جميع المهام من الشجرة
  const allTasks = useMemo(() => {
    const tasks: Task[] = [];
    const extractTasks = (nodes: HierarchyNode[]) => {
      nodes.forEach(node => {
        tasks.push(...node.tasks);
        extractTasks(node.children);
      });
    };
    extractTasks(hierarchyTree);
    return tasks;
  }, [hierarchyTree]);

  // تحويل رقم اليوم إلى تاريخ
  const dayToDate = (dayIndex: number): Date => {
    const date = new Date(projectStartDate);
    date.setDate(date.getDate() + dayIndex);
    return date;
  };

  // حساب عدد الأشخاص العاملين في كل يوم مع التفاصيل
  const dailyWorkforceData = useMemo(() => {
    if (allTasks.length === 0) return [];

    const maxDay = Math.max(...allTasks.map(task => task.startDay + task.duration));
    const dailyWorkers: { [key: number]: { [author: string]: number } } = {};

    // تجميع الأشخاص العاملين لكل يوم مع عدد المهام
    allTasks.forEach(task => {
      if (task.author && task.duration > 0) {
        for (let day = task.startDay; day < task.startDay + task.duration; day++) {
          if (!dailyWorkers[day]) {
            dailyWorkers[day] = {};
          }
          dailyWorkers[day][task.author] = (dailyWorkers[day][task.author] || 0) + 1;
        }
      }
    });

    // تحويل البيانات إلى format مناسب للمخطط
    const chartData = [];
    for (let day = 0; day <= maxDay; day++) {
      const date = dayToDate(day);
      const dayWorkers = dailyWorkers[day] || {};
      const workersCount = Object.keys(dayWorkers).length;
      const totalTasks = Object.values(dayWorkers).reduce((sum: number, count: number) => sum + count, 0);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6; // أحد وسبت
      
      // @ts-expect-error
      chartData.push({
        day: day + 1,
        date: date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }),
        workers: workersCount,
        totalTasks,
        workerDetails: dayWorkers,
        isWeekend,
        fullDate: date.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      });
    }

    return chartData;
  }, [allTasks, projectStartDate]);

  // إحصائيات عامة
  const projectStats = useMemo(() => {
    const totalTasks = allTasks.filter(task => task.type !== 'milestone').length;
    const milestones = allTasks.filter(task => task.type === 'milestone').length;
    const completedTasks = allTasks.filter(task => (task.progress || 0) >= 100).length;
    const inProgressTasks = allTasks.filter(task => {
      const progress = task.progress || 0;
      return progress > 0 && progress < 100;
    }).length;
    const notStartedTasks = allTasks.filter(task => (task.progress || 0) === 0).length;

    const averageProgress = totalTasks > 0 
      ? Math.round(allTasks.reduce((sum, task) => sum + (task.progress || 0), 0) / totalTasks)
      : 0;

    const averageDuration = totalTasks > 0
      ? Math.round(allTasks.filter(task => task.type !== 'milestone')
          .reduce((sum, task) => sum + task.duration, 0) / totalTasks)
      : 0;

    const uniqueAuthors = new Set(allTasks.map(task => task.author).filter(Boolean)).size;

    return {
      totalTasks,
      milestones,
      completedTasks,
      inProgressTasks,
      notStartedTasks,
      averageProgress,
      averageDuration,
      uniqueAuthors
    };
  }, [allTasks]);

  // توزيع المهام حسب الشركات مع التفاصيل
  const authorDistribution = useMemo(() => {
    const distribution: { [key: string]: {
      total: number;
      completed: number;
      inProgress: number;
      notStarted: number;
      averageProgress: number;
    } } = {};

    allTasks.forEach(task => {
      if (task.author) {
        if (!distribution[task.author]) {
          distribution[task.author] = {
            total: 0,
            completed: 0,
            inProgress: 0,
            notStarted: 0,
            averageProgress: 0
          };
        }
        
        distribution[task.author].total++;
        const progress = task.progress || 0;
        
        if (progress >= 100) {
          distribution[task.author].completed++;
        } else if (progress > 0) {
          distribution[task.author].inProgress++;
        } else {
          distribution[task.author].notStarted++;
        }
      }
    });

    // حساب متوسط التقدم لكل مسؤول
    Object.keys(distribution).forEach(author => {
      const authorTasks = allTasks.filter(task => task.author === author);
      const totalProgress = authorTasks.reduce((sum, task) => sum + (task.progress || 0), 0);
      distribution[author].averageProgress = authorTasks.length > 0 ? Math.round(totalProgress / authorTasks.length) : 0;
    });

    return Object.entries(distribution)
      .map(([author, stats]) => ({ 
        author, 
        ...stats,
        completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [allTasks]);

  // توزيع حالات المهام
  const taskStatusData = [
    { name: 'مكتملة', value: projectStats.completedTasks, color: '#10b981' },
    { name: 'قيد التنفيذ', value: projectStats.inProgressTasks, color: '#3b82f6' },
    { name: 'لم تبدأ', value: projectStats.notStartedTasks, color: '#6b7280' }
  ];

  // مخطط مقارنة التقدم مع الخطة المجدولة
  const progressVsPlannedData = useMemo(() => {
    if (allTasks.length === 0) return [];

    const maxDay = Math.max(...allTasks.map(task => task.startDay + task.duration));
    const chartData = [];

    for (let day = 0; day <= maxDay; day++) {
      const date = dayToDate(day);
      
      // حساب التقدم المجدول (مثالي)
      const totalTaskDays = allTasks.reduce((sum, task) => sum + task.duration, 0);
      const expectedProgress = totalTaskDays > 0 ? Math.min(100, (day / maxDay) * 100) : 0;
      
      // حساب التقدم الفعلي
      let completedWork = 0;
      let totalWork = 0;
      
      allTasks.forEach(task => {
        if (task.startDay <= day) {
          const daysIntoTask = Math.min(task.duration, day - task.startDay + 1);
          const taskProgress = (task.progress || 0) / 100;
          completedWork += daysIntoTask * taskProgress;
          totalWork += Math.min(task.duration, daysIntoTask);
        }
      });
      
      const actualProgress = totalWork > 0 ? (completedWork / totalWork) * 100 : 0;
      
      // @ts-expect-error
      chartData.push({
        day: day + 1,
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        planned: Math.round(expectedProgress),
        actual: Math.round(actualProgress),
        fullDate: date.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'long',
          day: 'numeric'
        })
      });
    }

    return chartData;
  }, [allTasks, dayToDate]);

  // بيانات الأداء الزمني
  const schedulePerformanceData = useMemo(() => {
    const today = new Date();
    const performance = {
      early3Plus: 0,
      early1to3: 0,
      onTime: 0,
      late1to3: 0,
      late3Plus: 0
    };

    allTasks.forEach(task => {
      if (task.progress && task.progress >= 100) {
        const taskStartDate = dayToDate(task.startDay);
        const taskEndDate = dayToDate(task.startDay + task.duration);
        const timeDiff = (today.getTime() - taskEndDate.getTime()) / (1000 * 3600 * 24);
        
        if (timeDiff >= 3) {
          performance.early3Plus++;
        } else if (timeDiff >= 1) {
          performance.early1to3++;
        } else if (Math.abs(timeDiff) <= 1) {
          performance.onTime++;
        } else if (timeDiff <= -1 && timeDiff > -3) {
          performance.late1to3++;
        } else {
          performance.late3Plus++;
        }
      }
    });

    return [
      { name: '3+ days early', value: performance.early3Plus, color: '#059669' },
      { name: '1-3 days early', value: performance.early1to3, color: '#10b981' },
      { name: 'On time', value: performance.onTime, color: '#3b82f6' },
      { name: '1-3 days late', value: performance.late1to3, color: '#f59e0b' },
      { name: '3+ days late', value: performance.late3Plus, color: '#ef4444' }
    ];
  }, [allTasks, dayToDate]);

  // بيانات متتبع الحالة المحسنة
  const enhancedStatusData = useMemo(() => {
    const today = new Date();
    const status = {
      completed: 0,
      onTrack: 0,
      atRisk: 0,
      overdue: 0,
      notStarted: 0
    };

    allTasks.forEach(task => {
      const taskStartDate = dayToDate(task.startDay);
      const taskEndDate = dayToDate(task.startDay + task.duration);
      const progress = task.progress || 0;

      if (progress >= 100) {
        status.completed++;
      } else if (taskStartDate > today) {
        status.notStarted++;
      } else if (taskEndDate < today && progress < 100) {
        status.overdue++;
      } else if (progress > 0) {
        // حساب إذا كان التقدم متأخر عن المتوقع
        const expectedProgress = Math.min(100, 
          ((today.getTime() - taskStartDate.getTime()) / 
           (taskEndDate.getTime() - taskStartDate.getTime())) * 100
        );
        
        if (progress < expectedProgress - 10) {
          status.atRisk++;
        } else {
          status.onTrack++;
        }
      } else {
        status.atRisk++;
      }
    });

    return [
      { name: 'Completed', value: status.completed, color: '#10b981' },
      { name: 'On Track', value: status.onTrack, color: '#3b82f6' },
      { name: 'At Risk', value: status.atRisk, color: '#f59e0b' },
      { name: 'Overdue', value: status.overdue, color: '#ef4444' },
      { name: 'Not Started', value: status.notStarted, color: '#6b7280' }
    ];
  }, [allTasks, dayToDate]);

  // Custom tooltip for progress comparison
  const ProgressTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 p-3 rounded shadow-sm">
          <p className="font-semibold text-gray-900 text-sm mb-2">{data.fullDate}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-xs text-gray-600">Planned:</span>
              </div>
              <span className="text-xs font-semibold text-blue-600">{data.planned}%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-xs text-gray-600">Actual:</span>
              </div>
              <span className="text-xs font-semibold text-green-600">{data.actual}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };
  const WorkforceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-300 p-3 rounded shadow-sm">
          <p className="font-semibold text-gray-900 text-sm mb-1">{data.fullDate}</p>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <p className="text-gray-700 text-sm">
              Team Members: <span className="font-semibold">{data.workers}</span>
            </p>
          </div>
          {data.isWeekend && (
            <div className="mt-1 px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs">
              <p className="text-gray-600">Weekend</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-full bg-gray-100 overflow-y-auto">
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Header */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-3 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Project Analytics Dashboard</h1>
                <p className="text-gray-600">Comprehensive insights into project performance and resource allocation</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-300 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">{projectStats.totalTasks}</p>
                  <p className="text-xs text-gray-600 mt-1">Active projects</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-300 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Completion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{projectStats.averageProgress}%</p>
                  <p className="text-xs text-gray-600 mt-1">Average progress</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-300 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Milestones</p>
                  <p className="text-2xl font-bold text-gray-900">{projectStats.milestones}</p>
                  <p className="text-xs text-gray-600 mt-1">Key deliverables</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-300 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Team Members</p>
                  <p className="text-2xl font-bold text-gray-900">{projectStats.uniqueAuthors}</p>
                  <p className="text-xs text-gray-600 mt-1">Active contributors</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Daily Workforce Chart */}
            <div className="lg:col-span-2 bg-white rounded-lg border border-gray-300 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-blue-600 p-2 rounded">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Daily Workforce Distribution</h2>
                  <p className="text-sm text-gray-600">Number of team members working each day</p>
                </div>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyWorkforceData}>
                    <defs>
                      <linearGradient id="workforceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280"
                      fontSize={11}
                      fontWeight={400}
                      interval="preserveStartEnd"
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      fontSize={11}
                      fontWeight={400}
                      tick={{ fill: '#6b7280' }}
                      label={{ 
                        value: 'Team Members', 
                        angle: -90, 
                        position: 'insideLeft',
                        style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' }
                      }}
                    />
                    <Tooltip content={<WorkforceTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="workers"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#workforceGradient)"
                      dot={{ fill: '#3b82f6', strokeWidth: 1, r: 3 }}
                      activeDot={{ r: 4, stroke: '#3b82f6', strokeWidth: 1, fill: '#ffffff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Task Status Pie Chart */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-green-600 p-2 rounded">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Task Status</h2>
                  <p className="text-sm text-gray-600">Current project status</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {taskStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={1} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '13px'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      wrapperStyle={{ paddingTop: '16px' }}
                      formatter={(value) => (
                        <span style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Author Distribution Chart */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-purple-600 p-2 rounded">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Team Workload Analysis</h2>
                <p className="text-sm text-gray-600">Task assignment and completion status for each team member</p>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={authorDistribution} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                  <XAxis 
                    type="number" 
                    stroke="#6b7280" 
                    fontSize={11}
                    fontWeight={400}
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="author" 
                    stroke="#6b7280" 
                    fontSize={11}
                    fontWeight={400}
                    width={110}
                    tick={{ fill: '#6b7280' }}
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-gray-300 p-4 rounded shadow-sm min-w-[200px]">
                            <p className="font-semibold text-gray-900 text-sm mb-3">{data.author}</p>
                            
                            <div className="space-y-2 mb-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Total Tasks:</span>
                                <span className="text-sm font-semibold text-gray-900">{data.total}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Completed:</span>
                                <span className="text-sm font-semibold text-green-600">{data.completed}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">In Progress:</span>
                                <span className="text-sm font-semibold text-blue-600">{data.inProgress}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Not Started:</span>
                                <span className="text-sm font-semibold text-gray-600">{data.notStarted}</span>
                              </div>
                            </div>
                            
                            <div className="pt-2 border-t border-gray-200 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Completion Rate:</span>
                                <span className="text-sm font-bold text-purple-600">{data.completionRate}%</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-600">Average Progress:</span>
                                <span className="text-sm font-bold text-indigo-600">{data.averageProgress}%</span>
                              </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="mt-3">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full" 
                                  style={{ width: `${data.completionRate}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">Task completion progress</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="total" 
                    fill="#8b5cf6"
                    radius={[0, 4, 4, 0]}
                    stroke="#ffffff"
                    strokeWidth={1}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-gray-300 p-6 text-center">
              <div className="bg-green-100 w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Completed Tasks</h3>
              <p className="text-2xl font-bold text-gray-900 mb-2">{projectStats.completedTasks}</p>
              <div className="bg-gray-50 border border-gray-200 rounded p-2">
                <p className="text-xs font-medium text-gray-700">
                  {projectStats.totalTasks > 0 
                    ? Math.round((projectStats.completedTasks / projectStats.totalTasks) * 100)
                    : 0}% of total tasks
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-300 p-6 text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">In Progress</h3>
              <p className="text-2xl font-bold text-gray-900 mb-2">{projectStats.inProgressTasks}</p>
              <div className="bg-gray-50 border border-gray-200 rounded p-2">
                <p className="text-xs font-medium text-gray-700">
                  {projectStats.totalTasks > 0 
                    ? Math.round((projectStats.inProgressTasks / projectStats.totalTasks) * 100)
                    : 0}% of total tasks
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-300 p-6 text-center">
              <div className="bg-gray-100 w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-gray-600" />
              </div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Average Duration</h3>
              <p className="text-2xl font-bold text-gray-900 mb-2">{projectStats.averageDuration}</p>
              <div className="bg-gray-50 border border-gray-200 rounded p-2">
                <p className="text-xs font-medium text-gray-700">days per task</p>
              </div>
            </div>
          </div>

          {/* Progress vs Planning Comparison */}
          <div className="bg-white rounded-lg border border-gray-300 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-indigo-600 p-2 rounded">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Actual Progress vs. Planned Schedule</h2>
                <p className="text-sm text-gray-600">Comparison between planned and actual project progress</p>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressVsPlannedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    fontSize={11}
                    fontWeight={400}
                    interval="preserveStartEnd"
                    tick={{ fill: '#6b7280' }}
                  />
                  <YAxis 
                    domain={[0, 100]}
                    stroke="#6b7280"
                    fontSize={11}
                    fontWeight={400}
                    tick={{ fill: '#6b7280' }}
                    label={{ 
                      value: 'Progress %', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '12px' }
                    }}
                  />
                  <Tooltip content={<ProgressTooltip />} />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => (
                      <span style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>{value}</span>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="planned"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 1, r: 3 }}
                    activeDot={{ r: 4, stroke: '#3b82f6', strokeWidth: 1, fill: '#ffffff' }}
                    name="Planned Progress"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 1, r: 3 }}
                    activeDot={{ r: 4, stroke: '#10b981', strokeWidth: 1, fill: '#ffffff' }}
                    name="Actual Progress"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Analysis Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Schedule Performance */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-emerald-600 p-2 rounded">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Schedule Performance</h2>
                  <p className="text-sm text-gray-600">Task completion timing</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={schedulePerformanceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {schedulePerformanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={1} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '13px'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      wrapperStyle={{ paddingTop: '16px' }}
                      formatter={(value) => (
                        <span style={{ fontSize: '10px', fontWeight: '500', color: '#374151' }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Enhanced Status Tracking */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-cyan-600 p-2 rounded">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Status Tracking</h2>
                  <p className="text-sm text-gray-600">Current task status</p>
                </div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={enhancedStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {enhancedStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={1} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '13px'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      wrapperStyle={{ paddingTop: '16px' }}
                      formatter={(value) => (
                        <span style={{ fontSize: '10px', fontWeight: '500', color: '#374151' }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Performance Insights */}
            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-violet-600 p-2 rounded">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Performance Insights</h2>
                  <p className="text-sm text-gray-600">Key project metrics</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="border border-gray-200 rounded p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">Schedule Adherence</span>
                    <span className="text-sm font-bold text-green-600">
                      {schedulePerformanceData.reduce((acc, item) => 
                        item.name.includes('early') || item.name.includes('On time') ? acc + item.value : acc, 0
                      )} / {schedulePerformanceData.reduce((acc, item) => acc + item.value, 0)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ 
                        width: `${(schedulePerformanceData.reduce((acc, item) => 
                          item.name.includes('early') || item.name.includes('On time') ? acc + item.value : acc, 0
                        ) / Math.max(1, schedulePerformanceData.reduce((acc, item) => acc + item.value, 0))) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">Task Completion Rate</span>
                    <span className="text-sm font-bold text-blue-600">
                      {enhancedStatusData.find(item => item.name === 'Completed')?.value || 0} / {allTasks.length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ 
                        width: `${((enhancedStatusData.find(item => item.name === 'Completed')?.value || 0) / Math.max(1, allTasks.length)) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>

                <div className="border border-gray-200 rounded p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">Risk Level</span>
                    <span className="text-sm font-bold text-orange-600">
                      {enhancedStatusData.find(item => item.name === 'At Risk')?.value || 0} tasks
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span className="text-xs text-gray-600">Requires attention</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProjectAnalytics;
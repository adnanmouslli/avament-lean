"use client";

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Calendar,
  Users,
  Plus,
  Search,
  Settings,
  Bell,
  User,
  MoreVertical,
  FolderPlus,
  Zap,
  Target,
  TrendingUp,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import ProjectLoader from '@/components/ProjectLoader';

interface Project {
  id: string;
  name: string;
  lastModified: string;
  status: 'active' | 'completed' | 'draft';
  teamSize: number;
  color: string;
}

const AvamentDashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [userName] = useState('Adnan Mouslli');
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showProjectLoader, setShowProjectLoader] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<string[]>(['Wednesday']);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectDuration, setProjectDuration] = useState({
    startDate: '2025-08-13',
    endDate: '2025-09-13'
  });

  // محاكاة تحميل البيانات
  useEffect(() => {
    const generateSampleProjects = (): Project[] => {
      const projectNames = [
        'Project Management System',
        'E-commerce Platform',
        'Banking Services Application',
        'Human Resources Management System',
        'E-learning Platform'
      ];

      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

      return projectNames.map((name, index) => ({
        id: `project-${index + 1}`,
        name,
        lastModified: `${Math.floor(Math.random() * 7) + 1} days ago`,
        status: ['active', 'completed', 'draft'][Math.floor(Math.random() * 3)] as any,
        teamSize: Math.floor(Math.random() * 8) + 3,
        color: colors[index % colors.length]
      }));
    };

    setTimeout(() => {
      setProjects(generateSampleProjects());
      setIsLoading(false);
    }, 1200);
  }, []);

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );



  const openProject = (project: Project) => {
    setSelectedProject(project);
    setShowProjectLoader(true);
    setLoadingProgress(0);

    // محاكاة تقدم التحميل
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          // الانتقال إلى صفحة المشروع بعد التحميل
          setTimeout(() => {
            window.location.href = '/project';
          }, 500);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: newProjectName,
      lastModified: 'الآن',
      status: 'active',
      teamSize: 1,
      color: '#3b82f6'
    };

    setProjects(prev => [newProject, ...prev]);
    setNewProjectName('');
    setSelectedDays(['Wednesday']);
    setProjectDuration({
      startDate: '2025-08-13',
      endDate: '2025-09-13'
    });
    setShowNewProjectModal(false);
  };

  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('en-GB', options);
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // مكون نافذة إنشاء مشروع جديد
  const NewProjectModal = () => (
    <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
                 <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-800">New Project</h2>
          <button
            onClick={() => {
              setShowNewProjectModal(false);
              setNewProjectName('');
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="space-y-6">
          {/* اسم المشروع */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name
            </label>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Enter project name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all outline-none"
              autoFocus
            />
          </div>

          {/* المدة */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={projectDuration.startDate}
                  onChange={(e) => setProjectDuration(prev => ({...prev, startDate: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={projectDuration.endDate}
                  onChange={(e) => setProjectDuration(prev => ({...prev, endDate: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all outline-none"
                />
              </div>
            </div>
            {/* عرض التاريخ المنسق */}
            <div className="mt-2 p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar size={14} />
                <span>
                  {formatDateForDisplay(projectDuration.startDate)} - {formatDateForDisplay(projectDuration.endDate)}
                </span>
              </div>
            </div>
          </div>

          {/* التقويم الافتراضي */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Default Calendar</h3>
            <p className="text-xs text-gray-500 mb-4">{selectedDays.length} Workdays</p>
            
            <div className="grid grid-cols-2 gap-2">
              {weekDays.map(day => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-2.5 text-xs rounded-lg border transition-colors font-medium ${
                    selectedDays.includes(day)
                      ? 'bg-gray-800 text-white border-gray-800'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* أزرار العمل */}
        <div className="flex justify-end space-x-3 mt-8">
          <button
            onClick={() => {
              setShowNewProjectModal(false);
              setNewProjectName('');
            }}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateProject}
            disabled={!newProjectName.trim()}
            className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );

 
  const AvamentLogo = () => (
    <div className="flex items-center space-x-3">
      {/* شعار AVAMENT من الملف */}
      <div className="relative w-12 h-12 flex items-center justify-center">
        <img 
          src="/AVAMENT_big.png" 
          alt="AVAMENT Logo" 
          className="w-10 h-10 object-contain"
         
        />
        
      </div>
      
      {/* النص */}
      <div className="flex flex-col">
        <div className="text-xl font-black text-gray-800 tracking-tight">
          AVAMENT
        </div>
        <div className="text-xs font-semibold text-cyan-600 tracking-wider -mt-1">
          LEAN
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          {/* شعار متحرك أثناء التحميل */}
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 animate-spin">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 transform rotate-12 rounded-lg shadow-lg animate-pulse" />
            </div>
            <div className="absolute w-8 h-12 bg-gradient-to-br from-blue-500 to-blue-700 transform skew-y-12 rounded-lg shadow-md animate-pulse" 
                 style={{ top: '2px', right: '0px', animationDelay: '0.2s' }} />
          </div>
          <div className="text-gray-800 text-lg font-medium mb-2">جاري التحميل...</div>
          <div className="text-gray-600 text-sm">يرجى الانتظار</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-cyan-50 text-gray-800">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-white min-h-screen border-r border-gray-200 shadow-sm">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <AvamentLogo />
              <div className="flex items-center space-x-2">
                <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <Bell size={18} className="text-gray-500 hover:text-gray-700" />
                </button>
                <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <Settings size={18} className="text-gray-500 hover:text-gray-700" />
                </button>
              </div>
            </div>

            {/* بحث */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search projects"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2 text-gray-700 placeholder-gray-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* قسم المشاريع */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                جميع المشاريع
              </h2>
              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                {filteredProjects.length}
              </span>
            </div>

            {/* قائمة المشاريع */}
            <div className="space-y-2">
              {filteredProjects.map((project, index) => (
                <div
                  key={project.id}
                  className="group flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-all duration-200 border border-transparent hover:border-gray-200"
                  style={{ 
                    animationDelay: `${index * 100}ms`,
                    animation: 'slideInLeft 0.5s ease-out forwards'
                  }}
                  onClick={() => openProject(project)}
                >
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: project.color + '20' }}
                  >
                    <Building2 size={16} style={{ color: project.color }} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-800 truncate group-hover:text-cyan-600 transition-colors">
                        {project.name}
                      </h3>
                      <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all">
                        <MoreVertical size={14} className="text-gray-500" />
                      </button>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">{project.lastModified}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <div className="flex items-center space-x-1">
                        <Users size={12} className="text-gray-500" />
                        <span className="text-xs text-gray-500">{project.teamSize}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* المحتوى الرئيسي */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {/* المحتوى المركزي */}
          <div className="text-center max-w-md">
            {/* الترحيب */}
            <div className="mb-8 animate-fadeIn">
              <p className="text-gray-500 text-lg mb-2">Welcome</p>
              <h1 className="text-4xl font-bold text-gray-800 mb-8">{userName}</h1>
            </div>

            {/* زر المشروع الجديد */}
            <button 
              onClick={() => setShowNewProjectModal(true)}
              className="group bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-semibold text-base transition-all duration-300 transform hover:scale-105 hover:shadow-xl mb-12 animate-bounceIn"
            >
              <div className="flex items-center space-x-3">
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                <span>New Project</span>
              </div>
            </button>
          </div>

          {/* الشعار الزخرفي */}
          <div className="absolute bottom-8 right-8 opacity-10">
            <div className="relative w-32 h-32 animate-float">
              {/* شعار AVAMENT الكبير المتحرك */}
              <img 
                src="/AVAMENT_big.png" 
                alt="AVAMENT Logo" 
                className="w-28 h-28 object-contain opacity-70"
                
              />
              
            </div>
          </div>
        </div>
      </div>

      {/* نافذة إنشاء مشروع جديد */}
      {showNewProjectModal && <NewProjectModal />}
      
      {/* واجهة تحميل المشروع */}
      {showProjectLoader && <ProjectLoader selectedProject={selectedProject} />}

      {/* CSS للأنيميشن */}
      <style jsx>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(2deg);
          }
        }

        /* انيميشن جديد لواجهة التحميل */
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes spin-reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }

        @keyframes float-gentle {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes rotate-gentle {
          0%, 100% {
            transform: rotate(12deg);
          }
          50% {
            transform: rotate(15deg);
          }
        }

        @keyframes skew-gentle {
          0%, 100% {
            transform: skew(0deg, 12deg);
          }
          50% {
            transform: skew(2deg, 15deg);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.1);
          }
        }

        @keyframes text-glow {
          0%, 100% {
            text-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
          }
          50% {
            text-shadow: 0 0 20px rgba(34, 211, 238, 0.8), 0 0 30px rgba(34, 211, 238, 0.6);
          }
        }

        @keyframes text-pulse {
          0%, 100% {
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes progress-glow {
          0% {
            box-shadow: 0 0 5px rgba(34, 211, 238, 0.5);
          }
          50% {
            box-shadow: 0 0 20px rgba(34, 211, 238, 0.8), 0 0 30px rgba(59, 130, 246, 0.6);
          }
          100% {
            box-shadow: 0 0 5px rgba(34, 211, 238, 0.5);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes counter {
          0% {
            transform: scale(0.9);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }

        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce-dot-1 {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes bounce-dot-2 {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes bounce-dot-3 {
          0%, 80%, 100% {
            transform: scale(0);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes logo-bounce {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes logo-glow {
          0%, 100% {
            filter: drop-shadow(0 0 10px rgba(34, 211, 238, 0.5));
          }
          50% {
            filter: drop-shadow(0 0 25px rgba(34, 211, 238, 0.8)) drop-shadow(0 0 35px rgba(59, 130, 246, 0.6));
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 1s ease-out forwards;
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 1s ease-out 0.5s forwards;
          opacity: 0;
        }
        
        .animate-bounceIn {
          animation: bounceIn 1s ease-out 0.3s forwards;
          opacity: 0;
        }
        
        .animate-float {
          animation: float 2s ease-in-out infinite;
        }

        /* Classes جديدة لواجهة التحميل */
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        .animate-spin-reverse {
          animation: spin-reverse 4s linear infinite;
        }

        .animate-float-gentle {
          animation: float-gentle 3s ease-in-out infinite;
        }

        .animate-rotate-gentle {
          animation: rotate-gentle 4s ease-in-out infinite;
        }

        .animate-skew-gentle {
          animation: skew-gentle 4s ease-in-out infinite 0.5s;
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .animate-text-glow {
          animation: text-glow 2s ease-in-out infinite;
        }

        .animate-text-pulse {
          animation: text-pulse 1.5s ease-in-out infinite;
        }

        .animate-progress-glow {
          animation: progress-glow 2s ease-in-out infinite;
        }

        .animate-shimmer {
          animation: shimmer 2s linear infinite;
        }

        .animate-counter {
          animation: counter 0.3s ease-out;
        }

        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out;
        }

        .animate-bounce-dot-1 {
          animation: bounce-dot-1 1.4s ease-in-out infinite;
        }

        .animate-bounce-dot-2 {
          animation: bounce-dot-2 1.4s ease-in-out infinite 0.2s;
        }

        .animate-bounce-dot-3 {
          animation: bounce-dot-3 1.4s ease-in-out infinite 0.4s;
        }

        .animate-logo-bounce {
          animation: logo-bounce 2s ease-in-out infinite;
        }

        .animate-logo-glow {
          animation: logo-glow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default AvamentDashboard;
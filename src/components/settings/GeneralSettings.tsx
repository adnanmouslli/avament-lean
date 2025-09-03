import { useState } from "react";
import { Calendar, CalendarOff, Clock, Plus, RotateCcw, Save, Type, X, BarChart3 } from "lucide-react";

// Mock ProjectConfig type for demonstration
interface ProjectConfig {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
}

export const GeneralSettings: React.FC = () => {
  const [editingProject, setEditingProject] = useState<ProjectConfig>({
    name: "مشروع تطوير التطبيق",
    description: "تطوير تطبيق إدارة المشاريع الجديد",
    startDate: "2024-01-15",
    endDate: "2024-06-30"
  });

  const [weekendDays, setWeekendDays] = useState<number[]>([5, 6]); // الجمعة والسبت
  const [workingHours, setWorkingHours] = useState({ start: '08:00', end: '17:00' });
  const [holidays, setHolidays] = useState<string[]>(['2024-03-15', '2024-04-20']);
  const [newHoliday, setNewHoliday] = useState('');

    const weekDays = [
    { id: 0, name: 'Sunday', short: 'Sun' },
    { id: 1, name: 'Monday', short: 'Mon' },
    { id: 2, name: 'Tuesday', short: 'Tue' },
    { id: 3, name: 'Wednesday', short: 'Wed' },
    { id: 4, name: 'Thursday', short: 'Thu' },
    { id: 5, name: 'Friday', short: 'Fri' },
    { id: 6, name: 'Saturday', short: 'Sat' }
    ];


  const calculateDuration = (start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const calculateWorkingDays = (start: string, end: string): number => {
    let workingDays = 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const dateStr = d.toISOString().split('T')[0];
      if (!weekendDays.includes(dayOfWeek) && !holidays.includes(dateStr)) {
        workingDays++;
      }
    }
    return workingDays;
  };

  const handleSaveProject = () => {
    console.log('حفظ المشروع');
  };

  const handleResetProject = () => {
    console.log('إعادة تعيين');
  };

  return (
    <div className="min-h-screen  p-4" dir="rtl">
      <div className="max-w-6xl mx-auto">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* معلومات المشروع */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <Type size={16} className="text-gray-600" />
              <h2 className="font-medium text-gray-900">معلومات المشروع</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  اسم المشروع
                </label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  الوصف
                </label>
                <textarea
                  value={editingProject.description || ''}
                  onChange={(e) => setEditingProject(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                />
              </div>

              {/* إحصائيات مبسطة */}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 size={14} className="text-gray-500" />
                  <span className="text-xs font-medium text-gray-700">إحصائيات المشروع</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 bg-gray-50 rounded-md">
                    <div className="text-lg font-semibold text-gray-900">
                      {calculateDuration(editingProject.startDate, editingProject.endDate)}
                    </div>
                    <div className="text-xs text-gray-500">يوم كامل</div>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded-md">
                    <div className="text-lg font-semibold text-blue-700">
                      {calculateWorkingDays(editingProject.startDate, editingProject.endDate)}
                    </div>
                    <div className="text-xs text-gray-500">يوم عمل</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* الجدول الزمني وأيام العمل */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <Calendar size={16} className="text-gray-600" />
              <h2 className="font-medium text-gray-900">التوقيتات</h2>
            </div>
            
            <div className="space-y-5">
              {/* التواريخ */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">التواريخ الأساسية</label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">البداية</label>
                    <input
                      type="date"
                      value={editingProject.startDate}
                      onChange={(e) => setEditingProject(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">النهاية</label>
                    <input
                      type="date"
                      value={editingProject.endDate}
                      onChange={(e) => setEditingProject(prev => ({ ...prev, endDate: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* أيام العمل */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">العطلة الأسبوعية</label>
                <div className="grid grid-cols-7 gap-1">
                  {weekDays.map(day => (
                    <button
                      key={day.id}
                      onClick={() => {
                        setWeekendDays(prev => 
                          prev.includes(day.id) 
                            ? prev.filter(d => d !== day.id)
                            : [...prev, day.id]
                        );
                      }}
                      className={`p-2 text-xs font-medium rounded border transition-colors ${
                        weekendDays.includes(day.id)
                          ? 'bg-red-50 text-red-700 border-red-300'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                      title={day.name}
                    >
                      {day.short}
                    </button>
                  ))}
                </div>
              </div>

              {/* ساعات العمل */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">ساعات العمل</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">من</label>
                    <input
                      type="time"
                      value={workingHours.start}
                      onChange={(e) => setWorkingHours(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">إلى</label>
                    <input
                      type="time"
                      value={workingHours.end}
                      onChange={(e) => setWorkingHours(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* العطل الرسمية */}
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <CalendarOff size={16} className="text-gray-600" />
              <h2 className="font-medium text-gray-900">العطل الرسمية</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="date"
                  value={newHoliday}
                  onChange={(e) => setNewHoliday(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => {
                    if (newHoliday && !holidays.includes(newHoliday)) {
                      setHolidays([...holidays, newHoliday]);
                      setNewHoliday('');
                    }
                  }}
                  className="px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {holidays.sort().map(holiday => (
                  <div key={holiday} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-md">
                    <span className="text-sm text-gray-700">
                      {new Date(holiday).toLocaleDateString('ar-EG', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    <button
                      onClick={() => setHolidays(holidays.filter(h => h !== holiday))}
                      className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                
                {holidays.length === 0 && (
                  <div className="text-center py-6">
                    <div className="text-gray-300 mb-2">
                      <CalendarOff size={24} className="mx-auto" />
                    </div>
                    <p className="text-xs text-gray-500">لا توجد عطل مضافة</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleResetProject}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <RotateCcw size={14} />
            إعادة تعيين
          </button>
          <button
            onClick={handleSaveProject}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <Save size={14} />
            حفظ التغييرات
          </button>
        </div>
      </div>
    </div>
  );
};
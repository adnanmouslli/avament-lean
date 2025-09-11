"use client";

import React from 'react';
import { 
  Eye, 
  Link2, 
  X, 
  Grid3X3, 
  Calendar,
  Users,
  BarChart3,
  Target,
  Clock,
  Palette,
  Settings,
  MousePointer2,
  RotateCcw
} from 'lucide-react';

export interface ViewSettings {
  showLinks: boolean;
  isLinkMode: boolean;
  showGrid: boolean;
  showWeekends: boolean;
  showProgress: boolean;
  showAuthors: boolean;
  showMilestones: boolean;
  showTimestamps: boolean;
  showColors: boolean;
  showTaskIds: boolean;
  showTodayLine: boolean;
  showHoverTask: boolean;
}

interface ViewSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ViewSettings;
  onSettingsChange: (settings: ViewSettings) => void;
}

interface SettingItem {
  key: keyof ViewSettings;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  dependent?: keyof ViewSettings;
}

const allSettings: SettingItem[] = [
  {
    key: 'showLinks',
    label: 'إظهار الروابط',
    icon: Link2
  },
  {
    key: 'isLinkMode',
    label: 'وضع ربط المهام',
    icon: Target,
    dependent: 'showLinks'
  },
  {
    key: 'showGrid',
    label: 'إظهار الشبكة',
    icon: Grid3X3
  },
  {
    key: 'showWeekends',
    label: 'تمييز عطل الأسبوع',
    icon: Calendar
  },
  {
    key: 'showProgress',
    label: 'إظهار التقدم',
    icon: BarChart3
  },
  {
    key: 'showHoverTask',
    label: 'التقدم عند التمرير',
    icon: MousePointer2,
  },
  {
    key: 'showAuthors',
    label: 'إظهار المؤلفين',
    icon: Users
  },
  {
    key: 'showMilestones',
    label: 'إظهار المعالم',
    icon: Target
  },
  {
    key: 'showColors',
    label: 'ألوان الحالة',
    icon: Palette
  },
  {
    key: 'showTodayLine',
    label: 'إظهار اليوم الحالي',
    icon: Calendar
  },
  {
    key: 'showTimestamps',
    label: 'إظهار الطوابع الزمنية',
    icon: Clock
  },
  {
    key: 'showTaskIds',
    label: 'إظهار معرفات المهام',
    icon: Eye
  }
];

export const ViewSettingsModal: React.FC<ViewSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange
}) => {
  const handleSettingChange = (key: keyof ViewSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    
    // إذا تم إيقاف showLinks، قم بإيقاف isLinkMode أيضاً
    if (key === 'showLinks' && !value) {
      newSettings.isLinkMode = false;
    }
    
    onSettingsChange(newSettings);
  };

  const isSettingDisabled = (setting: SettingItem): boolean => {
    if (setting.dependent) {
      return !settings[setting.dependent];
    }
    return false;
  };

  const handleResetToDefaults = () => {
    const defaultSettings: ViewSettings = {
      showLinks: true,
      isLinkMode: false,
      showGrid: true,
      showWeekends: true,
      showProgress: true,
      showAuthors: true,
      showMilestones: true,
      showTimestamps: false,
      showColors: true,
      showTaskIds: false,
      showTodayLine: false,
      showHoverTask: false
    };
    onSettingsChange(defaultSettings);
  };

  return (
    <div className={`
      fixed top-14 right-0 h-[calc(100vh-3.5rem)] w-80 z-40
      bg-white shadow-xl border-l border-gray-200
      transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : 'translate-x-full'}
    `}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3">
            <Settings className="text-gray-600" size={20} />
            <h3 className="text-lg font-semibold text-gray-900">إعدادات العرض</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Settings List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {allSettings.map((setting) => {
            const isDisabled = isSettingDisabled(setting);
            const isActive = settings[setting.key];
            const IconComponent = setting.icon;

            return (
              <div
                key={setting.key}
                className={`
                  bg-gray-50 rounded-lg p-3 transition-all duration-200 border border-gray-200
                  ${isDisabled ? 'opacity-50' : 'hover:bg-gray-100 hover:border-gray-300'}
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`
                      p-2 rounded-lg transition-all duration-200 border
                      ${isActive && !isDisabled
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-500 border-gray-200'
                      }
                    `}>
                      <IconComponent size={16} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex flex-col">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {setting.label}
                        </h4>
                        {setting.dependent && (
                          <span className="text-xs text-amber-600 mt-1">
                            يتطلب {allSettings.find(s => s.key === setting.dependent)?.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="flex items-center">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
                        disabled={isDisabled}
                        className="sr-only peer"
                      />
                      <div className={`
                        relative w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer 
                        transition-all duration-300 border border-gray-300
                        ${isActive && !isDisabled ? 
                          'peer-checked:bg-blue-600 peer-checked:border-blue-600' : 
                          ''
                        }
                        ${isDisabled ? 
                          'cursor-not-allowed opacity-50' : 
                          'cursor-pointer hover:border-gray-400'
                        }
                      `}>
                        <div className={`
                          absolute top-[1px] left-[1px] bg-white rounded-full h-4 w-4 
                          transition-all duration-300 border border-gray-200
                          ${isActive ? 
                            'translate-x-5' : 
                            'translate-x-0'
                          }
                        `}>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
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
        style={{ transitionDelay: isOpen ? `${500 + allSettings.length * 50 + 100}ms` : '0ms' }}
        >
          <button
            onClick={handleResetToDefaults}
            className={`
              w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-sm font-medium 
              text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg 
              transition-all duration-300 border border-gray-300 hover:border-gray-400
              hover:shadow-sm transform hover:scale-[1.02]
            `}
          >
            <RotateCcw size={16} />
            <span>إعادة تعيين للافتراضي</span>
          </button>
          
          <button
            onClick={onClose}
            className={`
              w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg 
              hover:bg-blue-700 transition-all duration-300
              hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]
            `}
          >
            تطبيق الإعدادات
          </button>
        </div>
      </div>
    </div>
  );
};
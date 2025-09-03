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
  MousePointer2
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

interface SettingGroup {
  settings: SettingItem[];
}

interface SettingItem {
  key: keyof ViewSettings;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  dependent?: keyof ViewSettings;
}

const settingsGroups: SettingGroup[] = [
  {
    settings: [
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
      }
    ]
  },
  {
    settings: [
      {
        key: 'showGrid',
        label: 'إظهار الشبكة',
        icon: Grid3X3
      },
      {
        key: 'showWeekends',
        label: 'تمييز عطل الأسبوع',
        icon: Calendar
      }
    ]
  },
  {
    settings: [
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
      }
    ]
  },
  {
    settings: [
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
      }
    ]
  }
];

export const ViewSettingsModal: React.FC<ViewSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange
}) => {
  if (!isOpen) return null;

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

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/30">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-slate-100/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Settings className="text-slate-600" size={20} />
              <h3 className="text-lg font-semibold text-slate-900">إعدادات العرض</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-all duration-200 group"
            >
              <X size={18} className="text-slate-500 group-hover:text-slate-700" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-160px)] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {settingsGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-4">
                {/* Settings Items */}
                <div className="space-y-3">
                  {group.settings.map((setting) => {
                    const isDisabled = isSettingDisabled(setting);
                    const isActive = settings[setting.key];
                    const IconComponent = setting.icon;

                    return (
                      <div
                        key={setting.key}
                        className={`bg-slate-50/70 rounded-xl p-4 transition-all duration-200 border border-slate-200/50 ${
                          isDisabled ? 'opacity-50' : 'hover:bg-slate-100/60 hover:border-slate-300/60 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            <div className={`p-2.5 rounded-xl transition-all duration-200 shadow-sm border ${
                              isActive && !isDisabled
                                ? 'bg-gradient-to-br from-slate-600 to-slate-700 text-white border-slate-600'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}>
                              <IconComponent size={18} />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-slate-900 text-base">
                                  {setting.label}
                                </h4>
                                {setting.dependent && (
                                  <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium border border-amber-200">
                                    يتطلب {settingsGroups
                                      .flatMap(g => g.settings)
                                      .find(s => s.key === setting.dependent)?.label}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Enhanced Toggle Switch */}
                          <div className="flex items-center">
                            <label className="relative inline-flex items-center cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
                                disabled={isDisabled}
                                className="sr-only peer"
                              />
                              <div className={`
                                relative w-12 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 
                                peer-focus:ring-slate-300 peer-focus:ring-opacity-50 rounded-full peer 
                                transition-all duration-300 border-2 border-slate-300 shadow-inner
                                ${isActive && !isDisabled ? 
                                  'peer-checked:bg-gradient-to-r peer-checked:from-slate-600 peer-checked:to-slate-700 peer-checked:border-slate-600 peer-checked:shadow-md' : 
                                  ''
                                }
                                ${isDisabled ? 
                                  'cursor-not-allowed opacity-50' : 
                                  'cursor-pointer hover:border-slate-400 group-hover:shadow-sm'
                                }
                              `}>
                                <div className={`
                                  absolute top-[1px] left-[1px] bg-white rounded-full h-5 w-5 
                                  transition-all duration-300 shadow-md border border-slate-200
                                  flex items-center justify-center
                                  ${isActive ? 
                                    'translate-x-6 border-slate-300 shadow-lg' : 
                                    'translate-x-0'
                                  }
                                `}>
                                  {isActive && !isDisabled && (
                                    <div className="w-2 h-2 bg-slate-600 rounded-full opacity-80"></div>
                                  )}
                                </div>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200/60 px-6 py-4 bg-gradient-to-r from-slate-50/80 to-slate-100/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  // إعادة تعيين جميع الإعدادات للقيم الافتراضية
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
                }}
                className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-all duration-200 border border-slate-300 hover:border-slate-400 hover:shadow-sm"
              >
                إعادة تعيين
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gradient-to-r from-slate-600 to-slate-700 text-white text-sm font-medium rounded-lg hover:from-slate-700 hover:to-slate-800 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                تطبيق الإعدادات
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
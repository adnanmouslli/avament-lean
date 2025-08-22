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
  Settings
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
}

interface ViewSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ViewSettings;
  onSettingsChange: (settings: ViewSettings) => void;
}

interface SettingGroup {
  title: string;
  description: string;
  settings: SettingItem[];
}

interface SettingItem {
  key: keyof ViewSettings;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  dependent?: keyof ViewSettings;
  type?: 'toggle' | 'button';
}

const settingsGroups: SettingGroup[] = [
  {
    title: "إدارة الروابط",
    description: "التحكم في عرض وإنشاء الروابط بين المهام",
    settings: [
      {
        key: 'showLinks',
        label: 'إظهار الروابط',
        description: 'عرض الروابط والاتصالات بين المهام',
        icon: Link2,
        type: 'toggle'
      },
      {
        key: 'isLinkMode',
        label: 'وضع ربط المهام',
        description: 'تفعيل وضع إنشاء روابط جديدة بين المهام',
        icon: Target,
        dependent: 'showLinks',
        type: 'button'
      }
    ]
  },
  {
    title: "عناصر الشبكة والتخطيط",
    description: "إعدادات العرض العامة للمخطط الزمني",
    settings: [
      {
        key: 'showGrid',
        label: 'إظهار الشبكة',
        description: 'عرض خطوط الشبكة في الخلفية',
        icon: Grid3X3,
        type: 'toggle'
      },
      {
        key: 'showWeekends',
        label: 'تمييز عطل الأسبوع',
        description: 'تمييز أيام السبت والأحد بلون مختلف',
        icon: Calendar,
        type: 'toggle'
      }
    ]
  },
  {
    title: "معلومات المهام",
    description: "التحكم في البيانات المعروضة على المهام",
    settings: [
      {
        key: 'showProgress',
        label: 'إظهار التقدم',
        description: 'عرض شريط التقدم على المهام',
        icon: BarChart3,
        type: 'toggle'
      },
      {
        key: 'showAuthors',
        label: 'إظهار المؤلفين',
        description: 'عرض أسماء المسؤولين عن المهام',
        icon: Users,
        type: 'toggle'
      },
      {
        key: 'showMilestones',
        label: 'إظهار المعالم',
        description: 'عرض المعالم الهامة في المشروع',
        icon: Target,
        type: 'toggle'
      },
      {
        key: 'showTimestamps',
        label: 'إظهار الطوابع الزمنية',
        description: 'عرض تواريخ البداية والنهاية',
        icon: Clock,
        type: 'toggle'
      }
    ]
  },
  {
    title: "المظهر والألوان",
    description: "إعدادات المظهر البصري",
    settings: [
      {
        key: 'showColors',
        label: 'الألوان المميزة',
        description: 'استخدام ألوان مميزة للمهام المختلفة',
        icon: Palette,
        type: 'toggle'
      },
      {
        key: 'showTaskIds',
        label: 'إظهار معرفات المهام',
        description: 'عرض الأرقام التعريفية للمهام (للمطورين)',
        icon: Eye,
        type: 'toggle'
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

  const getActiveSettingsCount = (): number => {
    return Object.values(settings).filter(Boolean).length;
  };

  return (
    <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-white/30">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-slate-100/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-slate-600 p-2 rounded-lg shadow-md">
                <Settings size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">إعدادات العرض</h2>
                <p className="text-sm font-medium text-slate-600">
                  تخصيص عرض المخطط الزمني ({getActiveSettingsCount()} نشط)
                </p>
              </div>
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
                {/* Group Header */}
                <div className="border-b border-slate-200/60 pb-3">
                  <h3 className="text-base font-semibold text-slate-900">
                    {group.title}
                  </h3>
                  <p className="text-sm font-medium text-slate-600">
                    {group.description}
                  </p>
                </div>

                {/* Settings Items */}
                <div className="space-y-3">
                  {group.settings.map((setting) => {
                    const isDisabled = isSettingDisabled(setting);
                    const isActive = settings[setting.key];
                    const IconComponent = setting.icon;

                    return (
                      <div
                        key={setting.key}
                        className={`bg-slate-50/70 rounded-lg p-4 transition-all duration-200 border border-slate-200/50 ${
                          isDisabled ? 'opacity-50' : 'hover:bg-slate-100/60 hover:border-slate-300/60'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className={`p-2 rounded-lg transition-all duration-200 shadow-sm ${
                              isActive && !isDisabled
                                ? 'bg-slate-600 text-white'
                                : 'bg-slate-300 text-slate-600'
                            }`}>
                              <IconComponent size={16} />
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-slate-900">
                                  {setting.label}
                                </h4>
                                {setting.dependent && (
                                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
                                    يتطلب {settingsGroups
                                      .flatMap(g => g.settings)
                                      .find(s => s.key === setting.dependent)?.label}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 mt-1 font-medium">
                                {setting.description}
                              </p>
                            </div>
                          </div>

                          {/* Toggle Switch or Button */}
                          <div className="flex items-center">
                            {setting.type === 'button' ? (
                              <button
                                onClick={() => handleSettingChange(setting.key, !isActive)}
                                disabled={isDisabled}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm ${
                                  isActive && !isDisabled
                                    ? 'bg-slate-600 text-white hover:bg-slate-700'
                                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}`}
                              >
                                {isActive ? 'نشط' : 'غير نشط'}
                              </button>
                            ) : (
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isActive}
                                  onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
                                  disabled={isDisabled}
                                  className="sr-only peer"
                                />
                                <div className={`
                                  relative w-11 h-6 bg-slate-200 peer-focus:outline-none 
                                  rounded-full peer transition-all duration-200 border border-slate-300
                                  ${isActive && !isDisabled ? 'peer-checked:bg-slate-600 peer-checked:border-slate-600' : ''}
                                  ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer hover:border-slate-400'}
                                `}>
                                  <div className={`
                                    absolute top-[2px] left-[2px] bg-white border border-slate-300 
                                    rounded-full h-5 w-5 transition-transform duration-200 shadow-sm
                                    ${isActive ? 'translate-x-full border-white' : ''}
                                  `}></div>
                                </div>
                              </label>
                            )}
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
            <div className="text-sm font-medium text-slate-600">
              <span className="font-semibold text-slate-800">{getActiveSettingsCount()}</span> من {settingsGroups.reduce((total, group) => total + group.settings.length, 0)} إعداد نشط
            </div>
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
                    showTaskIds: false
                  };
                  onSettingsChange(defaultSettings);
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-all duration-200 border border-slate-300 hover:border-slate-400"
              >
                إعادة تعيين
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-all duration-200 shadow-md hover:shadow-lg"
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
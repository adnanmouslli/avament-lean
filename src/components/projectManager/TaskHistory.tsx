"use client";

import React from 'react';
import { X, ChevronRight, Filter, Clock } from 'lucide-react';
import { TaskHistoryEvent } from './GanttCanvas';

interface TaskHistoryProps {
  isVisible: boolean;
  onClose: () => void;
  taskId: string;
  taskName: string;
  history: TaskHistoryEvent[];
}

export const TaskHistory: React.FC<TaskHistoryProps> = ({
  isVisible,
  onClose,
  taskId,
  taskName,
  history = []
}) => {
    const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', {
        calendar: 'gregory', // تأكيد استخدام التقويم الميلادي
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
    };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'created': return '➕';
      case 'updated': return '✏️';
      case 'progress_changed': return '📊';
      case 'moved': return '🔄';
      case 'assigned': return '👤';
      case 'completed': return '✅';
      case 'deleted': return '🗑️';
      default: return '📝';
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'created': return 'text-green-600 bg-green-50';
      case 'updated': return 'text-blue-600 bg-blue-50';
      case 'progress_changed': return 'text-purple-600 bg-purple-50';
      case 'moved': return 'text-orange-600 bg-orange-50';
      case 'assigned': return 'text-indigo-600 bg-indigo-50';
      case 'completed': return 'text-green-600 bg-green-50';
      case 'deleted': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // تجميع التاريخ حسب اليوم
  const groupedHistory = history.reduce((acc, event) => {
    const dateKey = formatDate(event.timestamp);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, TaskHistoryEvent[]>);

  return (
    <div className={`
      fixed top-14 right-0 h-[calc(100vh-3.5rem)] w-96 z-40
      bg-white shadow-xl border-l border-gray-200
      transition-transform duration-300 ease-in-out
      ${isVisible ? 'translate-x-0' : 'translate-x-full'}
    `}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">تاريخ المهمة</h2>
            <p className="text-sm text-gray-500">{taskName}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Filter size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto">
          {Object.keys(groupedHistory).length === 0 ? (
            <div className="text-center text-gray-500 mt-8 p-4">
              <Clock size={48} className="mx-auto mb-4 text-gray-300" />
              <p>لا يوجد تاريخ للمهمة حتى الآن</p>
            </div>
          ) : (
            Object.entries(groupedHistory)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, events]) => (
                <div key={date} className="border-b border-gray-100">
                  {/* Date Header */}
                  <div className="sticky top-0 bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">{date}</h3>
                      <span className="text-xs text-gray-500">
                        {events.length} حدث
                      </span>
                    </div>
                  </div>

                  {/* Events */}
                  <div className="p-4 space-y-3">
                    {events
                      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                      .map(event => (
                        <div key={event.id} className="flex items-start space-x-3">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs ${getEventColor(event.eventType)}`}>
                            {getEventIcon(event.eventType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">{event.description}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-gray-500">{event.userName}</span>
                                <span className="text-xs text-gray-500">
                                    {event.timestamp.toLocaleTimeString('en-GB', { 
                                        hour: '2-digit', 
                                        minute: '2-digit',
                                        hour12: false
                                    })}
                                    </span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};
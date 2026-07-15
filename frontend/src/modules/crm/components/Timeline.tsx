import { useState, useEffect } from 'react';
import { FiActivity, FiEdit, FiTrash2, FiCheckCircle, FiClock, FiUser } from 'react-icons/fi';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';

interface TimelineItem {
  type: 'activity' | 'audit';
  id: number;
  title: string;
  description?: string;
  date: string;
  user?: string;
}

interface TimelineProps {
  entityType: 'account' | 'contact' | 'deal';
  entityId: number;
}

export default function Timeline({ entityType, entityId }: TimelineProps) {
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, [entityType, entityId]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const response = await apiService.get(`/crm/${entityType}/${entityId}/timeline`);
      
      // Handle response - could be direct data or wrapped in data property
      const timelineData = Array.isArray(response) ? response : (response?.data || response || []);
      
      setTimeline(timelineData);
    } catch (error: any) {
      console.error('Failed to load timeline:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Greška pri učitavanju timeline-a';
      toast.error(errorMessage);
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'activity':
        return <FiActivity className="text-blue-500" />;
      case 'audit':
        return <FiEdit className="text-gray-500" />;
      default:
        return <FiClock className="text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="card p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Timeline Aktivnosti</h2>
      
      {timeline.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nema aktivnosti</p>
      ) : (
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
          
          <div className="space-y-6">
            {timeline.map((item, index) => (
              <div key={`${item.type}-${item.id}`} className="relative flex items-start gap-4">
                {/* Icon */}
                <div className="relative z-10 flex items-center justify-center w-16 h-16 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
                  {getIcon(item.type)}
                </div>
                
                {/* Content */}
                <div className="flex-1 pb-6">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{item.title}</h3>
                        {item.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      {item.user && (
                        <div className="flex items-center gap-1">
                          <FiUser size={14} />
                          {item.user}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <FiClock size={14} />
                        {new Date(item.date).toLocaleString('bs-BA')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



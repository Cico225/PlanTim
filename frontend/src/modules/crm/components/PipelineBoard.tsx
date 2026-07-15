import { useState, useEffect } from 'react';
import { FiTrendingUp, FiPlus, FiDollarSign } from 'react-icons/fi';
import { apiService } from '@/services/api';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface Deal {
  id: number;
  title: string;
  company_name?: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  owner_name?: string;
}

interface Stage {
  id: number;
  name: string;
  stage_key: string;
  color?: string;
}

interface Pipeline {
  id: number;
  name: string;
  stages: Stage[];
}

export default function PipelineBoard() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);

  useEffect(() => {
    loadPipelines();
  }, []);

  useEffect(() => {
    if (selectedPipeline) {
      loadDeals();
    }
  }, [selectedPipeline]);

  const loadPipelines = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/crm/pipelines');
      const pipelinesData = response || [];
      setPipelines(pipelinesData);
      if (pipelinesData.length > 0) {
        setSelectedPipeline(pipelinesData[0]);
      }
    } catch (error) {
      console.error('Failed to load pipelines:', error);
      toast.error('Greška pri učitavanju pipeline-a');
    } finally {
      setLoading(false);
    }
  };

  const loadDeals = async () => {
    if (!selectedPipeline) return;

    try {
      const response = await apiService.get(`/crm/deals?pipeline=${selectedPipeline.name.toLowerCase()}`);
      setDeals(response.data || []);
    } catch (error) {
      console.error('Failed to load deals:', error);
      toast.error('Greška pri učitavanju deal-ova');
    }
  };

  const handleDragStart = (deal: Deal) => {
    setDraggedDeal(deal);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (stageKey: string) => {
    if (!draggedDeal || draggedDeal.stage === stageKey) {
      setDraggedDeal(null);
      return;
    }

    try {
      await apiService.put(`/crm/deals/${draggedDeal.id}`, {
        stage: stageKey,
      });
      toast.success('Deal uspješno premješten');
      loadDeals();
    } catch (error) {
      console.error('Failed to update deal:', error);
      toast.error('Greška pri premještanju deal-a');
    } finally {
      setDraggedDeal(null);
    }
  };

  const formatCurrency = (value: number, currency: string = 'BAM') => {
    return new Intl.NumberFormat('bs-BA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const getDealsForStage = (stageKey: string) => {
    return deals.filter(deal => deal.stage === stageKey);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!selectedPipeline) {
    return (
      <div className="p-6">
        <p className="text-gray-500 dark:text-gray-400">Nema pipeline-a</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pipeline</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Kanban board za deal-ove</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPipeline.id}
            onChange={(e) => {
              const pipeline = pipelines.find(p => p.id === parseInt(e.target.value));
              if (pipeline) setSelectedPipeline(pipeline);
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {pipelines.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </option>
            ))}
          </select>
          <Link to="/crm/deals/new" className="btn-primary flex items-center gap-2">
            <FiPlus />
            Novi Deal
          </Link>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {selectedPipeline.stages.map((stage) => {
            const stageDeals = getDealsForStage(stage.stage_key);
            return (
              <div
                key={stage.id}
                className="flex-shrink-0 w-80"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(stage.stage_key)}
              >
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {stage.color && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        ></div>
                      )}
                      <h3 className="font-semibold text-gray-900 dark:text-white">{stage.name}</h3>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                      {stageDeals.length}
                    </span>
                  </div>

                  <div className="space-y-3 min-h-[200px]">
                    {stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={() => handleDragStart(deal)}
                        className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg cursor-move hover:shadow-md transition-shadow"
                      >
                        <Link to={`/crm/deals/${deal.id}`} className="block">
                          <div className="font-medium text-gray-900 dark:text-white mb-2">
                            {deal.title}
                          </div>
                          {deal.company_name && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {deal.company_name}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(deal.value, deal.currency)}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${deal.probability}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {deal.probability}%
                              </span>
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

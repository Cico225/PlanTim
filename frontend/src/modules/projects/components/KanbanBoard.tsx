import { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  FiMoreVertical,
  FiPlus,
  FiAlertCircle,
  FiUser,
  FiUsers,
  FiFlag,
  FiClock,
  FiMessageSquare,
  FiEdit2,
  FiTrash2,
} from 'react-icons/fi';
import { projectsService, KanbanColumn, Task } from '@/services/projectsService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { srLatn } from 'date-fns/locale';
import CreateTaskModal from './CreateTaskModal';
import TaskDetailModal from './TaskDetailModal';

interface KanbanBoardProps {
  projectId: number | string;
  swimlane?: 'assignee' | 'priority' | 'epic' | null;
}

export default function KanbanBoard({ projectId, swimlane }: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<number | undefined>(undefined);
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10, // Require 10px of movement before activating drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchKanbanBoard();
  }, [projectId, swimlane]);

  const fetchKanbanBoard = async () => {
    try {
      setLoading(true);
      const board = await projectsService.getKanbanBoard(projectId, swimlane ? { swimlane } : undefined);
      setColumns(board.columns || []);
    } catch (error) {
      console.error('Error fetching Kanban board:', error);
      toast.error('Greška pri učitavanju Kanban table');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as number);
    
    // Find the task
    for (const column of columns) {
      const task = column.tasks?.find((t) => t.id === active.id);
      if (task) {
        setActiveTask(task);
        break;
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTaskId = active.id as number;
    const overId = over.id;

    // Find active task and its current column
    let activeColumn: KanbanColumn | undefined;
    let activeTask: Task | undefined;
    
    for (const column of columns) {
      activeTask = column.tasks?.find((t) => t.id === activeTaskId);
      if (activeTask) {
        activeColumn = column;
        break;
      }
    }

    if (!activeTask || !activeColumn) return;

    // Check if over is a column (droppable area with id "column-{id}")
    const overColumn =
      typeof overId === 'string' && overId.startsWith('column-')
        ? columns.find((col) => col.id === Number(overId.slice(7)))
        : undefined;
    if (overColumn && overColumn.id !== activeColumn.id) {
      // Moving to different column
      const newColumns = columns.map((col) => {
        if (col.id === activeColumn!.id) {
          // Remove from current column
          return {
            ...col,
            tasks: col.tasks?.filter((t) => t.id !== activeTaskId) || [],
          };
        }
        if (col.id === overColumn.id) {
          // Add to new column
          return {
            ...col,
            tasks: [...(col.tasks || []), activeTask!],
          };
        }
        return col;
      });
      setColumns(newColumns);
      return;
    }

    // Check if over is a task in a different column (overId must be task id, not column-*)
    const overTaskId = typeof overId === 'string' && overId.startsWith('column-') ? null : overId;
    for (const column of columns) {
      if (column.id === activeColumn.id) continue;
      const overTask = overTaskId != null ? column.tasks?.find((t) => t.id === overTaskId) : undefined;
      if (overTask) {
        // Move to different column at specific position
        const newColumns = columns.map((col) => {
          if (col.id === activeColumn!.id) {
            return {
              ...col,
              tasks: col.tasks?.filter((t) => t.id !== activeTaskId) || [],
            };
          }
          if (col.id === column.id) {
            const tasks = [...(col.tasks || [])];
            const overIndex = tasks.findIndex((t) => t.id === overTaskId);
            tasks.splice(overIndex, 0, activeTask!);
            return {
              ...col,
              tasks,
            };
          }
          return col;
        });
        setColumns(newColumns);
        return;
      }
    }

    // Reordering within same column
    if (activeColumn && overTaskId != null) {
      const overTask = activeColumn.tasks?.find((t) => t.id === overTaskId);
      if (overTask && overTask.id !== activeTaskId) {
        const newColumns = columns.map((col) => {
          if (col.id === activeColumn!.id) {
            const tasks = col.tasks || [];
            const oldIndex = tasks.findIndex((t) => t.id === activeTaskId);
            const newIndex = tasks.findIndex((t) => t.id === overTaskId);
            return {
              ...col,
              tasks: arrayMove(tasks, oldIndex, newIndex),
            };
          }
          return col;
        });
        setColumns(newColumns);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveTask(null);

    if (!over) return;

    const activeTaskId = active.id as number;
    const overId = over.id;

    // Find active task and current column
    let activeColumn: KanbanColumn | undefined;
    let activeTask: Task | undefined;
    let previousPosition: number | undefined;

    for (const column of columns) {
      activeTask = column.tasks?.find((t) => t.id === activeTaskId);
      if (activeTask) {
        activeColumn = column;
        previousPosition = column.tasks?.findIndex((t) => t.id === activeTaskId);
        break;
      }
    }

    if (!activeTask || !activeColumn) return;

    // Determine target column
    let targetColumn: KanbanColumn | undefined;
    let newPosition: number | undefined;
    const overTaskIdForEnd = typeof overId === 'string' && overId.startsWith('column-') ? null : overId;

    // Check if over is a column (droppable empty area)
    const overColumn =
      typeof overId === 'string' && overId.startsWith('column-')
        ? columns.find((col) => col.id === Number(overId.slice(7)))
        : undefined;
    if (overColumn) {
      targetColumn = overColumn;
      newPosition = overColumn.tasks?.length || 0;
    } else if (overTaskIdForEnd != null) {
      // Over is a task - find its column
      for (const column of columns) {
        const overTask = column.tasks?.find((t) => t.id === overTaskIdForEnd);
        if (overTask) {
          targetColumn = column;
          newPosition = column.tasks?.findIndex((t) => t.id === overTaskIdForEnd);
          break;
        }
      }
    }

    if (!targetColumn) return;

    // If didn't move, no need to update
    if (targetColumn.id === activeColumn.id && previousPosition === newPosition) {
      return;
    }

    // Check WIP limit
    if (targetColumn.wip_limit !== null && targetColumn.wip_limit !== undefined) {
      const currentCount = targetColumn.tasks?.length || 0;
      if (currentCount >= targetColumn.wip_limit) {
        toast.error(`WIP limit dostignut za kolonu "${targetColumn.name}". Limit: ${targetColumn.wip_limit}`);
        fetchKanbanBoard(); // Reload to revert
        return;
      }
    }

    // Optimistic update
    const previousColumnId = activeColumn.id;
    const previousPositionValue = previousPosition;

    try {
      await projectsService.moveTask(projectId, activeTaskId, {
        kanban_column_id: targetColumn.id,
        position: newPosition,
        previous_column_id: previousColumnId !== targetColumn.id ? previousColumnId : undefined,
        previous_position: previousPositionValue,
      });

      toast.success('Task premješten');
      // Refresh board to get updated project progress and task details
      await fetchKanbanBoard();
    } catch (error: any) {
      console.error('Error moving task:', error);
      toast.error(error.response?.data?.message || 'Greška pri premještanju taska');
      fetchKanbanBoard(); // Reload on error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <p>Nema Kanban kolona. Kolone će biti automatski kreirane kada se prvi put pristupi Kanban tableu.</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 h-full">
        {columns.map((column) => (
          <KanbanColumnComponent
            key={column.id}
            column={column}
            projectId={projectId}
            onTaskUpdate={fetchKanbanBoard}
            onCreateTask={(columnId) => {
              setSelectedColumnId(columnId);
              setShowCreateTaskModal(true);
            }}
            onTaskClick={(taskId) => {
              setSelectedTaskId(taskId);
              setShowTaskDetailModal(true);
            }}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} isDragging />}
      </DragOverlay>

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateTaskModal}
        onClose={() => {
          setShowCreateTaskModal(false);
          setSelectedColumnId(undefined);
        }}
        projectId={projectId}
        defaultColumnId={selectedColumnId}
        onTaskCreated={fetchKanbanBoard}
      />

      {/* Task Detail Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          isOpen={showTaskDetailModal}
          onClose={() => {
            setShowTaskDetailModal(false);
            setSelectedTaskId(null);
          }}
          projectId={projectId}
          taskId={selectedTaskId}
          onTaskUpdated={fetchKanbanBoard}
          onTaskDeleted={fetchKanbanBoard}
        />
      )}
    </DndContext>
  );
}

// Helper function for priority color
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500';
    case 'high':
      return 'bg-orange-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-blue-500';
    default:
      return 'bg-gray-500';
  }
};

const getStatusLabel: Record<string, string> = {
  todo: 'To Do',
  'in-progress': 'U toku',
  review: 'Pregled',
  done: 'Završeno',
};
const getStatusColor = (status: string) => {
  switch (status) {
    case 'done':
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
    case 'in-progress':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
    case 'review':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

// Kanban Column Component
function KanbanColumnComponent({
  column,
  projectId,
  onTaskUpdate,
  onCreateTask,
  onTaskClick,
}: {
  column: KanbanColumn;
  projectId: number;
  onTaskUpdate: () => void;
  onCreateTask: (columnId: number) => void;
  onTaskClick: (taskId: number) => void;
}) {
  const tasks = column.tasks || [];
  const taskIds = tasks.map((t) => t.id);
  const columnDroppableId = `column-${column.id}`;
  const { setNodeRef, isOver } = useDroppable({ id: columnDroppableId });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col bg-gray-50 dark:bg-dark-700 rounded-lg p-4 min-w-0 transition-colors ${
        isOver ? 'ring-2 ring-primary-500 ring-inset bg-primary-50/50 dark:bg-primary-900/20' : ''
      }`}
      style={{
        borderLeft: column.color ? `4px solid ${column.color}` : '4px solid #e5e7eb',
      }}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">{column.name}</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {tasks.length}
            {column.wip_limit !== null && ` / ${column.wip_limit}`}
          </span>
        </div>
        {column.wip_exceeded && (
          <FiAlertCircle className="text-red-500" size={16} title="WIP limit prekoračen" />
        )}
      </div>

      {/* Tasks */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 min-h-[100px] overflow-y-auto pr-2 -mr-2">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              projectId={projectId}
              onUpdate={onTaskUpdate}
              onTaskClick={onTaskClick}
            />
          ))}
        </div>
      </SortableContext>

      {/* Add Task Button */}
      <button
        className="mt-4 w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-600 rounded transition-colors flex items-center justify-center gap-2"
        onClick={() => onCreateTask(column.id)}
      >
        <FiPlus size={16} />
        Dodaj task
      </button>
    </div>
  );
}

// Sortable Task Card
function SortableTaskCard({
  task,
  projectId,
  onUpdate,
  onTaskClick,
}: {
  task: Task;
  projectId: number;
  onUpdate: () => void;
  onTaskClick: (taskId: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Use double-click to open task details, single click/drag for moving
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!isDragging) {
          onTaskClick(task.id);
        }
      }}
      className="cursor-grab active:cursor-grabbing"
    >
      <TaskCard 
        task={task} 
        projectId={projectId} 
        onUpdate={onUpdate} 
        isDragging={isDragging}
        onTaskClick={onTaskClick}
        onTaskDelete={async (taskId) => {
          try {
            await projectsService.deleteTask(projectId, taskId);
            toast.success('Task uspješno obrisan');
            onUpdate(); // Refresh the board
          } catch (error: any) {
            toast.error(error.response?.data?.message || 'Greška pri brisanju taska');
          }
        }}
      />
    </div>
  );
}

// Task Card Component
function TaskCard({
  task,
  projectId,
  onUpdate,
  isDragging = false,
  onTaskClick,
  onTaskDelete,
}: {
  task: Task;
  projectId: number;
  onUpdate?: () => void;
  isDragging?: boolean;
  onTaskClick?: (taskId: number) => void;
  onTaskDelete?: (taskId: number) => void;
}) {

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Don't prevent default - let the click work naturally
    if (onTaskClick) {
      onTaskClick(task.id);
    }
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Don't prevent default - let the click work naturally
    if (onTaskDelete && confirm(`Da li ste sigurni da želite obrisati task "${task.title}"?`)) {
      await onTaskDelete(task.id);
    }
  };

  return (
    <div
      className={`bg-white dark:bg-dark-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-move ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {/* Task Header with Edit/Delete buttons */}
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-gray-900 dark:text-white line-clamp-2 flex-1">
          {task.title}
        </h4>
        <div 
          className="flex items-center gap-1 ml-2 flex-shrink-0"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {onTaskClick && (
            <button
              type="button"
              onClick={handleEditClick}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors z-10 relative"
              style={{ pointerEvents: 'auto' }}
              title="Uredi task"
            >
              <FiEdit2 size={14} />
            </button>
          )}
          {onTaskDelete && (
            <button
              type="button"
              onClick={handleDeleteClick}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors z-10 relative"
              style={{ pointerEvents: 'auto' }}
              title="Obriši task"
            >
              <FiTrash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Task Meta */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {/* Status (updated when dragged to another column) */}
        {task.status && (
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium ${getStatusColor(task.status)}`}
            title="Status"
          >
            {getStatusLabel[task.status] ?? task.status}
          </span>
        )}
        {/* Priority */}
        <span
          className={`inline-block w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`}
          title={task.priority}
        />

        {/* Assignees */}
        {task.assignees && task.assignees.length > 0 && (
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <FiUsers size={12} />
            <span className="text-xs">{task.assignees.length}</span>
          </div>
        )}

        {/* Comments */}
        {task.comments_count !== undefined && task.comments_count > 0 && (
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <FiMessageSquare size={12} />
            <span className="text-xs">{task.comments_count}</span>
          </div>
        )}

        {/* Due Date */}
        {task.due_date && (
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <FiClock size={12} />
            <span className="text-xs">
              {format(new Date(task.due_date), 'dd.MM.yyyy', { locale: srLatn })}
            </span>
          </div>
        )}
      </div>

      {/* Task Footer */}
      <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center justify-between">
          <span>#{task.id}</span>
          {task.assigned_to_name && (
            <span className="flex items-center gap-1">
              <FiUser size={10} />
              {task.assigned_to_name}
            </span>
          )}
        </div>
        {task.project_name && (
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            {task.project_name}
          </div>
        )}
        {task.created_by_name && (
          <div className="text-xs text-gray-400 dark:text-gray-500">
            Kreirao: {task.created_by_name}
          </div>
        )}
        {task.assignees && task.assignees.length > 0 && (
          <div className="text-xs text-gray-400 dark:text-gray-500">
            Dodeljeno: {task.assignees.map((a: any) => a.user_name || a.name).join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}


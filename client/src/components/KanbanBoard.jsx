import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useDispatch, useSelector } from 'react-redux';
import { taskApi } from '../api/services';
import { fetchTasks } from '../store/tasksSlice';

const COLUMNS = ['To Do', 'In Progress', 'Done'];

function tasksForColumn(tasks, status) {
  return tasks
    .filter((t) => t.status === status)
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

function priorityClass(p) {
  if (p === 'High') return 'border-l-4 border-red-500';
  if (p === 'Medium') return 'border-l-4 border-amber-500';
  return 'border-l-4 border-emerald-500';
}

export default function KanbanBoard({ projectId, tasks, onOpenTask }) {
  const dispatch = useDispatch();
  const filters = useSelector((s) => s.tasks.filters);

  async function refresh() {
    await dispatch(
      fetchTasks({
        projectId,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        assignedTo: filters.assignedTo || undefined,
        label: filters.label || undefined,
        search: filters.search || undefined,
      })
    );
  }

  async function onDragEnd(result) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }
    const sourceCol = source.droppableId;
    const destCol = destination.droppableId;
    const taskId = draggableId;
    const srcList = tasksForColumn(tasks, sourceCol);
    const destList = tasksForColumn(tasks, destCol);
    const moved = tasks.find((t) => String(t._id) === String(taskId));
    if (!moved) return;

    try {
      if (sourceCol === destCol) {
        const next = srcList.filter((t) => String(t._id) !== String(taskId));
        next.splice(destination.index, 0, moved);
        await taskApi.reorder(projectId, {
          status: sourceCol,
          orderedTaskIds: next.map((t) => t._id),
        });
      } else {
        const nextSrc = srcList.filter((t) => String(t._id) !== String(taskId));
        const nextDest = destList.filter((t) => String(t._id) !== String(taskId));
        nextDest.splice(destination.index, 0, { ...moved, status: destCol });
        await taskApi.move({
          taskId,
          projectId,
          status: destCol,
          position: destination.index,
        });
        await taskApi.reorder(projectId, {
          status: destCol,
          orderedTaskIds: nextDest.map((t) => t._id),
        });
        await taskApi.reorder(projectId, {
          status: sourceCol,
          orderedTaskIds: nextSrc.map((t) => t._id),
        });
      }
      await refresh();
    } catch (e) {
      console.error(e);
      await refresh();
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {COLUMNS.map((col) => (
          <div key={col} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/50">
            <div className="px-3 py-2 font-semibold text-sm border-b border-slate-200 dark:border-slate-800 flex justify-between">
              <span>{col}</span>
              <span className="text-slate-500 font-normal">{tasksForColumn(tasks, col).length}</span>
            </div>
            <Droppable droppableId={col}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`p-2 min-h-[200px] space-y-2 ${snapshot.isDraggingOver ? 'bg-sky-50/50 dark:bg-sky-950/30' : ''}`}
                >
                  {tasksForColumn(tasks, col).map((task, index) => (
                    <Draggable key={task._id} draggableId={String(task._id)} index={index}>
                      {(dragP, dragS) => (
                        <div
                          ref={dragP.innerRef}
                          {...dragP.draggableProps}
                          {...dragP.dragHandleProps}
                          className={`rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 shadow-sm cursor-grab active:cursor-grabbing ${priorityClass(task.priority)} ${dragS.isDragging ? 'ring-2 ring-sky-400' : ''}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => onOpenTask(task)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') onOpenTask(task);
                          }}
                        >
                          <div className="font-medium text-sm">{task.title}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(task.labels || []).map((lb) => (
                              <span
                                key={lb}
                                className="text-[10px] uppercase tracking-wide bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded"
                              >
                                {lb}
                              </span>
                            ))}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex justify-between items-center gap-2">
                            <span className="flex items-center gap-1.5 min-w-0">
                              {task.assignedTo?.avatarUrl ? (
                                <img
                                  src={task.assignedTo.avatarUrl}
                                  alt=""
                                  className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                                />
                              ) : null}
                              <span className="truncate">{task.assignedTo?.name || 'Unassigned'}</span>
                            </span>
                            <span className="flex-shrink-0">{task.priority}</span>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}

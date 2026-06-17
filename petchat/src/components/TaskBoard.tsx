import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { createTask, onUserTasksChange, updateTaskStatus, deleteTask } from '../services/taskService';

interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  dueDate: any;
  dueTime: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  subtasks: string[];
  assignedBy: string;
  tags: string[];
}

export default function TaskBoard({ userId }: { userId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [dueTime, setDueTime] = useState('17:00');

  useEffect(() => {
    const unsub = onUserTasksChange(userId, setTasks);
    return () => unsub();
  }, [userId]);

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    await createTask({
      userId,
      title: newTask,
      description: '',
      priority: 'medium',
      status: 'todo',
      subtasks: [],
      assignedBy: userId,
      tags: [],
      dueDate: new Date(),
      dueTime,
    });
    setNewTask('');
  };

  const handleStatusChange = async (taskId: string, status: Task['status']) => {
    await updateTaskStatus(taskId, status);
  };

  const handleDelete = async (taskId: string) => {
    await deleteTask(taskId);
  };

  const getColorByPriority = (priority: string) => {
    const colors: { [key: string]: string } = {
      urgent: 'border-red-500 bg-red-50',
      high: 'border-orange-500 bg-orange-50',
      medium: 'border-yellow-500 bg-yellow-50',
      low: 'border-green-500 bg-green-50',
    };
    return colors[priority] || 'border-gray-300 bg-gray-50';
  };

  const statuses = ['todo', 'in_progress', 'done', 'blocked'] as const;

  return (
    <div className="p-6 bg-white rounded-lg">
      <h2 className="text-2xl font-bold mb-6">📋 My Tasks</h2>

      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="Add new task..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleAddTask}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition flex items-center gap-2"
          >
            <Plus size={20} /> Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {statuses.map(status => (
          <div key={status} className="bg-gray-100 p-4 rounded-lg min-h-96">
            <h3 className="font-semibold mb-3 capitalize text-sm">{status.replace('_', ' ')}</h3>
            <div className="space-y-2">
              {tasks.filter(t => t.status === status).map(task => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border-l-4 transition ${getColorByPriority(task.priority)}`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <p className="font-medium text-sm flex-1">{task.title}</p>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="text-red-500 hover:text-red-700 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                    🕐 {task.dueTime}
                  </div>

                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value as Task['status'])}
                    className="w-full text-xs p-1 border rounded bg-white"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="blocked">Blocked</option>
                  </select>

                  <div className="mt-2 flex gap-1">
                    <span className={`text-xs px-2 py-1 rounded ${
                      task.priority === 'urgent' ? 'bg-red-200 text-red-700' :
                      task.priority === 'high' ? 'bg-orange-200 text-orange-700' :
                      task.priority === 'medium' ? 'bg-yellow-200 text-yellow-700' :
                      'bg-green-200 text-green-700'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>{tasks.filter(t => t.status === 'todo').length}</strong> To Do •
          <strong className="ml-2">{tasks.filter(t => t.status === 'in_progress').length}</strong> In Progress •
          <strong className="ml-2">{tasks.filter(t => t.status === 'done').length}</strong> Done
        </p>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import API from '../services/api';
import Navbar from '../components/Navbar';
import TaskCard from '../components/TaskCard';
import TaskModal from '../components/TaskModal';
import ConfirmModal from '../components/ConfirmModal';
import ChatBox from '../components/ChatBox';

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [allTasksStats, setAllTasksStats] = useState({ pending: 0, progress: 0, done: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc'); // asc or desc by dueDate

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [taskIdToDelete, setTaskIdToDelete] = useState(null);

  // Toasts state
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Fetch filtered + sorted tasks from the API
  const fetchTasks = async (currentFilter = filter, currentSort = sortOrder) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ sortBy: 'dueDate', order: currentSort });
      if (currentFilter !== 'all') {
        params.append('status', currentFilter);
      }
      const response = await API.get(`/api/tasks?${params.toString()}`);
      setTasks(response.data?.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      showToast(error.response?.data?.message || 'Failed to fetch tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all tasks (no filter) to keep stat counters always accurate
  const fetchStats = async () => {
    try {
      const response = await API.get('/api/tasks');
      const all = response.data?.tasks || [];
      setAllTasksStats({
        total: all.length,
        pending: all.filter((t) => t.status === 'pending').length,
        progress: all.filter((t) => t.status === 'in-progress').length,
        done: all.filter((t) => t.status === 'done').length,
      });
    } catch (_) {
      // silently fail — stats are non-critical
    }
  };

  // Re-fetch from API whenever filter or sort changes
  useEffect(() => {
    fetchTasks(filter, sortOrder);
  }, [filter, sortOrder]);

  // Load stats once on mount and after any task mutation
  useEffect(() => {
    fetchStats();
  }, []);

  const handleCreateOrUpdateTask = async (taskData) => {
    try {
      if (selectedTask) {
        // Update Task
        const response = await API.put(`/api/tasks/${selectedTask._id}`, taskData);
        if (response.data?.task) {
          showToast('Task updated successfully!');
        }
      } else {
        // Create Task
        const response = await API.post('/api/tasks', taskData);
        if (response.data?.task) {
          showToast('Task created successfully!');
        }
      }
      setIsTaskModalOpen(false);
      setSelectedTask(null);
      // Refresh both task list and stats
      fetchTasks();
      fetchStats();
    } catch (error) {
      console.error('Error saving task:', error);
      showToast(error.response?.data?.message || 'Failed to save task', 'error');
    }
  };

  const handleDeleteTask = async () => {
    if (!taskIdToDelete) return;
    try {
      await API.delete(`/api/tasks/${taskIdToDelete}`);
      showToast('Task deleted successfully!');
      setIsConfirmOpen(false);
      setTaskIdToDelete(null);
      // Refresh both task list and stats
      fetchTasks();
      fetchStats();
    } catch (error) {
      console.error('Error deleting task:', error);
      showToast(error.response?.data?.message || 'Failed to delete task', 'error');
    }
  };

  const openEditModal = (task) => {
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  };

  const openCreateModal = () => {
    setSelectedTask(null);
    setIsTaskModalOpen(true);
  };

  const openDeleteConfirm = (id) => {
    setTaskIdToDelete(id);
    setIsConfirmOpen(true);
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  const handleSortToggle = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <div className="app-container">
      <Navbar />
      
      <main className="dashboard-container">
        {/* Stats Grid — always use allTasksStats for accurate totals */}
        <section className="stats-grid">
          <div className="stat-card stat-total">
            <div className="stat-icon">📋</div>
            <div className="stat-details">
              <h3>{allTasksStats.total}</h3>
              <p>Total Tasks</p>
            </div>
          </div>

          <div className="stat-card stat-pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-details">
              <h3>{allTasksStats.pending}</h3>
              <p>Pending</p>
            </div>
          </div>

          <div className="stat-card stat-progress">
            <div className="stat-icon">⚡</div>
            <div className="stat-details">
              <h3>{allTasksStats.progress}</h3>
              <p>In Progress</p>
            </div>
          </div>

          <div className="stat-card stat-done">
            <div className="stat-icon">✓</div>
            <div className="stat-details">
              <h3>{allTasksStats.done}</h3>
              <p>Completed</p>
            </div>
          </div>
        </section>

        {/* Toolbar: Filter and Actions — filter/sort sent as API query params */}
        <section className="toolbar">
          <div className="filter-bar">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => handleFilterChange('pending')}
            >
              Pending
            </button>
            <button
              className={`filter-btn ${filter === 'in-progress' ? 'active' : ''}`}
              onClick={() => handleFilterChange('in-progress')}
            >
              In Progress
            </button>
            <button
              className={`filter-btn ${filter === 'done' ? 'active' : ''}`}
              onClick={() => handleFilterChange('done')}
            >
              Done
            </button>
          </div>

          <div className="toolbar-actions">
            {/* Sort Toggle — triggers API re-fetch with new order */}
            <button
              className="btn btn-secondary"
              onClick={handleSortToggle}
              style={{ padding: '10px 16px', display: 'inline-flex', alignItems: 'center', width: 'auto' }}
              title="Sort by Due Date"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
              Sort: {sortOrder === 'asc' ? 'Earliest Due' : 'Latest Due'}
            </button>

            <button className="btn btn-primary btn-add-task" onClick={openCreateModal}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Task
            </button>
          </div>
        </section>

        {/* Tasks display section — tasks already filtered & sorted by API */}
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading your tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📂</div>
            <h3>No tasks found</h3>
            <p>
              {filter === 'all'
                ? "You haven't created any tasks yet. Let's get started!"
                : `No tasks with status "${filter}" found.`}
            </p>
            {filter === 'all' && (
              <button className="btn btn-primary" onClick={openCreateModal}>
                Create Your First Task
              </button>
            )}
          </div>
        ) : (
          <section className="tasks-grid">
            {tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onEdit={openEditModal}
                onDelete={openDeleteConfirm}
              />
            ))}
          </section>
        )}
      </main>

      {/* Task Creation / Editing Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        onSubmit={handleCreateOrUpdateTask}
        task={selectedTask}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setTaskIdToDelete(null);
        }}
        onConfirm={handleDeleteTask}
      />

      {/* Chat Bot Assistant */}
      <ChatBox />

      {/* Toast notifications portal */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <div className="toast-icon">
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}
            </div>
            <div className="toast-content">{toast.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;

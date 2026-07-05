import Task from '../models/Task.js';

/**
 * Adds a new task for the given user
 * @param {string} userId - The MongoDB ObjectId of the user
 * @param {Object} taskData - { title, description, dueDate, status? }
 * @returns {Object} The created task document or { error: message }
 */
export const addTask = async (userId, taskData) => {
  try {
    const { title, description = '', dueDate, status = 'pending' } = taskData;

    const task = new Task({
      title,
      description,
      dueDate,
      status,
      userId,
    });

    const savedTask = await task.save();
    return savedTask;
  } catch (error) {
    return { error: error.message };
  }
};

/**
 * Updates an existing task (only if it belongs to the user)
 * @param {string} userId - The MongoDB ObjectId of the user
 * @param {string} id - The task _id to update
 * @param {Object} updates - Fields to update (title, description, dueDate, status)
 * @returns {Object} The updated task document or { error: message }
 */
export const updateTask = async (userId, id, updates) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: id, userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!task) {
      return { error: 'Task not found' };
    }

    return task;
  } catch (error) {
    return { error: error.message };
  }
};

/**
 * Deletes a task (only if it belongs to the user)
 * @param {string} userId - The MongoDB ObjectId of the user
 * @param {string} id - The task _id to delete
 * @returns {Object} { success: true } or { error: message }
 */
export const deleteTask = async (userId, id) => {
  try {
    const result = await Task.findOneAndDelete({ _id: id, userId });

    if (!result) {
      return { error: 'Task not found' };
    }

    return { success: true };
  } catch (error) {
    return { error: error.message };
  }
};

/**
 * Lists all tasks for a given user
 * @param {string} userId - The MongoDB ObjectId of the user
 * @returns {Array} Array of task documents or { error: message }
 */
export const listTasks = async (userId) => {
  try {
    const tasks = await Task.find({ userId }).sort({ createdAt: -1 });
    return tasks;
  } catch (error) {
    return { error: error.message };
  }
};

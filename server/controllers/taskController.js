import Task from '../models/Task.js';


export const getTasks = async (req, res) => {
  try {
    const { status, sortBy = 'createdAt', order = 'desc' } = req.query;

    // Build filter — always scoped to the logged-in user
    const filter = { userId: req.user._id };
    const validStatuses = ['pending', 'in-progress', 'done'];
    if (status && validStatuses.includes(status)) {
      filter.status = status;
    }

    // Build sort — allow sorting by dueDate or createdAt
    const validSortFields = ['dueDate', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = order === 'asc' ? 1 : -1;

    const tasks = await Task.find(filter).sort({ [sortField]: sortDirection });
    res.json({ tasks });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
};

export const createTask = async (req, res) => {
  try {
    const { title, description, status, dueDate } = req.body;

    if (!title || !dueDate) {
      return res.status(400).json({ message: 'Title and due date are required' });
    }

    const task = await Task.create({
      title,
      description,
      status,
      dueDate,
      userId: req.user._id,
    });

    res.status(201).json({ task });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create task' });
  }
};

export const updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const { title, description, status, dueDate } = req.body;

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (status !== undefined) task.status = status;
    if (dueDate !== undefined) task.dueDate = dueDate;

    await task.save();
    res.json({ task });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update task' });
  }
};


export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete task' });
  }
};
const Task = require('../models/Task');
const Board = require('../models/Board');

// ─── Get Board (with its tasks) ──────────────────────────────────────────────
exports.getBoardByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const board = await Board.findOne({ project: projectId });
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found for this project.' });
    }
    res.json({ success: true, board });
  } catch (err) {
    console.error('[Board] GetBoard error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch board.' });
  }
};

// ─── Get Tasks for a Board ───────────────────────────────────────────────────
exports.getTasksByBoard = async (req, res) => {
  try {
    const { boardId } = req.params;
    const tasks = await Task.find({ board: boardId })
      .populate('assignees', 'name avatar')
      .populate('comments.author', 'name avatar')
      .sort({ order: 1 });
    res.json({ success: true, tasks });
  } catch (err) {
    console.error('[Task] GetTasks error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks.' });
  }
};

// ─── Create Task ─────────────────────────────────────────────────────────────
exports.createTask = async (req, res) => {
  try {
    const { boardId, columnId, title, description, priority, assignees, dueDate, tags } = req.body;

    if (!boardId || !title) {
      return res.status(400).json({ success: false, message: 'Board ID and title are required.' });
    }

    const tasksInColumn = await Task.countDocuments({ board: boardId, columnId });

    const task = await Task.create({
      board: boardId,
      columnId: columnId || 'todo',
      title: title.trim(),
      description: description || '',
      priority: priority || 'Medium',
      assignees: assignees || [req.user.id],
      dueDate: dueDate || null,
      tags: tags || [],
      order: tasksInColumn
    });

    await task.populate('assignees', 'name avatar');
    res.status(201).json({ success: true, task });
  } catch (err) {
    console.error('[Task] CreateTask error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create task.' });
  }
};

// ─── Update Task (title, desc, priority, dueDate, tags, assignees) ───────────
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const task = await Task.findByIdAndUpdate(id, updates, { new: true })
      .populate('assignees', 'name avatar')
      .populate('comments.author', 'name avatar');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    res.json({ success: true, task });
  } catch (err) {
    console.error('[Task] UpdateTask error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update task.' });
  }
};

// ─── Move Task (Drag & Drop) ─────────────────────────────────────────────────
exports.moveTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { columnId, order } = req.body;

    const task = await Task.findByIdAndUpdate(
      id,
      { columnId, order },
      { new: true }
    ).populate('assignees', 'name avatar');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    res.json({ success: true, task });
  } catch (err) {
    console.error('[Task] MoveTask error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to move task.' });
  }
};

// ─── Delete Task ─────────────────────────────────────────────────────────────
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }
    res.json({ success: true, message: 'Task deleted.' });
  } catch (err) {
    console.error('[Task] DeleteTask error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete task.' });
  }
};

// ─── Add Comment ─────────────────────────────────────────────────────────────
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Comment content is required.' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    task.comments.push({ author: req.user.id, content: content.trim() });
    await task.save();
    await task.populate('comments.author', 'name avatar');

    const newComment = task.comments[task.comments.length - 1];
    res.status(201).json({ success: true, comment: newComment });
  } catch (err) {
    console.error('[Task] AddComment error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to add comment.' });
  }
};

// ─── Toggle Subtask ──────────────────────────────────────────────────────────
exports.toggleSubtask = async (req, res) => {
  try {
    const { id, subtaskIndex } = req.params;
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }
    if (task.subtasks[subtaskIndex] === undefined) {
      return res.status(404).json({ success: false, message: 'Subtask not found.' });
    }
    task.subtasks[subtaskIndex].completed = !task.subtasks[subtaskIndex].completed;
    await task.save();
    res.json({ success: true, subtasks: task.subtasks });
  } catch (err) {
    console.error('[Task] ToggleSubtask error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to toggle subtask.' });
  }
};

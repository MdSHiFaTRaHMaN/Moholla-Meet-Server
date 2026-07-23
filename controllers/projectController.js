const Project = require('../models/Project');
const Board = require('../models/Board');

// ─── Get Projects in a Workspace ─────────────────────────────────────────────
exports.getProjects = async (req, res) => {
  try {
    const { workspaceId } = req.query;
    const query = workspaceId
      ? { workspace: workspaceId, members: req.user.id }
      : { members: req.user.id };

    const projects = await Project.find(query)
      .populate('lead', 'name avatar')
      .populate('members', 'name avatar email')
      .sort({ createdAt: -1 });

    res.json({ success: true, projects });
  } catch (err) {
    console.error('[Project] GetProjects error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch projects.' });
  }
};

// ─── Get Single Project ──────────────────────────────────────────────────────
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('lead', 'name avatar')
      .populate('members', 'name avatar email role');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    res.json({ success: true, project });
  } catch (err) {
    console.error('[Project] GetProjectById error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch project.' });
  }
};

// ─── Create Project ──────────────────────────────────────────────────────────
exports.createProject = async (req, res) => {
  try {
    const { name, key, description, color, workspaceId } = req.body;

    if (!name || !workspaceId) {
      return res.status(400).json({ success: false, message: 'Project name and workspace ID are required.' });
    }

    // Auto-generate key if not provided
    const projectKey = key
      ? key.toUpperCase()
      : name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'PRJ';

    const project = await Project.create({
      workspace: workspaceId,
      name: name.trim(),
      key: projectKey,
      description: description || '',
      color: color || '#6366f1',
      status: 'Active',
      lead: req.user.id,
      members: [req.user.id]
    });

    // Automatically create a default Kanban board for this project
    await Board.create({
      project: project._id,
      title: `${project.name} Board`,
      columns: [
        { id: 'backlog',     title: 'Backlog',      color: '#64748b', order: 0 },
        { id: 'todo',        title: 'To Do',         color: '#3b82f6', order: 1 },
        { id: 'in_progress', title: 'In Progress',   color: '#f59e0b', order: 2 },
        { id: 'review',      title: 'Code Review',   color: '#8b5cf6', order: 3 },
        { id: 'done',        title: 'Done',          color: '#10b981', order: 4 }
      ]
    });

    await project.populate('lead', 'name avatar');
    await project.populate('members', 'name avatar email');

    res.status(201).json({ success: true, project });
  } catch (err) {
    console.error('[Project] CreateProject error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create project.' });
  }
};

// ─── Update Project ──────────────────────────────────────────────────────────
exports.updateProject = async (req, res) => {
  try {
    const { name, description, color, status } = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { name, description, color, status },
      { new: true, runValidators: true }
    )
      .populate('lead', 'name avatar')
      .populate('members', 'name avatar email');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    res.json({ success: true, project });
  } catch (err) {
    console.error('[Project] UpdateProject error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update project.' });
  }
};

// ─── Delete Project ──────────────────────────────────────────────────────────
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    // Also delete associated boards
    await Board.deleteMany({ project: req.params.id });
    res.json({ success: true, message: 'Project deleted successfully.' });
  } catch (err) {
    console.error('[Project] DeleteProject error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete project.' });
  }
};

const Workspace = require('../models/Workspace');

// ─── Get User's Workspaces ───────────────────────────────────────────────────
exports.getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      'members.user': req.user.id
    })
      .populate('owner', 'name avatar')
      .populate('members.user', 'name avatar email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, workspaces });
  } catch (err) {
    console.error('[Workspace] GetWorkspaces error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch workspaces.' });
  }
};

// ─── Get Single Workspace ────────────────────────────────────────────────────
exports.getWorkspaceById = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.id)
      .populate('owner', 'name avatar')
      .populate('members.user', 'name avatar email role status');

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found.' });
    }

    // Check user is a member
    const isMember = workspace.members.some(
      (m) => m.user._id.toString() === req.user.id
    );
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Access denied to this workspace.' });
    }

    res.json({ success: true, workspace });
  } catch (err) {
    console.error('[Workspace] GetWorkspaceById error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch workspace.' });
  }
};

// ─── Create Workspace ────────────────────────────────────────────────────────
exports.createWorkspace = async (req, res) => {
  try {
    const { name, logo } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Workspace name is required.' });
    }

    // Generate unique slug
    const baseSlug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (await Workspace.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const workspace = await Workspace.create({
      name: name.trim(),
      slug,
      logo: logo || '⚡',
      owner: req.user.id,
      members: [{ user: req.user.id, role: 'Owner', joinedAt: new Date() }]
    });

    await workspace.populate('owner', 'name avatar');
    await workspace.populate('members.user', 'name avatar email role');

    res.status(201).json({ success: true, workspace });
  } catch (err) {
    console.error('[Workspace] CreateWorkspace error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create workspace.' });
  }
};

// ─── Update Workspace ────────────────────────────────────────────────────────
exports.updateWorkspace = async (req, res) => {
  try {
    const { name, logo, settings } = req.body;
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found.' });
    }

    // Only Owner or Admin can update
    const member = workspace.members.find((m) => m.user.toString() === req.user.id);
    if (!member || !['Owner', 'Admin'].includes(member.role)) {
      return res.status(403).json({ success: false, message: 'Only Owners or Admins can update the workspace.' });
    }

    if (name) workspace.name = name.trim();
    if (logo) workspace.logo = logo;
    if (settings) workspace.settings = { ...workspace.settings, ...settings };
    await workspace.save();

    res.json({ success: true, workspace });
  } catch (err) {
    console.error('[Workspace] UpdateWorkspace error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update workspace.' });
  }
};

// ─── Invite Member ────────────────────────────────────────────────────────────
exports.inviteMember = async (req, res) => {
  try {
    const { userId, role = 'Member' } = req.body;
    const workspace = await Workspace.findById(req.params.id);

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found.' });
    }

    const alreadyMember = workspace.members.some((m) => m.user.toString() === userId);
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: 'User is already a member of this workspace.' });
    }

    workspace.members.push({ user: userId, role, joinedAt: new Date() });
    await workspace.save();
    await workspace.populate('members.user', 'name avatar email');

    res.json({ success: true, workspace });
  } catch (err) {
    console.error('[Workspace] InviteMember error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to invite member.' });
  }
};

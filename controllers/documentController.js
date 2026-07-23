const Document = require('../models/Document');

// ─── Get Workspace Documents ──────────────────────────────────────────────────
exports.getDocuments = async (req, res) => {
  try {
    const { workspaceId, search } = req.query;
    const query = {
      $or: [
        { author: req.user.id },
        { collaborators: req.user.id },
        { isPublic: true }
      ]
    };
    if (workspaceId) query.workspace = workspaceId;
    if (search) query.title = { $regex: search, $options: 'i' };

    const documents = await Document.find(query)
      .populate('author', 'name avatar')
      .populate('collaborators', 'name avatar')
      .select('-content')          // Don't load full content in list view
      .sort({ updatedAt: -1 });

    res.json({ success: true, documents });
  } catch (err) {
    console.error('[Doc] GetDocuments error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch documents.' });
  }
};

// ─── Get Single Document (with full content) ──────────────────────────────────
exports.getDocumentById = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id)
      .populate('author', 'name avatar')
      .populate('collaborators', 'name avatar');

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    // Access check
    const hasAccess =
      doc.isPublic ||
      doc.author._id.toString() === req.user.id ||
      doc.collaborators.some((c) => c._id.toString() === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Access denied to this document.' });
    }

    res.json({ success: true, document: doc });
  } catch (err) {
    console.error('[Doc] GetDocumentById error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch document.' });
  }
};

// ─── Create Document ──────────────────────────────────────────────────────────
exports.createDocument = async (req, res) => {
  try {
    const { workspaceId, title, content, tags, isPublic } = req.body;

    const doc = await Document.create({
      workspace: workspaceId,
      title: title || 'Untitled Document',
      content: content || '<p>Start writing your document here...</p>',
      author: req.user.id,
      collaborators: [req.user.id],
      tags: tags || [],
      isPublic: isPublic || false
    });

    await doc.populate('author', 'name avatar');
    res.status(201).json({ success: true, document: doc });
  } catch (err) {
    console.error('[Doc] CreateDocument error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to create document.' });
  }
};

// ─── Update Document (auto-save from editor) ──────────────────────────────────
exports.updateDocument = async (req, res) => {
  try {
    const { title, content, tags, isPublic } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (tags !== undefined) updates.tags = tags;
    if (isPublic !== undefined) updates.isPublic = isPublic;

    const doc = await Document.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('author', 'name avatar')
      .populate('collaborators', 'name avatar');

    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    res.json({ success: true, document: doc });
  } catch (err) {
    console.error('[Doc] UpdateDocument error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update document.' });
  }
};

// ─── Delete Document ──────────────────────────────────────────────────────────
exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    if (doc.author.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the document author can delete it.' });
    }

    await doc.deleteOne();
    res.json({ success: true, message: 'Document deleted.' });
  } catch (err) {
    console.error('[Doc] DeleteDocument error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to delete document.' });
  }
};

// ─── Add Collaborator ─────────────────────────────────────────────────────────
exports.addCollaborator = async (req, res) => {
  try {
    const { userId } = req.body;
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found.' });

    if (!doc.collaborators.includes(userId)) {
      doc.collaborators.push(userId);
      await doc.save();
    }

    await doc.populate('collaborators', 'name avatar');
    res.json({ success: true, collaborators: doc.collaborators });
  } catch (err) {
    console.error('[Doc] AddCollaborator error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to add collaborator.' });
  }
};

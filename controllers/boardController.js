const Board = require('../models/Board');
const Task = require('../models/Task');

exports.getBoards = async (req, res) => {
  try {
    const { projectId } = req.query;
    const query = projectId ? { project: projectId } : {};
    const boards = await Board.find(query);
    res.json({ success: true, boards });
  } catch (err) {
    console.error('[Board] GetBoards error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch boards.' });
  }
};

exports.getBoardById = async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) {
      return res.status(404).json({ success: false, message: 'Board not found.' });
    }
    res.json({ success: true, board });
  } catch (err) {
    console.error('[Board] GetBoardById error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch board.' });
  }
};

exports.updateColumns = async (req, res) => {
  try {
    const { columns } = req.body;
    const board = await Board.findByIdAndUpdate(
      req.params.id,
      { columns },
      { new: true }
    );
    if (!board) return res.status(404).json({ success: false, message: 'Board not found.' });
    res.json({ success: true, board });
  } catch (err) {
    console.error('[Board] UpdateColumns error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to update board columns.' });
  }
};

const Task = require('../models/Task');
const User = require('../models/User');
const Project = require('../models/Project');
const Message = require('../models/Message');
const File = require('../models/File');

exports.getDashboardAnalytics = async (req, res) => {
  try {
    const { workspaceId } = req.query;

    // ─── Task Statistics ─────────────────────────────────────────────────
    // Get all tasks (filter by workspace projects if provided)
    const taskStats = await Task.aggregate([
      {
        $group: {
          _id: '$columnId',
          count: { $sum: 1 }
        }
      }
    ]);

    const tasksByStatus = {};
    taskStats.forEach(({ _id, count }) => {
      tasksByStatus[_id] = count;
    });

    // ─── Task Priority Distribution ──────────────────────────────────────
    const priorityStats = await Task.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // ─── Tasks Created Per Day (last 14 days) ────────────────────────────
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const tasksTrend = await Task.aggregate([
      { $match: { createdAt: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          created: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$columnId', 'done'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // ─── Top Active Members ──────────────────────────────────────────────
    const topAssignees = await Task.aggregate([
      { $unwind: '$assignees' },
      { $group: { _id: '$assignees', taskCount: { $sum: 1 } } },
      { $sort: { taskCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          name: '$user.name',
          avatar: '$user.avatar',
          taskCount: 1
        }
      }
    ]);

    // ─── Total Counts ────────────────────────────────────────────────────
    const [totalTasks, totalProjects, totalMembers, totalMessages, totalFiles] = await Promise.all([
      Task.countDocuments(),
      Project.countDocuments(),
      User.countDocuments(),
      Message.countDocuments(),
      File.countDocuments()
    ]);

    res.json({
      success: true,
      analytics: {
        totals: { tasks: totalTasks, projects: totalProjects, members: totalMembers, messages: totalMessages, files: totalFiles },
        tasksByStatus,
        tasksByPriority: Object.fromEntries(priorityStats.map(({ _id, count }) => [_id, count])),
        tasksTrend,
        topAssignees
      }
    });
  } catch (err) {
    console.error('[Analytics] GetDashboard error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics.' });
  }
};

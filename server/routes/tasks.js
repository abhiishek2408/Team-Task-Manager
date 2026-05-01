const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');

router.use(protect);

// @route GET /api/tasks  — tasks assigned to / created by current user
router.get('/', async (req, res) => {
  try {
    const { status, priority, projectId } = req.query;
    const filter = {};
    if (req.user.role !== 'admin') {
      filter.$or = [{ assignee: req.user._id }, { createdBy: req.user._id }];
    }
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (projectId) filter.project = projectId;

    const tasks = await Task.find(filter)
      .populate('project', 'name color')
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .sort({ dueDate: 1, createdAt: -1 });

    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/tasks/dashboard — dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    // Get projects user belongs to
    const query = req.user.role === 'admin' ? {} : {
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
    };
    const projects = await Project.find(query).select('_id');
    const projectIds = projects.map((p) => p._id);

    const now = new Date();

    const [statusCounts, overdueTasks, recentTasks, myTasks] = await Promise.all([
      Task.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Task.find({
        project: { $in: projectIds },
        dueDate: { $lt: now },
        status: { $ne: 'done' },
      })
        .populate('project', 'name color')
        .populate('assignee', 'name email')
        .sort({ dueDate: 1 })
        .limit(5),
      Task.find({ project: { $in: projectIds } })
        .populate('project', 'name color')
        .populate('assignee', 'name email')
        .sort({ createdAt: -1 })
        .limit(8),
      Task.find({ assignee: req.user._id, status: { $ne: 'done' } })
        .populate('project', 'name color')
        .sort({ dueDate: 1 })
        .limit(5),
    ]);

    const counts = { todo: 0, 'in-progress': 0, review: 0, done: 0, total: 0 };
    statusCounts.forEach(({ _id, count }) => {
      counts[_id] = count;
      counts.total += count;
    });

    res.json({
      success: true,
      stats: {
        taskCounts: counts,
        overdueCount: await Task.countDocuments({
          project: { $in: projectIds },
          dueDate: { $lt: now },
          status: { $ne: 'done' },
        }),
        projectCount: projectIds.length,
        overdueTasks,
        recentTasks,
        myTasks,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/tasks
router.post(
  '/',
  [
    body('title').trim().isLength({ min: 3, max: 150 }).withMessage('Title must be 3-150 chars'),
    body('project').isMongoId().withMessage('Valid project ID required'),
    body('status').optional().isIn(['todo', 'in-progress', 'review', 'done']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { title, description, project, assignee, status, priority, dueDate, tags } = req.body;

      // Check project membership
      const proj = await Project.findById(project);
      if (!proj) return res.status(404).json({ success: false, message: 'Project not found' });
      if (!proj.isMember(req.user._id) && req.user.role !== 'admin')
        return res.status(403).json({ success: false, message: 'Not a project member' });

      const task = await Task.create({
        title, description, project, assignee, status, priority, dueDate, tags,
        createdBy: req.user._id,
      });

      await task.populate('assignee', 'name email');
      await task.populate('createdBy', 'name email');
      await task.populate('project', 'name color');
      res.status(201).json({ success: true, task });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// @route GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name color owner members')
      .populate('comments.user', 'name email');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const proj = await Project.findById(task.project._id);
    if (!proj.isMember(req.user._id) && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied' });

    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const proj = await Project.findById(task.project);
    if (!proj.isMember(req.user._id) && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied' });

    const allowed = ['title', 'description', 'assignee', 'status', 'priority', 'dueDate', 'tags'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) task[field] = req.body[field];
    });

    await task.save();
    await task.populate('assignee', 'name email');
    await task.populate('createdBy', 'name email');
    await task.populate('project', 'name color');
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const proj = await Project.findById(task.project);
    if (!proj.isAdmin(req.user._id) && task.createdBy.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Not authorized to delete' });

    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/tasks/:id/comments
router.post('/:id/comments', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim())
      return res.status(400).json({ success: false, message: 'Comment text required' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    task.comments.push({ user: req.user._id, text: text.trim() });
    await task.save();
    await task.populate('comments.user', 'name email');

    res.status(201).json({ success: true, comments: task.comments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

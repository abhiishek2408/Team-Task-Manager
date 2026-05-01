const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// @route GET /api/projects
router.get('/', async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : {
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
    };
    const projects = await Project.find(query)
      .populate('owner', 'name email role')
      .populate('members.user', 'name email role')
      .sort({ updatedAt: -1 });

    // Attach task counts
    const projectsWithCounts = await Promise.all(
      projects.map(async (p) => {
        const taskCounts = await Task.aggregate([
          { $match: { project: p._id } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        const counts = { todo: 0, 'in-progress': 0, review: 0, done: 0, total: 0 };
        taskCounts.forEach(({ _id, count }) => {
          counts[_id] = count;
          counts.total += count;
        });
        return { ...p.toObject(), taskCounts: counts };
      })
    );

    res.json({ success: true, projects: projectsWithCounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/projects
router.post(
  '/',
  [
    body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Name must be 3-100 characters'),
    body('description').optional().trim().isLength({ max: 500 }),
    body('status').optional().isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { name, description, status, priority, dueDate, color, tags } = req.body;
      const project = await Project.create({
        name,
        description,
        status,
        priority,
        dueDate,
        color,
        tags,
        owner: req.user._id,
        members: [{ user: req.user._id, role: 'admin' }],
      });

      await project.populate('owner', 'name email role');
      res.status(201).json({ success: true, project });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// @route GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email role')
      .populate('members.user', 'name email role');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (!project.isMember(req.user._id) && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied' });

    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route PUT /api/projects/:id
router.put('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (!project.isAdmin(req.user._id) && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Admin access required' });

    const allowed = ['name', 'description', 'status', 'priority', 'dueDate', 'color', 'tags'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) project[field] = req.body[field];
    });

    await project.save();
    await project.populate('owner', 'name email role');
    await project.populate('members.user', 'name email role');
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (project.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Only owner can delete project' });

    await Task.deleteMany({ project: project._id });
    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Project and all tasks deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/projects/:id/members
router.post('/:id/members', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (!project.isAdmin(req.user._id) && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Admin access required' });

    const { userId, role } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const alreadyMember = project.members.some((m) => m.user.toString() === userId);
    if (alreadyMember)
      return res.status(400).json({ success: false, message: 'User is already a member' });

    project.members.push({ user: userId, role: role || 'member' });
    await project.save();
    await project.populate('members.user', 'name email role');
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route DELETE /api/projects/:id/members/:userId
router.delete('/:id/members/:userId', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (!project.isAdmin(req.user._id) && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Admin access required' });

    project.members = project.members.filter(
      (m) => m.user.toString() !== req.params.userId
    );
    await project.save();
    res.json({ success: true, message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/projects/:id/tasks
router.get('/:id/tasks', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    if (!project.isMember(req.user._id) && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Access denied' });

    const tasks = await Task.find({ project: req.params.id })
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// @route POST /api/auth/register
router.post(
  '/register',
  [
    body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['admin', 'member']).withMessage('Invalid role'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { name, email, password, role } = req.body;

      const existing = await User.findOne({ email });
      if (existing)
        return res.status(400).json({ success: false, message: 'Email already registered' });

      const user = await User.create({ name, email, password, role: role || 'member' });
      const token = generateToken(user._id);

      res.status(201).json({
        success: true,
        token,
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// @route POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select('+password');

      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Account deactivated' });
      }

      const token = generateToken(user._id);
      res.json({
        success: true,
        token,
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// @route GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// @route PUT /api/auth/profile
router.put(
  '/profile',
  protect,
  [body('name').optional().trim().isLength({ min: 2, max: 50 })],
  async (req, res) => {
    try {
      const { name, currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user._id).select('+password');

      if (name) user.name = name;

      if (newPassword) {
        if (!currentPassword)
          return res.status(400).json({ success: false, message: 'Current password required' });
        const match = await user.comparePassword(currentPassword);
        if (!match)
          return res.status(400).json({ success: false, message: 'Current password incorrect' });
        user.password = newPassword;
      }

      await user.save();
      res.json({
        success: true,
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

module.exports = router;

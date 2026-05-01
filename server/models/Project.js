const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      minlength: [3, 'Project name must be at least 3 characters'],
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['planning', 'active', 'on-hold', 'completed', 'cancelled'],
      default: 'planning',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['admin', 'member'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    dueDate: {
      type: Date,
    },
    color: {
      type: String,
      default: '#6366f1',
    },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual: task count (populated separately)
projectSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
});

// Check if user is member
projectSchema.methods.isMember = function (userId) {
  if (!userId) return false;
  const uid = userId._id || userId;
  return (
    this.owner.equals(uid) ||
    this.members.some((m) => {
      const memberId = m.user?._id || m.user;
      return memberId && memberId.equals(uid);
    })
  );
};

// Check if user is admin of this project
projectSchema.methods.isAdmin = function (userId) {
  if (!userId) return false;
  const uid = userId._id || userId;
  if (this.owner.equals(uid)) return true;
  const member = this.members.find((m) => {
    const memberId = m.user?._id || m.user;
    return memberId && memberId.equals(uid);
  });
  return member && member.role === 'admin';
};

module.exports = mongoose.model('Project', projectSchema);

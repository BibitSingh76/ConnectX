const mongoose = require('mongoose');

const meetingParticipantSchema = new mongoose.Schema(
  {
    meetingId: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['host', 'participant'],
      default: 'participant',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['joined', 'left'],
      default: 'joined',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes justified by participant lookups & leave/end operations
meetingParticipantSchema.index({ meetingId: 1, user: 1 });
meetingParticipantSchema.index({ meetingId: 1, displayName: 1 });
meetingParticipantSchema.index({ meetingId: 1, status: 1 });

module.exports = mongoose.model('MeetingParticipant', meetingParticipantSchema);

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

module.exports = mongoose.model('MeetingParticipant', meetingParticipantSchema);

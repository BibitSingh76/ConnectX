const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    meetingId: {
      type: String,
      required: [true, 'Meeting ID is required'],
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      default: 'ConnectX 1:1 Video Session',
      trim: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    hostName: {
      type: String,
      trim: true,
      default: 'Host',
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MeetingParticipant',
      },
    ],
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number, // Duration in seconds
      default: 0,
    },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'ended'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes justified by query patterns (listMeetings & getSummaryMetrics)
meetingSchema.index({ status: 1, createdAt: -1 });
meetingSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Meeting', meetingSchema);

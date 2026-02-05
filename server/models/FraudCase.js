const mongoose = require('mongoose');

const { Schema } = mongoose;

const fraudCaseSchema = new Schema({
  scanEventId: { type: Schema.Types.ObjectId, ref: 'ScanEvent', required: true },
  status: {
    type: String,
    enum: ['OPEN', 'IN_REVIEW', 'CONFIRMED_FRAUD', 'FALSE_POSITIVE', 'CLOSED'],
    default: 'OPEN'
  },
  assignedToUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('FraudCase', fraudCaseSchema);

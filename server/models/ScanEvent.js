const mongoose = require('mongoose');

const { Schema } = mongoose;

const ocrFieldsSchema = new Schema({
  studentId: { type: String },
  name: { type: String },
  gpa: { type: String },
  creditsTotal: { type: String },
  issueDate: { type: String }
}, { _id: false });

const scanEventSchema = new Schema({
  universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
  documentTypeId: { type: Schema.Types.ObjectId, ref: 'DocumentType', required: true },
  sourceApp: { type: String, enum: ['ios', 'android'], required: true },
  docHash: { type: String, index: true },
  resultLabel: { type: String, enum: ['AUTHENTIC', 'SUSPICIOUS', 'FORGED'], required: true },
  confidence: { type: Number, min: 0, max: 1 },
  reasons: [String],
  riskScore: { type: Number, min: 0, max: 100, index: true },
  suspiciousRegionsCount: { type: Number, default: 0 },
  ocrFields: { type: Schema.Types.Mixed },
  geoCountry: { type: String },
  geoCity: { type: String },
  deviceLanguage: { type: String }
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

// Indexes for common query patterns
scanEventSchema.index({ createdAt: -1 });
scanEventSchema.index({ universityId: 1 });
scanEventSchema.index({ resultLabel: 1 });
scanEventSchema.index({ riskScore: -1 });
scanEventSchema.index({ docHash: 1 });
// If ocrFields contains studentId, index that path where present
scanEventSchema.index({ 'ocrFields.studentId': 1 });

module.exports = mongoose.model('ScanEvent', scanEventSchema);

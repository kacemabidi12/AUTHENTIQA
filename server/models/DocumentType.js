const mongoose = require('mongoose');

const { Schema } = mongoose;

const documentTypeSchema = new Schema({
  universityId: { type: Schema.Types.ObjectId, ref: 'University', required: true },
  name: { type: String, enum: ['Transcript', 'Diploma', 'Attestation'], required: true },
  version: { type: String, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

module.exports = mongoose.model('DocumentType', documentTypeSchema);

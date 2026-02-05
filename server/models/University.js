const mongoose = require('mongoose');

const { Schema } = mongoose;

const universitySchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  country: { type: String, trim: true },
  status: { type: String, enum: ['active', 'pending', 'disabled'], default: 'active' }
}, { timestamps: { createdAt: 'createdAt', updatedAt: false } });

// createdAt is handled by timestamps option; updatedAt disabled (only createdAt requested)

module.exports = mongoose.model('University', universitySchema);

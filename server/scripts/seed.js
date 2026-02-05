const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');
const User = require('../models/User');
const University = require('../models/University');
const DocumentType = require('../models/DocumentType');

async function upsertAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@authentiqa.io';
  const password = process.env.ADMIN_PASSWORD || 'Admin123!';
  const role = 'SUPER_ADMIN';
  const name = 'Super Admin';
  const existing = await User.findOne({ email });
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ name, email, passwordHash, role });
    return { created: 1, updated: 0 };
  }

  // If the admin already exists, do NOT overwrite their passwordHash.
  let updated = 0;
  let changed = false;
  if (existing.role !== role) { existing.role = role; changed = true; }
  if (existing.name !== name) { existing.name = name; changed = true; }
  if (changed) {
    await existing.save();
    updated = 1;
  }
  return { created: 0, updated };
}

async function upsertUniversitiesAndDocs() {
  const universitiesData = [
    { name: 'Mediterranean Institute of Technology Tunisia', country: 'Tunisia' },
    { name: 'Mediterranean School of Business', country: '' }
  ];

  const docTypeNames = ['Transcript', 'Diploma', 'Attestation'];

  let createdUnis = 0, updatedUnis = 0, createdDocs = 0, updatedDocs = 0;

  for (const u of universitiesData) {
    const existing = await University.findOne({ name: u.name });
    let uni;
    if (!existing) {
      uni = await University.create({ name: u.name, country: u.country, status: 'active' });
      createdUnis++;
    } else {
      let changed = false;
      if (existing.country !== u.country) { existing.country = u.country; changed = true; }
      if (!existing.status) { existing.status = 'active'; changed = true; }
      if (changed) { await existing.save(); updatedUnis++; }
      uni = existing;
    }

    for (const dtName of docTypeNames) {
      const existingDt = await DocumentType.findOne({ universityId: uni._id, name: dtName });
      if (!existingDt) {
        await DocumentType.create({ universityId: uni._id, name: dtName, version: 'v1', status: 'active' });
        createdDocs++;
      } else {
        let changed = false;
        if (!existingDt.version) { existingDt.version = 'v1'; changed = true; }
        if (!existingDt.status) { existingDt.status = 'active'; changed = true; }
        if (changed) { await existingDt.save(); updatedDocs++; }
      }
    }
  }

  return { createdUnis, updatedUnis, createdDocs, updatedDocs };
}

async function main() {
  try {
    await mongoose.connect(config.mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const adminResult = await upsertAdmin();
    const uniResult = await upsertUniversitiesAndDocs();

    console.log('Seed summary:');
    console.log(`  Admin user - created: ${adminResult.created}, updated: ${adminResult.updated}`);
    console.log(`  Universities - created: ${uniResult.createdUnis}, updated: ${uniResult.updatedUnis}`);
    console.log(`  DocumentTypes - created: ${uniResult.createdDocs}, updated: ${uniResult.updatedDocs}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    try { await mongoose.disconnect(); } catch (e) {}
    process.exit(1);
  }
}

if (require.main === module) main();

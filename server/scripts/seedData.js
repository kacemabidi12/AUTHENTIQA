/*
 Seed script for Authentiqa server.
 - Creates two universities and three document types each (Transcript, Diploma, Attestation v2026.1)
 - Creates up to 300 ScanEvent documents across the two universities over the last 30 days.
 - Creates up to 20 FraudCase documents linked to suspicious/forged events.
 The script is idempotent: it will not duplicate universities or document types, and will only create missing ScanEvents/FraudCases to reach desired counts.
*/

const mongoose = require('mongoose');
const crypto = require('crypto');
const config = require('../config');

const University = require('../models/University');
const DocumentType = require('../models/DocumentType');
const ScanEvent = require('../models/ScanEvent');
const FraudCase = require('../models/FraudCase');

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomHex(len = 20) {
  return crypto.randomBytes(len).toString('hex');
}

function randomDateWithinDays(daysBack) {
  const now = Date.now();
  const past = now - daysBack * 24 * 60 * 60 * 1000;
  return new Date(randInt(past, now));
}

async function main() {
  await mongoose.connect(config.mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB for seeding data');

  const universitiesData = [
    { name: 'Mediterranean Institute of Technology Tunisia', country: 'Tunisia', status: 'active' },
    { name: 'Mediterranean School of Business', country: 'Tunisia', status: 'active' }
  ];

  const reasonPool = ['Template mismatch', 'Stamp anomaly', 'OCR mismatch', 'Credit total mismatch', 'Font inconsistency'];
  const docNames = ['Transcript', 'Diploma', 'Attestation'];
  const docVersion = '2026.1';

  // Ensure universities exist
  const universities = [];
  for (const u of universitiesData) {
    let existing = await University.findOne({ name: u.name });
    if (!existing) {
      existing = new University(u);
      await existing.save();
      console.log('Created university:', u.name);
    } else {
      console.log('Found existing university:', u.name);
    }
    universities.push(existing);
  }

  // Ensure document types per university
  const docTypesByUni = {};
  for (const uni of universities) {
    docTypesByUni[uni._id] = [];
    for (const name of docNames) {
      const existing = await DocumentType.findOne({ universityId: uni._id, name, version: docVersion });
      if (existing) {
        docTypesByUni[uni._id].push(existing);
      } else {
        const d = new DocumentType({ universityId: uni._id, name, version: docVersion, status: 'active' });
        await d.save();
        docTypesByUni[uni._id].push(d);
        console.log(`Created DocumentType ${name} for ${uni.name}`);
      }
    }
  }

  // Create up to 300 ScanEvents across these universities
  const TARGET_SCAN_EVENTS = 300;
  const existingCount = await ScanEvent.countDocuments({ universityId: { $in: universities.map(u => u._id) } });
  const toCreate = Math.max(0, TARGET_SCAN_EVENTS - existingCount);
  console.log(`Existing scan events for seeded universities: ${existingCount}. Will create: ${toCreate}`);

  const namesSample = ['Alice Smith', 'Bob Johnson', 'Carla Gomez', 'Derek Lee', 'Fatima Ben', 'Hassan Ali', 'Imane K.', 'Jamal R.'];

  const createdScanIds = [];

  for (let i = 0; i < toCreate; i++) {
    // choose university evenly
    const uni = universities[i % universities.length];
    const docTypes = docTypesByUni[uni._id];
    const docType = randChoice(docTypes);

    // label distribution: Authentic 70%, Suspicious 20%, Forged 10%
    const r = Math.random();
    let resultLabel;
    if (r < 0.7) resultLabel = 'AUTHENTIC';
    else if (r < 0.9) resultLabel = 'SUSPICIOUS';
    else resultLabel = 'FORGED';

    // confidence and riskScore by label
    let confidence = 0.5;
    let riskScore = 50;
    if (resultLabel === 'AUTHENTIC') {
      confidence = (Math.random() * 0.2) + 0.8; // 0.8-1.0
      riskScore = randInt(0, 20);
    } else if (resultLabel === 'SUSPICIOUS') {
      confidence = (Math.random() * 0.4) + 0.4; // 0.4-0.8
      riskScore = randInt(20, 60);
    } else {
      confidence = (Math.random() * 0.5); // 0.0-0.5
      riskScore = randInt(60, 100);
    }

    const reasons = (resultLabel === 'AUTHENTIC') ? [] : (() => {
      const n = randInt(1, 3);
      const s = new Set();
      while (s.size < n) s.add(randChoice(reasonPool));
      return Array.from(s);
    })();

    const createdAt = randomDateWithinDays(30);
    const studentId = `S${randInt(10000, 99999)}`;
    const name = randChoice(namesSample);

    const doc = new ScanEvent({
      universityId: uni._id,
      documentTypeId: docType._id,
      sourceApp: randChoice(['ios', 'android']),
      docHash: randomHex(12),
      resultLabel,
      confidence: Number(confidence.toFixed(3)),
      reasons,
      riskScore,
      suspiciousRegionsCount: randInt(0, 3),
      ocrFields: { studentId, name, gpa: (Math.random() * 2 + 2).toFixed(2), creditsTotal: String(randInt(90, 180)), issueDate: createdAt.toISOString().slice(0,10) },
      geoCountry: uni.country,
      geoCity: randChoice(['Tunis', 'Sfax', 'Sousse', 'Unknown']),
      deviceLanguage: randChoice(['en','fr','ar']),
      createdAt
    });

    await doc.save();
    createdScanIds.push(doc._id);
  }

  const finalCount = await ScanEvent.countDocuments({ universityId: { $in: universities.map(u => u._id) } });
  console.log(`Final scan events count for seeded universities: ${finalCount}`);

  // Create up to 20 FraudCases linked to suspicious/forged events
  const TARGET_FRAUD_CASES = 20;
  const existingFraud = await FraudCase.countDocuments({});
  const need = Math.max(0, TARGET_FRAUD_CASES - existingFraud);
  console.log(`Existing fraud cases: ${existingFraud}. Will create: ${need}`);

  if (need > 0) {
    // find candidate scan events (SUSPICIOUS or FORGED) for these universities that don't already have a fraud case
    const candidateEvents = await ScanEvent.find({ universityId: { $in: universities.map(u => u._id) }, resultLabel: { $in: ['SUSPICIOUS', 'FORGED'] } }).lean();
    const candidateIds = candidateEvents.map(c => c._id);
    const existingLinked = await FraudCase.find({ scanEventId: { $in: candidateIds } }).lean();
    const linkedIds = new Set(existingLinked.map(e => String(e.scanEventId)));

    const available = candidateEvents.filter(c => !linkedIds.has(String(c._id)));
    // shuffle available
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }

    const toTake = available.slice(0, need);
    const createOps = toTake.map(ev => {
      const fc = new FraudCase({ scanEventId: ev._id, status: 'OPEN', assignedToUserId: null, notes: 'Seeded case' });
      return fc.save();
    });

    await Promise.all(createOps);
    console.log(`Created ${createOps.length} fraud cases`);
  }

  console.log('Seeding complete');
  process.exit(0);
}

main().catch(err => {
  console.error('Seeding failed', err);
  process.exit(1);
});

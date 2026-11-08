require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../src/db');
const { todayInIndia } = require('../src/validation/reading');
const { SLOTS } = require('../src/constants');

const DEMO_USER = { name: 'Demo User', email: 'demo@sweety.app', password: 'demo12345' };
const DAYS_OF_DATA = 45;

function dateDaysAgo(daysAgo) {
  const [year, month, day] = todayInIndia().split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day - daysAgo)).toISOString().slice(0, 10);
}
function pseudoRandom(n) {
  return Math.abs(Math.sin(n * 12.9898) * 43758.5453) % 1;
}

async function seed() {
  const passwordHash = await bcrypt.hash(DEMO_USER.password, 10);

  const userResult = await pool.query(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [DEMO_USER.name, DEMO_USER.email, passwordHash]
  );
  const userId = userResult.rows[0].id;

  await pool.query('DELETE FROM readings WHERE user_id = $1', [userId]);

  const slots = Object.keys(SLOTS);
  let inserted = 0;

  for (let daysAgo = 0; daysAgo < DAYS_OF_DATA; daysAgo++) {
    const date = dateDaysAgo(daysAgo);

    for (let i = 0; i < slots.length; i++) {
      if (pseudoRandom(daysAgo * 10 + i) < 0.2) continue;

      const baseline = slots[i] === 'morning_fasting' ? 95 : 140;
      const value = Math.round(baseline + (pseudoRandom(daysAgo * 100 + i + 7) - 0.5) * 50);

      await pool.query(
        'INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4)',
        [userId, date, slots[i], value]
      );
      inserted++;
    }
  }

  console.log(`Seeded ${DEMO_USER.email} with ${inserted} readings.`);
  console.log(`Log in with password: ${DEMO_USER.password}`);
}

seed()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
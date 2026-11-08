const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { SLOTS, MAX_READINGS_PER_DAY } = require('../constants');
const { validateReading, isRealDate } = require('../validation/reading');

const router = express.Router();
router.use(requireAuth);

const SLOT_SORT = `CASE slot
  WHEN 'morning_fasting' THEN 1 WHEN 'after_breakfast' THEN 2
  WHEN 'after_lunch' THEN 3 WHEN 'after_dinner' THEN 4 END`;

function duplicateMessage(slot) {
  const label = SLOTS[slot];
  const article = /^[AEIOU]/.test(label) ? 'an' : 'a';
  return `You already have ${article} ${label} reading for this date.`;
}

async function checkDayLimits(userId, date, slot, excludeId = null) {
  const params = [userId, date];
  let sql = 'SELECT slot FROM readings WHERE user_id = $1 AND reading_date = $2';
  if (excludeId) {
    sql += ' AND id <> $3';
    params.push(excludeId);
  }
  const { rows } = await pool.query(sql, params);
  if (rows.length >= MAX_READINGS_PER_DAY) return `You can add only ${MAX_READINGS_PER_DAY} readings per day.`;
  if (rows.some((r) => r.slot === slot)) return duplicateMessage(slot);
  return null;
}

router.get('/', async (req, res) => {
  const params = [req.user.id];
  let where = 'user_id = $1';
  if (req.query.date) {
    if (!isRealDate(req.query.date)) return res.status(400).json({ error: 'Please choose a valid date.' });
    where += ' AND reading_date = $2';
    params.push(req.query.date);
  }
  const { rows } = await pool.query(
    `SELECT id, reading_date AS date, slot, value FROM readings
     WHERE ${where} ORDER BY reading_date DESC, ${SLOT_SORT}`,
    params
  );
  res.json({ readings: rows });
});

router.post('/', async (req, res) => {
  const check = validateReading(req.body);
  if (check.error) return res.status(400).json({ error: check.error });
  const { date, slot } = req.body;

  try {
    const limitError = await checkDayLimits(req.user.id, date, slot);
    if (limitError) return res.status(409).json({ error: limitError });

    const { rows } = await pool.query(
      `INSERT INTO readings (user_id, reading_date, slot, value) VALUES ($1, $2, $3, $4)
       RETURNING id, reading_date AS date, slot, value`,
      [req.user.id, date, slot, check.value]
    );
    res.status(201).json({ reading: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: duplicateMessage(slot) });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Reading not found.' });

  const check = validateReading(req.body);
  if (check.error) return res.status(400).json({ error: check.error });
  const { date, slot } = req.body;

  try {
    const existing = await pool.query('SELECT id FROM readings WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (existing.rowCount === 0) return res.status(404).json({ error: 'Reading not found.' });

    const limitError = await checkDayLimits(req.user.id, date, slot, id);
    if (limitError) return res.status(409).json({ error: limitError });

    const { rows } = await pool.query(
      `UPDATE readings SET reading_date = $1, slot = $2, value = $3
       WHERE id = $4 AND user_id = $5
       RETURNING id, reading_date AS date, slot, value`,
      [date, slot, check.value, id, req.user.id]
    );
    res.json({ reading: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: duplicateMessage(slot) });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Reading not found.' });

  const result = await pool.query('DELETE FROM readings WHERE id = $1 AND user_id = $2', [id, req.user.id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Reading not found.' });
  res.json({ message: 'Reading deleted.' });
});

module.exports = router;
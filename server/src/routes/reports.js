const express = require('express');
const pool = require('../db');
const requireAuth = require('../middleware/requireAuth');
const { getRange } = require('../utils/dateRange');
const { isRealDate, todayInIndia } = require('../validation/reading');

const router = express.Router();
router.use(requireAuth);

router.get('/:type', async (req, res) => {
  const type = req.params.type;
  const date = req.query.date || todayInIndia();

  if (!isRealDate(date)) {
    return res.status(400).json({ error: 'Please choose a valid date.' });
  }
  const range = getRange(type, date);
  if (!range) {
    return res.status(404).json({ error: 'Unknown report type.' });
  }

  try {
    const summary = await pool.query(
      `SELECT COUNT(*)::int AS count,
              MAX(value) AS highest,
              MIN(value) AS lowest,
              ROUND(AVG(value)::numeric, 1) AS average
       FROM readings
       WHERE user_id = $1 AND reading_date BETWEEN $2 AND $3`,
      [req.user.id, range.from, range.to]
    );

    const row = summary.rows[0];
    const report = {
      type,
      from: range.from,
      to: range.to,
      count: row.count,
      highest: row.count ? row.highest : null,
      lowest: row.count ? row.lowest : null,
      average: row.count ? Number(row.average) : null,
    };

    if (type === 'daily') {
      const list = await pool.query(
        `SELECT id, slot, value FROM readings
         WHERE user_id = $1 AND reading_date = $2
         ORDER BY CASE slot
           WHEN 'morning_fasting' THEN 1 WHEN 'after_breakfast' THEN 2
           WHEN 'after_lunch' THEN 3 WHEN 'after_dinner' THEN 4 END`,
        [req.user.id, date]
      );
      report.readings = list.rows;
    }

    res.json({ report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
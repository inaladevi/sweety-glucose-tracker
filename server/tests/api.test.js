const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

beforeAll(() => {
    if (!process.env.DATABASE_URL.includes('test')) {
    throw new Error('Tests must run against a test database');
  }
});

beforeEach(async () => {
  await pool.query('TRUNCATE users, readings RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await pool.end();
});

async function signup(email) {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ name: 'Test', email, password: 'password123' });
  return res.body.token;
}

const auth = (token) => ({ Authorization: `Bearer ${token}` });

function addReading(token, slot, value, date = '2026-11-01') {
  return request(app).post('/api/readings').set(auth(token)).send({ date, slot, value });
}

test('requests without a token are rejected', async () => {
  const res = await request(app).get('/api/readings');
  expect(res.status).toBe(401);
});

test('a second reading for the same slot and date is rejected', async () => {
  const token = await signup('a@example.com');
  expect((await addReading(token, 'after_lunch', 140)).status).toBe(201);

  const res = await addReading(token, 'after_lunch', 150);
  expect(res.status).toBe(409);
  expect(res.body.error).toBe('You already have an After lunch reading for this date.');
});

test('a fifth reading on one day is rejected', async () => {
  const token = await signup('a@example.com');
  for (const slot of ['morning_fasting', 'after_breakfast', 'after_lunch', 'after_dinner']) {
    expect((await addReading(token, slot, 120)).status).toBe(201);
  }
  const res = await addReading(token, 'after_lunch', 130);
  expect(res.status).toBe(409);
  expect(res.body.error).toBe('You can add only 4 readings per day.');
});

test('a future date is rejected', async () => {
  const token = await signup('a@example.com');
  const res = await addReading(token, 'after_lunch', 120, '2999-01-01');
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('Date cannot be in the future.');
});

test('users cannot see or delete each other\'s readings', async () => {
  const tokenA = await signup('a@example.com');
  const tokenB = await signup('b@example.com');
  const created = await addReading(tokenA, 'after_lunch', 140);
  const id = created.body.reading.id;

  const listB = await request(app).get('/api/readings').set(auth(tokenB));
  expect(listB.body.readings).toEqual([]);

  const deleteB = await request(app).delete(`/api/readings/${id}`).set(auth(tokenB));
  expect(deleteB.status).toBe(404);

  const listA = await request(app).get('/api/readings').set(auth(tokenA));
  expect(listA.body.readings).toHaveLength(1);
});

test('the daily report calculates highest, lowest, average and count', async () => {
  const token = await signup('a@example.com');
  await addReading(token, 'morning_fasting', 100);
  await addReading(token, 'after_breakfast', 151);
  await addReading(token, 'after_lunch', 125);

  const res = await request(app)
    .get('/api/reports/daily?date=2026-11-01')
    .set(auth(token));

  expect(res.body.report).toMatchObject({ count: 3, highest: 151, lowest: 100, average: 125.3 });
  expect(res.body.report.readings).toHaveLength(3);
});

test('a day with no readings gives an empty report', async () => {
  const token = await signup('a@example.com');
  const res = await request(app).get('/api/reports/daily?date=2026-11-01').set(auth(token));
  expect(res.body.report).toMatchObject({ count: 0, highest: null, lowest: null, average: null });
});
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgres://localhost:5432/sweety_test';
process.env.JWT_SECRET = 'test-secret';
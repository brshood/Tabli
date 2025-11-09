// Ensure required environment variables exist for tests
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tabli_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
process.env.ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'test-admin';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'test-password';



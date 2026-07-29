export function configureBackendTestEnv() {
  process.env.NODE_ENV = "test";
  process.env.MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/ai-bos-test";
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "test-access-secret-with-32-characters";
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret-with-32-characters";
  process.env.JWT_ISSUER = process.env.JWT_ISSUER ?? "ai-bos-api-test";
  process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE ?? "ai-bos-test-clients";
}

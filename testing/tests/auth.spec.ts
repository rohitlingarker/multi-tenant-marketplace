import { test, expect } from './fixtures';
import { USERS, TENANTS, TEST_PASSWORD, ERROR_CODES } from './seed-data';

// POST /auth/login (CLAUDE.md section 5). Not one of the 8 release
// acceptance criteria, but it's a real contract endpoint devs will build —
// every other test bypasses it via X-User-Id, so this is the only coverage
// it gets.
//
// Response shape verified live against backend/app/main.py's
// domain_error_handler: success returns the resource directly (no
// success/data envelope), errors are `{ error: { code, message } }`.

test.describe('Login', () => {
  test('valid credentials return the user id, role and association', async ({ apiRequest }) => {
    const { status, body } = await apiRequest('/auth/login', {
      method: 'POST',
      body: { username: USERS.vendorB, password: TEST_PASSWORD },
      tenantId: TENANTS.sunrise,
    });

    expect(status).toBe(200);
    expect(body.id).toBe(USERS.vendorB);
    expect(body.role).toBe('VENDOR');
    expect(body.vendorId).toBeTruthy();
    expect(body.passwordHash).toBeUndefined();
  });

  test('wrong password is rejected with INVALID_CREDENTIALS', async ({ apiRequest }) => {
    const { status, body } = await apiRequest('/auth/login', {
      method: 'POST',
      body: { username: USERS.vendorB, password: 'definitely-wrong' },
      tenantId: TENANTS.sunrise,
    });

    expect(status).toBe(401);
    expect(body.error?.code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
  });

  test('unknown username returns the same error as a wrong password', async ({ apiRequest }) => {
    const unknown = await apiRequest('/auth/login', {
      method: 'POST',
      body: { username: 'does-not-exist', password: TEST_PASSWORD },
      tenantId: TENANTS.sunrise,
    });
    const wrongPassword = await apiRequest('/auth/login', {
      method: 'POST',
      body: { username: USERS.vendorB, password: 'definitely-wrong' },
      tenantId: TENANTS.sunrise,
    });

    expect(unknown.status).toBe(401);
    // Same error code/message shape — must not leak whether the username exists.
    expect(unknown.body.error?.code).toBe(wrongPassword.body.error?.code);
    expect(unknown.body.error?.message).toBe(wrongPassword.body.error?.message);
  });

  test('passwordHash is never present in the response', async ({ apiRequest }) => {
    const { body } = await apiRequest('/auth/login', {
      method: 'POST',
      body: { username: USERS.vendorB, password: TEST_PASSWORD },
      tenantId: TENANTS.sunrise,
    });

    expect(JSON.stringify(body)).not.toContain('passwordHash');
  });
});

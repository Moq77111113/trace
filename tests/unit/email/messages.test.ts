import { describe, it, expect } from 'vitest';
import { resetPasswordEmail, oidcOnlyNudgeEmail } from '$lib/server/email/messages';

describe('resetPasswordEmail', () => {
  it('includes the URL and user display name', () => {
    const mail = resetPasswordEmail({
      to: 'alice@example.com',
      name: 'Alice',
      url: 'https://trace.example.com/reset-password?token=abc',
    });
    expect(mail.to).toBe('alice@example.com');
    expect(mail.subject.length).toBeGreaterThan(0);
    expect(mail.html).toContain('https://trace.example.com/reset-password?token=abc');
    expect(mail.text).toContain('https://trace.example.com/reset-password?token=abc');
    expect(mail.html).toContain('Alice');
  });
});

describe('oidcOnlyNudgeEmail', () => {
  it('mentions the provider and contains NO reset URL', () => {
    const mail = oidcOnlyNudgeEmail({
      to: 'bob@example.com',
      name: 'Bob',
      provider: 'Keycloak',
    });
    expect(mail.subject).toMatch(/Keycloak/);
    expect(mail.html).toContain('Keycloak');
    expect(mail.html).not.toMatch(/reset-password|token=/);
    expect(mail.text).not.toMatch(/reset-password|token=/);
  });
});

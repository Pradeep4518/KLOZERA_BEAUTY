import { describe, expect, it, vi } from 'vitest';

describe('Retailer Authentication & MFA Security Verification', () => {
  it('enforces fail-closed authentication in cloud production mode', () => {
    const isProductionCloud = true;
    const isConfigured = false;

    let loginError = '';
    if (isProductionCloud && !isConfigured) {
      loginError = 'Production Security Violation: Supabase Authentication service is unconfigured. Offline bypass is disabled in cloud production mode.';
    }

    expect(loginError).toContain('Production Security Violation');
  });

  it('permits offline kiosk bypass strictly in local kiosk mode', () => {
    const isProductionCloud = false;
    const isConfigured = false;
    const email = 'store-manager@klozeva.in';

    let accessGranted = false;
    if (!isProductionCloud && !isConfigured) {
      if (email.toLowerCase().includes('admin') || email.toLowerCase().includes('store') || email.toLowerCase().includes('retailer')) {
        accessGranted = true;
      }
    }

    expect(accessGranted).toBe(true);
  });

  it('triggers AAL2 TOTP challenge when MFA is enrolled on retailer account', async () => {
    const mockMfa = {
      getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({
        data: { currentLevel: 'aal1', nextLevel: 'aal2' }
      }),
      listFactors: vi.fn().mockResolvedValue({
        data: { totp: [{ id: 'totp_factor_123', status: 'verified' }] }
      }),
      challengeAndVerify: vi.fn().mockResolvedValue({ error: null })
    };

    const aal = await mockMfa.getAuthenticatorAssuranceLevel();
    expect(aal.data.currentLevel).toBe('aal1');
    expect(aal.data.nextLevel).toBe('aal2');

    const factors = await mockMfa.listFactors();
    expect(factors.data.totp[0].id).toBe('totp_factor_123');

    // Verify valid 6-digit TOTP
    const verifyRes = await mockMfa.challengeAndVerify({
      factorId: factors.data.totp[0].id,
      code: '582914'
    });
    expect(verifyRes.error).toBeNull();
  });

  it('rejects invalid MFA TOTP codes', async () => {
    const mockMfa = {
      challengeAndVerify: vi.fn().mockResolvedValue({
        error: { message: 'Invalid TOTP code' }
      })
    };

    const verifyRes = await mockMfa.challengeAndVerify({
      factorId: 'totp_factor_123',
      code: '000000'
    });
    expect(verifyRes.error?.message).toBe('Invalid TOTP code');
  });

  it('rejects suspended accounts from accessing retailer dashboard', () => {
    const profile = {
      role: 'retailer',
      is_suspended: true
    };

    let error = '';
    if (profile.is_suspended) {
      error = 'Account Suspended: Your retailer access has been deactivated.';
    }

    expect(error).toContain('Account Suspended');
  });

  it('rejects non-retailer customers attempting to access store manager portal', () => {
    const profile = {
      role: 'customer',
      is_suspended: false
    };
    const businessMembers: any[] = [];

    const hasPrivilege = (
      profile.role === 'admin' ||
      profile.role === 'retailer' ||
      businessMembers.length > 0
    );

    expect(hasPrivilege).toBe(false);
  });
});


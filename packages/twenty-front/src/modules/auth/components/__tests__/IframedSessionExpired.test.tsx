import { render, screen, waitFor } from '@testing-library/react';

import { IframedSessionExpired } from '@/auth/components/IframedSessionExpired';

jest.mock('@/domain-manager/utils/iosEmbedHost', () => ({
  getIosEmbedHostOrigin: () => 'https://ios.neeyafit.com',
}));

describe('IframedSessionExpired', () => {
  it('notifies only the exact IOS host origin', async () => {
    const postMessage = jest
      .spyOn(window.parent, 'postMessage')
      .mockImplementation();

    render(<IframedSessionExpired />);

    expect(
      screen.getByText('Session expired. Reopen CRM from Intelligence OS.'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(postMessage).toHaveBeenCalledWith(
        { source: 'twenty-iframe', type: 'session-expired' },
        'https://ios.neeyafit.com',
      );
    });
  });
});

import { styled } from '@linaria/react';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { useEffect } from 'react';

import { getIosEmbedHostOrigin } from '@/domain-manager/utils/iosEmbedHost';

const StyledRoot = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.primary};
  color: ${themeCssVariables.font.color.tertiary};
  display: flex;
  font-family: ${themeCssVariables.font.family};
  font-size: ${themeCssVariables.font.size.md};
  height: 100dvh;
  justify-content: center;
  margin: 0;
  padding: ${themeCssVariables.spacing[4]};
  text-align: center;
  width: 100%;
`;

export const IframedSessionExpired = () => {
  useEffect(() => {
    const hostOrigin = getIosEmbedHostOrigin();

    if (hostOrigin === null) {
      return;
    }

    window.parent.postMessage(
      { source: 'twenty-iframe', type: 'session-expired' },
      hostOrigin,
    );
  }, []);

  return (
    <StyledRoot data-testid="iframed-session-expired">
      Session expired. Reopen CRM from Intelligence OS.
    </StyledRoot>
  );
};

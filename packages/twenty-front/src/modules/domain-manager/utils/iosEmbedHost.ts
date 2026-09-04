export const IOS_HOST_ORIGINS = [
  'https://ios.neeyafit.com',
  'http://localhost:3001',
] as const;

export const getIosEmbedHostOrigin = (
  referrer = document.referrer,
): (typeof IOS_HOST_ORIGINS)[number] | null => {
  try {
    const origin = new URL(referrer).origin;

    return (
      IOS_HOST_ORIGINS.find((allowedOrigin) => allowedOrigin === origin) ?? null
    );
  } catch {
    return null;
  }
};

export const isHostedInIosEmbed = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.self !== window.top && getIosEmbedHostOrigin() !== null;
  } catch {
    return getIosEmbedHostOrigin() !== null;
  }
};

export const isAllowedIosHostMessage = (
  event: Pick<MessageEvent, 'origin' | 'source'>,
  parentWindow: Window,
): boolean =>
  IOS_HOST_ORIGINS.some((allowedOrigin) => event.origin === allowedOrigin) &&
  event.source === parentWindow;

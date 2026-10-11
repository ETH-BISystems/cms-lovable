export type Environment = 'development' | 'qa' | 'production';

export function getEnvironment(): Environment {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'development';
  if (hostname.includes('elite-travel-hackers.web.app')) return 'qa';
  return 'production';
}

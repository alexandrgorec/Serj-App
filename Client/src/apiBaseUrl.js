export function getApiBaseUrl() {
  const envUrl = process.env.REACT_APP_API_URL;
  if (envUrl && envUrl.trim() !== '') return envUrl.trim().replace(/\/$/, '');

  const { protocol, hostname, port, origin } = window.location;
  const isLocalDevHost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocalDevHost && port === '3000') {
    return `${protocol}//${hostname}:3001`;
  }

  return origin;
}

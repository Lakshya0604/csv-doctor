export const API = import.meta.env.VITE_API_URL || 'https://csv-doctor-api.onrender.com';
const KEY = 'csvdoctor.token';
export const getToken = () => localStorage.getItem(KEY);
export const setToken = t => t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY);
export async function api(path, {method = 'GET', body} = {}) {
  const headers = {}; const t = getToken();
  if (t) headers.authorization = `Bearer ${t}`;
  if (body) headers['content-type'] = 'application/json';
  let res;
  try { res = await fetch(`${API}${path}`, {method, headers, body: body ? JSON.stringify(body) : undefined}); }
  catch { throw new Error('Cannot reach the server. It may be waking up; try again in a minute.'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || 'Request failed'); e.status = res.status; throw e; }
  return data;
}

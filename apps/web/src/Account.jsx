import React, {useEffect, useState} from 'react';
import {api, getToken, setToken} from './api.js';
function save(text, name, type) {const url = URL.createObjectURL(new Blob([text], {type})); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);}
export function useAccount() {
  const [email, setEmail] = useState(null), [ready, setReady] = useState(!getToken());
  useEffect(() => { if (!getToken()) return; api('/api/auth/me').then(d => setEmail(d.email)).catch(() => setToken(null)).finally(() => setReady(true)); }, []);
  return {email, ready, set: (t, e) => {setToken(t); setEmail(e);}, out: () => {setToken(null); setEmail(null);}};
}
export function AuthCard({account}) {
  const [mode, setMode] = useState('login'), [f, setF] = useState({email: '', password: ''}), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  async function submit(e) {e.preventDefault(); setBusy(true); setErr(''); try {const d = await api(`/api/auth/${mode}`, {method: 'POST', body: f}); account.set(d.token, d.email);} catch (x) {setErr(x.message);} finally {setBusy(false);}}
  return <section className="import-card auth" id="account"><div><h2>{mode === 'login' ? 'Sign in to save runs' : 'Create your account'}</h2><p>Cleaning always runs in your browser. An account lets you save finished runs and download them later.</p></div>
    <form onSubmit={submit} className="auth-form"><label>Email<input type="email" required autoComplete="email" placeholder="you@example.com" value={f.email} onChange={e => setF({...f, email: e.target.value})}/></label><label>Password<input type="password" required minLength="8" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="8+ characters" value={f.password} onChange={e => setF({...f, password: e.target.value})}/></label><button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button><button type="button" className="link" onClick={() => {setMode(mode === 'login' ? 'signup' : 'login'); setErr('');}}>{mode === 'login' ? 'New here? Create an account' : 'Have an account? Sign in'}</button></form>
    {err && <div role="alert" className="error">{err}</div>}</section>;
}
export function History({account, refresh}) {
  const [runs, setRuns] = useState(null), [err, setErr] = useState('');
  const load = () => api('/api/runs').then(d => setRuns(d.runs)).catch(e => setErr(e.message));
  useEffect(() => {load();}, [refresh]);
  async function dl(id, kind) {try {const {run} = await api(`/api/runs/${id}`); kind === 'csv' ? save(run.csv, `${run.name}-cleaned.csv`, 'text/csv;charset=utf-8') : save(JSON.stringify({file: run.name, delimiter: run.delimiter, options: run.options, inputRows: run.inputRows, outputRows: run.outputRows, changes: run.log, changeCount: run.changeCount}, null, 2), `${run.name}-changes.json`, 'application/json');} catch (x) {setErr(x.message);}}
  async function del(id) {if (!confirm('Delete this saved run?')) return; try {await api(`/api/runs/${id}`, {method: 'DELETE'}); load();} catch (x) {setErr(x.message);}}
  async function delAccount() {if (!confirm('Delete your account and all saved runs?')) return; try {await api('/api/account', {method: 'DELETE'}); account.out();} catch (x) {setErr(x.message);}}
  return <section className="import-card history"><div><h2>Saved runs</h2><p>Signed in as <b>{account.email}</b></p><div className="acct-actions"><button type="button" className="primary" onClick={account.out}>Sign out</button><button type="button" className="danger" onClick={delAccount}>Delete account</button></div></div>
    {err && <div role="alert" className="error">{err}</div>}
    {runs === null ? <p>Loading…</p> : !runs.length ? <p>No saved runs yet. Clean a CSV, review it, then choose "Save to my history".</p> : <ul className="runs">{runs.map(r => <li key={r._id}><b>{r.name}</b> <span>{new Date(r.createdAt).toLocaleString()} · {r.inputRows} → {r.outputRows} rows · {r.changeCount} changes</span> <button type="button" onClick={() => dl(r._id, 'csv')}>↓ CSV</button> <button type="button" onClick={() => dl(r._id, 'log')}>↓ Log</button> <button type="button" onClick={() => del(r._id)}>Delete</button></li>)}</ul>}</section>;
}

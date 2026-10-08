import React, {useEffect, useState} from 'react';
import {api, getToken, setToken} from './api.js';
function save(text, name, type) {const url = URL.createObjectURL(new Blob([text], {type})); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);}
export function useAccount() {
  const [email, setEmail] = useState(null), [ready, setReady] = useState(!getToken());
  useEffect(() => { if (!getToken()) return; api('/api/auth/me').then(d => setEmail(d.email)).catch(() => setToken(null)).finally(() => setReady(true)); }, []);
  return {email, ready, set: (t, e) => {setToken(t); setEmail(e);}, out: () => {setToken(null); setEmail(null);}};
}
export const go = h => {window.location.hash = h;};
export function AppHeader({account, route}) {
  const nav = (h, label) => <a href={h} className={route === h ? 'tab on' : 'tab'}>{label}</a>;
  return <header><a className="brand" href="#/"><span className="logo">✳</span> CSV Doctor <span className="beta">LOCAL FIRST</span></a>
    {account.email && <nav className="appnav" aria-label="Main">{nav('#/', 'Clean')}{nav('#/history', 'History')}</nav>}
    <span className="hdr-auth"><ThemeToggle/>{account.email ? <><span className="who">{account.email}</span><button type="button" onClick={account.out}>Sign out</button></> : <a className="btn-link" href="#/login">Sign in</a>}</span></header>;
}
export function AuthPage({account, mode, token}) {
  const [f, setF] = useState({email: '', password: ''}), [err, setErr] = useState(''), [info, setInfo] = useState(''), [busy, setBusy] = useState(false);
  const titles = {login: ['Welcome back', 'Sign in to open your saved runs.'], signup: ['Create your account', 'Save every cleaned file and download it again anytime.'], forgot: ['Forgot your password?', 'Enter your email and we will send a reset link.'], reset: ['Choose a new password', 'Use 8 or more characters.']};
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr(''); setInfo('');
    try {
      if (mode === 'forgot') {await api('/api/auth/forgot', {method: 'POST', body: {email: f.email}}); setInfo('If that email has an account, a reset link is on its way. Check your inbox and spam folder.');}
      else if (mode === 'reset') {const d = await api('/api/auth/reset', {method: 'POST', body: {token, password: f.password}}); account.set(d.token, d.email); go('#/');}
      else {const d = await api(`/api/auth/${mode}`, {method: 'POST', body: f}); account.set(d.token, d.email); go('#/');}
    } catch (x) {setErr(x.message);} finally {setBusy(false);}
  }
  const cta = {login: 'Sign in', signup: 'Create account', forgot: 'Send reset link', reset: 'Save new password'}[mode];
  return <main className="authpage"><section className="auth-hero"><div className="eyebrow">CSV DOCTOR</div><h1>Every messy export,<br/><span>cleaned and kept.</span></h1><p>Clean in your browser. Save the result. Come back and re-download it whenever you need.</p>
    <svg className="ecg" viewBox="0 0 600 80" aria-hidden="true" preserveAspectRatio="none"><path d="M0 40 H170 L195 40 L215 8 L245 72 L270 40 H360 L380 40 L398 22 L418 58 L436 40 H600"/></svg></section>
    <section className="auth-panel"><h2>{titles[mode][0]}</h2><p className="sub">{titles[mode][1]}</p>
      <form onSubmit={submit} className="auth-form">
        {mode !== 'reset' && <label>Email<input type="email" required autoComplete="email" placeholder="you@example.com" value={f.email} onChange={e => setF({...f, email: e.target.value})}/></label>}
        {mode !== 'forgot' && <label>{mode === 'reset' ? 'New password' : 'Password'}<input type="password" required minLength="8" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="8+ characters" value={f.password} onChange={e => setF({...f, password: e.target.value})}/></label>}
        <button className="primary" disabled={busy}>{busy ? 'Please wait…' : cta}</button>
        {err && <div role="alert" className="error">{err}</div>}{info && <div role="status" className="okmsg">{info}</div>}
        {mode === 'login' && <a className="link" href="#/forgot">Forgot password?</a>}
        {mode === 'login' && <a className="link" href="#/signup">New here? Create an account</a>}
        {mode === 'signup' && <a className="link" href="#/login">Have an account? Sign in</a>}
        {(mode === 'forgot' || mode === 'reset') && <a className="link" href="#/login">Back to sign in</a>}
      </form>
      {(mode === 'login' || mode === 'signup') && <button type="button" className="guest" onClick={() => {sessionStorage.setItem('csvd-guest', '1'); go('#/');}}>Continue without an account</button>}
    </section></main>;
}
export function HistoryPage({account, refresh}) {
  const [runs, setRuns] = useState(null), [err, setErr] = useState('');
  const load = () => api('/api/runs').then(d => setRuns(d.runs)).catch(e => setErr(e.message));
  useEffect(() => {load();}, [refresh]);
  async function dl(id, kind) {try {const {run} = await api(`/api/runs/${id}`); kind === 'csv' ? save(run.csv, `${run.name}-cleaned.csv`, 'text/csv;charset=utf-8') : save(JSON.stringify({file: run.name, delimiter: run.delimiter, options: run.options, inputRows: run.inputRows, outputRows: run.outputRows, changes: run.log, changeCount: run.changeCount}, null, 2), `${run.name}-changes.json`, 'application/json');} catch (x) {setErr(x.message);}}
  async function del(id) {if (!confirm('Delete this saved run?')) return; try {await api(`/api/runs/${id}`, {method: 'DELETE'}); load();} catch (x) {setErr(x.message);}}
  async function delAccount() {if (!confirm('Delete your account and all saved runs?')) return; try {await api('/api/account', {method: 'DELETE'}); account.out();} catch (x) {setErr(x.message);}}
  return <main className="historypage"><div className="eyebrow">YOUR HISTORY</div><h1>Files you have cleaned</h1><p className="sub">Every run you saved. Re-download the cleaned CSV or the change log anytime.</p>
    {err && <div role="alert" className="error">{err}</div>}
    {runs === null ? <p>Loading…</p> : !runs.length ? <div className="empty-hist"><p>Nothing saved yet.</p><a className="btn-link" href="#/">Clean a CSV</a></div> : <ul className="runcards">{runs.map(r => <li key={r._id}><div><b>{r.name}</b><span>{new Date(r.createdAt).toLocaleString()} · {r.inputRows} → {r.outputRows} rows · {r.changeCount} changes</span></div><div className="run-actions"><button type="button" className="primary" onClick={() => dl(r._id, 'csv')}>↓ Cleaned CSV</button><button type="button" onClick={() => dl(r._id, 'log')}>↓ Change log</button><button type="button" className="danger" onClick={() => del(r._id)}>Delete</button></div></li>)}</ul>}
    <div className="acct-actions"><button type="button" onClick={account.out}>Sign out</button><button type="button" className="danger" onClick={delAccount}>Delete account</button></div></main>;
}
export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  useEffect(() => {document.documentElement.dataset.theme = dark ? 'dark' : 'light'; try {localStorage.setItem('csvd-theme', dark ? 'dark' : 'light');} catch { /* storage blocked */ }}, [dark]);
  return <button type="button" className="theme-toggle" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} aria-pressed={dark} onClick={() => setDark(!dark)}>{dark ? '☀' : '☾'}</button>;
}

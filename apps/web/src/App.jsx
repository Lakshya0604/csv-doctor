import React, {useEffect, useState} from 'react';
import Cleaner from './Cleaner.jsx';
import {useAccount, AppHeader, AuthPage, HistoryPage, go} from './Account.jsx';
const useHash = () => {const [h, setH] = useState(window.location.hash || '#/'); useEffect(() => {const f = () => setH(window.location.hash || '#/'); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f);}, []); return h;};
export default function App() {
  const account = useAccount(), hash = useHash(), [refresh, setRefresh] = useState(0);
  const authMode = hash === '#/login' ? 'login' : hash === '#/signup' ? 'signup' : hash === '#/forgot' ? 'forgot' : hash.startsWith('#/reset/') ? 'reset' : null;
  const guest = sessionStorage.getItem('csvd-guest') === '1';
  const signedIn = !!account.email;
  const target = !account.ready ? null : signedIn && authMode && authMode !== 'reset' ? '#/' : !signedIn && hash === '#/history' ? '#/login' : !signedIn && !authMode && !guest && hash === '#/' ? '#/login' : null;
  useEffect(() => {if (target) go(target);}, [target]);
  const prev = React.useRef(signedIn);
  useEffect(() => {if (prev.current && !signedIn) {sessionStorage.removeItem('csvd-guest'); go('#/login');} prev.current = signedIn;}, [signedIn]);
  const route = authMode ? hash : hash === '#/history' ? '#/history' : '#/';
  return <div className="shell"><div className="aurora" aria-hidden="true"><i/><i/><i/></div><AppHeader account={account} route={route}/>
    {!account.ready ? <main className="loading"><p>Loading…</p></main> : authMode && !(signedIn && authMode !== 'reset') ? <AuthPage key={authMode} account={account} mode={authMode} token={hash.slice(8)}/> : signedIn && hash === '#/history' ? <HistoryPage account={account} refresh={refresh}/> : <div hidden={!!target}><Cleaner account={account} setRefresh={setRefresh}/></div>}
  </div>;
}

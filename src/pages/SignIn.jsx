import React, { useState } from 'react';
import * as api from '../api.js';
import { go } from '../router.js';
import { Notice } from '../components.jsx';
import { SleeveHead, SleeveFoot } from '../poster/Sleeve.jsx';

// Test variant: one-click demo accounts instead of passwords.
// The real build should swap this for Replit Auth (or similar) — see README "From test variant to MVP".
export default function SignInPage({ next }) {
  const [err, setErr] = useState('');
  const users = api.demoUsers();
  const pick = (u) => {
    try {
      api.signIn(u.id);
      go(next || (u.role === 'admin' ? '/admin' : u.role === 'store' ? '/portal' : '/'));
    } catch (e) { setErr(e.message); }
  };
  const describe = { admin: 'Review reports, hide listings, disable accounts, see pilot metrics', store: 'Manage only this store’s profile and listings', collector: 'Signed-in collector (no store access) — search works without signing in' };
  const ink = { admin: '#ff5fa6', store: '#ff7a3d', collector: '#7d97ff' };
  return (
    <section className="sleeve-back portal portal-small signin">
      <SleeveHead cat="Sign in · demo accounts" />
      <h1 className="sb-title">Sign in</h1>
      <p className="sb-meta">Test run: pick a demo account to try each role — no passwords. Collectors don’t need an account to search.</p>
      {err && <Notice kind="error">{err}</Notice>}
      <ol className="sb-tracks">
        {users.map((u, i) => (
          <li key={u.id} className="sb-track no-code">
            <button type="button" className="sb-row signin-row" onClick={() => pick(u)} disabled={u.disabled}>
              <span className="sb-code" style={{ '--side': ink[u.role] }}>{u.role}</span>
              <span className="sb-name">{u.name}</span>
              <span className="sb-leader" aria-hidden="true" />
              <span className="sb-time">{u.disabled ? 'disabled' : 'sign in →'}</span>
            </button>
            <div className="sb-sub"><span>{u.disabled ? 'Disabled by admin' : describe[u.role]}</span></div>
          </li>
        ))}
      </ol>
      <SleeveFoot>The real build would use a proper sign-in provider — see the README.</SleeveFoot>
    </section>
  );
}

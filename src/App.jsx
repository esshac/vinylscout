import React, { useEffect, useReducer, useState } from 'react';
import * as api from './api.js';
import { SearchPage, ListingPage, StoresPage, StorePage, ReleasePage } from './pages/Collector.jsx';
import StorePortal from './pages/StorePortal.jsx';
import AdminPage from './pages/Admin.jsx';
import SignInPage from './pages/SignIn.jsx';

// Tiny hash router: #/path?query
function parseHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, qs = ''] = raw.split('?');
  return { path, params: new URLSearchParams(qs) };
}
import { go } from './router.js';
import CityPicker from './CityPicker.jsx';

export default function App() {
  const [route, setRoute] = useState(parseHash());
  const [, rerender] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    const onHash = () => { setRoute(parseHash()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', onHash);
    const unsub = api.subscribe(rerender);
    return () => { window.removeEventListener('hashchange', onHash); unsub(); };
  }, []);

  // Scroll-reveal: anything with .reveal fades up when it enters the viewport.
  // A MutationObserver picks up sections that mount later (async data, tab switches).
  useEffect(() => {
    const show = (n) => n.classList.add('in');
    if (!('IntersectionObserver' in window)) { document.querySelectorAll('.reveal').forEach(show); return undefined; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
    }), { threshold: 0.05 });
    const scan = () => document.querySelectorAll('.reveal:not(.in)').forEach((n) => io.observe(n));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.getElementById('root'), { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, []);

  const user = api.currentUser();
  const { path, params } = route;
  const seg = path.split('/').filter(Boolean);

  let page;
  if (seg.length === 0) page = <SearchPage q={params.get('q') || ''} tab={params.get('tab') || 'vinyls'} />;
  else if (seg[0] === 'listing') page = <ListingPage id={seg[1]} />;
  else if (seg[0] === 'release') page = <ReleasePage id={seg[1]} storeId={params.get('store') || ''} />;
  else if (seg[0] === 'stores') page = <StoresPage />;
  else if (seg[0] === 'store') page = <StorePage id={seg[1]} />;
  else if (seg[0] === 'portal') page = <StorePortal user={user} />;
  else if (seg[0] === 'admin') page = <AdminPage user={user} />;
  else if (seg[0] === 'signin') page = <SignInPage next={params.get('next') || ''} />;
  else page = <div className="card"><h2>Page not found</h2><a href="#/">Back to search</a></div>;

  const active = (p) => (seg[0] || '') === p ? 'active' : '';

  return (
    <>
      <div className="ink-stripe top" aria-hidden="true"><i /><i /><i /><i /></div>
      <header className="site-header">
        <div className="wrap header-inner">
          <a href="#/" className="brand" aria-label="VinylScout home">
            <span className="disc" aria-hidden="true" />
            <span>Vinyl<b>Scout</b></span>
          </a>
          <CityPicker />
          {/* What to search (Vinyls / Stores) lives only in the toggle beside the search box. */}
          <nav className="nav" aria-label="Account">
            <a href="#/portal" className={active('portal')}>For stores</a>
            {user?.role === 'admin' && <a href="#/admin" className={active('admin')}>Admin</a>}
            {user ? (
              <>
                <span className={`role role-${user.role}`} title={user.name}>{user.role}</span>
                <button className="btn ghost sm" onClick={() => { api.signOut(); go('/'); }}>Sign out</button>
              </>
            ) : (
              <a className="btn ghost sm" href="#/signin">Sign in</a>
            )}
          </nav>
        </div>
      </header>
      <main key={seg[0] || 'home'} className="wrap main page-enter">{page}</main>
      <footer className="wrap footer">
        <p>
          VinylScout test variant · ENTI 333 Fall 2026 · Calgary pilot concept.
          Stores are real Calgary record shops from Google Maps; for this test run they are <b>assumed</b> to participate, and all availability, prices and dates are <b>simulated</b> — they have not joined VinylScout and this is not their real inventory.
          A listing never guarantees a record is still in stock — contact the store before making a trip. </p>
        <p>
          This application uses Discogs’ API but is not affiliated with, sponsored or endorsed by Discogs. ‘Discogs’ is a trademark of Zink Media, LLC.
        </p>
      </footer>
    </>
  );
}

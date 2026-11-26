// Seed data for the VinylScout TEST RUN.
//
// Stores: real Calgary record shops as listed on Google Maps (name, address, phone, neighbourhood),
// collected Nov 25, 2026. lat/lng are approximate (from the street address) and only drive the 3D city. For this test run we ASSUME they all participate — they have not actually
// joined VinylScout. Hours/websites are left blank rather than guessed.
//
// Inventory: not stored here. Every store is assumed to carry most of the Discogs vinyl catalogue,
// with availability, condition, price and "last confirmed" date SIMULATED in src/simulate.js.
// Store staff can still add real listings in the store portal; those override the simulation.

export const FEATURED_RELEASE_IDS = [
  8370787, 8359573, 409021, 3708190, 1813006, 266650, 9664187, 3975953, 16244176, 9216088, 10544976, 1514148,
];

// The project's example ad: Sloth Records is shown in the featured spot, clearly marked "Example".
// It is a demo placement only — Sloth Records has not bought an ad.
export const EXAMPLE_AD = { storeId: 's-sloth', tagline: 'Browse their crates on VinylScout', example: true };

export function buildSeed(now = Date.now()) {
  const users = [
    { id: 'u-admin', name: 'Avery (Admin)', email: 'admin@vinylscout.test', role: 'admin', disabled: false },
    { id: 'u-staff1', name: 'Demo staff · Hot Wax Records', email: 'staff1@vinylscout.test', role: 'store', disabled: false },
    { id: 'u-staff2', name: 'Demo staff · Recordland', email: 'staff2@vinylscout.test', role: 'store', disabled: false },
    { id: 'u-staff3', name: 'Demo staff · Sloth Records', email: 'staff3@vinylscout.test', role: 'store', disabled: false },
    { id: 'u-collector', name: 'Casey (Collector)', email: 'casey@collector.test', role: 'collector', disabled: false },
  ];

  const S = (id, name, neighbourhood, address, phone, ownerId = null, extra = {}) => ({
    id, ownerId, name, neighbourhood, address: `${address}, Calgary, AB`, phone,
    website: '', instagram: '', hours: '', blurb: '', status: 'active', source: 'Google Maps', ...extra,
  });

  const stores = [
    S('s-hotwax', 'Hot Wax Records', 'Kensington', '114 10 St NW', '(403) 283-0055', 'u-staff1', { lat: 51.053, lng: -114.088 }),
    S('s-recordland', 'Recordland', 'Inglewood', '1208 9 Ave SE', '(403) 262-3839', 'u-staff2', { lat: 51.0405, lng: -114.04 }),
    S('s-sloth', 'Sloth Records', 'Beltline', '736b 17 Ave SW', '(403) 265-6585', 'u-staff3', { lat: 51.0378, lng: -114.077 }),
    S('s-melodiya', 'Melodiya Records', '17 Ave SW', '2523 17 Ave SW', '(403) 246-8916', null, { lat: 51.038, lng: -114.117 }),
    S('s-blackbyrd', 'Blackbyrd Myoozik', 'Beltline', '1126 17 Ave SW', '(403) 367-7811', null, { lat: 51.0378, lng: -114.087 }),
    S('s-turnitup', 'Turn It Up! Records & Hi-Fi', 'Mount Pleasant', '418 16 Ave NW', '(403) 235-0858', null, { lat: 51.067, lng: -114.07 }),
    S('s-cdtrader', 'CD Trader', 'Brentwood', '3630 Brentwood Rd NW #306', '(403) 220-9470', null, { lat: 51.086, lng: -114.13 }),
    S('s-bowness', 'Bowness Records & Books', 'Bowness', '6326 Bowness Rd NW, Lower Floor', '(403) 288-4926', null, { lat: 51.089, lng: -114.19 }),
    S('s-heritage', 'Heritage Posters & Music', 'Beltline', '1316 11 Ave SW', '(403) 802-1846', null, { lat: 51.042, lng: -114.089 }),
    S('s-neontaste', 'Neon Taste', 'Downtown East Village', '111 3 Ave SE #111', '', null, { lat: 51.049, lng: -114.059 }),
    S('s-sunrise-dt', 'Sunrise Records (Downtown)', 'Downtown', '317 7 Ave SW', '(403) 313-3769', null, { lat: 51.0465, lng: -114.07 }),
    S('s-sunrise-mb', 'Sunrise Records (Marlborough)', 'Marlborough', '3800 Memorial Dr NE', '(403) 313-7808', null, { lat: 51.053, lng: -113.98 }),
  ];

  return {
    meta: { version: 3, seededAt: now, clockOffsetDays: 0, exampleAdSeeded: true },
    featured: { ...EXAMPLE_AD, since: now },
    users, stores,
    listings: [], // real, store-entered listings (override the simulation for that store + release)
    storeConfirmedAt: {}, // storeId -> timestamp of last "confirm all" (refreshes simulated stock too)
    reports: [],
    events: [],
  };
}

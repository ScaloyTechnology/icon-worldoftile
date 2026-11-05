# ICON virtual tour integration

The existing 360 showroom is mounted at `/360/main-lobby`. Every finished camera
position also has a direct URL, for example `/360/breccia-brown` and
`/360/breccia-brown-kitchen`. The public-site navigation links to the lobby.
Changing rooms updates the URL without resetting the WebGL viewer; browser
Back/Forward returns to the corresponding camera position.

The source project lives at `../360` during development. The Next.js site does
**not** need that sibling directory at build or runtime: the synced HTML, JS,
CSS and referenced 4K/8K panoramas and product images are committed under
`public/virtual-tour/`. `src/data/virtual-tour-rooms.json` supplies the allowed
URL slugs. Only assets referenced by the current tour are copied, not the large
original renders.

When the showroom source changes, run from this website repository:

```bash
npm run tour:sync
npm run tour:verify
```

An alternate source directory can be passed with
`node scripts/sync-virtual-tour.mjs /path/to/360`. Review and commit the synced
files along with site code. The normal DigitalOcean deployment of this Next.js
repository will then serve both the route and the static assets; no separate
web server or proxy rule is required. Do not run `tour:sync` during production
build, because the sibling source directory will not be present there.

The iframe loads Three.js from jsDelivr, as the standalone showroom already
does, so production visitors need access to that CDN. The iframe is same-origin
and the room-routing bridge accepts messages only from the local origin.

# Frontend Production Build

SillyBunny normally serves the plain ES modules and stylesheets from `public/`.
That keeps development readable and close to upstream SillyTavern. The optional
frontend production build creates minified, fingerprinted assets in
`dist/frontend/` for release testing and performance checks.

## Build

```sh
npm run build:frontend
```

The build writes `dist/frontend/asset-manifest.json` and hashed asset names for
styles, fonts, images, and vendor assets.

## Enable

In your generated root runtime config:

```yaml
performance:
  frontendBuild:
    enabled: true
```

Or use the environment override:

```sh
SILLYTAVERN_PERFORMANCE_FRONTENDBUILD_ENABLED=true npm run start:node
```

With Bun:

```sh
SILLYTAVERN_PERFORMANCE_FRONTENDBUILD_ENABLED=true bun run start
```

The server only switches to production frontend assets when the flag is enabled
and `dist/frontend/asset-manifest.json` exists. If either is missing, it falls
back to the normal `public/` files.

## Verify

Open the app and check the HTML for `/frontend-assets/` URLs:

```sh
curl http://127.0.0.1:4444/ | grep frontend-assets
```

Check cache headers on a hashed asset:

```sh
curl -I http://127.0.0.1:4444/frontend-assets/style-0123456789ab.css
```

Hashed files under `/frontend-assets/` should return long-lived immutable cache
headers. Unhashed fallback JavaScript modules, such as raw boot or dependency
modules served from their public paths, return `no-cache` so a fresh build can
safely update module graphs during testing.

## Measure

Run the mobile-oriented smoke measurement against a running server:

```sh
npm run perf:frontend
```

Use `SILLYBUNNY_PERF_URL` to point the script at a different port:

```sh
SILLYBUNNY_PERF_URL=http://127.0.0.1:4555 npm run perf:frontend
```

## Disable

Set `performance.frontendBuild.enabled` to `false` or remove the environment
override, then restart the server. No user data or extension data is migrated by
this mode.

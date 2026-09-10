# Public city preview with Tailscale Funnel

This workstation serves compiled preview files through Tailscale Funnel. Visitors need only a browser; the hosting workstation must be signed into Tailscale. The preview is public. No development-server or API proxy is forwarded.

## Refresh the published files

From the repository root:

```sh
npx vite build --config vite.public-preview.config.ts
node scripts/prepare-public-preview.mjs
```

The prepared directory is `.impeccable/review/city-public`. Its index opens seed 732 in full-city mode. It includes only the city diorama, city seed gallery, landing page and their bundled dependencies. Campaign API functions are unavailable.

## Start serving after host sign-in

```sh
sudo tailscale funnel --bg /home/brutus/Documents/ChatGPT/Ironfront/.impeccable/review/city-public
tailscale funnel status
```

If Tailscale prints a feature-enablement URL, complete that step in the host account and rerun the command. Use the HTTPS URL printed by the CLI. The background setting persists; the workstation must remain awake and online. Refresh the built files when source changes should become public.

## Stop public access

```sh
tailscale funnel --https=443 off
```

Tailscale is installed through Omarchy's package manager and `tailscaled` is enabled at boot. DNS acceptance is disabled for this host; no exit node or subnet routing is configured.

Reference: https://tailscale.com/docs/reference/tailscale-cli/funnel

Current URL: https://brutus.tail250251.ts.net/

The city seed gallery is at `/city-seeds.html`. The full-city example is `/city-diorama.html?seed=732&case=citywide`.

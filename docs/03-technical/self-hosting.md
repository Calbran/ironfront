# Self-hosting

## Local production build

Install Node.js 24.13+ or Node 25, then run npm install, npm run build, npm start. The process serves http://localhost:3000. PORT changes the listening port; HOST defaults to 127.0.0.1. DB_PATH defaults to data/warfare.sqlite. Keep the process running and the PC awake for campaign progression. Restart pauses time spent offline.

## Tailscale

After Tailscale is installed and authenticated on the host, `tailscale serve --bg 3000` makes the application available privately to the tailnet. For ordinary browser visitors outside it, `tailscale funnel --bg 3000` exposes the application publicly over HTTPS. Enable the corresponding tailnet policy/HTTPS requirements first. Use the production server, not Vite's development server.

Funnel has fixed bandwidth limits and uses a ts.net domain. See [Serve](https://tailscale.com/docs/features/tailscale-serve) and [Funnel](https://tailscale.com/kb/1223/funnel). Neither feature creates in-game accounts. Initial invite-only playtests are the intended exposure level.

## Containers

The included Dockerfile/compose.yaml package this SQLite proof with a persistent /data volume. `docker compose up --build -d` starts it on loopback port 3000. Docker configuration must be verified on the actual home PC; Docker was unavailable during development. PostgreSQL is not part of this proof's Compose file.

## Backups and access

Stop the application before copying the SQLite database and its WAL/SHM sidecars, or use SQLite's backup facilities. Preserve the data volume when rebuilding. Session keys are private credentials: do not share them; invite codes are what other players need. Losing a browser key loses proof access unless it was saved. Public-launch account management is future work.

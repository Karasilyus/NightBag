# NightBag

## Run the app with Docker

Install Docker Desktop, then run this command from the repository root:

```sh
docker compose -f backend/docker-compose.yml up --build
```

This starts the database, backend API, and Expo web frontend. The backend is
available at [http://localhost:8080](http://localhost:8080); the frontend opens
at [http://localhost:8081](http://localhost:8081) after the API is healthy.

To stop the services, press `Ctrl+C`, then run:

```sh
docker compose -f backend/docker-compose.yml down
```

## Deploy to a DuckDNS server

The Compose file above is for local development. For a public deployment, use
the production stack instead. It serves the Expo web export and API on the same
HTTPS DuckDNS hostname, keeps PostgreSQL private, and does not apply the
development seed/test-account migrations.

1. Point the DuckDNS hostname to the server's public IP. Allow inbound TCP
   ports 80 and 443 (and UDP 443 for HTTP/3) in both the server firewall and
   the hosting provider firewall. Do not expose PostgreSQL or port 8080.
2. Install Docker Engine and the Docker Compose plugin using the [official
   Docker instructions for Ubuntu](https://docs.docker.com/engine/install/ubuntu/).
   Clone this public repository on the server:

   ```sh
   git clone https://github.com/Karasilyus/NightBag.git
   cd NightBag/backend
   ```

3. Create a private production environment file and generate unique secrets on
   the server:

   ```sh
   cp .env.production.example .env.production
   openssl rand -hex 32
   openssl rand -hex 32
   chmod 600 .env.production
   ```

   Edit `.env.production`: set `DOMAIN` to the exact DuckDNS hostname and put
   the two generated values into `DB_PASSWORD` and `AUTH_SECRET`. Do not reuse
   either value or commit this file. `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` is
   optional; without it, the web map displays a missing-key message.
4. Start the production stack:

   ```sh
   docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
   docker compose --env-file .env.production -f docker-compose.prod.yml ps
   ```

   Caddy obtains and renews the HTTPS certificate automatically after the
   DuckDNS record resolves to the server and ports 80/443 are reachable.
   Open `https://<your-duckdns-hostname>` in a browser. The mobile app must be
   built with `EXPO_PUBLIC_API_URL=https://<your-duckdns-hostname>/api/v1`;
   the production web image is already built with that API URL.

   To update after pushing changes, run `git pull` in the repository and repeat
   the `docker compose ... up -d --build` command. Database data is stored in
   the `pgdata` Docker volume; back it up before replacing or removing volumes.

To start the frontend and its required backend services without the database
interface:

```sh
docker compose -f backend/docker-compose.yml up --build frontend
```

The Expo frontend is shared by mobile and web; web-only components are under
`frontend/src/components/web`. To export a static web build:

```sh
cd frontend
npm run web:build
```

The export is written to `frontend/web-build`. Set `EXPO_PUBLIC_API_URL` before
building when the API is not available at `http://localhost:8080/api/v1` (for
example, in PowerShell: `$env:EXPO_PUBLIC_API_URL = "https://api.example.com/api/v1"`).

The web map uses the Google Maps JavaScript API. Create `frontend/.env.local`
with `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your-key` to enable it locally. Enable the
Maps JavaScript API in Google Cloud and restrict the key to your development
and production website referrers. This key is included in the web bundle, so
never commit an unrestricted key or put a server-side key here.

## Frontend account and discovery behavior

Registration checks password strength locally with zxcvbn and checks for known
password leaks through the Have I Been Pwned Pwned Passwords range API. The
password itself and its full SHA-1 hash are not sent; only the first five
characters of the hash are used for the range request. Registration requires
this online check to complete. Password reset/change screens are preparatory
UI only until the backend provides verified reset and password-change flows.

The discovery distance control covers 2–50 km. The current nearby-listings API
caps radius at 50 km and returns at most 50 listings, so “Tümü” currently means
the widest supported search, not every listing globally.

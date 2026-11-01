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

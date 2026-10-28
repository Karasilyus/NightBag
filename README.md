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

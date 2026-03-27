# Running the Backend with Docker

To make it incredibly easy for anyone to run this backend project on their computer without needing to install MySQL or Redis themselves, we have provided a `docker-compose.yml` file.

Docker Compose will automatically set up:
1. The **Backend** server.
2. A **MySQL** database container.
3. A **Redis** cache container.

## Prerequisites

1. Ensure [Docker Desktop](https://www.docker.com/products/docker-desktop/) is installed and running on your machine.
2. You need a `.env` file in the root of the project with your required variables (e.g., Stripe keys, JWT secrets, etc.). The MySQL credentials (`DB_LOCAL_PASS`, `DB_LOCAL_NAME`) will be picked up from your `.env` so you don't have to redefine them.

## Setup & Run

Open your terminal in the `backend` folder and run:

```bash
docker compose up -d
```

That's it! 

- The **`-d`** flag runs the containers in detached mode (in the background).
- Docker Compose will automatically map `DB_LOCAL_HOST` to the `mysql_db` container and `REDIS_HOST` to the `redis_cache` container so that your server connects properly without pointing to `127.0.0.1` locally.

## Viewing Logs

If you want to view the logs for any issues or to see the server output, you can run:

```bash
docker compose logs -f backend
```

## Stopping the Containers

When you are done testing, you can stop and remove the containers by running:

```bash
docker compose down
```

## Useful Commands

- **Access the MySQL database directly via bash:**
  ```bash
  docker ps # get the container id
  docker exec -it <container-id-for-mysql> bash
  ```
- **Force rebuild your backend image:**
  If you changed the code in `server.js` or `package.json`, run:
  ```bash
  docker compose build backend --no-cache
  docker compose up -d
  ```

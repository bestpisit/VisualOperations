## Prerequisites
Before running the project, ensure you have the following installed:

- [Bun](https://bun.sh/)
- [PostgreSQL Server](https://www.postgresql.org/)
- [RabbitMQ](https://www.rabbitmq.com/)
- [Make](https://www.gnu.org/software/make/)

## Environment Setup

1. Copy the `.env` template:
   ```sh
   cp template.env .env
   ```
2. Open `.env` and update the following variables:
   ```env
   DATABASE_URL=postgres://username:password@localhost:5432/database
   RABBITMQ_URL=amqp://admin:admin@localhost:5672
   ```
   Replace `username`, `password`, and `database` with your actual PostgreSQL credentials.

## Quickstart Using Docker

Run the following commands to build and start the development environment:
```sh
make build-development
make start-development
```

## Development Setup

For local development without Docker:

1. Install dependencies:
   ```sh
   bun install
   ```
2. Start the development server:
   ```sh
   bun start
   ```

## Additional Commands

- Stop Docker containers:
  ```sh
  make stop-development
  ```
- Clean Docker resources:
  ```sh
  make clean-development
  ```

## Troubleshooting

- **Database Connection Issues**: Ensure PostgreSQL is running and the `DATABASE_URL` in `.env` is correctly set.
- **RabbitMQ Connection Issues**: Check if RabbitMQ is running and that `RABBITMQ_URL` is correct.
- **Bun Issues**: If `bun install` fails, try updating Bun using:
  ```sh
  bun upgrade
  ```

For any other issues, check the logs using:
```sh
docker-compose logs -f
```

---

**Happy Deploying! 🚀**
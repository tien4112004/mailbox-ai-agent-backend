# Student360 Backend

This is the backend for the Student360 application, a platform for students.

## Technologies Used

- [NestJS](https://nestjs.com/) - A progressive Node.js framework for building efficient, reliable and scalable server-side applications.
- [TypeORM](https://typeorm.io/) - A TypeScript ORM for Node.js.
- [PostgreSQL](https://www.postgresql.org/) - A powerful, open source object-relational database system.
- [Docker](https://www.docker.com/) - A platform for developing, shipping, and running applications in containers.
- [Swagger](https://swagger.io/) - A tool for designing, building, documenting, and consuming RESTful web services.

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Node.js](https://nodejs.org/en/)

### Development
1. Clone the repo
    ```sh
    https://github.com/htloc0610/TLL_backend
    ```

3. Create a `.env` file by copying the `.env.example` file:
    ```sh
    cp .env.example .env
    ```

4. Run the local database using Docker Compose:
    ```sh
    docker compose -f docker-compose.local.yml up -d
    ```

5. Install dependencies:
    ```sh
    npm install
    ```

6. Run database migrations:
    ```sh
    npm run migration:run
    ```

7. Seed the database with initial data:
    ```sh
    npm run migration:seed
    ```

8. Start the development server:
    ```sh
    npm run start:dev
    ```

9. Open your browser and navigate to `http://localhost:${PORT}` to access the application.

10. The API documentation will be available at `http://localhost:${PORT}/docs`.

**Note:** You must comment `@UseGuards(StackAuthGuard)` in `*.controller.ts` to test APIs in development mode.

### Production

1. Clone the repo
    ```sh
    git clone https://github.com/Student360-VN/backend.git
    ```

2. Create a `.env` file by copying the `.env.example` file:
    ```sh
    cp .env.example .env
    ```

3. Adjust any necessary environment variables in the `.env` file for production.

4. Build and run the application using Docker Compose:
    ```sh
    docker compose -f docker-compose.production.yml up -d --build
    ```

5. Run database migrations:
    ```sh
    npm install 
    npm run migration:run
    ```

6. The application will be accessible at `http://localhost:${PORT}`.
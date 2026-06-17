# Distributed URL Shortener

A high-performance, full-stack, distributed URL shortening service built with modern architecture. It leverages layered design patterns, in-memory caching for minimal latency, and robust request handling.

## Features

- **User Authentication**: Secure user registration and login utilizing `bcryptjs` password hashing and HttpOnly JWT cookies.
- **Robust URL Shortening**: High-entropy unique short code generation using `Sqids`.
- **Performance Caching**: Layered architecture utilizing Redis to cache active short codes and counter increments, minimizing heavy MongoDB indexing workloads.
- **Analytics & Tracking**: Records metrics including device breakdowns (via `ua-parser-js`), referrers, and daily click distributions.
- **Rate Limiting**: Built-in protection algorithms leveraging Redis to prevent DDoS and API abuse.
- **Interactive UX**: Built with React & TypeScript, rendering Recharts visualizations, interactive QR code creators, and responsive error notifications (`react-hot-toast`).
- **Containerized Environment**: Full multi-container setups leveraging Docker and Docker Compose.

---

## Tech Stack

### Frontend
- React 19 (TypeScript)
- Vite
- Tailwind CSS
- React Router DOM
- Recharts
- React Query

### Backend
- Node.js (ES6 Modules)
- Express 5
- MongoDB / Mongoose
- Redis Cloud / Local
- Sqids

---

## Getting Started

### Prerequisites
Make sure you have the following installed on your local environment:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) (v22+ recommended for running outside containers)

---

### Running the Whole Ecosystem via Docker

Running the application with Docker sets up the React Frontend, Node.js Backend, MongoDB database, and Redis cache automatically inside micro-containers.

1. **Clone the repository**
   ```bash
   git clone https://github.com/saumyaketu/distributed-url-shortener.git
   cd Distributed-URL-Shortener
   ```
2. **Configure Environment Variables**
    Ensure your environment variables are configured for both the backend and the frontend.
3. **Build and Run the Containers**
    Execute this command from the root directory:
    ```bash
    docker-compose up --build
    ```


#### Access the Apps

* **Frontend:** Navigate to http://localhost:5173
* **Backend API Server:** Operational at http://localhost:5000

To stop the background infrastructure, run:

    docker-compose down

---

### Running Manually for Development

If you prefer to run the services bare-metal during active development:

1. **Start Backend**
    ```bash
    cd backend
    npm install
    npm run dev
    ```
    *Creates server instances running at http://localhost:5000*

2. **Start Frontend**
    ```bash
    cd ../frontend
    npm install
    npm run dev
    ```
    *Launches Vite Hot-Reloading server at http://localhost:5173*

# Distributed URL Shortener

A high-performance, full-stack, distributed URL shortening service built with modern architecture. It leverages layered design patterns, in-memory caching for minimal latency, and robust request handling.

---

## Features

- **Distributed Key Generation Service (KGS)**: Dedicated background daemon worker pre-allocating range blocks and generating thousands of unique Base-62 short codes offline into a centralized Redis key pool (`key_pool:available`).
- **In-Memory Token Buffering**: Web instances pull and buffer short codes directly in local RAM (`TokenBuffer`), delivering **$\sim 0\text{ ms}$ key acquisition latency** with zero runtime database reads and automatic non-blocking background refills.
- **Multi-Tier Fault Tolerance**: Resilient fallback hierarchy (RAM Buffer $\to$ Centralized Redis Pool $\to$ Emergency MongoDB Range Counter Allocator) ensuring 100% uptime and zero duplicate collisions even during Redis restarts or network partitions.
- **User Authentication**: Secure user registration and login utilizing `bcryptjs` password hashing and HttpOnly JWT cookies.
- **Performance Caching**: Layered architecture utilizing Redis to cache active short codes and redirect routes, minimizing MongoDB workloads.
- **Analytics & Tracking**: Records metrics including device breakdowns (via `ua-parser-js`), referrers, and daily click distributions.
- **Rate Limiting**: Built-in protection algorithms leveraging Redis to prevent DDoS and API abuse.
- **Interactive UX**: Built with React & TypeScript, rendering Recharts visualizations, interactive QR code creators, and responsive notifications (`react-hot-toast`).
- **Link Expiration**: Custom time-to-live (TTL) settings, automatically invalidating stale cache entries and gracefully routing users to an expired landing page.
- **Containerized Microservice Ecosystem**: Multi-container architecture orchestrating the Frontend, Backend API, KGS Background Worker, MongoDB, and Redis.

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
- Sqids (Base-62 Encoding)
- TokenBuffer (In-Memory Ring Buffer)

---

## Architecture Overview

```
                      [ User Traffic ]
                             │
                             ▼
                     ┌───────────────┐
                     │  Express API  │
                     │  (Web Server) │
                     └───┬───────┬───┘
                         │       │
    Fast Path: 0ms RAM   │       │ Cold Start / Refill
    ┌────────────────────┘       └──────────────────┐
    ▼                                               ▼
┌───────────────────────┐                 ┌───────────────────────┐
│ In-Memory TokenBuffer │                 │ Redis Centralized Pool│
│ (Local RAM Array)     │◄────────────────┤ (key_pool:available)  │
└───────────────────────┘    Batch Pop    └───────────▲───────────┘
                                                      │ Bulk Push
                                          ┌───────────┴───────────┐
                                          │      KGS Worker       │
                                          │  (Background Daemon)  │
                                          └───────────────────────┘
```

---

## Getting Started

### Prerequisites
Make sure you have the following installed on your local environment:
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) (v22+ recommended for running outside containers)

---

### Running the Whole Ecosystem via Docker

Running the application with Docker automatically sets up the React Frontend, Node.js Backend API, KGS Background Worker, MongoDB database, and Redis cache inside isolated micro-containers.

1. **Clone the repository**
   ```bash
   git clone https://github.com/saumyaketu/distributed-url-shortener.git
   cd Distributed-URL-Shortener
   ```
2. **Configure Environment Variables**
   Ensure your environment variables are configured:
   ```bash
   cp frontend/.env.sample frontend/.env
   cp backend/.env.sample backend/.env
   ```
3. **Build and Run the Containers**
   Execute this command from the root directory:
   ```bash
   docker-compose up --build
   ```

#### Access the Apps
* **Frontend:** http://localhost:5173
* **Backend API Server:** http://localhost:5000

To stop the containers, run:
```bash
docker-compose down
```

---

### Running Manually for Development

If you prefer running services directly in development mode:

1. **Start Backend API Server**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   *Runs server at http://localhost:5000*

2. **Start KGS Worker Daemon (Optional / Standalone)**
   ```bash
   cd backend
   npm run worker:kgs:dev
   ```
   *Proactively manages and refills the Redis key pool in the background.*

3. **Start Frontend**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```
   *Runs Vite Hot-Reloading server at http://localhost:5173*

---

## Testing

The backend includes an automated test suite verifying Key Generation, TokenBuffer concurrency, Redis pool replenishment, and failover resilience.

Run the test suite:
```bash
cd backend
npm test
```

### Verified Test Cases:
* **Test 1: Base-62 Range Generation & Uniqueness** (Generates 2,000+ keys with 0 collisions).
* **Test 2: Atomic Range Block Allocation** (Ensures discrete, non-overlapping numeric ranges).
* **Test 3: Redis Key Pool Replenishment** (Verifies centralized Redis list management).
* **Test 4: In-Memory Token Buffer & 0ms Fast Path** (Verifies sub-millisecond RAM retrieval).
* **Test 5: High-Concurrency Burst** (Simulates 300+ parallel requests with 100% uniqueness).

# Ultra Running Planner

A personal web-based application for planning and analyzing long-distance running events with GPX route planning, pace calculations, waypoint management, and AI-assisted planning support.

## 🔒 Data Persistence

**Important**: Your database and uploads are now stored in the `./data` directory. This means **your data survives all Docker operations**, including `docker-compose down --rmi all`. See [DATA_PERSISTENCE.md](DATA_PERSISTENCE.md) for complete details on backups and data management.

## Features

- 🗺️ **Route Planning**: Upload and visualize GPX files with interactive maps
- 📊 **Pace Calculations**: Advanced pace calculations with elevation and fatigue adjustments
- 📍 **Waypoint Management**: Add, edit, and organize checkpoints, food stops, water stations
- 🤖 **AI Assistant**: GPT-5 Nano powered coach with web search, RAG, and persistent chat history
- 📈 **Post-Race Analysis**: Compare planned vs actual performance
- 📱 **Modern UI**: Beautiful, responsive interface with Tailwind CSS

## Technology Stack

- **Backend**: Python FastAPI + PostgreSQL with PGVector
- **Frontend**: React + TypeScript + Vite
- **Maps**: Leaflet.js
- **AI/ML**: OpenAI, OpenRouter, Opera text embeddings
- **Containerization**: Docker + docker-compose

## Quick Start

### Prerequisites

- Docker and docker-compose installed
- Node.js 18+ (for local development)
- Python 3.11+ (for local development)

### Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd runPlanV2
```

2. Create environment file:
```bash
cp .env.example .env
# Edit .env with your API keys (optional for basic functionality)
```

3. Start the application:
```bash
docker-compose up --build
```

4. Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Development Setup

#### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

#### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

## Project Structure

```
runPlanV2/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── models.py            # Database models
│   ├── database.py          # Database connection
│   ├── routes/              # API endpoints
│   ├── services/            # Business logic
│   ├── utils/               # Utilities (GPX processing, calculations)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API clients
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Utility functions
│   │   └── App.tsx
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Usage

### 1. Create an Event

1. Click "New Event" in the dashboard
2. Enter event name, date, and target duration
3. Upload a GPX file for your planned route

### 2. Add Waypoints

1. Click on the map to add waypoints
2. Select waypoint type (checkpoint, food, water, rest)
3. Set stop time and add notes

### 3. Calculate Pace

1. Adjust elevation gain/descent percentages
2. Set fatigue slowdown factor
3. View leg-by-leg breakdown with arrival times

### 4. Post-Race Analysis

1. Upload actual GPX/TCX file after race
2. Compare planned vs actual performance
3. View deviation charts and statistics

### 5. AI Assistant

1. Upload training documents (PDFs, text files)
2. Ask questions about training, nutrition, pacing
3. Get context-aware recommendations

## API Documentation

Full API documentation is available at http://localhost:8000/docs when running the application.

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## License

MIT License - See LICENSE file for details


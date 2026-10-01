# SETUP — FNFAI-REAL-MODS V1

## Windows 11 Installation

### Prerequisites
1. **Docker Desktop for Windows**
   - Download from https://www.docker.com/products/docker-desktop
   - Install and start Docker Desktop
   - Ensure WSL2 backend is enabled

2. **Git** (for cloning the repository)
   - Download from https://git-scm.com/download/win

### Installation Steps

1. Clone the repository:
   ```powershell
   git clone <repository-url>
   cd fnf-ai-mods
   ```

2. Start the application:
   ```powershell
   docker compose -f docker-compose.base44.yml up -d
   ```

3. Wait for services to start (usually 10-15 seconds):
   ```powershell
   docker compose -f docker-compose.base44.yml ps
   ```
   Both `backend` and `frontend` should show as `healthy`.

4. Open your browser to http://localhost:3000

5. Configure AI provider:
   - Go to **Settings** tab
   - Enter your OpenAI API key (or any OpenAI-compatible provider)
   - Set the model (e.g., gpt-4o)
   - Click **Save**

6. Start creating mods in the **Chat** tab!

### Optional: Environment Variables
Create a `.env` file or set environment variables:
```
AI_API_KEY=sk-your-key-here
AI_API_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o
```

## Alternative: Without Docker

### Backend
```bash
cd backend
npm install
npm run dev
```
Backend runs on http://localhost:3001

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on http://localhost:5173 (Vite proxy forwards /api to backend)

## Troubleshooting

### Port 3000 already in use
Change the port mapping in `docker-compose.base44.yml`:
```yaml
ports:
  - "8080:5173"  # Use port 8080 instead
```

### Backend not responding
Check logs:
```bash
docker compose -f docker-compose.base44.yml logs backend
```

### AI chat shows "not configured"
Go to Settings and enter your API key, or set the `AI_API_KEY` environment variable.

# AIrep - AI Service for Salud+

A dedicated AI service microservice for handling all AI-powered health recommendations for the Salud+ application. This service handles calls to the Gemini API and provides multiple endpoints for different types of health guidance.

## Features

- 🤖 Health guidance generation
- 💪 Workout recommendations
- 🥗 Nutrition advice
- 🔄 Concurrent request handling
- ✅ Input validation
- 🛡️ Error handling
- 📊 Health check endpoint

## Prerequisites

- Node.js (v14 or higher)
- npm
- Gemini API Key (get from [Google AI Studio](https://aistudio.google.com))

## Setup

### 1. Install Dependencies

```bash
cd AIrep
npm install
```

### 2. Configure Environment Variables

Create or update the `.env` file in the AIrep directory:

```env
GEMINI_API_KEY=your_actual_api_key_here
PORT=3001
LOG_LEVEL=info
```

### 3. Start the Service

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

You should see:
```
✅ AIrep service running on http://localhost:3001
```

## API Endpoints

### 1. Health Guidance
**Endpoint:** `POST /api/generateHealth`

Generates personalized health and wellness guidance based on user profile.

**Request:**
```json
{
  "userData": {
    "name": "John Doe",
    "age": 30,
    "weight": "180",
    "height": "5'10\"",
    "conditions": ["diabetes", "hypertension"],
    "otherCondition": "",
    "additionalInfo": "Sedentary lifestyle"
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": "Personalized health guidance text..."
}
```

### 2. Workout Recommendations
**Endpoint:** `POST /api/generateWorkout`

Generates personalized workout plans and exercise recommendations.

**Request:**
```json
{
  "userData": {
    "name": "Jane Smith",
    "age": 28,
    "weight": "130",
    "height": "5'6\"",
    "fitnessLevel": "beginner",
    "goals": "weight loss",
    "limitations": "knee pain"
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": "Personalized workout recommendations..."
}
```

### 3. Nutrition Advice
**Endpoint:** `POST /api/generateNutrition`

Generates personalized nutrition and meal planning guidance.

**Request:**
```json
{
  "userData": {
    "name": "Alex Johnson",
    "age": 35,
    "weight": "200",
    "height": "6'0\"",
    "dietaryPreferences": "vegetarian",
    "conditions": ["high cholesterol"],
    "nutritionGoals": "heart health"
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": "Personalized nutrition advice..."
}
```

### 4. Health Check
**Endpoint:** `GET /health`

Simple health check to verify the service is running.

**Response:**
```json
{
  "status": "ok",
  "service": "AIrep AI Service",
  "timestamp": "2025-11-28T12:00:00.000Z"
}
```

## Integration with Salud-Plus

### Option 1: Update Salud-Plus Server as Proxy

Modify your Salud-Plus `server.js` to forward requests to AIrep:

```javascript
app.post('/api/generateHealth', async (req, res) => {
    try {
        const response = await fetch('http://localhost:3001/api/generateHealth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        const data = await response.json();
        res.json(data);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
```

### Option 2: Direct Frontend to AIrep

Update your frontend to call AIrep directly:

```javascript
const response = await fetch("http://localhost:3001/api/generateHealth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userData: userData })
});
```

## Architecture

```
┌─────────────────────────┐
│   Frontend (Browser)    │
└───────────┬─────────────┘
            │
            ▼
┌──────────────────────────────┐
│ Salud-Plus Backend (3000)    │ (Optional proxy)
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│  AIrep Service (3001)        │
├──────────────────────────────┤
│ • generateHealth             │
│ • generateWorkout            │
│ • generateNutrition          │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│    Gemini API                │
└──────────────────────────────┘
```

## File Structure

```
AIrep/
├── server.js          # Main application file
├── package.json       # Dependencies and scripts
├── .env              # Environment variables (create locally)
├── .gitignore        # Git ignore file
└── README.md         # This file
```

## Troubleshooting

### Port Already in Use
If port 3001 is already in use, change it in `.env`:
```env
PORT=3002
```

### GEMINI_API_KEY Not Set
Make sure your `.env` file is in the AIrep root directory and has the correct API key:
```env
GEMINI_API_KEY=your_actual_key
```

### CORS Issues
The server is configured with CORS enabled. If you still face issues, ensure both services are running on correct ports.

### Service Not Responding
1. Check that the service is running: `npm run dev`
2. Verify the API key is valid
3. Check console logs for error messages
4. Test the health endpoint: `curl http://localhost:3001/health`

## Next Steps

1. **Add Database Integration** - Store conversation history and user preferences
2. **Implement Authentication** - Add API key or JWT authentication
3. **Add Logging** - Implement comprehensive logging system
4. **Rate Limiting** - Prevent abuse with rate limiting middleware
5. **Input Sanitization** - Add validation library (e.g., `joi`, `zod`)
6. **Caching** - Cache responses for identical requests

## Development Tips

- Use `npm run dev` during development for auto-reload
- Check the console logs to debug issues
- Test endpoints using tools like Postman or `curl`
- Monitor your Gemini API usage in the Google AI Studio dashboard

## License

Private - Salud+ Project

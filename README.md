# SaludPlusAPI

A dedicated AI service microservice for handling all AI-powered health recommendations for the Salud+ application. This service handles calls to the Google Gemini API and provides endpoints for health guidance, workout recommendations, and nutrition advice.

## 🤖 Features

- 🧠 **Health Guidance Generation** - Personalized wellness plans based on user health profiles
- 💪 **Workout Recommendations** - Customized exercise plans for different fitness levels
- 🥗 **Nutrition Advice** - Tailored meal planning and dietary guidance
- 🔄 **Concurrent Request Handling** - Handle multiple requests simultaneously
- ✅ **Input Validation** - Validate required fields in requests
- 🛡️ **Error Handling** - Comprehensive error responses with helpful messages
- 📊 **Health Check Endpoint** - Monitor service availability

## 📋 Prerequisites

- Node.js v14 or higher
- npm or yarn
- Google Gemini API Key (get from [Google AI Studio](https://aistudio.google.com/app/apikey))

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/cuevashudg/SaludPlusAPI.git
cd SaludPlusAPI
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Get Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy your API key

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```env
GEMINI_API_KEY=your_actual_api_key_here
PORT=3001
LOG_LEVEL=info
```

**⚠️ Important:** Never commit `.env` to version control. Add it to `.gitignore`.

### 5. Start the Service

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
✅ SaludPlusAPI service running on http://localhost:3001
```

## 📚 Project Structure

```
SaludPlusAPI/
├── server.js           # Main application with all endpoints
├── package.json        # Dependencies and scripts
├── .env                # Environment variables (create locally)
├── .env.example        # Template for environment variables
├── .gitignore          # Git ignore file
└── README.md           # This file
```

## 📡 API Endpoints

### 1. Health Guidance
**Endpoint:** `POST /api/generateHealth`

Generates personalized health and wellness guidance based on user profile.

**Request:**
```bash
curl -X POST http://localhost:3001/api/generateHealth \
  -H "Content-Type: application/json" \
  -d '{
    "userData": {
      "name": "John Doe",
      "age": 30,
      "weight": "180",
      "height": "5'\''10\"",
      "conditions": ["diabetes", "hypertension"],
      "otherCondition": "",
      "additionalInfo": "Sedentary lifestyle"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "response": "Personalized health guidance text..."
}
```

**Required Fields:**
- `userData.name` (string)
- `userData.age` (number)
- `userData.weight` (string or number)
- `userData.height` (string)

**Optional Fields:**
- `userData.conditions` (array of strings)
- `userData.otherCondition` (string)
- `userData.additionalInfo` (string)

---

### 2. Workout Recommendations
**Endpoint:** `POST /api/generateWorkout`

Generates personalized workout plans and exercise recommendations.

**Request:**
```bash
curl -X POST http://localhost:3001/api/generateWorkout \
  -H "Content-Type: application/json" \
  -d '{
    "userData": {
      "name": "Jane Smith",
      "age": 28,
      "weight": "130",
      "height": "5'\''6\"",
      "fitnessLevel": "beginner",
      "goals": "weight loss",
      "limitations": "knee pain"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "response": "Personalized workout recommendations..."
}
```

---

### 3. Nutrition Advice
**Endpoint:** `POST /api/generateNutrition`

Generates personalized nutrition and meal planning guidance.

**Request:**
```bash
curl -X POST http://localhost:3001/api/generateNutrition \
  -H "Content-Type: application/json" \
  -d '{
    "userData": {
      "name": "Alex Johnson",
      "age": 35,
      "weight": "200",
      "height": "6'\''0\"",
      "dietaryPreferences": "vegetarian",
      "conditions": ["high cholesterol"],
      "nutritionGoals": "heart health"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "response": "Personalized nutrition advice..."
}
```

---

### 4. Health Check
**Endpoint:** `GET /health`

Simple health check to verify the service is running and healthy.

**Request:**
```bash
curl http://localhost:3001/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "SaludPlusAPI",
  "timestamp": "2025-11-28T12:00:00.000Z"
}
```

## 🏗️ Architecture

```
┌─────────────────────────┐
│   Frontend (Browser)    │
└───────────┬─────────────┘
            │
            ▼
┌──────────────────────────────┐
│ Salud-Plus Proxy (3000)      │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│ SaludPlusAPI Service (3001)  │
├──────────────────────────────┤
│ • POST /api/generateHealth   │
│ • POST /api/generateWorkout  │
│ • POST /api/generateNutrition│
│ • GET  /health               │
└───────────┬──────────────────┘
            │
            ▼
┌──────────────────────────────┐
│    Google Gemini API         │
└──────────────────────────────┘
```

## 🛠️ Development

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | (required) | Your Google Gemini API key |
| `PORT` | 3001 | Port for the service |
| `LOG_LEVEL` | info | Logging level (info, debug, error) |

### Testing Endpoints

Use Postman, Insomnia, or curl to test endpoints. Examples are provided above.

### How It Works

1. **Request Received** - Client sends user data to an endpoint
2. **Validation** - Required fields are validated
3. **Prompt Construction** - User data is formatted into a detailed AI prompt
4. **Gemini API Call** - Prompt is sent to Google's Gemini API
5. **Response Parsing** - AI response is extracted and formatted
6. **Response Sent** - Results returned to client as JSON

## 🔗 Integration with Salud-Plus

### Setup

1. Ensure both services are in the same directory structure:
   ```
   Salud+/
   ├── SaludPlusAPI/
   └── SaludGit/Salud-Plus/
   ```

2. Make sure SaludPlusAPI is running:
   ```bash
   cd SaludPlusAPI
   npm run dev
   ```

3. In another terminal, run Salud-Plus:
   ```bash
   cd SaludGit/Salud-Plus
   npm run dev
   ```

### Configuration

Salud-Plus needs the following in its `.env`:
```env
PORT=3000
AIREP_URL=http://localhost:3001
```

The proxy will forward all requests to SaludPlusAPI.

## 🔒 Security Considerations

- **API Key Protection** - Never commit your `.env` file or API key
- **Input Validation** - Required fields are validated on the server
- **Error Messages** - Avoid exposing sensitive error details to clients
- **CORS** - Configured to accept requests from Salud-Plus proxy

### Best Practices

1. Use environment variables for all sensitive data
2. Add `.env` to `.gitignore`
3. Never log or expose API keys
4. Validate all user input
5. Use rate limiting in production (future enhancement)

## 🚨 Troubleshooting

### GEMINI_API_KEY Not Set

**Error:**
```
ERROR: GEMINI_API_KEY is not set in .env file
```

**Solution:**
1. Create `.env` file in SaludPlusAPI root directory
2. Add your API key: `GEMINI_API_KEY=your_key_here`
3. Restart the service

### Invalid API Key

**Error:**
```
API Error: 401 - Unauthorized
```

**Solutions:**
1. Verify your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Ensure the key is copied exactly (no extra spaces)
3. Check API is enabled in Google Cloud project

### Port Already in Use

**Error:**
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solutions:**
1. Change port in `.env`: `PORT=3002`
2. Or kill the process using port 3001:
   ```bash
   # Windows
   netstat -ano | findstr :3001
   taskkill /PID <PID> /F
   ```

### Service Not Responding

**Checklist:**
1. Is the service running? Check terminal for startup message
2. Is the Gemini API key valid?
3. Check internet connection
4. Look for error messages in console
5. Try the health check endpoint: `curl http://localhost:3001/health`

### Gemini API Errors

**Common issues:**
- **Quota exceeded** - Check API usage at Google AI Studio dashboard
- **Rate limited** - Wait a moment and retry
- **Invalid request** - Check user data format and required fields

## 📊 Gemini API Costs

- **Free tier:** Limited requests per minute
- **Paid tier:** Variable pricing based on usage
- **Monitor usage:** Check [Google AI Studio](https://aistudio.google.com/app/apikey) dashboard

## 🔮 Future Enhancements

- [ ] Response caching to reduce API calls
- [ ] Rate limiting middleware
- [ ] Request logging and analytics
- [ ] Support for additional AI models
- [ ] API authentication (API keys for clients)
- [ ] Database integration for conversation history
- [ ] Streaming responses for better UX
- [ ] Input sanitization to prevent prompt injection

## 📝 Notes

- AI guidance is **not a substitute for professional medical advice**
- Responses are based on user-provided information
- Always recommend consulting healthcare providers for serious conditions
- Keep API key secure and never expose it

## 📄 License

Private - Salud+ Project

## 🤝 Support

**Issues or questions?**
1. Check the troubleshooting section above
2. Review the [Salud-Plus repository](https://github.com/cuevashudg/Salud-Plus)
3. Check [Google AI Studio documentation](https://ai.google.dev/)
4. Create an issue on GitHub

---

**Last Updated:** November 28, 2025

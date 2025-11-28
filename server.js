import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

// Validate API key on startup
if (!GEMINI_API_KEY) {
    console.error('ERROR: GEMINI_API_KEY is not set in .env file');
    process.exit(1);
}

// ---------------------------
// UTILITY: CALL GEMINI API
// ---------------------------
async function callGeminiAPI(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Gemini API error:", errorData);
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();

        if (data.candidates && data.candidates.length > 0) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('No response generated from Gemini API');
        }
    } catch (err) {
        console.error("Gemini API call failed:", err);
        throw err;
    }
}

// ---------------------------
// HEALTH GUIDANCE ENDPOINT
// ---------------------------
app.post('/api/generateHealth', async (req, res) => {
    try {
        const { userData } = req.body;

        if (!userData) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing userData' 
            });
        }

        // Validate required fields
        if (!userData.name || !userData.age || !userData.weight || !userData.height) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: name, age, weight, height' 
            });
        }

        const prompt = `You are a friendly health and wellness advisor (NOT a medical doctor). Based on the following user information, provide personalized, non-medical but science-based health and wellness suggestions.

User Health Information:
- Full Name: ${userData.name}
- Age: ${userData.age}
- Weight: ${userData.weight}
- Height: ${userData.height}
- Existing Conditions: ${userData.conditions && userData.conditions.length > 0 ? userData.conditions.join(", ") : "None selected"}
${userData.otherCondition ? "- Other Condition: " + userData.otherCondition : ""}
${userData.additionalInfo ? "- Additional Notes: " + userData.additionalInfo : ""}

Please provide friendly wellness suggestions in these areas:
1. **General Wellness Overview** - What positive health habits to focus on
2. **Lifestyle Recommendations** - Daily habits and activities to consider
3. **Nutrition Tips** - Simple, general dietary guidance (not medical advice)
4. **Physical Activity Suggestions** - Exercise ideas suited to the person's profile
5. **Stress Management** - Relaxation and mindfulness tips
6. **When to Consult a Professional** - General guidance on seeing a healthcare provider

Keep the tone friendly, encouraging, and supportive. Focus on general wellness, not medical diagnosis or treatment.`;

        const aiResponse = await callGeminiAPI(prompt);
        
        res.json({ 
            success: true, 
            response: aiResponse 
        });

    } catch (err) {
        console.error("Error in /api/generateHealth:", err);
        res.status(500).json({ 
            success: false,
            error: `Server error: ${err.message}` 
        });
    }
});

// ---------------------------
// WORKOUT RECOMMENDATION ENDPOINT
// ---------------------------
app.post('/api/generateWorkout', async (req, res) => {
    try {
        const { userData } = req.body;

        if (!userData) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing userData' 
            });
        }

        const prompt = `You are a friendly fitness advisor. Based on the user's profile, suggest personalized workout recommendations.

User Profile:
- Name: ${userData.name}
- Age: ${userData.age}
- Weight: ${userData.weight}
- Height: ${userData.height}
- Fitness Level: ${userData.fitnessLevel || "Not specified"}
- Goals: ${userData.goals || "General fitness"}
- Limitations: ${userData.limitations || "None"}

Please provide:
1. **Recommended Workout Types** - Best suited to their profile
2. **Weekly Schedule** - Sample weekly workout plan
3. **Duration & Intensity** - Suggested workout length and intensity
4. **Recovery Tips** - How to properly recover between workouts
5. **Equipment Needs** - What equipment they'll need (if any)
6. **Progression Tips** - How to advance safely over time

Keep it encouraging and realistic for their fitness level.`;

        const aiResponse = await callGeminiAPI(prompt);
        
        res.json({ 
            success: true, 
            response: aiResponse 
        });

    } catch (err) {
        console.error("Error in /api/generateWorkout:", err);
        res.status(500).json({ 
            success: false,
            error: `Server error: ${err.message}` 
        });
    }
});

// ---------------------------
// NUTRITION ADVICE ENDPOINT
// ---------------------------
app.post('/api/generateNutrition', async (req, res) => {
    try {
        const { userData } = req.body;

        if (!userData) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing userData' 
            });
        }

        const prompt = `You are a friendly nutrition advisor. Based on the user's profile, provide personalized nutrition guidance.

User Profile:
- Name: ${userData.name}
- Age: ${userData.age}
- Weight: ${userData.weight}
- Height: ${userData.height}
- Dietary Preferences: ${userData.dietaryPreferences || "No preference"}
- Health Conditions: ${userData.conditions ? userData.conditions.join(", ") : "None"}
- Goals: ${userData.nutritionGoals || "General health"}

Please provide:
1. **Daily Nutrition Overview** - Recommended caloric and macro breakdown
2. **Foods to Include** - Nutrient-dense foods they should eat more of
3. **Foods to Limit** - Foods to consume less frequently
4. **Meal Planning Tips** - Simple meal ideas and prep strategies
5. **Hydration Guidance** - Water intake recommendations
6. **Supplement Considerations** - Any supplements to consider (consult doctor first)

Keep recommendations practical, accessible, and non-medical.`;

        const aiResponse = await callGeminiAPI(prompt);
        
        res.json({ 
            success: true, 
            response: aiResponse 
        });

    } catch (err) {
        console.error("Error in /api/generateNutrition:", err);
        res.status(500).json({ 
            success: false,
            error: `Server error: ${err.message}` 
        });
    }
});

// ---------------------------
// HEALTH CHECK ENDPOINT
// ---------------------------
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'AIrep AI Service',
        timestamp: new Date().toISOString()
    });
});

// ---------------------------
// ERROR HANDLING
// ---------------------------
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        success: false,
        error: 'Internal server error' 
    });
});

// ---------------------------
// START SERVER
// ---------------------------
app.listen(PORT, () => {
    console.log(`✅ AIrep service running on http://localhost:${PORT}`);
    console.log(`📝 Make sure your .env file has GEMINI_API_KEY set`);
});

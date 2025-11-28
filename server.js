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
// VALIDATION UTILITIES
// ---------------------------
function validateString(value, fieldName, minLength = 1, maxLength = 500) {
    if (typeof value !== 'string') {
        throw new Error(`${fieldName} must be a string`);
    }
    const trimmed = value.trim();
    if (trimmed.length < minLength) {
        throw new Error(`${fieldName} must be at least ${minLength} character(s)`);
    }
    if (trimmed.length > maxLength) {
        throw new Error(`${fieldName} must not exceed ${maxLength} characters`);
    }
    return trimmed;
}

function validateNumber(value, fieldName, min = null, max = null) {
    const num = Number(value);
    if (isNaN(num)) {
        throw new Error(`${fieldName} must be a valid number`);
    }
    if (min !== null && num < min) {
        throw new Error(`${fieldName} must be at least ${min}`);
    }
    if (max !== null && num > max) {
        throw new Error(`${fieldName} must not exceed ${max}`);
    }
    return num;
}

function validateArray(value, fieldName, maxLength = 100) {
    if (!Array.isArray(value)) {
        throw new Error(`${fieldName} must be an array`);
    }
    if (value.length > maxLength) {
        throw new Error(`${fieldName} cannot contain more than ${maxLength} items`);
    }
    // Validate each item is a string
    return value.map((item, index) => {
        if (typeof item !== 'string') {
            throw new Error(`${fieldName}[${index}] must be a string`);
        }
        return item.trim();
    });
}

function validateHealthData(userData) {
    const errors = [];

    // Validate required fields
    if (!userData.name) {
        errors.push('name is required');
    } else {
        try {
            userData.name = validateString(userData.name, 'name', 1, 100);
        } catch (err) {
            errors.push(err.message);
        }
    }

    if (userData.age === undefined || userData.age === null || userData.age === '') {
        errors.push('age is required');
    } else {
        try {
            userData.age = validateNumber(userData.age, 'age', 1, 150);
        } catch (err) {
            errors.push(err.message);
        }
    }

    if (!userData.weight) {
        errors.push('weight is required');
    } else {
        try {
            userData.weight = validateString(userData.weight, 'weight', 1, 50);
        } catch (err) {
            errors.push(err.message);
        }
    }

    if (!userData.height) {
        errors.push('height is required');
    } else {
        try {
            userData.height = validateString(userData.height, 'height', 1, 50);
        } catch (err) {
            errors.push(err.message);
        }
    }

    // Validate optional fields
    if (userData.conditions) {
        try {
            userData.conditions = validateArray(userData.conditions, 'conditions', 20);
        } catch (err) {
            errors.push(err.message);
        }
    } else {
        userData.conditions = [];
    }

    if (userData.otherCondition) {
        try {
            userData.otherCondition = validateString(userData.otherCondition, 'otherCondition', 0, 200);
        } catch (err) {
            errors.push(err.message);
        }
    } else {
        userData.otherCondition = '';
    }

    if (userData.additionalInfo) {
        try {
            userData.additionalInfo = validateString(userData.additionalInfo, 'additionalInfo', 0, 1000);
        } catch (err) {
            errors.push(err.message);
        }
    } else {
        userData.additionalInfo = '';
    }

    if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join('; ')}`);
    }

    return userData;
}

function validateWorkoutData(userData) {
    const errors = [];

    // Require at least name for workout recommendations
    if (!userData.name) {
        errors.push('name is required');
    } else {
        try {
            userData.name = validateString(userData.name, 'name', 1, 100);
        } catch (err) {
            errors.push(err.message);
        }
    }

    if (userData.age !== undefined && userData.age !== null && userData.age !== '') {
        try {
            userData.age = validateNumber(userData.age, 'age', 1, 150);
        } catch (err) {
            errors.push(err.message);
        }
    }

    if (userData.weight) {
        try {
            userData.weight = validateString(userData.weight, 'weight', 1, 50);
        } catch (err) {
            errors.push(err.message);
        }
    }

    if (userData.height) {
        try {
            userData.height = validateString(userData.height, 'height', 1, 50);
        } catch (err) {
            errors.push(err.message);
        }
    }

    if (userData.fitnessLevel) {
        try {
            userData.fitnessLevel = validateString(userData.fitnessLevel, 'fitnessLevel', 1, 50);
        } catch (err) {
            errors.push(err.message);
        }
    }

    if (userData.goals) {
        try {
            userData.goals = validateString(userData.goals, 'goals', 1, 500);
        } catch (err) {
            errors.push(err.message);
        }
    }

    if (userData.limitations) {
        try {
            userData.limitations = validateString(userData.limitations, 'limitations', 1, 500);
        } catch (err) {
            errors.push(err.message);
        }
    }

    if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join('; ')}`);
    }

    return userData;
}

function validateNutritionData(userData) {
    const errors = [];

    // Require at least name for nutrition recommendations
    if (!userData.name) {
        errors.push('name is required');
    } else {
        try {
            userData.name = validateString(userData.name, 'name', 1, 100);
        } catch (err) {
            errors.push(err.message);
        }
    }

    if (userData.age !== undefined && userData.age !== null && userData.age !== '') {
        try {
            userData.age = validateNumber(userData.age, 'age', 1, 150);
        } catch (err) {
            errors.push(err.message);
        }
    }

    if (userData.weight) {
        try {
            userData.weight = validateString(userData.weight, 'weight', 1, 50);
        } catch (err) {
            errors.push(err.message);
        }
    }

    if (userData.height) {
        try {
            userData.height = validateString(userData.height, 'height', 1, 50);
        } catch (err) {
            errors.push(err.message);
        }
    }

    if (userData.dietaryPreferences) {
        try {
            userData.dietaryPreferences = validateString(userData.dietaryPreferences, 'dietaryPreferences', 1, 200);
        } catch (err) {
            errors.push(err.message);
        }
    }

    if (userData.conditions) {
        try {
            userData.conditions = validateArray(userData.conditions, 'conditions', 20);
        } catch (err) {
            errors.push(err.message);
        }
    } else {
        userData.conditions = [];
    }

    if (userData.nutritionGoals) {
        try {
            userData.nutritionGoals = validateString(userData.nutritionGoals, 'nutritionGoals', 1, 500);
        } catch (err) {
            errors.push(err.message);
        }
    }

    if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join('; ')}`);
    }

    return userData;
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
                error: 'Missing userData object' 
            });
        }

        // Validate and sanitize input
        const validatedData = validateHealthData(userData);

        const prompt = `You are a friendly health and wellness advisor (NOT a medical doctor). Based on the following user information, provide personalized, non-medical but science-based health and wellness suggestions.

User Health Information:
- Full Name: ${validatedData.name}
- Age: ${validatedData.age}
- Weight: ${validatedData.weight}
- Height: ${validatedData.height}
- Existing Conditions: ${validatedData.conditions && validatedData.conditions.length > 0 ? validatedData.conditions.join(", ") : "None selected"}
${validatedData.otherCondition ? "- Other Condition: " + validatedData.otherCondition : ""}
${validatedData.additionalInfo ? "- Additional Notes: " + validatedData.additionalInfo : ""}

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
        const statusCode = err.message.includes('Validation failed') ? 400 : 500;
        res.status(statusCode).json({ 
            success: false,
            error: err.message 
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
                error: 'Missing userData object' 
            });
        }

        // Validate and sanitize input
        const validatedData = validateWorkoutData(userData);

        const prompt = `You are a friendly fitness advisor. Based on the user's profile, suggest personalized workout recommendations.

User Profile:
- Name: ${validatedData.name}
- Age: ${validatedData.age || "Not specified"}
- Weight: ${validatedData.weight || "Not specified"}
- Height: ${validatedData.height || "Not specified"}
- Fitness Level: ${validatedData.fitnessLevel || "Not specified"}
- Goals: ${validatedData.goals || "General fitness"}
- Limitations: ${validatedData.limitations || "None"}

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
        const statusCode = err.message.includes('Validation failed') ? 400 : 500;
        res.status(statusCode).json({ 
            success: false,
            error: err.message 
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
                error: 'Missing userData object' 
            });
        }

        // Validate and sanitize input
        const validatedData = validateNutritionData(userData);

        const prompt = `You are a friendly nutrition advisor. Based on the user's profile, provide personalized nutrition guidance.

User Profile:
- Name: ${validatedData.name}
- Age: ${validatedData.age || "Not specified"}
- Weight: ${validatedData.weight || "Not specified"}
- Height: ${validatedData.height || "Not specified"}
- Dietary Preferences: ${validatedData.dietaryPreferences || "No preference"}
- Health Conditions: ${validatedData.conditions && validatedData.conditions.length > 0 ? validatedData.conditions.join(", ") : "None"}
- Goals: ${validatedData.nutritionGoals || "General health"}

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
        const statusCode = err.message.includes('Validation failed') ? 400 : 500;
        res.status(statusCode).json({ 
            success: false,
            error: err.message 
        });
    }
});

// ---------------------------
// HEALTH CHECK ENDPOINT
// ---------------------------
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'SaludPlusAPI',
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
    console.log(`✅ SaludPlusAPI service running on http://localhost:${PORT}`);
    console.log(`📝 Make sure your .env file has GEMINI_API_KEY set`);
});

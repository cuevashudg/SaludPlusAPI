import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import NodeCache from 'node-cache';
import PQueue from 'p-queue';
import connectDB from './utils/db.js';
import authMiddleware from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import plansRoutes from './routes/plans.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Connect to database
let dbConnected = false;
connectDB().then(() => {
  dbConnected = true;
  console.log('✅ Database integration enabled');
}).catch(err => {
  console.warn('⚠️ Database connection failed:', err.message);
  dbConnected = false;
});

// Initialize cache (1 hour TTL for wellness advice)
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Gemini request queue (prevents hitting Gemini 5 RPM free-tier limit)
const geminiQueue = new PQueue({
    concurrency: 1,
    interval: 60000,
    intervalCap: 5
});

// In-memory request metrics for local diagnostics
const requestMetrics = {
    startedAt: new Date().toISOString(),
    totalRequests: 0,
    byMethod: {},
    byPath: {},
    responseClasses: {
        '2xx': 0,
        '3xx': 0,
        '4xx': 0,
        '5xx': 0
    },
    aiEndpoints: {
        generateHealth: 0,
        generateWorkout: 0,
        generateNutrition: 0,
        testGemini: 0
    },
    recentRequests: []
};

function getResponseClass(statusCode) {
    if (statusCode >= 200 && statusCode < 300) return '2xx';
    if (statusCode >= 300 && statusCode < 400) return '3xx';
    if (statusCode >= 400 && statusCode < 500) return '4xx';
    return '5xx';
}

function trackRecentRequest(entry) {
    requestMetrics.recentRequests.push(entry);
    if (requestMetrics.recentRequests.length > 30) {
        requestMetrics.recentRequests.shift();
    }
}

// Validate environment on startup
function validateEnvironment() {
    if (!GEMINI_API_KEY) {
        console.error('ERROR: GEMINI_API_KEY is not set in .env file');
        process.exit(1);
    }
    if (isNaN(parseInt(PORT))) {
        console.error(`ERROR: Invalid PORT: ${PORT}`);
        process.exit(1);
    }
    console.log(`✅ Environment validated (${NODE_ENV})`);
}

validateEnvironment();

// Rate limiting: 30 requests per 15 minutes per IP
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // limit each IP to 30 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, // return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // disable the `X-RateLimit-*` headers
});

// Middleware
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    const startTime = Date.now();
    const method = req.method;
    const path = req.path;

    requestMetrics.totalRequests += 1;
    requestMetrics.byMethod[method] = (requestMetrics.byMethod[method] || 0) + 1;
    requestMetrics.byPath[path] = (requestMetrics.byPath[path] || 0) + 1;

    if (path === '/api/generateHealth') requestMetrics.aiEndpoints.generateHealth += 1;
    if (path === '/api/generateWorkout') requestMetrics.aiEndpoints.generateWorkout += 1;
    if (path === '/api/generateNutrition') requestMetrics.aiEndpoints.generateNutrition += 1;
    if (path === '/api/test-gemini') requestMetrics.aiEndpoints.testGemini += 1;

    res.on('finish', () => {
        const statusClass = getResponseClass(res.statusCode);
        requestMetrics.responseClasses[statusClass] += 1;

        trackRecentRequest({
            timestamp: new Date().toISOString(),
            method,
            path,
            statusCode: res.statusCode,
            durationMs: Date.now() - startTime,
            rateLimitRemaining: res.getHeader('RateLimit-Remaining') || null,
            rateLimitLimit: res.getHeader('RateLimit-Limit') || null,
            rateLimitReset: res.getHeader('RateLimit-Reset') || null
        });
    });

    next();
});

// ---------------------------
// AUTHENTICATION & ACCOUNT ROUTES
// ---------------------------
app.use('/api/auth', authRoutes);

// ---------------------------
// HEALTH PLANS ROUTES (Protected)
// ---------------------------
app.use('/api/plans', plansRoutes);

// ---------------------------
// ERROR MESSAGE MAPPING
// ---------------------------
function getGeminiErrorMessage(status, data) {
    const errorMap = {
        400: 'Invalid request format. Check that all required fields are provided.',
        401: 'API key is invalid. Check GEMINI_API_KEY in .env',
        403: 'API key does not have permission. Enable Gemini API in Google Cloud Console.',
        429: 'Rate limited by Gemini API. Please wait and try again. Consider upgrading your API quota.',
        500: 'Gemini API server error. Try again in a few moments.',
        503: 'Gemini API is temporarily unavailable. Please try again later.'
    };
    return errorMap[status] || `Gemini API error: ${status}`;
}

// ---------------------------
// INPUT SANITIZATION
// ---------------------------
function sanitizeForPrompt(text) {
    if (!text || typeof text !== 'string') return '';
    // Remove potentially problematic patterns
    return text
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript:/gi, '') // Remove script protocol
        .replace(/onerror\s*=/gi, '') // Remove event handlers
        .replace(/onclick\s*=/gi, '')
        .substring(0, 500); // Cap length
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
            userData.name = sanitizeForPrompt(validateString(userData.name, 'name', 1, 100));
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
            userData.weight = sanitizeForPrompt(validateString(userData.weight, 'weight', 1, 50));
        } catch (err) {
            errors.push(err.message);
        }
    }

    if (!userData.height) {
        errors.push('height is required');
    } else {
        try {
            userData.height = sanitizeForPrompt(validateString(userData.height, 'height', 1, 50));
        } catch (err) {
            errors.push(err.message);
        }
    }

    // Validate optional fields
    if (userData.conditions) {
        try {
            userData.conditions = validateArray(userData.conditions, 'conditions', 20).map(sanitizeForPrompt);
        } catch (err) {
            errors.push(err.message);
        }
    } else {
        userData.conditions = [];
    }

    if (userData.otherCondition) {
        try {
            userData.otherCondition = sanitizeForPrompt(validateString(userData.otherCondition, 'otherCondition', 0, 200));
        } catch (err) {
            errors.push(err.message);
        }
    } else {
        userData.otherCondition = '';
    }

    if (userData.additionalInfo) {
        try {
            userData.additionalInfo = sanitizeForPrompt(validateString(userData.additionalInfo, 'additionalInfo', 0, 1000));
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
async function callGeminiAPI(prompt, retries = 2) {
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        console.log('Calling Gemini API...');

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            }),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Gemini API error:", errorData);

            if (response.status === 429 && retries > 0) {
                console.log("Retrying Gemini request...");
                await new Promise(r => setTimeout(r, 2000));
                return callGeminiAPI(prompt, retries - 1);
            }

            const userMessage = getGeminiErrorMessage(response.status, errorData);
            throw new Error(userMessage);
        }

        const data = await response.json();

        return data.candidates?.[0]?.content?.parts
            ?.map(p => p.text || "")
            .join("") || "No response generated";

    } catch (err) {
        clearTimeout(timeout);

        if (err.name === 'AbortError') {
            throw new Error('Gemini API request timeout (30 seconds)');
        }

        console.error("Gemini API call failed:", err.message || err);
        throw err;
    }
}

// Cache key generation
function getCacheKey(type, userData) {
    // Create cache key from user characteristics (not name/personal info)
    const cleanData = {
        type,
        age: userData.age,
        weight: userData.weight,
        height: userData.height,
        conditions: userData.conditions || [],
        goals: userData.goals || '',
        fitnessLevel: userData.fitnessLevel || '',
        dietaryPreferences: userData.dietaryPreferences || ''
    };

    return Buffer.from(JSON.stringify(cleanData)).toString('base64');
}

// ---------------------------
// HEALTH GUIDANCE ENDPOINT
// ---------------------------
app.post('/api/generateHealth', apiLimiter, async (req, res) => {
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

        // Check cache first
        const cacheKey = getCacheKey('health', validatedData);
        const cachedResponse = cache.get(cacheKey);
        if (cachedResponse) {
            return res.json({ 
                success: true, 
                response: cachedResponse,
                cached: true
            });
        }

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

        const aiResponse = await geminiQueue.add(() => callGeminiAPI(prompt));
        
        // Cache the response
        cache.set(cacheKey, aiResponse);
        
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
app.post('/api/generateWorkout', apiLimiter, async (req, res) => {
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

        // Check cache first
        const cacheKey = getCacheKey('workout', validatedData);
        const cachedResponse = cache.get(cacheKey);
        if (cachedResponse) {
            return res.json({ 
                success: true, 
                response: cachedResponse,
                cached: true
            });
        }

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

        const aiResponse = await geminiQueue.add(() => callGeminiAPI(prompt));
        
        // Cache the response
        cache.set(cacheKey, aiResponse);
        
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
app.post('/api/generateNutrition', apiLimiter, async (req, res) => {
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

        // Check cache first
        const cacheKey = getCacheKey('nutrition', validatedData);
        const cachedResponse = cache.get(cacheKey);
        if (cachedResponse) {
            return res.json({ 
                success: true, 
                response: cachedResponse,
                cached: true
            });
        }

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

        const aiResponse = await geminiQueue.add(() => callGeminiAPI(prompt));
        
        // Cache the response
        cache.set(cacheKey, aiResponse);
        
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
    const checks = {
        status: 'ok', 
        service: 'SaludPlusAPI',
        timestamp: new Date().toISOString(),
        checks: {
            geminiApiKey: !!GEMINI_API_KEY,
            geminiApiKeyLength: GEMINI_API_KEY ? GEMINI_API_KEY.length : 0,
            environment: NODE_ENV,
            cacheStatus: 'ok'
        }
    };
    res.json(checks);
});

// ---------------------------
// REQUEST METRICS ENDPOINT
// ---------------------------
app.get('/metrics/requests', (req, res) => {
    res.json({
        success: true,
        service: 'SaludPlusAPI',
        startedAt: requestMetrics.startedAt,
        uptimeSeconds: Math.floor(process.uptime()),
        totals: {
            requests: requestMetrics.totalRequests,
            byMethod: requestMetrics.byMethod,
            byPath: requestMetrics.byPath,
            responseClasses: requestMetrics.responseClasses,
            aiEndpoints: requestMetrics.aiEndpoints
        },
        recentRequests: requestMetrics.recentRequests
    });
});

// ---------------------------
// DIAGNOSTIC ENDPOINT
// ---------------------------
app.post('/api/test-gemini', async (req, res) => {
    try {
        if (!GEMINI_API_KEY) {
            return res.status(400).json({ 
                success: false, 
                error: 'GEMINI_API_KEY not configured in .env file' 
            });
        }

        const testPrompt = 'Say "Hello, Gemini API is working!" in one sentence.';
        const response = await geminiQueue.add(() => callGeminiAPI(testPrompt));
        
        res.json({ 
            success: true, 
            message: 'Gemini API is working correctly',
            response: response
        });
    } catch (err) {
        console.error("Gemini test failed:", err);
        res.status(500).json({ 
            success: false,
            error: err.message,
            tip: 'Check your GEMINI_API_KEY in .env file and ensure you have internet connectivity'
        });
    }
});

// ---------------------------
// ERROR HANDLING
// ---------------------------
app.use((err, req, res, next) => {
    if (err.message && err.message.includes('too many requests')) {
        return res.status(429).json({ 
            success: false,
            error: 'Too many requests. Please try again later.' 
        });
    }
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

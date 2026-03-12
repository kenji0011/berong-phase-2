import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getFireSafetySystemPrompt } from '@/lib/fire-safety-system-prompt';
import { requireAuth } from '@/lib/auth-guard';

export async function POST(request: NextRequest) {
    try {
        // SECURITY: Require authentication to prevent API key abuse
        const auth = await requireAuth()
        if (auth instanceof NextResponse) return auth

        const body = await request.json();
        const { message } = body as { message: string };

        if (!message || typeof message !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Message is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(
                JSON.stringify({ response: 'API key not configured. Please set GEMINI_API_KEY in .env file.' }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const ai = new GoogleGenAI({ apiKey });

        // Generate content WITH the fire safety system prompt
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: message,
            config: {
                // System instruction to restrict topics and format responses
                systemInstruction: getFireSafetySystemPrompt() + `

## Response Formatting
Always format your responses using markdown for better readability:
- Use **bold** for important terms and key points
- Use bullet points (- or *) for lists
- Use numbered lists (1. 2. 3.) for step-by-step instructions
- Use line breaks between sections for clarity
- Keep paragraphs short and focused
- Use emoji sparingly for friendliness (🔥 🧯 🚒)
`,
                // Lower temperature = more consistent, less creative
                temperature: 0.3,
                // Limit response length for concise answers
                maxOutputTokens: 800,
            }
        });

        const responseText = response.text || "I couldn't generate a response.";

        return new Response(
            JSON.stringify({ response: responseText }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('[Chatbot API] Error:', error?.message || error);
        console.error('[Chatbot API] Full error:', JSON.stringify(error, null, 2));

        return new Response(
            JSON.stringify({
                response: "I'm sorry, I encountered an error. Please try again later."
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// Health check endpoint
export async function GET() {
    const hasApiKey = !!process.env.GEMINI_API_KEY;

    return new Response(
        JSON.stringify({
            message: 'Berong Fire Safety Chatbot API',
            status: hasApiKey ? 'ready' : 'missing_api_key'
        }),
        { headers: { 'Content-Type': 'application/json' } }
    );
}

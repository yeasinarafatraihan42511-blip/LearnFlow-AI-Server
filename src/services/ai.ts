import { ai } from '../config/gemini.js';

export interface GeneratedFlashcard {
  front: string;
  back: string;
}

export interface GeneratedQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface GeneratedInsights {
  summary: string;
  keyPoints: string[];
}

export const generateInsights = async (text: string): Promise<GeneratedInsights> => {
  try {
    const prompt = `
      You are an expert learning tutor. Analyze the following study text and generate:
      1. A detailed, well-structured Markdown summary explaining the core concepts.
      2. A concise list of 5-8 bullet key points.

      The response MUST be valid JSON matching this schema:
      {
        "summary": "Markdown formatted summary string",
        "keyPoints": ["Key point 1", "Key point 2", ...]
      }

      Study Text:
      ${text.slice(0, 40000)} // Limit input length to keep prompt within bounds
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Gemini returned an empty insights response.');
    }

    return JSON.parse(resultText) as GeneratedInsights;
  } catch (error) {
    console.error('❌ Error generating insights with Gemini:', error);
    // Fallback if AI fails or returns invalid JSON
    return {
      summary: '### Summary\nFailed to automatically generate summary. Please try again.',
      keyPoints: ['Failed to extract key points.'],
    };
  }
};

export const generateFlashcards = async (text: string): Promise<GeneratedFlashcard[]> => {
  try {
    const prompt = `
      Create 8-12 learning flashcards from the text below. 
      Each flashcard must contain:
      - "front": A clear question, concept, or term.
      - "back": A concise, clear definition, answer, or explanation.

      The response MUST be a valid JSON array of objects matching this schema:
      [
        {
          "front": "Question/Term",
          "back": "Answer/Explanation"
        }
      ]

      Study Text:
      ${text.slice(0, 30000)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Gemini returned empty flashcards.');
    }

    return JSON.parse(resultText) as GeneratedFlashcard[];
  } catch (error) {
    console.error('❌ Error generating flashcards:', error);
    return [];
  }
};

export const generateQuiz = async (text: string): Promise<GeneratedQuizQuestion[]> => {
  try {
    const prompt = `
      Create a multiple-choice quiz consisting of 5-8 questions based on the study text below.
      Each question must contain:
      - "id": A unique short string (e.g. "q1")
      - "question": The question text
      - "options": An array of exactly 4 choices
      - "correctIndex": The index (0, 1, 2, or 3) of the correct option
      - "explanation": An explanation explaining why that choice is correct

      The response MUST be a valid JSON array of objects matching this schema:
      [
        {
          "id": "q1",
          "question": "Question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctIndex": 0,
          "explanation": "Why Option A is correct"
        }
      ]

      Study Text:
      ${text.slice(0, 30000)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error('Gemini returned empty quiz.');
    }

    return JSON.parse(resultText) as GeneratedQuizQuestion[];
  } catch (error) {
    console.error('❌ Error generating quiz:', error);
    return [];
  }
};

export const askMentor = async (
  documentText: string,
  userMessage: string,
  chatHistory: { role: 'user' | 'assistant'; content: string }[],
): Promise<string> => {
  try {
    // Format chat history for Gemini
    const formattedHistory = chatHistory.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Construct tutor system prompt
    const systemPrompt = `
      You are LearnFlow Mentor, an empathetic, smart, and encouraging personal AI tutor.
      You guide the user to learn from their uploaded document.
      Use the following context from the document to answer their questions:
      -----
      CONTEXT:
      ${documentText.slice(0, 45000)}
      -----
      Guidelines:
      - Be direct and friendly. Use formatting like bullet points or bold text to make explanations clear.
      - If the user asks something not related to the document or common learning topics, guide them back politely.
      - Keep answers educational. Do not just solve their homework; explain the "why".
      - At the very end of your response, always recommend a brief one-line "Next Topic to Study" based on the dialogue. Format it precisely like this at the end of the message:
        **Recommended Next Topic:** [Topic Name]
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      config: {
        systemInstruction: systemPrompt,
      }
    });

    return response.text || "I'm sorry, I couldn't formulate a response right now. Please try asking again.";
  } catch (error) {
    console.error('❌ Error in AI learning mentor:', error);
    return "I'm experiencing connectivity issues with my tutor brain. Please try asking again in a moment.";
  }
};


// Simple AI conversation service
// This service integrates with the OpenAI-compatible API

interface MessageType {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ConversationRequest {
  messages: MessageType[];
  max_tokens?: number;
  temperature?: number;
}

interface ConversationResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
  }[];
}

// This URL should be replaced with an actual API endpoint
const API_URL = "https://api.openai.com/v1/chat/completions";

// Function to get AI response
export const getAIResponse = async (
  userMessage: string, 
  conversationHistory: MessageType[] = []
): Promise<string> => {
  try {
    // For development/demo, return canned responses if no API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.log("No API key found, using canned responses");
      return getOfflineResponse(userMessage);
    }

    // Prepare conversation history
    const messages: MessageType[] = [
      {
        role: 'system',
        content: 'You are RemindHer, a helpful voice assistant for the kitchen. You are friendly, supportive, and knowledgeable about cooking, recipes, kitchen organization, and household management. Keep responses concise and conversational.'
      },
      ...conversationHistory,
      {
        role: 'user',
        content: userMessage
      }
    ];

    const request: ConversationRequest = {
      messages,
      max_tokens: 150,
      temperature: 0.7
    };

    // Make API request
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json() as ConversationResponse;
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error("Error getting AI response:", error);
    return "I'm sorry, I'm having trouble connecting to my brain right now. Let me offer some general assistance instead. " + getOfflineResponse(userMessage);
  }
};

// Fallback function for offline mode or when API calls fail
function getOfflineResponse(message: string): string {
  message = message.toLowerCase();
  
  // Kitchen-related keywords
  if (message.match(/recipe|cook|bake|food|meal|dinner|lunch|breakfast/i)) {
    const kitchenResponses = [
      "For that recipe, I'd recommend starting with fresh ingredients. What do you have in your pantry?",
      "Cooking is all about timing and temperature. Make sure to preheat your oven properly.",
      "A balanced meal should include protein, vegetables, and healthy carbs. What are you planning to make?",
      "When cooking pasta, remember to salt the water generously. It's your only chance to season the pasta itself.",
      "Fresh herbs can transform any dish. Consider growing some basil or mint on your windowsill."
    ];
    return kitchenResponses[Math.floor(Math.random() * kitchenResponses.length)];
  }
  
  // Time management
  if (message.match(/busy|time|schedule|organize|planning/i)) {
    const timeResponses = [
      "Meal prepping on weekends can save you lots of time during busy weekdays.",
      "Try the Pomodoro technique - work for 25 minutes, then take a 5-minute break.",
      "Setting a timer for quick cleaning bursts can make household tasks less overwhelming.",
      "Making a to-do list the night before can help your morning routine flow more smoothly.",
      "Consider batch cooking and freezing portions for those extra busy days."
    ];
    return timeResponses[Math.floor(Math.random() * timeResponses.length)];
  }
  
  // General wellbeing
  if (message.match(/tired|stress|relax|overwhelm|break/i)) {
    const wellbeingResponses = [
      "Remember to take breaks, even during busy days. A 5-minute breathing exercise can reset your energy.",
      "Staying hydrated helps with both energy levels and focus. Have you had enough water today?",
      "A short walk can do wonders for clearing your mind when you're feeling overwhelmed.",
      "It's okay to ask for help with household tasks. Everyone needs support sometimes.",
      "Self-care isn't selfish; it's necessary. What's one small thing you could do for yourself today?"
    ];
    return wellbeingResponses[Math.floor(Math.random() * wellbeingResponses.length)];
  }
  
  // Default responses
  const defaultResponses = [
    "I'm here to help make your day easier. What can I assist you with in the kitchen?",
    "I'd love to hear more about what you need help with today.",
    "Whether it's cooking, organizing, or just chatting, I'm here for you.",
    "Feel free to ask me anything about recipes, meal planning, or kitchen organization.",
    "I'm your kitchen companion. What's on your mind today?"
  ];
  
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

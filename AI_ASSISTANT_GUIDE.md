# AI Assistant Guide

## Overview

The AI Assistant is now fully functional and powered by OpenAI's GPT-4o-mini model. It provides expert ultra running advice with context-awareness of your current event and race plan.

---

## Setup

### 1. Add Your OpenAI API Key

1. Go to **Settings** (top navigation)
2. Enter your OpenAI API key in the "OpenAI API Key" field
3. Click **"Save Settings"**

**Getting an API Key:**
- Visit [platform.openai.com](https://platform.openai.com/api-keys)
- Sign in or create an account
- Click "Create new secret key"
- Copy the key and paste it into the app settings

**Note:** Your API key is encrypted and stored securely in the database.

---

## Using the AI Assistant

### Location
The AI Assistant appears on your event dashboard in the bottom-right section.

### How to Use
1. Type your question in the input box
2. Press Enter or click the Send button (➤)
3. The assistant will respond with detailed advice

### Response Time
- Typical response: 2-5 seconds
- Longer responses may take up to 10 seconds

---

## Features

### 1. **Context-Aware Responses**

The AI has access to your current event details:
- Event name and date
- Total distance
- Target duration
- Elevation gain and loss
- All waypoints and stop times
- Calculated leg-by-leg breakdown
- Pace adjustment settings

**Example:**
```
You: "What should my nutrition strategy be?"

AI: "Based on your 100-mile race with 23h 55m target time and 
18,000 feet of elevation gain, here's a detailed nutrition plan..."
```

### 2. **Expert Ultra Running Knowledge**

The AI assistant specializes in:

**Training & Preparation**
- Training plan development
- Periodization strategies
- Taper protocols
- Specific workout recommendations

**Race Day Strategy**
- Pacing for different terrains
- Elevation management
- Mental strategies
- Time management at aid stations

**Nutrition & Hydration**
- Calorie requirements
- Hydration strategies
- Electrolyte management
- Stomach upset prevention
- Specific product recommendations

**Gear & Equipment**
- Shoe selection
- Pack recommendations
- Clothing strategies
- Night running gear
- Weather-specific gear

**Recovery**
- Post-race recovery protocols
- Managing common issues
- When to seek medical attention
- Long-term recovery strategies

**Injury Prevention**
- Common ultra injuries
- Prevention strategies
- Addressing early warning signs

### 3. **Example Questions**

**General Training:**
- "How should I train for my first 100-miler?"
- "What's a good weekly mileage for my event?"
- "How do I handle back-to-back long runs?"

**Event-Specific:**
- "Given my target time and elevation, what pacing strategy should I use?"
- "My legs look too aggressive in the second half - how should I adjust?"
- "Should I add more stop time at higher elevation waypoints?"

**Nutrition:**
- "How many calories should I consume per hour?"
- "What should I eat during the night sections?"
- "How do I prevent stomach issues?"

**Technical:**
- "What's the best strategy for the descent after mile 75?"
- "How do I handle the elevation gain in the first 30 miles?"
- "Should I walk the uphills or try to maintain a slow jog?"

**Gear:**
- "What should I pack for a mountain 100-miler in September?"
- "When should I change shoes during the race?"
- "Do I need poles for this elevation profile?"

---

## Tips for Best Results

### 1. **Be Specific**
❌ "Tell me about nutrition"
✅ "What nutrition strategy should I use for my 100-mile race, given I'll be running for 24 hours with significant night sections?"

### 2. **Ask About Your Event**
The AI has access to your current event details, so ask questions about YOUR specific race:
- "Looking at my waypoints, which legs should I be most conservative on?"
- "Is my overall pacing strategy realistic given the elevation profile?"

### 3. **Follow-Up Questions**
You can ask follow-up questions to dive deeper:
- "Can you elaborate on the hydration strategy?"
- "What specific products would you recommend?"

### 4. **Multiple Topics**
Feel free to ask about different aspects:
- Start with strategy questions
- Then ask about specific sections
- Follow up with gear or nutrition questions

---

## Current Limitations

### 1. **No Conversation History**
- Each question is independent
- The AI doesn't remember previous questions in the same session
- Include relevant context in each question

### 2. **Document Upload (Coming Soon)**
- Document upload feature exists but embeddings aren't yet implemented
- For now, the AI uses its built-in ultra running knowledge
- Future: Upload training guides, race guides, etc., and the AI will reference them

### 3. **Response Length**
- Responses are limited to ~800 tokens (about 600 words)
- For very detailed questions, you may need to ask follow-up questions

---

## Troubleshooting

### "AI assistant is not configured"
- Make sure you've added your OpenAI API key in Settings
- The key must be valid and have available credits

### "Authentication error: Your OpenAI API key appears to be invalid"
- Your API key is incorrect or has been revoked
- Generate a new key at platform.openai.com
- Update it in Settings

### "Rate limit exceeded"
- You've made too many requests in a short time
- Wait 60 seconds and try again
- Consider upgrading your OpenAI plan if this happens frequently

### "Sorry, I encountered an error"
- Check your internet connection
- Verify your OpenAI account has available credits
- Try again in a few moments
- Check the backend logs: `docker-compose logs backend --tail 50`

---

## Cost Information

### API Usage
- The app uses GPT-4o-mini model
- Approximate cost: $0.15 per 1M input tokens, $0.60 per 1M output tokens
- Average conversation:
  - ~500 input tokens (including context)
  - ~400 output tokens
  - Cost: ~$0.0003 per question (less than a penny)

### Cost Management
- Context is automatically optimized
- Only relevant information is sent to the API
- Responses are capped to prevent excessive usage

### Monitoring Usage
- Check your OpenAI dashboard: platform.openai.com/usage
- Set up usage limits in your OpenAI account
- The app does not track or store conversation history

---

## Privacy & Security

### Your Data
- **API Key**: Encrypted in the database
- **Questions**: Sent directly to OpenAI, not stored locally
- **Responses**: Not saved (no conversation history)
- **Event Data**: Only sent if relevant to your question

### OpenAI's Policies
- OpenAI does not use API data to train models
- Conversations via API are not stored by OpenAI (per their policy)
- See OpenAI's API data usage policy for details

---

## Future Enhancements

### Coming Soon
1. **Document RAG (Retrieval Augmented Generation)**
   - Upload race guides, training plans, etc.
   - AI will reference your documents in responses
   - Vector search for relevant information

2. **Conversation History**
   - View past conversations
   - Continue previous threads
   - Save important advice

3. **Advanced Context**
   - Compare multiple events
   - Training log integration
   - Weather data integration

4. **Web Search**
   - Real-time information lookup
   - Current race conditions
   - Trail reports

---

## Example Conversation

**User:** "Looking at my event, is my pacing realistic?"

**AI Response:**
"Based on your 100-mile race with a 23h 55m target and 18,000 feet of elevation gain, let me analyze your plan:

**Overall Assessment:** Your target pace is ambitious but achievable with proper training. Here's my analysis:

1. **Elevation Impact:** 18,000 feet of climbing will significantly affect your pace. Your current elevation gain adjustment of 0.01 (1% slower per meter) is conservative - you might need 1.5-2% depending on terrain.

2. **Fatigue Factor:** Your 5% fatigue slowdown is realistic. Expect your pace to decrease by 15-20% in the final 25 miles.

3. **Night Running:** You'll likely hit darkness around mile 60-70. Plan for 10-15% slower pace during night sections.

**Recommendations:**
- Front-load your nutrition in the first 50 miles
- Be conservative on early climbs (you have 10 waypoints before mile 40)
- Plan for 30-45 min total stop time at aid stations
- Consider adding a 10-minute rest at mile 75

Would you like me to elaborate on any specific section of your race?"

---

## Getting Help

If you encounter issues:
1. Check this guide first
2. Verify your API key in Settings
3. Check the QUICKSTART.md for general app usage
4. Review backend logs: `docker-compose logs backend --tail 50`

---

**Happy Running! 🏃‍♂️⛰️**


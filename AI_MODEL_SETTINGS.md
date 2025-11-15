# AI Model Settings Guide

## Overview

You can now customize the AI model and reasoning effort used by the chat assistant directly from the Settings page. This gives you full control over performance, cost, and quality.

## Settings

### 1. AI Model (Text Input)

**Location**: Settings → API Keys → AI Model

**What it does**: Specifies which OpenAI reasoning/thinking model to use for the AI assistant.

**Default**: `gpt-5-nano-2025-08-07`

**Supported Models**:
- `gpt-5-nano-2025-08-07` - Fast, affordable, good quality
- `o1` - More advanced reasoning, slower, more expensive
- `o1-mini` - Balanced version of o1
- `o3-mini` - Latest generation (if available)
- Any future OpenAI reasoning models

**Requirements**:
- Must be a **reasoning/thinking model** (models that support the `responses` API endpoint)
- Must support the `reasoning` parameter
- Standard chat models (gpt-4, gpt-4-turbo, etc.) will NOT work

**When to Change**:
- Try newer models as they become available
- Switch to faster/cheaper models for routine questions
- Use more powerful models for complex planning

### 2. Reasoning Effort (Dropdown)

**Location**: Settings → API Keys → Reasoning Effort

**What it does**: Controls how much "thinking" the model does before responding.

**Options**:
1. **Minimal** - Fastest, cheapest
   - Quick responses
   - Good for simple questions
   - Lowest cost

2. **Low** - Fast responses (Default)
   - Balanced speed and quality
   - Good for most use cases
   - Affordable

3. **Medium** - Balanced
   - More thorough analysis
   - Better for complex planning
   - Moderate cost

4. **High** - Most thorough
   - Deepest reasoning
   - Best quality answers
   - Slowest and most expensive

**Cost Impact**:
Higher reasoning effort = more tokens used = higher cost per query

**Example Costs** (approximate for gpt-5-nano):
- Minimal: ~$0.001 per query
- Low: ~$0.002 per query
- Medium: ~$0.005 per query
- High: ~$0.015 per query

## How to Use

1. Go to **Settings** in the navigation menu
2. Scroll to the **API Keys** section
3. Enter your desired AI model name (or leave default)
4. Select your preferred reasoning effort from the dropdown
5. Click **Save Settings**
6. Your next chat message will use the new settings

## Persistence

- Settings are saved to the database
- They persist across sessions and container restarts
- Each user can have their own preferences (single-user app for now)
- Changes take effect immediately for new conversations

## Tips

### For Daily Use:
- **Model**: `gpt-5-nano-2025-08-07`
- **Effort**: `low`
- Fast, affordable, good quality

### For Race Planning:
- **Model**: `o1-mini` or `o3-mini`
- **Effort**: `medium` or `high`
- More thorough analysis for critical decisions

### For Quick Questions:
- **Model**: `gpt-5-nano-2025-08-07`
- **Effort**: `minimal`
- Instant responses for simple queries

### For Complex Strategy:
- **Model**: `o1`
- **Effort**: `high`
- Best quality for difficult planning scenarios

## Technical Details

**Backend Implementation**:
- Database columns: `ai_model` (String), `reasoning_effort` (String)
- Values passed directly to OpenAI `responses.create()` API call
- Defaults applied if fields are empty

**API Call**:
```python
stream = client.responses.create(
    model=settings.ai_model,  # User's choice
    reasoning={"effort": settings.reasoning_effort},  # User's choice
    # ... other parameters
)
```

**Frontend**:
- AI Model: Free text input (no validation - user responsible)
- Reasoning Effort: Dropdown (validated to 4 options)

## Troubleshooting

### Error: "Unknown model"
- The model you entered doesn't exist or isn't available
- Check spelling and model name format
- Ensure it's a **reasoning** model (not a standard chat model)

### Error: "Invalid reasoning effort"
- The effort level isn't supported by that model
- Try a different effort level (low/medium are safest)

### Slow Responses
- Try a faster model (gpt-5-nano instead of o1)
- Reduce reasoning effort to low/minimal

### Poor Quality Answers
- Increase reasoning effort to medium/high
- Try a more advanced model (o1, o3-mini)

## Future Enhancements

Possible future additions:
- Per-conversation model selection
- Model usage analytics and cost tracking
- Model recommendations based on query type
- Preset configurations (Fast, Balanced, Quality)
- Support for other providers (Anthropic, etc.)

## Related Documentation

- [AI Assistant Guide](./AI_ASSISTANT_GUIDE.md) - Full AI assistant features
- [RAG Implementation](./RAG_IMPLEMENTATION_COMPLETE.md) - Document search and context
- [Chat Persistence](./CHAT_PERSISTENCE_FEATURE.md) - Chat history and sessions


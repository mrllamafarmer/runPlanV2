# Chat Persistence Feature

## Overview

The AI Assistant now includes **persistent chat history** that saves all conversations to the PostgreSQL database. Your chats are preserved across sessions, page refreshes, and even Docker restarts!

## What's New

### 1. Persistent Chat Storage
- ✅ All chat messages are automatically saved to the database
- ✅ Chat sessions are organized per event
- ✅ Conversations survive page refreshes and app restarts
- ✅ Data is stored in PostgreSQL (part of your existing backup strategy)

### 2. Chat History Sidebar
- 📜 View all past conversations for the current event
- 🔍 Click on any past chat to load the full conversation
- 📝 Each chat is titled with the first message (truncated to 50 chars)
- 🗑️ Delete old chats you no longer need

### 3. Session Management
- 🆕 Start a new chat at any time
- 🔄 Continue existing conversations automatically
- 📊 See when each chat was last updated
- 🔗 Each chat is linked to a specific event

## How to Use

### Starting a New Chat
1. Navigate to any event dashboard
2. Type your question in the AI Assistant panel
3. A new chat session is automatically created
4. The session is saved with your first message as the title

### Viewing Past Chats
1. Click the **History icon** (📜) in the AI Assistant header
2. A sidebar appears showing all past chats for this event
3. Click on any chat to load its full conversation
4. The currently active chat is highlighted in blue

### Continuing a Conversation
- Once you load a chat, all new messages are added to that session
- The chat **automatically restores** when you return to the event dashboard
- The chat history persists even if you:
  - Navigate away from the page
  - Refresh the browser
  - Edit waypoints or update the event
  - Restart Docker containers

**Auto-Restore Feature:**
- The last active chat for each event is saved to browser localStorage
- When you return to an event, your last conversation is automatically loaded
- No more manually finding your chat after editing waypoints!
- Each event remembers its own active chat independently

### Starting Fresh
- Click the **Plus icon** (+) to start a new conversation
- This clears the current chat display
- Your next message creates a new session

### Deleting Chats
1. Open the chat history sidebar
2. Hover over any chat
3. Click the **trash icon** that appears
4. Confirm deletion
5. The chat and all its messages are permanently removed

## Technical Details

### Database Schema

**`chat_sessions` Table:**
- `id` - Unique session identifier (UUID)
- `event_id` - Links session to an event (nullable)
- `title` - Chat title (first message, max 50 chars)
- `created_at` - When the session started
- `updated_at` - Last message timestamp

**`chat_messages` Table:**
- `id` - Unique message identifier (UUID)
- `session_id` - Links to the session
- `role` - Either "user" or "assistant"
- `content` - The message text
- `sources` - JSON with citations (for assistant messages)
- `created_at` - When the message was sent

### API Endpoints

**`POST /api/chat`**
- Send a message to the AI
- Automatically creates a session if `session_id` is not provided
- Continues an existing session if `session_id` is provided
- Returns streaming response with session_id

**`GET /api/chat/sessions`**
- Get all chat sessions
- Optional query param: `event_id` to filter by event
- Returns sessions sorted by `updated_at` (newest first)

**`GET /api/chat/sessions/{session_id}`**
- Get a specific session with all its messages
- Returns full conversation history

**`DELETE /api/chat/sessions/{session_id}`**
- Delete a chat session
- Cascade deletes all messages in the session

### Frontend Updates

**New Features:**
- Session state management
- Chat history loader
- Auto-save session ID from stream
- **Auto-restore active session** from localStorage
- History sidebar with search/filter
- Delete confirmation dialog

**UI Components:**
- History icon button (top-right of AI panel)
- New chat icon button (top-right of AI panel)
- Slide-out history sidebar
- Chat session cards with timestamps
- Delete buttons (appear on hover)

**Persistence Strategy:**
- **Database**: All messages and sessions stored in PostgreSQL
- **localStorage**: Active session ID per event for auto-restore
- **Format**: `chat_session_${eventId}` → `session_uuid`
- **Lifecycle**: Saved on session create/load, cleared on new chat/delete

## Benefits

### For Users
- 📚 **Reference Past Conversations** - Go back to previous advice
- 💡 **Build on Previous Discussions** - Continue where you left off
- 🔍 **Easy to Find** - All chats organized by event
- 🛡️ **Never Lose Context** - Chats survive browser crashes

### For Development
- 📊 **Analytics Ready** - Track usage patterns
- 🐛 **Debugging** - Review conversation history for issues
- 🔄 **Data Persistence** - Integrated with existing backup strategy
- 🏗️ **Scalable** - PostgreSQL handles millions of messages

## Data Management

### Backup
- Chat data is part of your PostgreSQL database
- Backed up in `./data/postgres` (bind mount)
- Included in standard database backup procedures

### Storage Considerations
- Average message: ~500 bytes
- 1000 messages = ~500 KB
- Indexed for fast retrieval
- Cascade delete removes orphaned messages

### Privacy
- Chats are stored locally in your database
- OpenAI API key is encrypted (existing security)
- No chat data sent to third parties
- Delete functionality gives users control

## Troubleshooting

### Chat Disappears When Editing Waypoint
**Fixed!** Chats now persist across all page interactions.

### History Not Loading
1. Check backend logs: `docker-compose logs backend --tail 50`
2. Verify tables exist: `docker-compose exec db psql -U runner -d ultraplanner -c "\dt"`
3. Restart backend: `docker-compose restart backend`

### Session ID Not Saving
- The session ID is sent in the first stream event
- Check browser console for errors
- Ensure backend is sending `data: {"session_id": "..."}`

### Can't Delete Chat
- Ensure you have database write permissions
- Check for foreign key constraints
- Restart backend if needed

## Future Enhancements

Potential improvements for future versions:

- 🔍 **Search** - Full-text search across all chats
- 🏷️ **Tags** - Categorize chats by topic
- 📤 **Export** - Download chat history as PDF/Markdown
- 📊 **Analytics** - View chat usage statistics
- 🔗 **Share** - Share specific conversations
- 🤖 **Context Aware** - Load chat context into new conversations

## Migration Notes

### From Old Version
If you're upgrading from a version without chat persistence:
1. Old chats (not saved) are lost
2. New chats (after upgrade) are automatically saved
3. No manual migration needed
4. Tables are created automatically on first run

### Database Schema
The new tables are created by SQLAlchemy's `Base.metadata.create_all()`:
- Runs automatically on backend startup
- Idempotent (safe to run multiple times)
- No manual SQL execution needed

## Conclusion

The Chat Persistence feature transforms the AI Assistant from a stateless helper into a comprehensive knowledge base for your ultra running planning. Never lose important advice, and build up a library of insights specific to your training and races!

**Happy planning! 🏃‍♂️💨**


import { NextRequest, NextResponse } from 'next/server';

interface MergeRequest {
  messageIds: string[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
}

/**
 * POST /api/messages/merge
 * Merge multiple messages into a single message.
 * Body: { messageIds: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body: MergeRequest = await request.json();
    const { messageIds } = body;

    if (!Array.isArray(messageIds) || messageIds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 message IDs are required to merge.' },
        { status: 400 }
      );
    }

    // In a real implementation, fetch messages from your store/database.
    // For now, we demonstrate the merge logic with placeholder data.
    const messages: Message[] = messageIds.map((id) => ({
      id,
      role: 'user',
      content: `[Content of message ${id}]`,
      createdAt: new Date().toISOString(),
    }));

    // Determine the merged role (use the first message's role)
    const mergedRole = messages[0].role;

    // Merge content by joining with newlines
    const mergedContent = messages
      .map((msg, i) => (msg.role === 'user' ? `**Q${i + 1}:** ${msg.content}` : `**A${i + 1}:** ${msg.content}`))
      .join('\n\n---\n\n');

    const mergedMessage: Message = {
      id: `merged-${Date.now()}`,
      role: mergedRole,
      content: mergedContent,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: mergedMessage,
      mergedFrom: messageIds,
      count: messages.length,
    });
  } catch (error) {
    console.error('[POST /api/messages/merge] Error:', error);
    return NextResponse.json(
      { error: 'Failed to merge messages.' },
      { status: 500 }
    );
  }
}

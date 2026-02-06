import { NextRequest, NextResponse } from 'next/server';
import { createOpenAIClient, SYSTEM_PROMPT } from '@/lib/openai';
import { logChatMessage } from '@/lib/telemetry';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

// Rough token estimation (~4 chars per token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Server-side safety net: trim messages to fit within model context window.
// This prevents 400 errors from OpenAI when conversation history is too long.
function trimMessagesForModel(
  messages: ChatMessage[],
  systemPrompt: string,
  maxTokenBudget: number = 14000 // conservative budget for input tokens
): ChatMessage[] {
  const systemTokens = estimateTokens(systemPrompt);
  const availableBudget = maxTokenBudget - systemTokens;

  if (messages.length === 0) return messages;

  // Always keep the latest message
  const latestMessage = messages[messages.length - 1];
  let latestTokens = estimateTokens(latestMessage.content);

  // If the latest message alone exceeds the budget, truncate it
  if (latestTokens > availableBudget) {
    const maxChars = availableBudget * 4;
    return [{
      ...latestMessage,
      content: latestMessage.content.slice(0, maxChars) + '\n\n[Content truncated due to length]'
    }];
  }

  let totalTokens = latestTokens;
  const result: ChatMessage[] = [];

  // Walk backwards from second-to-last, adding messages while within budget
  for (let i = messages.length - 2; i >= 0; i--) {
    const msg = messages[i];
    const msgTokens = estimateTokens(msg.content);

    if (totalTokens + msgTokens > availableBudget) {
      break;
    }

    totalTokens += msgTokens;
    result.unshift(msg);
  }

  result.push(latestMessage);
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const { messages }: ChatRequest = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    // Server-side trimming as safety net (client already trims, but this catches edge cases)
    const trimmedMessages = trimMessagesForModel(messages, SYSTEM_PROMPT);

    const messagesWithSystem: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...trimmedMessages
    ];

    const userMessage = messages[messages.length - 1]?.content || '';
    const userId = req.headers.get('x-forwarded-for') || 'anonymous';
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const { client: openaiClient, deploymentName } = createOpenAIClient();
          
          const response = await openaiClient.chat.completions.create({
            model: deploymentName as any,
            messages: messagesWithSystem.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            stream: true
          });

          let assistantMessage = '';

          for await (const chunk of response) {
            const choice = chunk.choices[0];
            if (choice?.delta?.content) {
              assistantMessage += choice.delta.content;
              const data = JSON.stringify({ content: choice.delta.content });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }
          }

          logChatMessage(userId, userMessage, assistantMessage);

          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        } catch (apiError: any) {
          console.error('OpenAI API error:', apiError?.message || apiError);
          // Close the stream gracefully so the client doesn't hang
          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat route error:', error?.message || error);
    // Return an empty stream so the client handles it gracefully
    const emptyStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      }
    });
    return new Response(emptyStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
}
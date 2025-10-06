import { NextRequest, NextResponse } from 'next/server';
import { createOpenAIClient, SYSTEM_PROMPT } from '@/lib/openai';
import { searchWeb, shouldSearch } from '@/lib/websearch';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

export async function POST(req: NextRequest) {
  const { messages }: ChatRequest = await req.json();

  const lastUserMessage = messages[messages.length - 1]?.content || '';
  let webContext = '';
  
  if (shouldSearch(lastUserMessage)) {
    webContext = await searchWeb(lastUserMessage);
  }

  const messagesWithSystem: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages
  ];

  if (webContext) {
    messagesWithSystem.push({
      role: 'system',
      content: `Web Search Context:\n${webContext}\n\nUse this information to supplement your response if relevant.`
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const { client: openaiClient, deploymentName } = createOpenAIClient();
      
      const response = await openaiClient.chat.completions.create({
        model: deploymentName as any,
        messages: messagesWithSystem.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: true
      });

      for await (const chunk of response) {
        const choice = chunk.choices[0];
        if (choice?.delta?.content) {
          const data = JSON.stringify({ content: choice.delta.content });
          controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
        }
      }

      controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
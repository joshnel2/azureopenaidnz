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

  const messagesWithSystem: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages
  ];

  const stream = new ReadableStream({
    async start(controller) {
      const { client: openaiClient, deploymentName } = createOpenAIClient();
      
      const response = await openaiClient.chat.completions.create({
        model: deploymentName as any,
        messages: messagesWithSystem.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: true,
        tools: [
          {
            type: 'function',
            function: {
              name: 'search_web',
              description: 'Search the web for current information, recent events, news, or real-time data. Use this when you need up-to-date information beyond your training data.',
              parameters: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'The search query to find current information'
                  }
                },
                required: ['query']
              }
            }
          }
        ]
      });

      for await (const chunk of response) {
        const choice = chunk.choices[0];
        
        if (choice?.delta?.tool_calls) {
          const toolCall = choice.delta.tool_calls[0];
          if (toolCall?.function?.name === 'search_web' && toolCall?.function?.arguments) {
            const args = JSON.parse(toolCall.function.arguments);
            const searchResults = await searchWeb(args.query);
            
            const followUpResponse = await openaiClient.chat.completions.create({
              model: deploymentName as any,
              messages: [
                ...messagesWithSystem.map(msg => ({
                  role: msg.role,
                  content: msg.content
                })),
                {
                  role: 'system',
                  content: `Web Search Results:\n${searchResults}\n\nUse this information to provide an accurate, up-to-date response.`
                }
              ],
              stream: true
            });
            
            for await (const followChunk of followUpResponse) {
              const followChoice = followChunk.choices[0];
              if (followChoice?.delta?.content) {
                const data = JSON.stringify({ content: followChoice.delta.content });
                controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
              }
            }
          }
        } else if (choice?.delta?.content) {
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
import { NextRequest, NextResponse } from 'next/server';
import { createOpenAIClient, SYSTEM_PROMPT } from '@/lib/openai';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

export async function POST(req: NextRequest) {
  try {
    const { messages }: ChatRequest = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Add system prompt as the first message
    const messagesWithSystem: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages
    ];

    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('Creating OpenAI client...');
          const { client: openaiClient, deploymentName } = createOpenAIClient();
          console.log('Deployment name:', deploymentName);
          
          console.log('Sending request to Azure OpenAI...');
          const response = await openaiClient.chat.completions.create({
            model: deploymentName,
            messages: messagesWithSystem.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            stream: true
          });
          
          console.log('Got response, starting to stream...');

          for await (const chunk of response) {
            const choice = chunk.choices[0];
            if (choice?.delta?.content) {
              const data = JSON.stringify({ content: choice.delta.content });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }
          }

          controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('OpenAI API error:', error);
          const errorData = JSON.stringify({ 
            error: 'Sorry, something went wrong. Please try again.' 
          });
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
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
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Sorry, something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
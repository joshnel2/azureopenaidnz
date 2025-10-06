import { NextRequest, NextResponse } from 'next/server';
import { createOpenAIClient, SYSTEM_PROMPT } from '@/lib/openai';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{type: string; text?: string; image_url?: {url: string}}>;
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
          
          console.log('Sending request to Azure OpenAI with enhanced capabilities...');
          
          const processedMessages = messagesWithSystem.map(msg => {
            if (typeof msg.content === 'string' && msg.content.includes('data:image/')) {
              const imageMatch = msg.content.match(/data:image\/[^;]+;base64,[^\s\n]+/);
              if (imageMatch) {
                const imageUrl = imageMatch[0];
                const textParts = msg.content.split(imageUrl);
                const beforeText = textParts[0].replace(/\[IMAGE:.*?\]\n\nImage data \(base64-encoded for vision analysis\):\n/, '').trim();
                const afterText = textParts[1] ? textParts[1].replace(/\n\nPlease analyze this image.*$/, '').trim() : '';
                const finalText = (beforeText + ' ' + afterText).trim() || 'Please analyze this image and extract any text or information.';
                
                return {
                  role: msg.role,
                  content: [
                    { type: 'text', text: finalText },
                    { type: 'image_url', image_url: { url: imageUrl } }
                  ]
                };
              }
            }
            return {
              role: msg.role,
              content: msg.content
            };
          });
          
          const response = await openaiClient.chat.completions.create({
            model: deploymentName,
            messages: processedMessages as any,
            stream: true,
            temperature: 0.7,
            max_tokens: 4000,
            top_p: 0.95
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
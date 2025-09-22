import { NextRequest, NextResponse } from 'next/server';
import { createOpenAIClient, SYSTEM_PROMPT } from '@/lib/openai';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

async function searchWeb(query: string) {
  try {
    const searchResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    
    if (searchResponse.ok) {
      const { results } = await searchResponse.json();
      return results;
    }
  } catch (error) {
    console.error('Web search failed:', error);
  }
  return [];
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

    // Get the latest user message
    const latestUserMessage = messages[messages.length - 1];
    
    // Check if web search was requested
    const shouldSearch = latestUserMessage?.content && 
      latestUserMessage.content.includes('[WEB_SEARCH_REQUESTED]');

    let searchResults = '';
    if (shouldSearch && latestUserMessage) {
      console.log('Searching web for current legal information...');
      const cleanQuery = latestUserMessage.content.replace('[WEB_SEARCH_REQUESTED]', '').trim();
      const results = await searchWeb(cleanQuery);
      if (results && results.length > 0) {
        searchResults = '\n\n--- CURRENT LEGAL INFORMATION FROM WEB SEARCH ---\n\n';
        results.forEach((result: any, index: number) => {
          searchResults += `${index + 1}. ${result.title}\n${result.snippet}\nSource: ${result.url}\n\n`;
        });
        searchResults += '--- END WEB SEARCH RESULTS ---\n\n';
      }
    }

    // Add system prompt with web search results if available
    const enhancedSystemPrompt = SYSTEM_PROMPT + (searchResults ? 
      '\n\nYou have access to current legal information from web search. Use this information to provide up-to-date legal guidance while maintaining all disclaimers.' : '');

    const messagesWithSystem: ChatMessage[] = [
      { role: 'system', content: enhancedSystemPrompt },
      ...messages.slice(0, -1), // All messages except the last one
      { role: 'user', content: (shouldSearch ? cleanQuery : latestUserMessage.content) + searchResults } // Add search results to last message
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
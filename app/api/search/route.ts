import { NextRequest, NextResponse } from 'next/server';

export interface SearchRequest {
  query: string;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function POST(req: NextRequest) {
  try {
    const { query }: SearchRequest = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Use a simple web search API (you can replace with better service)
    const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query + ' legal law case')}`;
    
    try {
      const response = await fetch(searchUrl, {
        headers: {
          'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY || '',
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Search API failed');
      }

      const data = await response.json();
      
      const results: SearchResult[] = data.web?.results?.slice(0, 5).map((result: any) => ({
        title: result.title,
        url: result.url,
        snippet: result.description
      })) || [];

      return NextResponse.json({ results });

    } catch (searchError) {
      console.error('Search API error:', searchError);
      
      // Fallback: return a message indicating search is not available
      const fallbackResults: SearchResult[] = [{
        title: "Web Search Currently Unavailable",
        url: "",
        snippet: "I'll provide analysis based on my training data. For the most current legal information, please consult recent legal databases or a qualified attorney."
      }];
      
      return NextResponse.json({ results: fallbackResults });
    }

  } catch (error) {
    console.error('Search route error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
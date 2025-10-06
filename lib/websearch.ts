import axios from 'axios';

export async function searchWeb(query: string): Promise<string> {
  try {
    const response = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
    
    if (response.data.AbstractText) {
      return `Web Search Results for "${query}":\n\n${response.data.AbstractText}\n\nSource: ${response.data.AbstractURL || 'DuckDuckGo'}`;
    }
    
    if (response.data.RelatedTopics && response.data.RelatedTopics.length > 0) {
      const topics = response.data.RelatedTopics
        .slice(0, 5)
        .map((topic: any) => topic.Text)
        .filter((text: string) => text)
        .join('\n\n');
      
      return `Web Search Results for "${query}":\n\n${topics}`;
    }
    
    return `No specific results found for "${query}". Please try a more specific search query.`;
  } catch (error) {
    return `Web search temporarily unavailable. Providing answer based on training data.`;
  }
}

export function shouldSearch(message: string): boolean {
  const searchKeywords = [
    'current', 'recent', 'latest', 'today', 'now', 'this week', 'this month', 
    'this year', '2024', '2025', 'news', 'update', 'what is happening',
    'real-time', 'live', 'breaking', 'just announced'
  ];
  
  const messageLower = message.toLowerCase();
  return searchKeywords.some(keyword => messageLower.includes(keyword));
}

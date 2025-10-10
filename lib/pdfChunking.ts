export async function chunkAndSummarizePDF(
  pages: string[],
  fileName: string,
  apiEndpoint: string
): Promise<string> {
  const CHUNK_SIZE = 50;
  const chunks: string[] = [];
  
  // Split into chunks of 50 pages
  for (let i = 0; i < pages.length; i += CHUNK_SIZE) {
    const chunk = pages.slice(i, i + CHUNK_SIZE);
    chunks.push(chunk.join('\n'));
  }
  
  // If 50 pages or less, return as-is
  if (chunks.length === 1) {
    return `[PDF FILE: ${fileName}]\n\nExtracted content from PDF (${pages.length} pages):\n${chunks[0]}`;
  }
  
  // Summarize each chunk
  const summaries: string[] = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunkStart = i * CHUNK_SIZE + 1;
    const chunkEnd = Math.min((i + 1) * CHUNK_SIZE, pages.length);
    
    const summary = await summarizeChunk(chunks[i], chunkStart, chunkEnd, apiEndpoint);
    summaries.push(`Pages ${chunkStart}-${chunkEnd} Summary:\n${summary}`);
  }
  
  // Combine all summaries
  const combinedSummaries = summaries.join('\n\n---\n\n');
  
  return `[PDF FILE: ${fileName}]\n\nThis PDF has ${pages.length} pages. It was processed in ${chunks.length} chunks and summarized below:\n\n${combinedSummaries}`;
}

async function summarizeChunk(
  chunkText: string,
  startPage: number,
  endPage: number,
  apiEndpoint: string
): Promise<string> {
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: 'You are a legal document summarizer. Provide concise but comprehensive summaries of document sections.'
        },
        {
          role: 'user',
          content: `Summarize the following pages ${startPage}-${endPage} of a legal document. Include key points, important clauses, parties involved, and critical information:\n\n${chunkText}`
        }
      ]
    })
  });
  
  const reader = response.body?.getReader();
  if (!reader) return 'Summary unavailable';
  
  let summary = '';
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') break;
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) {
            summary += parsed.content;
          }
        } catch (e) {}
      }
    }
  }
  
  return summary || 'Summary generation failed';
}

/**
 * Web Search Tool
 *
 * A simulated web search tool that demonstrates the search capability.
 * In production, this could be integrated with actual search APIs
 * (e.g., Serper, SerpAPI, Google Custom Search).
 */

import { FunctionTool } from '@google/adk';
import { z } from 'zod/v4';

export const webSearch = new FunctionTool({
    name: 'web_search',
    description:
        'Searches the internet for information on a given query. ' +
        'Returns search results with titles, snippets, and URLs. ' +
        'Note: This is a simplified implementation. For production use, ' +
        'integrate with a real search API.',
    parameters: z.object({
        query: z.string().describe('The search query string'),
        num_results: z
            .number()
            .optional()
            .default(3)
            .describe('Number of results to return (default: 3)'),
    }),
    execute: ({ query }) => {
        // In a production environment, this would call a real search API.
        // For now, we return a helpful message indicating the limitation.
        return {
            status: 'success',
            note: 'This is a simulated search. In production, integrate with a real search API (e.g., Serper, SerpAPI).',
            query,
            results: [
                {
                    title: `Search results for: ${query}`,
                    snippet: `This is a placeholder result. The agent currently does not have access to live internet search. Please configure a search API provider for real results.`,
                    url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
                },
            ],
            suggestion: `You can manually search this query at: https://www.google.com/search?q=${encodeURIComponent(query)}`,
        };
    },
});

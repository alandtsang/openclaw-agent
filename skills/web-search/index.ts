import { FunctionTool } from '@google/adk';
import { z } from 'zod/v4';
import { search, SafeSearchType } from 'duck-duck-scrape';

export const webSearch = new FunctionTool({
    name: 'web_search',
    description:
        'Searches the internet for information on a given query using DuckDuckGo. ' +
        'Returns search results with titles, snippets, and URLs. ' +
        'Use this tool when you need up-to-date information, news, or facts from the web.',
    parameters: z.object({
        query: z.string().describe('The search query string'),
        num_results: z
            .number()
            .optional()
            .default(5)
            .describe('Number of results to return (maximum: 10, default: 5)'),
    }),
    execute: async ({ query, num_results }) => {
        try {
            const limit = Math.min(num_results || 5, 10);

            // Execute the search
            const searchResults = await search(query, {
                safeSearch: SafeSearchType.MODERATE,
            });

            // Process and limit results
            const results = searchResults.results.slice(0, limit).map(result => ({
                title: result.title,
                snippet: result.description,
                url: result.url,
            }));

            if (results.length === 0) {
                return {
                    status: 'success',
                    query,
                    message: `No results found for query: ${query}`,
                    results: []
                };
            }

            return {
                status: 'success',
                query,
                results,
            };
        } catch (error: any) {
            return {
                status: 'error',
                query,
                message: `Failed to execute search: ${error?.message || 'Unknown error'}`,
            };
        }
    },
});

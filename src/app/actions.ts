/**
 * @fileOverview Server Actions for the Tábua de Marés application.
 */
'use server';

import type { TideData } from '@/services/tabua-de-mares'; // Keep TideData if needed by fetchTideDataAction
import { getTideData } from '@/services/tabua-de-mares';

// Removed fetchStatesAction and fetchCitiesAction as they are no longer used.
// State list is now static and city is a text input.

/**
 * Server action to fetch tide data by scraping.
 * @param stateSlug The URL slug of the state. Special case: "so-paulo" for São Paulo.
 * @param citySlug The URL slug of the city, normalized from user input.
 * @returns A promise that resolves to an array of TideData, an empty array if no data found, or null if a critical error occurs during fetch/scraping.
 */
export async function fetchTideDataAction(stateSlug: string, citySlug: string): Promise<TideData[] | null> {
  try {
    // Basic input validation
    if (!stateSlug || !citySlug) {
      console.warn("[Action] fetchTideDataAction called with empty stateSlug or citySlug.");
      return null; // Return null for invalid input
    }

    console.log(`[Action] Fetching tide data for: ${citySlug}, ${stateSlug}`); // Log the request

    // Use the potentially modified stateSlug ("so-paulo" for SP)
    const data = await getTideData(stateSlug, citySlug);
    // getTideData now returns null for critical fetch/parsing errors,
    // empty array [] for successful scrape with no data found,
    // and TideData[] for successful scrape with data.
    if (data === null) {
        console.log(`[Action] Received null from getTideData for ${citySlug}, ${stateSlug}, indicating a fetch/scraping error.`);
        return null; // Propagate the null to indicate error
    } else {
        console.log(`[Action] Received ${data.length} tide entries for ${citySlug}, ${stateSlug}.`);
        return data; // Returns empty array [] if scraping found nothing, TideData[] otherwise.
    }
  } catch (error) {
    // Catch errors potentially thrown by fetchHtml within getTideData if they weren't caught there
    console.error("[Action] Unexpected error fetching tide data:", error);
    return null; // Return null on unexpected errors
  }
}

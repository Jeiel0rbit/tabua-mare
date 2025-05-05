/**
 * @fileOverview Server Actions for the Tábua de Marés application.
 */
'use server';

import type { ScrapedPageData } from '@/services/tabua-de-mares'; // Import the new return type
import { getTideData } from '@/services/tabua-de-mares';

// Removed fetchStatesAction and fetchCitiesAction as they are no longer used.
// State list is now static and city is a text input.

/**
 * Server action to fetch detailed tide data by scraping.
 * @param stateSlug The URL slug of the state. Special case: "so-paulo" for São Paulo.
 * @param citySlug The URL slug of the city, normalized from user input.
 * @returns A promise that resolves to a ScrapedPageData object, or null if a critical error occurs during fetch/scraping or if input is invalid.
 */
export async function fetchTideDataAction(stateSlug: string, citySlug: string): Promise<ScrapedPageData | null> {
  try {
    // Basic input validation
    if (!stateSlug || !citySlug) {
      console.warn("[Action] fetchTideDataAction called with empty stateSlug or citySlug.");
      return null; // Return null for invalid input
    }

    console.log(`[Action] Fetching detailed tide data for: ${citySlug}, ${stateSlug}`); // Log the request

    // Use the potentially modified stateSlug ("so-paulo" for SP)
    const data = await getTideData(stateSlug, citySlug);

    // getTideData now returns ScrapedPageData or null for critical errors.
    if (data === null) {
        console.log(`[Action] Received null from getTideData for ${citySlug}, ${stateSlug}, indicating a fetch/scraping error.`);
        return null; // Propagate the null to indicate error
    } else {
        console.log(`[Action] Received detailed data for ${citySlug}, ${stateSlug}. Daily entries: ${data.dailyTides.length}. Context: ${data.pageContextText}`);
        return data; // Returns the ScrapedPageData object.
                      // An empty dailyTides array inside means no table/rows found or parsed.
    }
  } catch (error) {
    // Catch errors potentially thrown by fetchHtml within getTideData if they weren't caught there
    console.error("[Action] Unexpected error fetching tide data:", error);
    return null; // Return null on unexpected errors
  }
}

/**
 * @fileOverview Server Actions for the Tábua de Marés application.
 */
'use server';

import type { TideData, StateInfo, CityInfo } from '@/services/tabua-de-mares';
import { getTideData, getStates, getCities } from '@/services/tabua-de-mares';

/**
 * Server action to fetch the list of Brazilian states.
 * @returns A promise that resolves to an array of StateInfo or null if an error occurs.
 */
export async function fetchStatesAction(): Promise<StateInfo[] | null> {
    try {
        console.log("[Action] Fetching states...");
        const states = await getStates();
        console.log(`[Action] Successfully fetched ${states.length} states.`);
        // If getStates throws, the catch block handles it. If it returns [], it's valid.
        return states;
    } catch (error) {
        console.error("[Action] Error fetching states:", error);
        return null; // Return null on error
    }
}

/**
 * Server action to fetch the list of cities for a given state slug.
 * @param stateSlug The URL slug of the state.
 * @returns A promise that resolves to an array of CityInfo or null if an error occurs.
 */
export async function fetchCitiesAction(stateSlug: string): Promise<CityInfo[] | null> {
    try {
        // Basic input validation
        if (!stateSlug) {
            console.warn("[Action] fetchCitiesAction called with empty stateSlug.");
            return null; // Return null for invalid input
        }
        console.log(`[Action] Fetching cities for state slug: ${stateSlug}`);
        const cities = await getCities(stateSlug);
         console.log(`[Action] Successfully fetched ${cities.length} cities for state ${stateSlug}.`);
        // If getCities throws, the catch block handles it. If it returns [], it's valid.
        return cities;
    } catch (error) {
        console.error(`[Action] Error fetching cities for state ${stateSlug}:`, error);
        return null; // Return null on error
    }
}


/**
 * Server action to fetch tide data by scraping.
 * @param stateSlug The URL slug of the state.
 * @param citySlug The URL slug of the city.
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

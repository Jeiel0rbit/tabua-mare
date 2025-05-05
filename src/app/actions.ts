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
        return states;
    } catch (error) {
        console.error("[Action] Error fetching states:", error);
        return null;
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
            throw new Error("State slug is required.");
        }
        console.log(`[Action] Fetching cities for state slug: ${stateSlug}`);
        const cities = await getCities(stateSlug);
         console.log(`[Action] Successfully fetched ${cities.length} cities for state ${stateSlug}.`);
        return cities;
    } catch (error) {
        console.error(`[Action] Error fetching cities for state ${stateSlug}:`, error);
        return null;
    }
}


/**
 * Server action to fetch tide data by scraping.
 * @param stateSlug The URL slug of the state.
 * @param citySlug The URL slug of the city.
 * @returns A promise that resolves to an array of TideData or null if an error occurs.
 */
export async function fetchTideDataAction(stateSlug: string, citySlug: string): Promise<TideData[] | null> {
  try {
    // Basic input validation
    if (!stateSlug || !citySlug) {
      throw new Error("State slug and city slug are required.");
    }

    console.log(`[Action] Fetching tide data for: ${citySlug}, ${stateSlug}`); // Log the request

    const data = await getTideData(stateSlug, citySlug);
    console.log(`[Action] Received ${data?.length ?? 0} tide entries for ${citySlug}, ${stateSlug}.`);
    return data; // Returns empty array if scraping found nothing, null if a fetch/critical error occurred
  } catch (error) {
    console.error("[Action] Error fetching tide data:", error);
    // Return null or throw a more specific error for the client to handle
    return null;
  }
}

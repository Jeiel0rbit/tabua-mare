'use server';

import type { TideData } from '@/services/tabua-de-mares';
import { getTideData } from '@/services/tabua-de-mares';

/**
 * Server action to fetch tide data.
 * @param state The state name.
 * @param city The city name.
 * @returns A promise that resolves to an array of TideData or null if an error occurs.
 */
export async function fetchTideDataAction(state: string, city: string): Promise<TideData[] | null> {
  try {
    // Basic input validation (could be more robust)
    if (!state || !city) {
      throw new Error("State and city are required.");
    }
    // TODO: Ideally, normalize state/city names here (e.g., lower case, remove accents)
    // to match the expected format of the scraping service or API.
    const normalizedState = state.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normalizedCity = city.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    console.log(`Fetching tide data for: ${normalizedCity}, ${normalizedState}`); // Log the request

    const data = await getTideData(normalizedState, normalizedCity);
    return data;
  } catch (error) {
    console.error("Server Action Error fetching tide data:", error);
    // Return null or throw a more specific error for the client to handle
    return null;
  }
}

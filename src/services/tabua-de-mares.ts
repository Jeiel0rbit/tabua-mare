/**
 * @fileOverview Service function for interacting with tabuademares.com.
 * Includes function to fetch tide data for a city.
 */

import { JSDOM } from 'jsdom'; // Using jsdom for server-side DOM parsing

/**
 * Represents tide data for a specific time.
 */
export interface TideData {
  /** The time of the tide. */
  time: string;
  /** The height of the tide in meters (e.g., "1.2"). */
  height: string;
}

// StateInfo and CityInfo interfaces are removed as they are no longer fetched/used here.

const BASE_URL = "https://tabuademares.com";

/**
 * Normalizes a string for use in a URL slug.
 * Converts to lowercase, removes accents, replaces spaces with hyphens.
 * @param input The string to normalize.
 * @returns The normalized string slug.
 */
function normalizeToSlug(input: string): string {
    if (!input) return "";
    return input
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z0-9\s-]/g, '') // Remove invalid chars except space and hyphen
        .trim()
        .replace(/\s+/g, '-'); // Replace spaces with hyphens
}


/**
 * Fetches HTML content from a given URL.
 * @param url The URL to fetch.
 * @returns A promise resolving to the HTML text content.
 * @throws If the fetch request fails or returns a non-OK status.
 */
async function fetchHtml(url: string): Promise<string> {
  console.log(`[Service] Fetching HTML from: ${url}`);
  try {
    // Use 'no-store' or headers to prevent caching issues during development/scraping
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
        // Log the failed URL for easier debugging
      console.error(`[Service] HTTP error! status: ${response.status} for URL: ${url}`);
      // Throw a more informative error
      throw new Error(`HTTP error ${response.status} fetching ${url}`);
    }
    const html = await response.text();
    console.log(`[Service] Successfully fetched HTML from: ${url}`);
    return html;
  } catch (error) {
    // Log the specific error encountered during fetch
    console.error(`[Service] Network or fetch error for ${url}:`, error);
    // Re-throw the original error or a new one wrapping it
    throw new Error(`Failed to fetch HTML from ${url}. Reason: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// getStates and getCities functions are removed as they are no longer used.

/**
 * Asynchronously retrieves tide data for a given state and city by scraping tabuademares.com.
 * Scrapes the specific tide table identified by ID `#tabla_mareas_fondo`.
 * Handles the special 'so-paulo' slug for São Paulo state.
 * @param stateSlug The URL slug of the state (e.g., "para", "rio-de-janeiro", "so-paulo").
 * @param citySlug The URL slug of the city, normalized from user input (e.g., "belem", "santos", "sao-vicente").
 * @returns A promise that resolves to an array of TideData objects, an empty array if no data found, or null if a critical error occurs.
 * @throws If fetching the HTML fails critically.
 */
export async function getTideData(stateSlug: string, citySlug: string): Promise<TideData[] | null> {
  if (!stateSlug || !citySlug) {
     console.warn("[Service] getTideData called with empty stateSlug or citySlug.");
     // Return null to indicate invalid input error, consistent with action layer
     return null;
  }

  // Construct the URL using the provided slugs.
  // The stateSlug might be 'so-paulo' as handled by the caller.
  const url = `${BASE_URL}/br/${stateSlug}/${citySlug}`;
  console.log(`[Service] Requesting tide data from URL: ${url}`);

  try {
    const html = await fetchHtml(url);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Target the table using the specific ID.
    const tideTable = document.querySelector('#tabla_mareas_fondo');

    if (!tideTable) {
      console.warn(`[Service] Tide table with ID 'tabla_mareas_fondo' not found on ${url}. This might mean the city/state combination is invalid or the page structure changed. Returning empty array.`);
      // Return empty array because the page was fetched successfully, but the target table wasn't found.
      // This indicates "no data found for this specific city/state" rather than a server error.
      return [];
    }

    const tideData: TideData[] = [];
    const rows = tideTable.querySelectorAll('tbody tr');

    if (rows.length === 0) {
        console.warn(`[Service] Found table '#tabla_mareas_fondo' but it contains no data rows (tbody tr) on ${url}. Returning empty array.`);
        return []; // Table exists but is empty
    }

    rows.forEach((row, index) => { // Added index for logging
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const time = cells[0]?.textContent?.trim();
        const heightText = cells[1]?.textContent?.trim(); // e.g., "2.8m"

        const heightMatch = heightText?.match(/([\d.,]+)/);
        const height = heightMatch ? heightMatch[1].replace(',', '.') : null;

        if (time && height !== null) {
          tideData.push({ time, height });
        } else {
            // Log which row had issues
            console.warn(`[Service] Skipping row ${index + 1} due to missing/invalid time or height. Time='${time}', HeightText='${heightText}'. Row HTML:`, row.innerHTML);
        }
      } else {
          console.warn(`[Service] Skipping row ${index + 1} due to insufficient cells (${cells.length}). Row HTML:`, row.innerHTML);
      }
    });

    if (tideData.length === 0 && rows.length > 0) {
        // This case means rows were found but none yielded valid data after parsing.
        console.warn(`[Service] Processed ${rows.length} rows in '#tabla_mareas_fondo' but extracted no valid tide data from ${url}. Check parsing logic or source data format.`);
    } else if (tideData.length > 0) {
        console.log(`[Service] Successfully extracted ${tideData.length} tide entries for ${citySlug}, ${stateSlug}.`);
    }
    // If tideData is still empty at this point (either table not found, table empty, or parsing failed for all rows),
    // return the empty array as intended.

    return tideData;

  } catch (error) {
    // Errors from fetchHtml are already logged and re-thrown.
    // Catch potential errors from JSDOM parsing itself, although less common.
    console.error(`[Service] Error processing or parsing HTML for ${citySlug}, ${stateSlug} from ${url}:`, error);
    // Return null for server-side errors during processing, distinct from "no data found" (empty array).
     return null;
  }
}

// Export the normalization function if needed elsewhere, otherwise keep it internal
export { normalizeToSlug };
// Add jsdom to dependencies: npm install jsdom @types/jsdom
// NOTE: Need to install jsdom: `npm install jsdom` and `@types/jsdom`: `npm install --save-dev @types/jsdom`

/**
 * @fileOverview Service functions for interacting with tabuademares.com.
 * Includes functions to fetch states, cities for a state, and tide data for a city.
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

/**
 * Represents a Brazilian state with its display name and URL slug.
 */
export interface StateInfo {
  name: string;
  slug: string;
}

/**
 * Represents a city within a state with its display name and URL slug.
 */
export interface CityInfo {
  name: string;
  slug: string;
}

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
    const response = await fetch(url, { cache: 'no-store' }); // Avoid caching during scraping
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${url}`);
    }
    const html = await response.text();
    console.log(`[Service] Successfully fetched HTML from: ${url}`);
    return html;
  } catch (error) {
    console.error(`[Service] Error fetching ${url}:`, error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

/**
 * Asynchronously retrieves the list of Brazilian states from tabuademares.com.
 * @returns A promise that resolves to an array of StateInfo objects.
 * @throws If scraping fails.
 */
export async function getStates(): Promise<StateInfo[]> {
  const url = `${BASE_URL}/br`;
  try {
    const html = await fetchHtml(url);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Selector based on inspection of tabuademares.com/br on 2024-08-15
    // It seems states are within links inside <section class="container"> -> <ul> elements
    const stateLinks = document.querySelectorAll('section.container ul li a[href^="/br/"]');

    const states: StateInfo[] = [];
    const seenSlugs = new Set<string>();

    stateLinks.forEach(link => {
        const href = link.getAttribute('href');
        const name = link.textContent?.trim();

        if (href && name) {
            const parts = href.split('/');
            // Expecting href like /br/state-slug
            if (parts.length === 3 && parts[1] === 'br' && parts[2]) {
                const slug = parts[2];
                 // Avoid duplicates like /br/rio-grande-do-sul and /br/rio-grande-do-sul/ (though the latter shouldn't match ^="/br/")
                if (!seenSlugs.has(slug)) {
                    states.push({ name, slug });
                    seenSlugs.add(slug);
                 }
            }
        }
    });

     if (states.length === 0) {
        console.warn("[Service] No states found using selector 'section.container ul li a[href^=\"/br/\"]'. Scraping might need adjustment.");
    } else {
        console.log(`[Service] Found ${states.length} states.`);
    }


    // Sort states alphabetically by name
    states.sort((a, b) => a.name.localeCompare(b.name));

    return states;

  } catch (error) {
    console.error("[Service] Error scraping states:", error);
    throw new Error("Failed to scrape states from tabuademares.com.");
  }
}

/**
 * Asynchronously retrieves the list of cities for a given state from tabuademares.com.
 * @param stateSlug The URL slug of the state (e.g., "para", "rio-de-janeiro").
 * @returns A promise that resolves to an array of CityInfo objects.
 * @throws If scraping fails.
 */
export async function getCities(stateSlug: string): Promise<CityInfo[]> {
  if (!stateSlug) {
    console.warn("[Service] getCities called with empty stateSlug.");
    return [];
  }
  const url = `${BASE_URL}/br/${stateSlug}`;
   try {
    const html = await fetchHtml(url);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Selector based on inspection of a state page (e.g., tabuademares.com/br/para) on 2024-08-15
    // Cities seem to be in links within <section class="container"> -> <ul> elements
    // The href should look like /br/state-slug/city-slug
    const cityLinks = document.querySelectorAll(`section.container ul li a[href^="/br/${stateSlug}/"]`);

    const cities: CityInfo[] = [];
     const seenSlugs = new Set<string>();

    cityLinks.forEach(link => {
      const href = link.getAttribute('href');
      const name = link.textContent?.trim();

      if (href && name) {
        const parts = href.split('/');
        // Expecting href like /br/state-slug/city-slug
        if (parts.length === 4 && parts[1] === 'br' && parts[2] === stateSlug && parts[3]) {
          const citySlug = parts[3];
            if(!seenSlugs.has(citySlug)){
                 cities.push({ name, slug: citySlug });
                 seenSlugs.add(citySlug);
            }
        }
      }
    });

     if (cities.length === 0) {
        console.warn(`[Service] No cities found for state '${stateSlug}' using selector 'section.container ul li a[href^="/br/${stateSlug}/"]'. Scraping might need adjustment or the state page structure differs.`);
    } else {
         console.log(`[Service] Found ${cities.length} cities for state '${stateSlug}'.`);
     }

    // Sort cities alphabetically by name
    cities.sort((a, b) => a.name.localeCompare(b.name));

    return cities;
   } catch (error) {
        console.error(`[Service] Error scraping cities for state ${stateSlug}:`, error);
        throw new Error(`Failed to scrape cities for state ${stateSlug} from tabuademares.com.`);
   }
}


/**
 * Asynchronously retrieves tide data for a given state and city by scraping tabuademares.com.
 *
 * @param stateSlug The URL slug of the state (e.g., "para", "rio-de-janeiro").
 * @param citySlug The URL slug of the city (e.g., "belem", "santos").
 * @returns A promise that resolves to an array of TideData objects, or an empty array if data cannot be scraped.
 * @throws If scraping fails at a critical point (e.g., fetching HTML).
 */
export async function getTideData(stateSlug: string, citySlug: string): Promise<TideData[]> {
  if (!stateSlug || !citySlug) {
     console.warn("[Service] getTideData called with empty stateSlug or citySlug.");
     return [];
  }
  const url = `${BASE_URL}/br/${stateSlug}/${citySlug}`;
  console.log(`[Service] Requesting tide data from URL: ${url}`);

  try {
    const html = await fetchHtml(url);
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Target the table using the specific ID provided by the user
    const tideTable = document.querySelector('#tabla_mareas_fondo'); // Using querySelector for ID

    if (!tideTable) {
      console.warn(`[Service] Tide table with ID 'tabla_mareas_fondo' not found on ${url}. Returning empty array.`);
      return [];
    }

    const tideData: TideData[] = [];
    // Get all table rows within the tbody of the target table
    const rows = tideTable.querySelectorAll('tbody tr');

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      // Expecting at least 2 cells: one for time, one for height
      if (cells.length >= 2) {
        const time = cells[0]?.textContent?.trim();
        let heightText = cells[1]?.textContent?.trim(); // e.g., "2.8m"

        // Extract only the numeric part of the height
        const heightMatch = heightText?.match(/([\d.,]+)/);
        const height = heightMatch ? heightMatch[1].replace(',', '.') : null; // Normalize comma to dot

        if (time && height !== null) {
          tideData.push({ time, height });
        } else {
            console.warn(`[Service] Skipping row due to missing time or height data:`, row.innerHTML);
        }
      } else {
           console.warn(`[Service] Skipping row with insufficient cells:`, row.innerHTML);
      }
    });

    if (tideData.length === 0) {
        console.warn(`[Service] Found table 'tabla_mareas_fondo' but extracted no valid tide data rows from ${url}.`);
    } else {
        console.log(`[Service] Successfully extracted ${tideData.length} tide entries for ${citySlug}, ${stateSlug}.`);
    }


    return tideData;

  } catch (error) {
    console.error(`[Service] Error scraping tide data for ${citySlug}, ${stateSlug}:`, error);
    // Depending on the error, you might want to return empty or re-throw
    // If fetchHtml threw, it's already logged and re-thrown.
    // If parsing failed here, log it and return empty.
    if (error instanceof Error && error.message.startsWith('HTTP error!')) {
        throw error; // Re-throw fetch errors
    }
    console.error(`[Service] Parsing error prevented tide data extraction for ${citySlug}, ${stateSlug}.`);
    return []; // Return empty array for parsing errors after successful fetch
  }
}

// Export the normalization function if needed elsewhere, otherwise keep it internal
// export { normalizeToSlug };
// Add jsdom to dependencies: npm install jsdom @types/jsdom
// NOTE: Need to install jsdom: `npm install jsdom` and `@types/jsdom`: `npm install --save-dev @types/jsdom`
// Also, jsdom might increase serverless function size/cold start time. Consider alternatives if performance is critical.

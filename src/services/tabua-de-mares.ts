/**
 * Represents tide data for a specific time.
 */
export interface TideData {
  /**
   * The time of the tide.
   */
  time: string;
  /**
   * The height of the tide in meters (e.g., "1.2m").
   */
  height: string;
}

/**
 * Asynchronously retrieves tide data for a given state and city in Brazil.
 * Placeholder function - Replace with actual scraping logic.
 * The target URL structure is typically: https://tabuademares.com/br/{state}/{city}
 * where state and city are lowercase and hyphenated if they contain spaces (e.g., rio-de-janeiro, sao-luis).
 *
 * @param state The state in Brazil (normalized, lowercase, no accents).
 * @param city The city in the specified state (normalized, lowercase, no accents).
 * @returns A promise that resolves to an array of TideData objects, or an empty array if data is unavailable/city not supported by mock.
 */
export async function getTideData(state: string, city: string): Promise<TideData[]> {
  console.log(`[Service] Requesting tide data for ${city}, ${state}`);

  // --- PLACEHOLDER LOGIC ---
  // In a real application, implement web scraping here.
  // Ensure state/city names are formatted correctly for the URL (lowercase, hyphens for spaces).
  // Example: "Rio de Janeiro", "Rio de Janeiro" -> rio-de-janeiro/rio-de-janeiro
  // Example: "São Paulo", "Santos" -> sao-paulo/santos

  // Simulating a network delay
  await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 800));

  // Returning mock data based on state and city for demonstration
  // IMPORTANT: This is just mock data and does not reflect real tide information.
  const locationKey = `${state}/${city}`;

  const mockDatabase: { [key: string]: TideData[] } = {
    // Pará
    "para/belem": [
      { time: '02:00', height: '2.8m' }, { time: '08:15', height: '0.7m' }, { time: '14:30', height: '2.9m' }, { time: '20:45', height: '0.5m' }
    ],
    "para/salinopolis": [
        { time: '01:45', height: '3.5m' }, { time: '08:00', height: '0.3m' }, { time: '14:10', height: '3.6m' }, { time: '20:25', height: '0.2m' }
    ],
    "para/ananindeua": [ // Likely similar to Belem, using Belem's data
       { time: '02:00', height: '2.8m' }, { time: '08:15', height: '0.7m' }, { time: '14:30', height: '2.9m' }, { time: '20:45', height: '0.5m' }
    ],
     "para/santarem": [ // River port, tides less pronounced
        { time: '05:00', height: '1.8m' }, { time: '11:30', height: '1.1m' }, { time: '17:45', height: '1.9m' }, { time: '23:55', height: '1.0m' }
    ],
    // Maranhão
    "maranhao/sao luis": [
      { time: '00:50', height: '5.8m' }, { time: '07:10', height: '0.8m' }, { time: '13:20', height: '6.0m' }, { time: '19:40', height: '0.6m' }
    ],
    "maranhao/alcantara": [ // Similar to São Luís due to proximity
      { time: '00:55', height: '5.9m' }, { time: '07:15', height: '0.7m' }, { time: '13:25', height: '6.1m' }, { time: '19:45', height: '0.5m' }
    ],
    // Ceará
    "ceara/fortaleza": [
      { time: '03:10', height: '2.5m' }, { time: '09:20', height: '0.6m' }, { time: '15:30', height: '2.7m' }, { time: '21:45', height: '0.4m' }
    ],
    "ceara/jericoacoara": [
        { time: '03:40', height: '2.9m' }, { time: '09:55', height: '0.5m' }, { time: '16:05', height: '3.1m' }, { time: '22:15', height: '0.3m' }
    ],
    // Rio de Janeiro
    "rio de janeiro/rio de janeiro": [
      { time: '04:50', height: '1.1m' }, { time: '11:05', height: '0.3m' }, { time: '17:10', height: '1.2m' }, { time: '23:30', height: '0.2m' }
    ],
    "rio de janeiro/niteroi": [ // Similar to Rio de Janeiro
        { time: '04:55', height: '1.1m' }, { time: '11:10', height: '0.3m' }, { time: '17:15', height: '1.2m' }, { time: '23:35', height: '0.2m' }
    ],
    "rio de janeiro/arraial do cabo": [
        { time: '05:20', height: '1.0m' }, { time: '11:40', height: '0.2m' }, { time: '17:50', height: '1.1m' }, { time: '23:59', height: '0.1m' }
    ],
     "rio de janeiro/angra dos reis": [
        { time: '05:05', height: '1.3m' }, { time: '11:20', height: '0.4m' }, { time: '17:25', height: '1.4m' }, { time: '23:40', height: '0.3m' }
    ],
    // São Paulo
    "sao paulo/santos": [
      { time: '04:30', height: '1.4m' }, { time: '10:45', height: '0.4m' }, { time: '16:55', height: '1.5m' }, { time: '23:10', height: '0.3m' }
    ],
    "sao paulo/ubatuba": [
        { time: '05:00', height: '1.2m' }, { time: '11:15', height: '0.3m' }, { time: '17:25', height: '1.3m' }, { time: '23:40', height: '0.2m' }
    ],
     "sao paulo/guaruja": [ // Similar to Santos
        { time: '04:35', height: '1.4m' }, { time: '10:50', height: '0.4m' }, { time: '17:00', height: '1.5m' }, { time: '23:15', height: '0.3m' }
    ],
    // Bahia
    "bahia/salvador": [
        { time: '03:50', height: '2.2m' }, { time: '10:05', height: '0.5m' }, { time: '16:15', height: '2.4m' }, { time: '22:30', height: '0.3m' }
    ],
    "bahia/porto seguro": [
        { time: '04:20', height: '1.8m' }, { time: '10:35', height: '0.4m' }, { time: '16:45', height: '1.9m' }, { time: '23:00', height: '0.2m' }
    ],
    // Santa Catarina
     "santa catarina/florianopolis": [
        { time: '04:40', height: '1.0m' }, { time: '10:55', height: '0.3m' }, { time: '17:05', height: '1.1m' }, { time: '23:20', height: '0.2m' }
    ],
     "santa catarina/balneario camboriu": [
        { time: '04:30', height: '1.1m' }, { time: '10:45', height: '0.3m' }, { time: '16:55', height: '1.2m' }, { time: '23:10', height: '0.2m' }
    ],
    // Amazonas (River ports - example shows daily fluctuation, not typical tides)
    "amazonas/manaus": [
        { time: '06:00', height: '28.5m' }, // Example river level, not tide height
        { time: '18:00', height: '28.7m' },
    ],
    // Rio Grande do Sul
    "rio grande do sul/rio grande": [
        { time: '02:10', height: '0.8m' }, { time: '08:30', height: '0.3m' }, { time: '14:40', height: '0.9m' }, { time: '20:55', height: '0.2m' }
    ],
     "rio grande do sul/tramandai": [
        { time: '01:50', height: '0.7m' }, { time: '08:10', height: '0.2m' }, { time: '14:20', height: '0.8m' }, { time: '20:35', height: '0.1m' }
    ],
  };

  const data = mockDatabase[locationKey];

  if (data) {
    console.log(`[Service] Found mock data for ${city}, ${state}`);
    return data;
  } else {
    // Return empty array if no mock data exists for the requested location
    console.warn(`[Service] No specific mock data for ${city}, ${state}. Returning empty array.`);
    return [];
  }

  // --- END PLACEHOLDER ---
}

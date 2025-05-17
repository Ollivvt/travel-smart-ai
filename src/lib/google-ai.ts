import { addMinutes, format } from 'date-fns';

interface BaseLocation {
  name: string;
  description: string;
  dayIndex: number;
  address: string;
  isStartingPoint: boolean;
  isHotel: boolean;
}

// Fields specific to attractions (non-hotels)
interface AttractionLocation extends BaseLocation {
  isHotel: false;
  estimatedDuration: number;
  bestTimeToVisit: string;
  travelTimeToNext: number | null;
}

// Fields specific to hotels
interface HotelLocation extends BaseLocation {
  isHotel: true;
  estimatedDuration?: never;  // Explicitly prevent these fields for hotels
  bestTimeToVisit?: never;
  travelTimeToNext?: never;
}

// Combined type that represents either a hotel or attraction
type Location = AttractionLocation | HotelLocation;

interface PreferredPlace {
  name: string;
  preferredDay: number | null;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const MAX_TOKENS = 2048;

async function callGoogleAI(prompt: string, apiKey: string): Promise<any> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.2,
          topK: 32,
          topP: 0.9,
          maxOutputTokens: MAX_TOKENS,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    if (error.error?.message?.includes('API_KEY_INVALID')) {
      throw new Error('Invalid Google AI API key. Please check your configuration.');
    } else if (error.error?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error('AI generation limit reached. Please try again later or continue with manual planning.');
    }
    throw new Error(error.error?.message || 'Failed to generate itinerary');
  }

  const data = await response.json();
  return data;
}

function cleanAndParseResponse(text: string): Location[] {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty or invalid response from AI service');
  }

  console.debug('Raw AI response:', text);

  // First, extract just the JSON array part
  let match = text.match(/\[[\s\S]*\]/);
  if (!match) {
    throw new Error('No JSON array found in response');
  }

  let cleanedText = match[0]
    .trim()
    // Remove any markdown code block markers
    .replace(/```json\s*|\s*```/g, '')
    // Remove any additional text before [ or after ]
    .replace(/^[^[]*(\[[\s\S]*\])[^]*$/, '$1')
    // Normalize line endings and whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\n\s+/g, ' ');

  console.debug('After initial cleanup:', cleanedText);

  let braceCount = 0;
  let lastCompleteObjectEnd = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < cleanedText.length; i++) {
    const char = cleanedText[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          lastCompleteObjectEnd = i;
        }
      }
    }
  }

  if (braceCount > 0 && lastCompleteObjectEnd !== -1) {
    cleanedText = cleanedText.substring(0, lastCompleteObjectEnd + 1);
    if (cleanedText.startsWith('[')) {
      cleanedText += ']';
    }
  }

  console.debug('After brace matching:', cleanedText);

  // Fix common JSON formatting issues
  cleanedText = cleanedText
    // Remove comments
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
    // Ensure property names are properly quoted
    .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":')
    // Normalize boolean values
    .replace(/"(isStartingPoint|isHotel)"\s*:\s*(true|false|\d)/gi, (match, key, value) => {
      const boolValue = value === 'true' || value === '1';
      return `"${key}":${boolValue}`;
    })
    // Fix numeric values that might be quoted
    .replace(/"(estimatedDuration|travelTimeToNext|dayIndex)"\s*:\s*"?(\d+)"?/g, '"$1":$2')
    // Handle potential string escaping issues in addresses
    .replace(/"address"\s*:\s*"([^"]*?)(?<!\\)"(?=[,}])/g, (_match, address) => {
      const cleanAddress = address
        .replace(/(?<!\\)"/g, '\\"') // Escape unescaped quotes
        .replace(/\\{2,}"/g, '\\"')  // Fix multiple escapes
        .replace(/,\s*([^,]+)$/, (_match: string, last: string) => `, ${last}`) // Format last part of address
        .trim();
      return `"address":"${cleanAddress}"`;
    })
    // Handle potential string escaping issues in descriptions
    .replace(/"description"\s*:\s*"([^"]*?)(?<!\\)"(?=[,}])/g, (_match, description) => {
      const cleanDescription = description
        .replace(/(?<!\\)"/g, '\\"') // Escape unescaped quotes
        .replace(/\\{2,}"/g, '\\"')  // Fix multiple escapes
        .replace(/,\s*([^,]+)$/, ', $1')
        .trim();
      return `"description":"${cleanDescription}"`;
    })
    // Clean up any formatting artifacts
    .replace(/,(\s*[}\]])/g, '$1')    // Remove trailing commas
    .replace(/,\s*,/g, ',')           // Fix double commas
    .replace(/}\s*{/g, '},{')         // Ensure proper object separation
    .replace(/\[\s*,\s*{/, '[{')      // Fix leading comma
    .replace(/}\s*,\s*\]/, '}]');     // Fix trailing comma

  console.debug('After formatting fixes:', cleanedText);

  if (!cleanedText.startsWith('[') || !cleanedText.endsWith(']')) {
    throw new Error('Invalid JSON structure: Must be an array');
  }

  try {
    const parsed = JSON.parse(cleanedText);
    
    if (!Array.isArray(parsed)) {
      throw new Error('Parsed result is not an array');
    }

    if (parsed.length === 0) {
      throw new Error('Empty array returned from AI service');
    }

    // First pass: validate and enforce exact travel times
    const initialProcessed = parsed.map((item: any, index: number) => {
      if (!item.name || typeof item.dayIndex !== 'number') {
        throw new Error(`Invalid location data at index ${index}: missing required fields`);
      }

      const isHotel = item.name.toLowerCase().startsWith('[hotel]');
      
      // Common fields for both types
      const baseLocation: BaseLocation = {
        name: item.name.trim(),
        description: item.description?.trim() || '',
        dayIndex: item.dayIndex,
        address: item.address?.trim() || '',
        isStartingPoint: Boolean(item.isStartingPoint),
        isHotel
      };

      // For hotels, return just the base location
      if (isHotel) {
        // Validate no timing fields for hotels
        if (item.estimatedDuration || item.travelTimeToNext || item.bestTimeToVisit) {
          console.warn(`Hotel "${item.name}" should not have timing fields. Removing them.`);
        }
        return baseLocation as HotelLocation;
      }

      // For attractions, calculate exact travel times using our updated logic
      const baseTime = getBaseTravelTime(item.travelTimeToNext, item.description);
      // Get time of day from bestTimeToVisit if available
      let timeStr = item.bestTimeToVisit?.toLowerCase() || '';
      const calculatedTravelTime = calculateExactTravelTime(baseTime, isRushHour(timeStr));
      // Ensure within reasonable bounds (5min-3hrs)
      const finalTravelTime = Math.max(5, Math.min(180, calculatedTravelTime));

      return {
        ...baseLocation,
        isHotel: false,
        estimatedDuration: typeof item.estimatedDuration === 'number' ? 
          Math.max(30, Math.min(480, item.estimatedDuration)) : 120,
        bestTimeToVisit: item.bestTimeToVisit?.trim() || '',
        travelTimeToNext: finalTravelTime
      } as AttractionLocation;
    });

    // Second pass: validate hotel placement rules
    const hotelsByDay = new Map<number, number>();
    initialProcessed.forEach((item, index) => {
      if (item.isHotel) {
        if (hotelsByDay.has(item.dayIndex)) {
          console.debug(`Multiple hotels found for day ${item.dayIndex}`);
        }
        hotelsByDay.set(item.dayIndex, index);
      }
    });

    // Filter out duplicate hotels and invalid placements
    return initialProcessed.filter((item, index) => {
      if (!item.isHotel) return true;
      
      // Keep only the last hotel for each day
      const lastHotelIndex = hotelsByDay.get(item.dayIndex);
      return index === lastHotelIndex;
    });

  } catch (error) {
    console.error('JSON parse error:', error);
    console.error('Failed JSON string:', cleanedText);
    
    if (error instanceof SyntaxError && typeof error.message === 'string') {
      const position = error.message.match(/position (\d+)/)?.[1];
      if (position) {
        const pos = parseInt(position);
        const start = Math.max(0, pos - 50);
        const end = Math.min(cleanedText.length, pos + 50);
        const context = cleanedText.substring(start, end);
        console.error(`Error context around position ${pos}:\n${context}`);
        throw new Error(`Failed to parse AI response: Invalid JSON near [...${context}...]`);
      }
    }
    
    throw new Error(`Failed to parse AI response: ${(error as Error).message}`);
  }
}

// Get base travel time from distance and description
function getBaseTravelTime(travelTime: string | number | undefined | null, description?: string): number {
  // If it's already a valid number, use it
  if (typeof travelTime === 'number' && !isNaN(travelTime)) {
    return travelTime;
  }
  
  // Extract distance from description if available
  const distanceMatch = description?.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometers?)/i);
  if (distanceMatch) {
    const distance = parseFloat(distanceMatch[1]);
    
    // Apply distance-based rules
    if (distance < 2) return 15;      // Short distance: <2km
    if (distance <= 5) return 25;     // Medium distance: 2-5km
    return 45;                        // Long distance: >5km
  }
  
  // Handle "varies with traffic" or other string cases
  if (typeof travelTime === 'string') {
    // Look for numeric values in the string
    const numericMatch = travelTime.match(/(\d+)/);
    if (numericMatch) {
      return parseInt(numericMatch[1], 10);
    }
    
    // Look for distance indicators in the string
    if (travelTime.toLowerCase().includes('short') || travelTime.toLowerCase().includes('nearby')) {
      return 15;
    }
    if (travelTime.toLowerCase().includes('long') || travelTime.toLowerCase().includes('far')) {
      return 45;
    }
  }
  
  return 25; // Default to medium distance time if no other information available
}

// Calculate exact travel time based on distance and traffic rules
function calculateExactTravelTime(base: number, isRushHour: boolean): number {
  let time = base;
  
  // Rush hour adjustment (40% increase during peak hours)
  if (isRushHour) {
    time *= 1.4;
  }
  
  return Math.round(time);
}

// Check if current time is during rush hour
function isRushHour(timeStr: string): boolean {
  if (!timeStr) return false;
  
  try {
    const time = timeStr.toLowerCase();
    // Morning rush: 8-10am
    const isMorningRush = time.includes('8:') || time.includes('9:') || 
      time.includes('8 am') || time.includes('9 am');
    // Evening rush: 4-7pm
    const isEveningRush = time.includes('4:') || time.includes('5:') || time.includes('6:') ||
      time.includes('4 pm') || time.includes('5 pm') || time.includes('6 pm');
    
    return isMorningRush || isEveningRush;
  } catch (e) {
    return false;
  }
}

export async function generateItinerary(
  startPoint: string,
  endPoint: string,
  duration: number,
  mustVisitPlaces: PreferredPlace[],
  pace: 'relaxed' | 'balanced' | 'intensive' = 'balanced'
): Promise<Location[]> {
  const apiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY;
  
  if (!apiKey) {
    throw new Error('Google AI API key is not configured');
  }

  const paceMultiplier = {
    relaxed: 0.7,
    balanced: 1,
    intensive: 1.3
  };

  const formattedPlaces = mustVisitPlaces.map(place => {
    if (place.preferredDay !== null) {
      return `${place.name} (Day ${place.preferredDay + 1})`;
    }
    return place.name;
  }).join(', ');

  const prompt = `As an expert travel planner, create a detailed ${duration}-day itinerary optimized for geographic efficiency and accommodation recommendations.

Start Point: ${startPoint}
End Point: ${endPoint}
Must-Visit Places: ${formattedPlaces}
Pace: ${pace}

CRITICAL REQUIREMENTS:

1. Day Structure and Hotels:
   - Day 1 MUST start with "${startPoint}"
   - For Days 2 to ${duration}, each day MUST start from the previous day's hotel
   - Each day (except the last) MUST have EXACTLY ONE hotel recommendation as its last entry
   - Day ${duration} MUST end at "${endPoint}"

2. Geographic Optimization:
   - Group locations by proximity to minimize travel time
   - Plan each day's route in a logical sequence
   - Each day's attractions should be near that night's hotel
   - Include EXACT travel times between locations in minutes
   - Consider typical traffic patterns for time estimates

3. Hotel Entry Requirements:
   - Name MUST start with "[HOTEL]" prefix
   - Only one hotel per day (as the last entry of the day)
   - Do NOT include estimatedDuration or bestTimeToVisit for hotels
   - Description MUST include:
     * Price range (e.g., "$$$" for luxury, "$$" for mid-range, "$" for budget)
     * Key amenities (e.g., "Free WiFi, Pool, Restaurant")
     * Why it's well-positioned for next day's activities

4. Travel Time Rules:
   - Include travelTimeToNext (in minutes) for each location (except hotels)
   - Use EXACT minutes for travel times, not ranges or descriptions
   - Short distances (<2km): 15 minutes
   - Medium distances (2-5km): 25 minutes
   - Long distances (>5km): 45 minutes
   - Add 40% to travel time during peak hours (8-10am, 4-7pm)

5. Duration Guidelines (Not Applicable to Hotels):
   - Major attractions: 180-240 minutes
   - Medium attractions: 120-180 minutes
   - Minor attractions: 60-120 minutes
   - Include time for security/entry lines
   - Factor in meal and rest breaks

6. Response Format:
[
  {
    "name": "Location Name or [HOTEL] Hotel Name",
    "address": "Full Street Address, City, State/Region",
    "description": "Brief description including key features. For hotels: include price range, amenities, and strategic location benefits",
    "estimatedDuration": number_of_minutes (omit for hotels),
    "travelTimeToNext": number_of_minutes (omit for hotels),
    "bestTimeToVisit": "morning/afternoon/evening or HH:MM" (omit for hotels),
    "dayIndex": number,
    "isStartingPoint": boolean,
    "isHotel": boolean
  }
]

STRICT FORMAT RULES:
- First overall location MUST be "${startPoint}" with dayIndex 0
- Last overall location MUST be "${endPoint}" with dayIndex ${duration - 1}
- Each dayIndex (except last) MUST have exactly one hotel as its last entry
- Each dayIndex (except first) MUST start with previous day's hotel
- Use ONLY double quotes for strings
- estimatedDuration and travelTimeToNext must be numbers (omit for hotels)
- dayIndex must be between 0 and ${duration - 1}
- Include FULL addresses
- Keep descriptions under 200 characters
- NO trailing commas
- NO comments or additional text
- NO markdown formatting
- RESPOND WITH ONLY THE JSON ARRAY`;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.debug(`Attempt ${attempt} of ${MAX_RETRIES}`);

      const data = await callGoogleAI(prompt, apiKey);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('No response received from Google AI');
      }

      const parsedResponse = cleanAndParseResponse(text);

      // Ensure the first location is the starting point
      if (!parsedResponse[0] || !parsedResponse[0].name.toLowerCase().includes(startPoint.toLowerCase())) {
        const startingLocation: AttractionLocation = {
          name: startPoint,
          address: startPoint,
          description: `Starting point of the journey.`,
          estimatedDuration: 30,
          travelTimeToNext: 0,
          bestTimeToVisit: "morning",
          dayIndex: 0,
          isStartingPoint: true,
          isHotel: false
        };
        parsedResponse.unshift(startingLocation);
      }

      // Update the processedResponse mapping
      const processedResponse = parsedResponse.map((location: Location, index: number) => {
        // Base location object
        const baseLocation: BaseLocation = {
          name: location.name,
          description: location.description,
          dayIndex: Math.max(0, Math.min(duration - 1, location.dayIndex)),
          address: location.address,
          isStartingPoint: location.name.toLowerCase().includes(startPoint.toLowerCase()),
          isHotel: location.isHotel
        };

        // Return early for hotels
        if (location.isHotel) {
          return baseLocation as HotelLocation;
        }

        // Process non-hotel locations
        const attraction = location as AttractionLocation;
        let formattedTime = attraction.bestTimeToVisit?.toLowerCase();
        if (formattedTime?.includes(':')) {
          try {
            const [hours, minutes] = formattedTime.split(':').map(Number);
            formattedTime = format(new Date().setHours(hours, minutes || 0), 'h:mm a');
          } catch (e) {
            formattedTime = attraction.bestTimeToVisit;
          }
        }

        // Calculate exact travel time
        const baseTime = getBaseTravelTime(attraction.travelTimeToNext, attraction.description);
        const exactTravelTime = calculateExactTravelTime(
          baseTime,
          isRushHour(formattedTime || '')
        );

        return {
          ...baseLocation,
          isHotel: false,
          estimatedDuration: Math.round((attraction.estimatedDuration || 120) * paceMultiplier[pace]),
          bestTimeToVisit: formattedTime || '',
          travelTimeToNext: index < parsedResponse.length - 1 ? exactTravelTime : 0
        } as AttractionLocation;
      });

      // Sort by day and time, ensuring proper order
      return processedResponse.sort((a: Location, b: Location) => {
        // If they're on different days
        if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
        
        // Handle special cases for each day
        if (a.dayIndex === 0) {
          // Day 1: Start with startPoint
          if (a.isStartingPoint) return -1;
          if (b.isStartingPoint) return 1;
        } else if (a.dayIndex === duration - 1) {
          // Last day: End with endPoint
          if (a.name.toLowerCase().includes(endPoint.toLowerCase())) return 1;
          if (b.name.toLowerCase().includes(endPoint.toLowerCase())) return -1;
        }
        
        // Within the same day
        // Hotels go last (except for last day)
        if (a.dayIndex < duration - 1) {
          if (a.isHotel && !b.isHotel) return 1;
          if (!a.isHotel && b.isHotel) return -1;
        }
        
        // Sort by time if available
        return (a.bestTimeToVisit || '').localeCompare(b.bestTimeToVisit || '');
      });
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error);
      lastError = error;

      if (attempt < MAX_RETRIES) {
        console.debug(`Retrying in ${RETRY_DELAY}ms...`);
        await delay(RETRY_DELAY * attempt);
      }
    }
  }

  throw new Error(`Failed to generate itinerary after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
}
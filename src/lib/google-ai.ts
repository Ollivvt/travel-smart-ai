import { addMinutes, format } from 'date-fns';

interface Location {
  name: string;
  description?: string;
  estimatedDuration: number;
  bestTimeToVisit?: string;
  dayIndex: number;
  address?: string;
  isStartingPoint?: boolean;
  travelTimeToNext?: number;
}

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

function cleanAndParseResponse(text: string): any {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty or invalid response from AI service');
  }

  console.debug('Raw AI response:', text);

  let cleanedText = text
    .trim()
    .replace(/```json\s*|\s*```/g, '')
    .replace(/^[^[]*(\[[\s\S]*$)/, '$1')
    .replace(/^([\s\S]*\])[^]*$/, '$1');

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

  cleanedText = cleanedText
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
    .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":')
    .replace(/"address"\s*:\s*"([^"]*?)(?<!\\)"(?=[,}])/g, (match, address) => {
      const cleanAddress = address
        .replace(/"/g, '\\"')
        .replace(/\\"/g, '\\"')
        .replace(/,\s*([^,]+)$/, ', $1')
        .trim();
      return `"address":"${cleanAddress}"`;
    })
    .replace(/"description"\s*:\s*"([^"]*?)(?<!\\)"(?=[,}])/g, (match, description) => {
      const cleanDescription = description
        .replace(/"/g, '\\"')
        .replace(/\\"/g, '\\"')
        .replace(/,\s*([^,]+)$/, ', $1')
        .trim();
      return `"description":"${cleanDescription}"`;
    })
    .replace(/"estimatedDuration"\s*:\s*"?(\d+)"?/g, '"estimatedDuration":$1')
    .replace(/"dayIndex"\s*:\s*"?(\d+)"?/g, '"dayIndex":$1')
    .replace(/"travelTimeToNext"\s*:\s*"?(\d+)"?/g, '"travelTimeToNext":$1')
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/,\s*,/g, ',')
    .replace(/}\s*{/g, '},{')
    .replace(/^\s*\{/, '[{')
    .replace(/}\s*$/, '}]');

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

    return parsed.map((item: Location, index: number) => {
      if (!item.name || typeof item.dayIndex !== 'number') {
        throw new Error(`Invalid location data at index ${index}: missing required fields`);
      }

      return {
        name: item.name.trim(),
        description: item.description?.trim() || '',
        estimatedDuration: typeof item.estimatedDuration === 'number' ? 
          Math.max(30, Math.min(480, item.estimatedDuration)) : 120,
        bestTimeToVisit: item.bestTimeToVisit?.trim() || '',
        dayIndex: item.dayIndex,
        address: item.address?.trim() || '',
        travelTimeToNext: typeof item.travelTimeToNext === 'number' ? 
          Math.max(5, Math.min(180, item.travelTimeToNext)) : null
      };
    });
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    console.error('Failed JSON string:', cleanedText);
    throw new Error(`Failed to parse AI response: ${parseError.message}`);
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

  const prompt = `As an expert travel planner, create a detailed ${duration}-day itinerary optimized for geographic efficiency.

Start Point: ${startPoint}
End Point: ${endPoint}
Must-Visit Places: ${formattedPlaces}
Pace: ${pace}

CRITICAL REQUIREMENTS:

1. Starting Point Rule:
   - The first location MUST be "${startPoint}" with dayIndex 0
   - All subsequent locations should be ordered by proximity

2. Geographic Optimization:
   - Group locations by proximity to minimize travel time
   - Plan each day's route in a logical sequence
   - Start each day from the previous day's end point
   - Include EXACT travel times between locations in minutes
   - Consider typical traffic patterns for time estimates

3. Travel Time Rules:
   - Include travelTimeToNext (in minutes) for each location
   - Use EXACT minutes for travel times, not ranges or descriptions
   - Short distances (<2km): 15 minutes
   - Medium distances (2-5km): 25 minutes
   - Long distances (>5km): 45 minutes
   - Add 10 minutes during peak hours (8-10am, 4-7pm)
   - Add 15 minutes for public transit transfers

4. Duration Guidelines:
   - Major attractions: 180-240 minutes
   - Medium attractions: 120-180 minutes
   - Minor attractions: 60-120 minutes
   - Include time for security/entry lines
   - Factor in meal and rest breaks

5. Response Format:
[
  {
    "name": "Location Name",
    "address": "Full Street Address, City, State/Region",
    "description": "Brief description including key features",
    "estimatedDuration": number_of_minutes,
    "travelTimeToNext": number_of_minutes,
    "bestTimeToVisit": "morning/afternoon/evening or HH:MM",
    "dayIndex": number
  }
]

STRICT FORMAT RULES:
- First location MUST be "${startPoint}" with dayIndex 0
- Use ONLY double quotes for strings
- estimatedDuration and travelTimeToNext must be numbers (no quotes)
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
        const startingLocation = {
          name: startPoint,
          address: startPoint,
          description: `Starting point of the journey.`,
          estimatedDuration: 30,
          travelTimeToNext: 0,
          bestTimeToVisit: "morning",
          dayIndex: 0
        };
        parsedResponse.unshift(startingLocation);
      }

      const processedResponse = parsedResponse.map((location: Location, index: number) => {
        const adjustedDuration = Math.round(location.estimatedDuration * paceMultiplier[pace]);

        let formattedTime = location.bestTimeToVisit?.toLowerCase();
        if (formattedTime?.includes(':')) {
          try {
            const [hours, minutes] = formattedTime.split(':').map(Number);
            formattedTime = format(new Date().setHours(hours, minutes || 0), 'h:mm a');
          } catch (e) {
            formattedTime = location.bestTimeToVisit;
          }
        }

        // Ensure travel times are specific numbers
        let travelTime = location.travelTimeToNext;
        if (typeof travelTime !== 'number' || travelTime < 0) {
          // Default travel times based on position in the itinerary
          travelTime = index < parsedResponse.length - 1 ? 25 : 0;
        }

        return {
          ...location,
          estimatedDuration: adjustedDuration,
          bestTimeToVisit: formattedTime || '',
          dayIndex: Math.max(0, Math.min(duration - 1, location.dayIndex)),
          travelTimeToNext: travelTime
        };
      });

      // Sort by day and time, ensuring starting point remains first
      return processedResponse.sort((a, b) => {
        if (a.name.toLowerCase().includes(startPoint.toLowerCase())) return -1;
        if (b.name.toLowerCase().includes(startPoint.toLowerCase())) return 1;
        if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
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
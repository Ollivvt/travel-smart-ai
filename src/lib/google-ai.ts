import { addMinutes, format } from 'date-fns';

interface Location {
  name: string;
  description?: string;
  estimatedDuration: number;
  bestTimeToVisit?: string;
  dayIndex: number;
}

export async function generateItinerary(
  startPoint: string,
  endPoint: string,
  duration: number,
  mustVisitPlaces: string[],
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

  const prompt = `As an expert travel planner, create a detailed ${duration}-day travel itinerary from ${startPoint} to ${endPoint}.

Required locations that MUST be included: ${mustVisitPlaces.join(', ')}
Travel pace preference: ${pace}

Consider these critical factors:
1. Geographic Optimization:
   - Cluster nearby attractions to minimize travel time
   - Consider traffic patterns and peak hours
   - Plan routes efficiently between locations
   - Include specific travel times between locations (e.g., "approx. 20-30 min drive")

2. Timing Optimization:
   - Best times to visit each location (opening hours, crowds, lighting for photos)
   - Adequate time for each activity based on importance and size
   - Buffer time for travel between locations
   - Meal times and breaks

3. Experience Quality:
   - Popular attractions during off-peak hours when possible
   - Logical sequence of activities
   - Balance between indoor and outdoor activities
   - Weather considerations for outdoor locations
   - Local cultural considerations (e.g., prayer times, siesta hours)

4. Pace Adjustment (${pace}):
   - ${pace === 'relaxed' ? 'More time at each location, longer breaks, later starts' :
      pace === 'intensive' ? 'Efficient visits, earlier starts, more locations per day' :
      'Balanced mix of activities and rest'}
   - Account for travel fatigue
   - Strategic placement of major attractions

For each location, include in the description:
- The exact address or location identifier
- Approximate travel time to the next location (e.g., "approx. 25-30 min drive to next location")
- Key features and highlights 
- Insider tips for the best experience

Return a JSON array of locations with this exact structure:
[
  {
    "name": "Location name",
    "address": "Full address of the location",
    "description": "Detailed description including key features, tips and travel time to next location",
    "estimatedDuration": 120,
    "bestTimeToVisit": "morning/afternoon/evening or HH:mm format",
    "dayIndex": 0
  }
]

Important formatting rules:
1. Use numeric values for estimatedDuration (in minutes)
2. Use 0-based dayIndex (0 to ${duration - 1})
3. Keep bestTimeToVisit as either "morning", "afternoon", "evening" or specific time like "14:00"
4. Ensure the JSON is properly formatted with double quotes
5. Include ONLY the JSON array, no additional text or explanations
6. Always include the full address in the address field
7. Do not include the address in the description field`;

  try {
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
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
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
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No response received from Google AI');
    }

    // Clean up the response text to ensure valid JSON
    const cleanedText = text.trim()
      .replace(/^```json\s*/, '') // Remove JSON code block start
      .replace(/\s*```$/, '')     // Remove JSON code block end
      .replace(/^\s*\[\s*\{/, '[{')  // Clean up leading whitespace
      .replace(/\}\s*\]\s*$/, '}]'); // Clean up trailing whitespace

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Try to extract JSON array if wrapped in other content
      const jsonMatch = cleanedText.match(/\[\s*\{[^]*\}\s*\]/);
      if (jsonMatch) {
        try {
          parsedResponse = JSON.parse(jsonMatch[0]);
        } catch (e) {
          throw new Error('Failed to parse AI response');
        }
      } else {
        throw new Error('Failed to parse AI response');
      }
    }
    
    if (!Array.isArray(parsedResponse)) {
      throw new Error('Invalid response format from Google AI');
    }

    // Post-process the response to ensure quality and separation of locations
    const processedResponse = parsedResponse.map((location: Location) => {
      // Handle location name and address separation
      let name = location.name?.trim() || '';
      
      // Remove any "- arrival" or similar suffixes from location names
      name = name.replace(/\s*-\s*(arrival|departure).*$/i, '');
      
      // Ensure numeric duration
      const duration = typeof location.estimatedDuration === 'string' 
        ? parseInt(location.estimatedDuration, 10)
        : location.estimatedDuration;

      // Adjust duration based on pace but keep in minutes (don't divide by 60)
      const adjustedDuration = Math.round(duration * paceMultiplier[pace]);
      
      // Normalize bestTimeToVisit format
      let formattedTime = location.bestTimeToVisit?.toLowerCase();
      if (formattedTime) {
        // For specific time formats like "14:00"
        if (formattedTime.includes(':')) {
          try {
            const [hours, minutes] = formattedTime.split(':').map(Number);
            formattedTime = format(new Date().setHours(hours, minutes || 0), 'h:mm a');
          } catch (e) {
            // Keep original format if parsing fails
          }
        } 
        // For descriptive times like "morning", "afternoon", "evening"
        else if (["morning", "afternoon", "evening"].includes(formattedTime)) {
          formattedTime = formattedTime.charAt(0).toUpperCase() + formattedTime.slice(1);
        }
      }

      // Process description to extract any additional address information
      let description = location.description?.trim() || '';
      let address = location.address?.trim() || '';
      
      // If no address was provided, try to extract it from the description
      if (!address && description) {
        // Try to extract an address from the description
        const addressLineMatch = description.match(/^(.*?)(?:\s*\(([^)]+)\)|\s*-\s*([^,]+))/);
        if (addressLineMatch && (addressLineMatch[2] || addressLineMatch[3])) {
          address = addressLineMatch[2] || addressLineMatch[3];
          // Remove the address from the description
          description = description.replace(addressLineMatch[0], '').trim();
        }
      }

      return {
        name: name,
        address: address,
        description: description,
        estimatedDuration: adjustedDuration,
        bestTimeToVisit: formattedTime || '',
        dayIndex: Math.max(0, Math.min(duration - 1, location.dayIndex))
      };
    });

    // Split combined locations if necessary (e.g., "Airport - Hotel")
    const finalLocations = [];
    for (const location of processedResponse) {
      // Check if the location name suggests it should be split
      if (location.name.includes(' - ') && !location.name.toLowerCase().includes('arrival')) {
        const [firstPart, secondPart] = location.name.split(' - ').map(part => part.trim());
        // Create two separate locations
        finalLocations.push({
          name: firstPart,
          address: location.address,
          description: location.description,
          estimatedDuration: Math.floor(location.estimatedDuration / 2),
          bestTimeToVisit: location.bestTimeToVisit,
          dayIndex: location.dayIndex
        });
        
        finalLocations.push({
          name: secondPart,
          address: '',  // We don't have specific address for the second part
          description: location.description,
          estimatedDuration: Math.ceil(location.estimatedDuration / 2),
          bestTimeToVisit: location.bestTimeToVisit,
          dayIndex: location.dayIndex
        });
      } else {
        finalLocations.push(location);
      }
    }

    // Sort by dayIndex and bestTimeToVisit
    return finalLocations.sort((a, b) => {
      if (a.dayIndex !== b.dayIndex) {
        return a.dayIndex - b.dayIndex;
      }
      return (a.bestTimeToVisit || '').localeCompare(b.bestTimeToVisit || '');
    });
  } catch (error: any) {
    console.error('Google AI Error:', error);
    throw error;
  }
}
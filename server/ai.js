import dotenv from 'dotenv';
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export async function generateProjectContent(scrapedData) {
  if (!GEMINI_API_KEY) {
    console.warn("UWAGA: Brak GEMINI_API_KEY w pliku .env. Zwracam dane testowe (Mock).");
    return getMockResponse(scrapedData);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  const systemPrompt = `Jesteś ekspertem ds. marketingu technologicznego, SEO oraz analizy systemów. Twój cel to przeanalizowanie surowych danych ze strony internetowej projektu i wygenerowanie atrakcyjnego opisu portfolio oraz metadanych w formacie JSON.
Musisz odpowiedzieć wyłącznie poprawnym obiektem JSON o następującym schemacie:
{
  "title": "Krótki, profesjonalny i chwytliwy tytuł projektu (maksymalnie 5 słów)",
  "description_generated": "Atrakcyjny opis projektu (2-3 zdania). Wyjaśnij, jaki konkretnie problem biznesowy lub techniczny ten projekt rozwiązuje i dlaczego jest wartościowy.",
  "tech_stack": ["Lista", "wykrytych", "użytych", "technologii", "i", "bibliotek"],
  "tags": ["3-5 tagów tematycznych projektu, np. automatyzacja, scraping, landing-page, analytics"],
  "seo_meta_desc": "Zoptymalizowany pod kątem SEO opis meta (maksymalnie 160 znaków) zachęcający do kliknięcia."
}
Odpowiedź musi być w języku polskim.`;

  const userContent = `Dane ze scraped strony:
Adres URL: ${scrapedData.url}
Tytuł ze strony: ${scrapedData.title}
Meta opis ze strony: ${scrapedData.metaDescription}
Surowy tekst strony (część body):
---
${scrapedData.bodyText}
---`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt },
              { text: userContent }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
    }

    const resData = await response.json();
    
    // Parse the generated text part
    const generatedText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) {
      throw new Error("Pusta odpowiedź z Gemini API");
    }

    const parsedContent = JSON.parse(generatedText.trim());
    return {
      success: true,
      ...parsedContent
    };
  } catch (error) {
    console.error("Błąd podczas generowania treści AI:", error.message);
    // Return mock fallback on error
    return {
      success: false,
      error: error.message,
      ...getMockResponse(scrapedData)
    };
  }
}

function getMockResponse(scrapedData) {
  // Simple heuristic mockup generator based on title and URL
  const title = scrapedData.title || "Nowy Projekt";
  const hostname = new URL(scrapedData.url).hostname;
  
  // Deduce some technologies
  const tech_stack = ["HTML", "CSS", "JavaScript"];
  if (scrapedData.bodyText.toLowerCase().includes('react')) tech_stack.push("React");
  if (scrapedData.bodyText.toLowerCase().includes('node')) tech_stack.push("Node.js");
  if (scrapedData.bodyText.toLowerCase().includes('tailwind')) tech_stack.push("Tailwind CSS");
  
  return {
    title: title.split('|')[0].trim().substring(0, 30),
    description_generated: `Zautomatyzowany prototyp i analiza portalu ${hostname}. Projekt prezentuje wdrożenie optymalizacji wydajności, zaawansowane skrypty interaktywne oraz czysty, responsywny design dostosowany do urządzeń mobilnych.`,
    tech_stack,
    tags: ["prototyp", "web-development", hostname.replace('www.', '').split('.')[0]],
    seo_meta_desc: `Projekt portfolio Tomasza Możdżyńskiego: ${title}. Sprawdź szczegóły wdrożenia technologicznego i automatyzacji.`
  };
}

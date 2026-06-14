/**
 * Resolves images securely using an inline proxy image rendering channel
 * This bypasses CORS and cross-domain server scrapers without downloading files to storage.
 */
async function cleanUrlToBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      try {
        // Convert canvas image footprint directly to a base64 data string
        const dataURL = canvas.toDataURL("image/jpeg");
        const base64Data = dataURL.split(",")[1];
        resolve({
          data: base64Data,
          mimeType: "image/jpeg"
        });
      } catch (e) {
        reject(new Error("Canvas conversion blocked by secure asset configuration."));
      }
    };

    img.onerror = () => reject(new Error("Target asset unreadable by browser node."));
    img.src = url;
  });
}

/**
 * Direct HTTPS Post using your AQ... key and the correct fallback model path
 */
export async function gradeSubmission(participantCode, targetImageUrl) {
  try {
    const apiKey = import.meta.env.VITE_CUSTOM_GEMINI_TOKEN;
    
  // Switch the model identifier to gemini-2.5-flash on the v1beta path
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const imagePart = await cleanUrlToBase64(targetImageUrl);

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `You are an expert UI Engineer judging a "Code in the Dark" match.
              Compare this HTML/CSS code to the target image layout.
              
              Return ONLY a raw JSON object matching this exact scheme. Do not embed markdown fences:
              {
                "score": 85,
                "feedback": "Write a 1-2 sentence critique here."
              }

              Participant's Code:
              ${participantCode}`
            },
            {
              inlineData: {
                mimeType: imagePart.mimeType,
                data: imagePart.data
              }
            }
          ]
        }
      ]
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Endpoint Error Block:", data.error);
      return { score: 0, feedback: `API Error: ${data.error.message}` };
    }

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error("Unexpected JSON response footprint layout:", data);
      return { score: 0, feedback: "Evaluation matrix empty. Check input code parameters." };
    }

    const rawText = data.candidates[0].content.parts[0].text;
    const cleanJsonText = rawText.replace(/```json|```/g, "").trim();

    return JSON.parse(cleanJsonText);

  } catch (error) {
    console.error("AI Judge Core Error Logic:", error);
    return {
      score: 0,
      feedback: "The AI Judge failed to reconcile input schemas. Manual review required."
    };
  }
}

export const evaluateCode = gradeSubmission;

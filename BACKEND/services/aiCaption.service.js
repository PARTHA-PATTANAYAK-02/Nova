import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Production-ready AI Caption & Hashtag generator powered exclusively
 * by Google Gemini Multimodal Vision & Language API.
 */

const TONE_GUIDES = {
  trending: "Viral, engaging, high-energy social media tone with natural emojis and an interactive hook.",
  aesthetic: "Dreamy, poetic, calm aesthetic with elegant spacing and subtle, delicate emojis (e.g. 🕊️, ☁️, ✨, 🪔).",
  genz: "Modern Gen-Z internet culture slang (e.g. 'understood the assignment', 'main character', 'ate', 'no cap') with bold emojis.",
  deep: "Philosophical, thoughtful reflection or inspiring quote about life, memories, and moments.",
  minimal: "Ultra-clean, punchy 3-8 words aesthetic one-liner.",
  humor: "Witty, sarcastic, light-hearted, and funny relatable observation.",
};

const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.7-flash",
];

export const generateAICaptionWithGemini = async ({
  prompt = "",
  tone = "trending",
  fileBuffer = null,
  mimeType = "image/jpeg",
  filename = "",
}) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const userTopic = prompt ? prompt.trim() : "";
  const hasImage = Boolean(fileBuffer && mimeType.startsWith("image/"));
  const toneInstruction = TONE_GUIDES[tone] || TONE_GUIDES.trending;

  // Build high-fidelity context instructions tailored to user intent
  let intentInstruction = "";
  if (userTopic && hasImage) {
    intentInstruction = `
- The user has provided an image AND stated their desired topic/thought: "${userTopic}".
- Visually inspect the image to observe the environment, clothing, subjects, or mood.
- Connect the visual details in the image with the user's topic: "${userTopic}".
- The user's intent ("${userTopic}") MUST be the primary focus of the caption.`;
  } else if (userTopic && !hasImage) {
    intentInstruction = `
- The user specified this post topic / thought: "${userTopic}".
- Generate a creative caption and relevant hashtags focused entirely on: "${userTopic}".`;
  } else if (!userTopic && hasImage) {
    intentInstruction = `
- No text was provided by the user. You MUST visually inspect the attached image in detail.
- Identify the subject, setting, mood, colors, activity, and key objects visible in the image.
- Generate a caption and hashtags strictly derived from and describing what is actually visible in this image.`;
  } else {
    intentInstruction = `
- Generate an inspiring, creative social media caption and relevant hashtags matching the requested tone.`;
  }

  const promptText = `
You are Nova AI, an expert creative copywriter for a modern social media app.

Requested Tone:
${toneInstruction}

Context & User Intent:
${intentInstruction}

Instructions:
1. Write 1 engaging, authentic caption with matching emojis.
2. Provide 5 to 8 relevant trending hashtags. If user topic relates to a festival or celebration, include popular festive expressions and tags.
3. Return valid JSON with keys: "caption" (string) and "hashtags" (array of strings).
`.trim();

  let lastError = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.85,
          topP: 0.95,
          maxOutputTokens: 350,
        },
      });

      const contents = [];

      // Include image data for multimodal vision
      if (hasImage) {
        contents.push({
          inlineData: {
            mimeType,
            data: fileBuffer.toString("base64"),
          },
        });
      }

      contents.push(promptText);

      const result = await model.generateContent(contents);
      const responseText = result.response.text();

      if (!responseText) {
        throw new Error("Empty response from Gemini");
      }

      const parsed = JSON.parse(responseText);
      if (parsed.caption && Array.isArray(parsed.hashtags)) {
        const hashtagsClean = parsed.hashtags.map((t) =>
          t.startsWith("#") ? t : `#${t}`
        );

        return {
          caption: parsed.caption.trim(),
          hashtags: hashtagsClean,
          fullText: `${parsed.caption.trim()}\n\n${hashtagsClean.join(" ")}`,
          provider: "gemini",
          model: modelName,
          tone,
        };
      }
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error("Failed to generate caption using Gemini API.");
};

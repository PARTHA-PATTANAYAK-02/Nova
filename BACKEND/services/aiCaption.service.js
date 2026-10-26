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

/**
 * AI Smart Comment Suggestions generator powered by Google Gemini.
 * Generates 3 natural, contextual social comments based on post content.
 */
export const generateAICommentsWithGemini = async ({
  caption = "",
  authorUsername = "",
  existingComments = [],
}) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return {
      comments: [
        { text: "Love this vibe so much! ✨", vibe: "Appreciative", emoji: "✨" },
        { text: "This post definitely understood the assignment 🔥", vibe: "Witty", emoji: "🔥" },
        { text: "Where was this? Looks incredible! 💭", vibe: "Curious", emoji: "💭" },
      ],
      fallback: true,
    };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const promptText = `
You are Nova AI, an expert social assistant helping a user write genuine, cool, natural comments on a social media post.

Post Context:
- Post Author: @${authorUsername || "friend"}
- Post Caption/Topic: "${caption ? caption.trim() : "A moment shared on Nova"}"
${existingComments && existingComments.length > 0 ? `- Recent comments on post: ${existingComments.slice(0, 3).map((c) => `"${c}"`).join(", ")}` : ""}

Instructions:
1. Generate exactly 3 distinct, authentic comment options that sound like a real person on Instagram/Nova (NOT robotic or corporate).
2. The 3 options must have different vibes:
   - Option 1 (Appreciative): Supportive, hype, or warm with fitting emojis.
   - Option 2 (Witty): Fun, playful, clever, or relatable one-liner.
   - Option 3 (Curious): Asks a natural question or points out an interesting detail to spark a conversation.
3. Keep each comment concise (4 to 12 words max). Avoid generic repetitive clichés like "great photo".
4. Return strict valid JSON with the format:
{
  "comments": [
    { "text": "...", "vibe": "Appreciative", "emoji": "✨" },
    { "text": "...", "vibe": "Witty", "emoji": "🔥" },
    { "text": "...", "vibe": "Curious", "emoji": "💭" }
  ]
}
`.trim();

  let lastError = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.9,
          topP: 0.95,
          maxOutputTokens: 250,
        },
      });

      const result = await model.generateContent(promptText);
      const responseText = result.response.text();

      if (!responseText) throw new Error("Empty response from Gemini");

      const parsed = JSON.parse(responseText);
      if (Array.isArray(parsed.comments) && parsed.comments.length > 0) {
        return {
          comments: parsed.comments.slice(0, 3).map((item) => ({
            text: (item.text || "").trim(),
            vibe: item.vibe || "General",
            emoji: item.emoji || "✨",
          })),
          provider: "gemini",
          model: modelName,
        };
      }
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  // Graceful fallback if AI call fails
  return {
    comments: [
      { text: "Love this aesthetic so much! ✨", vibe: "Appreciative", emoji: "✨" },
      { text: "This post definitely understood the assignment 🔥", vibe: "Witty", emoji: "🔥" },
      { text: "Where was this? Looks incredible! 💭", vibe: "Curious", emoji: "💭" },
    ],
    fallback: true,
  };
};

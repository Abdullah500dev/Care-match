import catchAsyncError from "../middlewares/catchAsyncErrors.js";
import openai from "../config/openai.js";

const generateAIContent = catchAsyncError(async (req, res) => {
  const { title, description } = req.body;

  try {
    const prompt = `
  You are an expert campaign content writer for a nonprofit fundraising platform.
  Based on the following campaign information, generate compelling content:
  
  ${title ? `Title: ${title}` : ""}
  ${description ? `Description: ${description}` : ""}
  
  Please provide a JSON response with these fields:
  - title: An improved campaign title (1-2 sentences)
  - tagline: A catchy tagline (1 short sentence)
  - description: Detailed campaign description in plain text (3-5 paragraphs)
  
  The content should be:
  - Engaging and persuasive
  - Focused on inspiring donations
  - Clear about the impact of contributions
  - Suitable for a nonprofit audience
`;

    const retryOperation = async (
      operation,
      maxRetries = 3,
      initialDelay = 1000
    ) => {
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await operation();
        } catch (error) {
          if (error.status === 429 && i < maxRetries - 1) {
            const delay = initialDelay * Math.pow(2, i);
            console.error(`Rate limit hit, retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          throw error;
        }
      }
    };

    const response = await retryOperation(() =>
      openai.chat.completions.create({
        model: "gpt-3.5-turbo-0125",
        messages: [
          {
            role: "system",
            content: "You are an expert nonprofit fundraising content creator.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1000,
      })
    );

    const aiContent = JSON.parse(response.choices[0].message.content);

    if (!aiContent.title && !aiContent.description) {
      throw new Error("AI failed to generate meaningful content");
    }

    const formattedResponse = {
      title: aiContent.title || title,
      tagline: aiContent.tagline || "",
      description: aiContent.description || description,
    };

    res.status(200).json(formattedResponse);
  } catch (error) {
    console.error("AI Generation Error:", error);
    res.status(500).json({
      error: {
        message: error.message || "Failed to generate campaign content",
        details: error.response?.data || null,
      },
    });
  }
});

export default {
  generateAIContent,
};

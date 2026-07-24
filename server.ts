import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

app.use(express.json());

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    geminiConfigured: !!process.env.GEMINI_API_KEY 
  });
});

app.post("/api/farming-tips", async (req, res) => {
  console.log("Received request for farming tips:", req.body);
  try {
    const { crop, region } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is missing");
      return res.status(500).json({ error: "Gemini API key is not configured" });
    }

    const prompt = `Provide 3 expert farming tips for growing ${crop} in the ${region} region. The output MUST be in Bengali (Bangla). 
    Format your response EXACTLY as a JSON object:
    {
      "tips": [
        { "title": "Tip Title in Bengali", "content": "Detailed tip content in Bengali" },
        { "title": "Tip Title in Bengali", "content": "Detailed tip content in Bengali" },
        { "title": "Tip Title in Bengali", "content": "Detailed tip content in Bengali" }
      ]
    }
    Do not add any other text before or after the JSON.`;
    
    const interaction = await Promise.race([
      genAI.interactions.create({
        model: "gemini-3.5-flash",
        input: prompt,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("AI response timeout")), 25000))
    ]) as any;
    
    let fullOutput = "";
    for (const step of interaction.steps) {
      if (step.type === 'model_output') {
        const textContent = step.content?.find(c => c.type === 'text');
        if (textContent && textContent.text) {
          fullOutput += textContent.text;
        }
      }
    }
    
    console.log("Raw Gemini Output:", fullOutput);

    // More robust JSON extraction
    const extractJson = (text: string) => {
      // Look for JSON blocks
      const jsonBlock = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlock) return jsonBlock[1];
      
      // Look for the first { and last }
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return text.substring(firstBrace, lastBrace + 1);
      }
      return text;
    };

    const cleanedText = extractJson(fullOutput).trim();
    
    try {
      const parsed = JSON.parse(cleanedText);
      if (!parsed.tips || !Array.isArray(parsed.tips)) {
        throw new Error("Invalid format: 'tips' array missing");
      }
      res.json(parsed);
    } catch (parseError) {
      console.error("Failed to parse Gemini output:", fullOutput);
      res.status(500).json({ 
        error: "AI response parsing failed", 
        raw: fullOutput.substring(0, 500) + "..." 
      });
    }
  } catch (error: any) {
    console.error("Error generating tips:", error);
    res.status(500).json({ error: error.message || "Failed to generate tips" });
  }
});

app.get("/api/weather-alerts", (req, res) => {
  // Simulating real-time alerts based on region (could use a real API here)
  const alerts = [
    { 
      id: "1", 
      type: "ভারী বৃষ্টি", 
      severity: "High", 
      region: "উত্তর", 
      message: "আগামীকাল ভারী বৃষ্টিপাতের সম্ভাবনা রয়েছে। জমিতে সঠিক নিষ্কাশন ব্যবস্থা নিশ্চিত করুন।" 
    },
    { 
      id: "2", 
      type: "তাপপ্রবাহ", 
      severity: "High", 
      region: "দক্ষিণ", 
      message: "তাপমাত্রা ৪০° সেলসিয়াসের উপরে উঠতে পারে। সেচের ফ্রিকোয়েন্সি বাড়ান।" 
    },
    { 
      id: "3", 
      type: "পঙ্গপাল সতর্কতা", 
      severity: "Medium", 
      region: "পশ্চিম", 
      message: "এলাকায় পঙ্গপাল দেখা গেছে। আপনার ফসল রক্ষা করতে দ্রুত ব্যবস্থা নিন।" 
    }
  ];
  res.json(alerts);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Krishi server running on http://localhost:${PORT}`);
  });
}

startServer();

const jwt = require("jsonwebtoken");
require("dotenv").config();

function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) return res.sendStatus(401);
        req.user = user;
        next();
    });
}

// Single reusable Groq caller
async function callGroq(prompt, model = "llama-3.1-8b-instant") {
    if (!process.env.GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY not set in .env");
    }
    const Groq = require("groq-sdk");
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 512,
    });
    return completion.choices[0].message.content.trim();
}

async function summarizeNote(content) {
    return callGroq(
        `The following note is written in Markdown. Interpret it properly: headings (##) are sections, "- [ ] item" means a task named "item" (the brackets do NOT mean it is empty — read the text after them), "- [x] item" means a completed task.\n\nSummarise what this note is about in 2-3 concise sentences. Just the summary, no preamble:\n\n${content}`
    );
}

async function autoTagNote(title, content) {
    const raw = await callGroq(
        `Generate 3 to 5 relevant tags for this note. Return ONLY a comma-separated list of lowercase single-word tags, nothing else.\nTitle: ${title}\nContent: ${content}`
    );
    return raw.split(",").map(t => t.trim().replace(/^#/, "")).filter(Boolean).slice(0, 5);
}

async function detectMood(content) {
    const raw = await callGroq(
        `Analyze the mood of this note. Reply with ONLY one of these exact options (emoji + word):\n💡 Creative\n✅ Productive\n😤 Frustrated\n😊 Happy\n📋 Informational\n🤔 Thoughtful\n😰 Stressed\n💪 Motivated\n\nNote: "${content}"`
    );
    const parts = raw.trim().split(" ");
    return { moodEmoji: parts[0] || "📋", mood: parts.slice(1).join(" ") || "Informational" };
}

async function writingAssist(content, mode) {
    const prompts = {
        continue: `Continue writing this note naturally, adding 2-3 more sentences. Return ONLY the continuation (not the original):\n\n"${content}"`,
        formal:   `Rewrite this note in a formal, professional tone. Return ONLY the rewritten version:\n\n"${content}"`,
        shorter:  `Make this note more concise while keeping all key information. Return ONLY the shortened version:\n\n"${content}"`,
    };
    return callGroq(prompts[mode] || prompts.continue);
}

async function suggestTitle(content) {
    return callGroq(
        `Suggest a short, catchy title (max 6 words) for this note. Return ONLY the title, nothing else:\n\n"${content}"`
    );
}

module.exports = {
    authenticateToken,
    summarizeNote,
    autoTagNote,
    detectMood,
    writingAssist,
    suggestTitle,
};

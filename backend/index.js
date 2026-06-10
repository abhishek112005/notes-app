require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { randomUUID: uuidv4 } = require("crypto");

const User = require("./models/user.model");
const Note = require("./models/note.model");
const {
    authenticateToken,
    summarizeNote,
    autoTagNote,
    detectMood,
    writingAssist,
    suggestTitle,
} = require("./utilities");

// ─── DB ──────────────────────────────────────────────────────────────────────
const DB_URI =
    process.env.CONNECTION_STRING ||
    "mongodb+srv://testuser:testuser123@notesapp.symsp.mongodb.net/?retryWrites=true&w=majority&appName=notesapp";

mongoose
    .connect(DB_URI, { serverSelectionTimeoutMS: 30000, socketTimeoutMS: 45000 })
    .then(() => console.log("✅ MongoDB connected successfully!"))
    .catch((err) => { console.error("❌ MongoDB error:", err); process.exit(1); });

// ─── APP + SOCKET ─────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);
const FRONTEND = process.env.FRONTEND_URL || "http://localhost:5173";

const io = new Server(server, {
    cors: { origin: FRONTEND, methods: ["GET", "POST"], credentials: true },
});

// Socket auth + rooms
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) return next(new Error("Invalid token"));
        socket.userId = (decoded.user || decoded.newUser)?._id;
        next();
    });
});
io.on("connection", (socket) => {
    if (socket.userId) socket.join(String(socket.userId));
});

const emitUpdate = (userId) => io.to(String(userId)).emit("notes-updated");

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());
app.use(cors({ origin: FRONTEND, credentials: true }));

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: true, message: "Too many requests. Try again later." },
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const SALT_ROUNDS = 10;

// Supports both bcrypt-hashed and legacy plain-text passwords (migrates on login)
async function verifyPassword(plain, stored) {
    if (stored.startsWith("$2b$") || stored.startsWith("$2a$")) {
        return bcrypt.compare(plain, stored);
    }
    return plain === stored; // legacy
}

function signAccess(payload) {
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "60m" });
}
function signRefresh(payload) {
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET + "_refresh", { expiresIn: "7d" });
}

function saveVersion(note) {
    note.versions.unshift({ title: note.title, content: note.content, tags: note.tags });
    if (note.versions.length > 5) note.versions = note.versions.slice(0, 5);
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
app.get("/", (_, res) => res.json({ data: "Notes API running" }));

app.post("/create-account", authLimiter, async (req, res) => {
    const { fullName, email, password } = req.body;
    if (!fullName) return res.status(400).json({ error: true, message: "Full Name is required" });
    if (!email) return res.status(400).json({ error: true, message: "Email is required" });
    if (!password) return res.status(400).json({ error: true, message: "Password is required" });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.json({ error: true, message: "User already exists" });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser = await new User({ fullName, email: email.toLowerCase(), password: hashed }).save();

    const accessToken = signAccess({ user: newUser });
    const refreshToken = signRefresh({ user: newUser });
    await User.findByIdAndUpdate(newUser._id, { refreshToken });

    return res.json({ error: false, user: newUser, accessToken, refreshToken, message: "Registration Successful" });
});

app.post("/login", authLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    if (!password) return res.status(400).json({ message: "Password is required" });

    const userInfo = await User.findOne({ email: email.toLowerCase() });
    if (!userInfo) return res.status(400).json({ message: "User not found" });

    const valid = await verifyPassword(password, userInfo.password);
    if (!valid) return res.status(400).json({ error: true, message: "Invalid Credentials" });

    // Migrate plain-text password to bcrypt on login
    if (!userInfo.password.startsWith("$2b$") && !userInfo.password.startsWith("$2a$")) {
        const hashed = await bcrypt.hash(password, SALT_ROUNDS);
        userInfo.password = hashed;
    }

    const accessToken = signAccess({ user: userInfo });
    const refreshToken = signRefresh({ user: userInfo });
    userInfo.refreshToken = refreshToken;
    await userInfo.save();

    return res.json({ error: false, message: "Login Successful", email, accessToken, refreshToken });
});

app.post("/refresh-token", async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: true, message: "Refresh token required" });

    try {
        const secret = process.env.REFRESH_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET + "_refresh";
        const decoded = jwt.verify(refreshToken, secret);
        const user = await User.findById((decoded.user || decoded.newUser)?._id);
        if (!user || user.refreshToken !== refreshToken) {
            return res.status(403).json({ error: true, message: "Invalid refresh token" });
        }
        const newAccessToken = signAccess({ user });
        return res.json({ error: false, accessToken: newAccessToken });
    } catch {
        return res.status(403).json({ error: true, message: "Invalid or expired refresh token" });
    }
});

app.post("/logout", authenticateToken, async (req, res) => {
    const { user } = req.user;
    await User.findByIdAndUpdate(user._id, { refreshToken: null });
    return res.json({ error: false, message: "Logged out successfully" });
});

app.get("/get-user", authenticateToken, async (req, res) => {
    const { user } = req.user;
    const isUser = await User.findById(user._id);
    if (!isUser) return res.sendStatus(401);
    return res.json({
        user: { fullName: isUser.fullName, email: isUser.email, _id: isUser._id, createdOn: isUser.createdOn },
    });
});

// ─── NOTE ROUTES ──────────────────────────────────────────────────────────────
app.post("/add-note", authenticateToken, async (req, res) => {
    const { title, content, tags, color, category } = req.body;
    const { user } = req.user;
    if (!title) return res.status(400).json({ error: true, message: "Title is required" });
    if (!content) return res.status(400).json({ error: true, message: "Content is required" });

    const note = await new Note({
        title, content,
        tags: tags || [],
        color: color || "default",
        category: category || "General",
        userId: user._id,
    }).save();

    emitUpdate(user._id);
    return res.json({ error: false, note, message: "Note added successfully" });
});

app.put("/edit-note/:noteId", authenticateToken, async (req, res) => {
    const { title, content, tags, isPinned, color, category } = req.body;
    const { user } = req.user;

    const note = await Note.findOne({ _id: req.params.noteId, userId: user._id });
    if (!note) return res.status(404).json({ error: true, message: "Note not found" });

    // Save to version history before editing
    saveVersion(note);

    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (tags !== undefined) note.tags = tags;
    if (isPinned !== undefined) note.isPinned = isPinned;
    if (color !== undefined) note.color = color;
    if (category !== undefined) note.category = category;
    note.updatedOn = new Date();

    await note.save();
    emitUpdate(user._id);
    return res.json({ error: false, note, message: "Note updated successfully" });
});

app.get("/get-all-notes", authenticateToken, async (req, res) => {
    const { user } = req.user;
    const { category, sort } = req.query;

    const filter = { userId: user._id, isTrashed: false, isArchived: false };
    if (category && category !== "All") filter.category = category;

    let sortObj = { isPinned: -1, createdOn: -1 };
    if (sort === "oldest") sortObj = { isPinned: -1, createdOn: 1 };
    if (sort === "alpha") sortObj = { isPinned: -1, title: 1 };
    if (sort === "updated") sortObj = { isPinned: -1, updatedOn: -1 };

    const notes = await Note.find(filter).sort(sortObj);
    return res.json({ error: false, notes });
});

// Soft-delete → trash
app.delete("/delete-note/:noteId", authenticateToken, async (req, res) => {
    const { user } = req.user;
    const note = await Note.findOne({ _id: req.params.noteId, userId: user._id });
    if (!note) return res.status(404).json({ error: true, message: "Note not found" });

    note.isTrashed = true;
    note.trashedAt = new Date();
    await note.save();

    emitUpdate(user._id);
    return res.json({ error: false, message: "Note moved to trash" });
});

app.put("/update-note-pinned/:noteId", authenticateToken, async (req, res) => {
    const { isPinned } = req.body;
    const { user } = req.user;
    const note = await Note.findOne({ _id: req.params.noteId, userId: user._id });
    if (!note) return res.status(404).json({ error: true, message: "Note not found" });

    note.isPinned = isPinned;
    await note.save();
    emitUpdate(user._id);
    return res.json({ error: false, note, message: "Pin status updated" });
});

app.put("/archive-note/:noteId", authenticateToken, async (req, res) => {
    const { user } = req.user;
    const note = await Note.findOne({ _id: req.params.noteId, userId: user._id });
    if (!note) return res.status(404).json({ error: true, message: "Note not found" });

    note.isArchived = !note.isArchived;
    await note.save();
    emitUpdate(user._id);
    return res.json({ error: false, note, message: note.isArchived ? "Note archived" : "Note unarchived" });
});

// ─── TRASH ROUTES ─────────────────────────────────────────────────────────────
app.get("/get-trash", authenticateToken, async (req, res) => {
    const { user } = req.user;
    const notes = await Note.find({ userId: user._id, isTrashed: true }).sort({ trashedAt: -1 });
    return res.json({ error: false, notes });
});

app.put("/restore-note/:noteId", authenticateToken, async (req, res) => {
    const { user } = req.user;
    const note = await Note.findOne({ _id: req.params.noteId, userId: user._id });
    if (!note) return res.status(404).json({ error: true, message: "Note not found" });

    note.isTrashed = false;
    note.trashedAt = null;
    await note.save();
    emitUpdate(user._id);
    return res.json({ error: false, message: "Note restored" });
});

app.delete("/permanent-delete/:noteId", authenticateToken, async (req, res) => {
    const { user } = req.user;
    await Note.deleteOne({ _id: req.params.noteId, userId: user._id });
    return res.json({ error: false, message: "Note permanently deleted" });
});

// ─── ARCHIVED NOTES ───────────────────────────────────────────────────────────
app.get("/get-archived", authenticateToken, async (req, res) => {
    const { user } = req.user;
    const notes = await Note.find({ userId: user._id, isArchived: true, isTrashed: false }).sort({ updatedOn: -1 });
    return res.json({ error: false, notes });
});

// ─── SEARCH ───────────────────────────────────────────────────────────────────
app.get("/search-notes", authenticateToken, async (req, res) => {
    const { user } = req.user;
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: true, message: "Query required" });

    const regex = new RegExp(q, "i");
    const notes = await Note.find({
        userId: user._id,
        isTrashed: false,
        $or: [{ title: regex }, { content: regex }, { tags: regex }],
    }).sort({ isPinned: -1, updatedOn: -1 });

    return res.json({ error: false, notes });
});

// ─── VERSION HISTORY ──────────────────────────────────────────────────────────
app.get("/versions/:noteId", authenticateToken, async (req, res) => {
    const { user } = req.user;
    const note = await Note.findOne({ _id: req.params.noteId, userId: user._id });
    if (!note) return res.status(404).json({ error: true, message: "Note not found" });
    return res.json({ error: false, versions: note.versions });
});

app.put("/restore-version/:noteId/:versionIndex", authenticateToken, async (req, res) => {
    const { user } = req.user;
    const note = await Note.findOne({ _id: req.params.noteId, userId: user._id });
    if (!note) return res.status(404).json({ error: true, message: "Note not found" });

    const idx = parseInt(req.params.versionIndex);
    const version = note.versions[idx];
    if (!version) return res.status(404).json({ error: true, message: "Version not found" });

    saveVersion(note);
    note.title = version.title;
    note.content = version.content;
    note.tags = version.tags;
    note.updatedOn = new Date();
    await note.save();
    emitUpdate(user._id);
    return res.json({ error: false, note, message: "Version restored" });
});

// ─── SHARE ROUTES ─────────────────────────────────────────────────────────────
app.post("/generate-share/:noteId", authenticateToken, async (req, res) => {
    const { user } = req.user;
    const note = await Note.findOne({ _id: req.params.noteId, userId: user._id });
    if (!note) return res.status(404).json({ error: true, message: "Note not found" });

    note.shareToken = uuidv4();
    await note.save();
    return res.json({ error: false, shareToken: note.shareToken });
});

app.delete("/remove-share/:noteId", authenticateToken, async (req, res) => {
    const { user } = req.user;
    await Note.findOneAndUpdate({ _id: req.params.noteId, userId: user._id }, { shareToken: null });
    return res.json({ error: false, message: "Share link removed" });
});

// Public — no auth required
app.get("/share/:token", async (req, res) => {
    const note = await Note.findOne({ shareToken: req.params.token, isTrashed: false });
    if (!note) return res.status(404).json({ error: true, message: "Note not found or link expired" });
    return res.json({
        error: false,
        note: { title: note.title, content: note.content, tags: note.tags, mood: note.mood, moodEmoji: note.moodEmoji, createdOn: note.createdOn },
    });
});

// ─── AI ROUTES ────────────────────────────────────────────────────────────────
app.post("/ai/summarize", authenticateToken, async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: true, message: "Content required" });
    try {
        const summary = await summarizeNote(content);
        return res.json({ error: false, summary });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
});

app.post("/ai/auto-tag", authenticateToken, async (req, res) => {
    const { title, content } = req.body;
    if (!content) return res.status(400).json({ error: true, message: "Content required" });
    try {
        const tags = await autoTagNote(title || "", content);
        return res.json({ error: false, tags });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
});

app.post("/ai/mood", authenticateToken, async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: true, message: "Content required" });
    try {
        const { mood, moodEmoji } = await detectMood(content);
        // Persist mood on the note if noteId provided
        if (req.body.noteId) {
            await Note.findOneAndUpdate(
                { _id: req.body.noteId, userId: req.user.user._id },
                { mood, moodEmoji }
            );
        }
        return res.json({ error: false, mood, moodEmoji });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
});

app.post("/ai/writing-assist", authenticateToken, async (req, res) => {
    const { content, mode } = req.body;
    if (!content) return res.status(400).json({ error: true, message: "Content required" });
    try {
        const result = await writingAssist(content, mode || "continue");
        return res.json({ error: false, result });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
});

app.post("/ai/suggest-title", authenticateToken, async (req, res) => {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: true, message: "Content required" });
    try {
        const title = await suggestTitle(content);
        return res.json({ error: false, title });
    } catch (e) {
        return res.status(500).json({ error: true, message: e.message });
    }
});

// ─── START ────────────────────────────────────────────────────────────────────
if (require.main === module) {
    server.listen(8000, () => console.log("🚀 Server running on port 8000"));
}
module.exports = app;

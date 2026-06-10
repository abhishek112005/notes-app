const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const versionSchema = new Schema({
    title: String,
    content: String,
    tags: [String],
    savedAt: { type: Date, default: Date.now },
});

const noteSchema = new Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    tags: { type: [String], default: [] },
    isPinned: { type: Boolean, default: false },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdOn: { type: Date, default: Date.now },
    updatedOn: { type: Date, default: Date.now },

    // Organisation
    color: { type: String, default: "default" },
    category: { type: String, default: "General" },

    // State
    isArchived: { type: Boolean, default: false },
    isTrashed: { type: Boolean, default: false },
    trashedAt: { type: Date, default: null },

    // Sharing
    shareToken: { type: String, default: null },

    // AI
    mood: { type: String, default: null },
    moodEmoji: { type: String, default: null },

    // Version history (up to 5 previous versions)
    versions: { type: [versionSchema], default: [] },
});

module.exports = mongoose.model("Note", noteSchema);

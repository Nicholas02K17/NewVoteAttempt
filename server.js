const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve frontend files

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/votingDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Define the vote schema
const voteSchema = new mongoose.Schema({
    number: { type: Number, unique: true },
    count: { type: Number, default: 0 },
});

const Vote = mongoose.model("Vote", voteSchema);

// Define the IP tracking schema
const ipVoteSchema = new mongoose.Schema({
    ip: String,
    lastVotedAt: Date,
});

const IPVote = mongoose.model("IPVote", ipVoteSchema);

// Ensure all numbers (1-5) exist in DB
async function initializeVotes() {
    for (let i = 1; i <= 5; i++) {
        await Vote.findOneAndUpdate(
            { number: i },
            { $setOnInsert: { count: 0 } },
            { upsert: true }
        );
    }
}
initializeVotes();

// Handle vote submission with IP restriction
app.post("/vote", async (req, res) => {
    try {
        const { number } = req.body;
        const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

        if (![1, 2, 3, 4, 5].includes(number)) {
            return res.status(400).json({ error: "Invalid number" });
        }

        // Check if this IP has voted in the last 24 hours
        const existingIPVote = await IPVote.findOne({ ip });

        if (existingIPVote) {
            const now = new Date();
            const timeDiff = now - existingIPVote.lastVotedAt;
            const twentyFourHours = 24 * 60 * 60 * 1000;

            if (timeDiff < twentyFourHours) {
                const hoursLeft = Math.ceil((twentyFourHours - timeDiff) / (1000 * 60 * 60));
                return res.status(429).json({
                    error: `You already voted. Please wait ${hoursLeft} hour(s) before voting again.`,
                });
            }

            // Update timestamp
            existingIPVote.lastVotedAt = now;
            await existingIPVote.save();
        } else {
            await IPVote.create({ ip, lastVotedAt: new Date() });
        }

        // Update vote count
        const updatedVote = await Vote.findOneAndUpdate(
            { number },
            { $inc: { count: 1 } },
            { new: true, upsert: true }
        );

        res.json({ message: "Vote recorded!", updatedVote });
    } catch (error) {
        console.error("Error recording vote:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Fetch vote results
app.get("/results", async (req, res) => {
    try {
        const results = await Vote.find();
        let voteCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        results.forEach((vote) => {
            voteCounts[vote.number] = vote.count;
        });

        res.json(voteCounts);
    } catch (error) {
        console.error("Error fetching results:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Reset all votes
app.post("/reset", async (req, res) => {
    try {
        await Vote.updateMany({}, { $set: { count: 0 } });
        await IPVote.deleteMany({}); // Also reset IP voting records
        res.json({ success: true, message: "All votes and IP records have been reset!" });
    } catch (error) {
        console.error("Error resetting votes:", error);
        res.status(500).json({ success: false, error: "Failed to reset votes" });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
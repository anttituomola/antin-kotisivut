// Serverless function entry point for Vercel
import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";
import fetch from "node-fetch";

// Define interfaces for essays
interface Essay {
  id: string;
  title: string;
  content: string;
  created: string;
  updated: string;
  status: string;
  audio_file_id?: string;
  voiceId?: string;
}

// Memory store for essays (in a real app, this would be in a database)
let essays: Essay[] = [];

// Define custom interface for authenticated requests
interface AuthRequest extends Request {
  user?: JwtPayload | string;
}

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "*", // Allow from anywhere for Vercel functions
    credentials: true,
  })
);

// Simple in-memory user store (in a real app, this would be in a database)
// We'll hash the password on server startup
let hashedPassword = "";

// Hash the password on startup
(async () => {
  if (process.env.AUTH_PASSWORD) {
    hashedPassword = await bcrypt.hash(process.env.AUTH_PASSWORD, 10);
    console.log("Password hashed and ready for authentication");
  } else {
    console.error("WARNING: Auth password not set in environment variables");
  }
})();

// Auth routes
app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  // Check credentials
  if (
    username === process.env.AUTH_USERNAME &&
    (await bcrypt.compare(password, hashedPassword))
  ) {
    // Create JWT token
    const token = jwt.sign(
      { username },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" }
    );

    // Set token as a cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "none",
    });

    return res.json({ success: true });
  }

  // Auth failed
  return res.status(401).json({ message: "Invalid credentials" });
});

// Middleware to check authentication
const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret"
    );
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Logout route
app.post("/api/auth/logout", (req: Request, res: Response) => {
  res.clearCookie("token");
  return res.json({ success: true });
});

// Check auth status
app.get("/api/auth/status", authenticate, (req: AuthRequest, res: Response) => {
  return res.json({ authenticated: true, user: req.user });
});

// Protected route example
app.get("/api/protected", authenticate, (req: AuthRequest, res: Response) => {
  res.json({ message: "This is protected data", user: req.user });
});

// Create essays router
const essaysRouter = express.Router();

// GET all essays
essaysRouter.get("/", (req: Request, res: Response) => {
  res.json({ items: essays });
});

// GET a single essay by ID
essaysRouter.get("/:id", (req: Request, res: Response) => {
  const essay = essays.find((e) => e.id === req.params.id);

  if (!essay) {
    return res.status(404).json({ message: "Essay not found" });
  }

  res.json(essay);
});

// POST a new essay
essaysRouter.post("/", (req: Request, res: Response) => {
  const { title, content, voiceId } = req.body;

  if (!content) {
    return res.status(400).json({ message: "Content is required" });
  }

  const newEssay: Essay = {
    id: Date.now().toString(),
    title: title || "Untitled Essay",
    content,
    voiceId: voiceId || "Matthew",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    status: "pending",
  };

  essays.push(newEssay);

  // Simulate async processing by changing status after a delay
  setTimeout(() => {
    const essay = essays.find((e) => e.id === newEssay.id);
    if (essay) {
      essay.status = "completed";
      essay.audio_file_id = `audio_${essay.id}.mp3`;
    }
  }, 5000);

  res.status(201).json(newEssay);
});

// POST to process an essay (regenerate audio)
essaysRouter.post("/:id/process", (req: Request, res: Response) => {
  const { voiceId } = req.body;
  const essay = essays.find((e) => e.id === req.params.id);

  if (!essay) {
    return res.status(404).json({ message: "Essay not found" });
  }

  essay.status = "processing";
  if (voiceId) {
    essay.voiceId = voiceId;
  }

  // Simulate async processing
  setTimeout(() => {
    essay.status = "completed";
    essay.audio_file_id = `audio_${essay.id}_${Date.now()}.mp3`;
    essay.updated = new Date().toISOString();
  }, 5000);

  res.json({ message: "Processing started", essay });
});

// DELETE an essay
essaysRouter.delete("/:id", (req: Request, res: Response) => {
  const essayIndex = essays.findIndex((e) => e.id === req.params.id);

  if (essayIndex === -1) {
    return res.status(404).json({ message: "Essay not found" });
  }

  essays.splice(essayIndex, 1);
  res.json({ message: "Essay deleted successfully" });
});

// Use essay routes
app.use("/api/essays", authenticate, essaysRouter);

// Export the Express API for Vercel
export default app;

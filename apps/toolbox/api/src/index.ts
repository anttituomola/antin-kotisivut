import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt, { JwtPayload } from "jsonwebtoken";
import bcrypt from "bcrypt";

// Define custom interface for authenticated requests
interface AuthRequest extends Request {
  user?: JwtPayload | string;
}

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? "https://toolbox.anttituomola.fi"
        : "http://localhost:5173",
    credentials: true,
  })
);

// Simple in-memory user store (in a real app, this would be in a database)
// We'll hash the password on server startup
let hashedPassword: string = "";

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
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

import { VercelRequest, VercelResponse } from "@vercel/node";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import cookie from "cookie";

// In-memory storage for password hash
let hashedPassword = "";

// Initialize the password hash
(async () => {
  if (process.env.AUTH_PASSWORD) {
    hashedPassword = await bcrypt.hash(process.env.AUTH_PASSWORD, 10);
    console.log("Password hash initialized");
  } else {
    console.error("AUTH_PASSWORD environment variable not set");
  }
})();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://toolbox.anttituomola.fi"
  );
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle OPTIONS preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow POST for login
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required" });
  }

  // Skip actual password check in development if needed
  const skipAuth = process.env.SKIP_AUTH === "true";
  const passwordMatches =
    skipAuth ||
    (username === process.env.AUTH_USERNAME &&
      (await bcrypt.compare(password, hashedPassword)));

  if (passwordMatches) {
    // Create JWT token
    const token = jwt.sign(
      { username },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "7d" }
    );

    // Set token as a cookie
    const cookieStr = cookie.serialize("token", token, {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      sameSite: "none",
      path: "/",
    });

    res.setHeader("Set-Cookie", cookieStr);
    return res.status(200).json({ success: true });
  }

  // Auth failed
  return res.status(401).json({ message: "Invalid credentials" });
}

import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import cookie from "cookie";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  // For debugging purposes - check if environment variables are set
  if (!process.env.AUTH_USERNAME || !process.env.AUTH_PASSWORD) {
    console.error(
      "Missing AUTH_USERNAME or AUTH_PASSWORD environment variables"
    );
    // Return a more specific error in development
    if (process.env.NODE_ENV !== "production") {
      return res.status(500).json({
        message:
          "Server configuration error: Missing authentication credentials",
        debug: {
          authUsernameDefined: !!process.env.AUTH_USERNAME,
          authPasswordDefined: !!process.env.AUTH_PASSWORD,
        },
      });
    }
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const correctUsername = process.env.AUTH_USERNAME;
  const correctPassword = process.env.AUTH_PASSWORD;

  try {
    // Verify username first
    if (username !== correctUsername) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Then verify password - compare plain text since we're passing the password directly
    const passwordMatches = password === correctPassword;

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
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

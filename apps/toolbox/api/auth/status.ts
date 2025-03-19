import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://toolbox.anttituomola.fi"
  );
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Cookie");

  // Handle OPTIONS preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow GET for status check
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET environment variable not set");
      if (process.env.NODE_ENV !== "production") {
        return res.status(500).json({
          message: "Server configuration error: Missing JWT_SECRET",
        });
      }
    }

    // Get token from cookies
    const token = req.cookies.token;

    if (!token) {
      return res
        .status(401)
        .json({ authenticated: false, message: "No token found" });
    }

    // Verify the token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret"
    );
    return res.status(200).json({ authenticated: true, user: decoded });
  } catch (error) {
    console.error("Auth status error:", error);
    return res
      .status(401)
      .json({ authenticated: false, message: "Invalid token" });
  }
}

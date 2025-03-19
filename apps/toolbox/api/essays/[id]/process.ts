import { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";

// Import essay interface and essays array from the main essays endpoint
// In a real app, this would come from a database
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

// Reference to essays array (simulated database)
// This will be empty on cold starts since it's not shared with the index.ts file
// In a real app, you'd use a database like PocketBase
let essays: Essay[] = [];

// Middleware to authenticate requests
const authenticate = (
  req: NextApiRequest,
  res: NextApiResponse,
  callback: () => void
) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
    callback();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Cookie");

  // Handle OPTIONS preflight request
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Only allow POST for processing
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Get the essay ID from the URL
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return res.status(400).json({ message: "Invalid essay ID" });
  }

  // Authenticate the request
  return authenticate(req, res, async () => {
    try {
      // Proxy the request to the PocketBase server
      const pocketbaseUrl = "https://api.anttituomola.fi";
      const apiPath = `/api/essays/${id}/process`;

      // Forward the POST request with body
      const response = await fetch(`${pocketbaseUrl}${apiPath}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.cookies.token ? `Bearer ${req.cookies.token}` : "",
        },
        body: JSON.stringify(req.body),
      });

      // Get the response data
      const data = await response.json();

      // Forward the response status and data
      return res.status(response.status).json(data);
    } catch (error: any) {
      console.error("Error proxying request to PocketBase:", error);
      return res.status(500).json({
        message: "Error communicating with the backend server",
        error: error.message,
      });
    }
  });
}

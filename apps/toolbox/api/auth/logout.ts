import { NextApiRequest, NextApiResponse } from "next";
import cookie from "cookie";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
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

  // Only allow POST for logout
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Clear the token cookie
  const cookieStr = cookie.serialize("token", "", {
    httpOnly: true,
    secure: true,
    expires: new Date(0), // Set expiry to the past
    sameSite: "none",
    path: "/",
  });

  res.setHeader("Set-Cookie", cookieStr);
  return res.status(200).json({ success: true });
}

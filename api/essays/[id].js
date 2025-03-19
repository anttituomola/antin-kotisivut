// Vercel serverless function for /api/essays/[id]
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// PocketBase configuration
const pocketbaseUrl = process.env.POCKETBASE_URL || 'https://api.anttituomola.fi';
const pocketbaseEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const pocketbasePassword = process.env.POCKETBASE_ADMIN_PASSWORD;

// Function to authenticate with PocketBase
async function authenticateWithPocketbase() {
	try {
		// Try authenticating with users collection
		try {
			const authUrl = `${pocketbaseUrl}/api/collections/users/auth-with-password`;

			const response = await fetch(authUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					identity: pocketbaseEmail,
					password: pocketbasePassword,
				}),
			});

			if (response.ok) {
				const data = await response.json();
				return data.token;
			}
		} catch (userAuthError) {
			console.error("User auth error:", userAuthError);
		}

		// If that fails, try with staff collection
		try {
			const altAuthUrl = `${pocketbaseUrl}/api/collections/staff/auth-with-password`;

			const altResponse = await fetch(altAuthUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					identity: pocketbaseEmail,
					password: pocketbasePassword,
				}),
			});

			if (altResponse.ok) {
				const altData = await altResponse.json();
				return altData.token;
			}
		} catch (staffAuthError) {
			console.error("Staff auth error:", staffAuthError);
		}

		console.error("All authentication methods failed");
		return null;
	} catch (error) {
		console.error("PocketBase authentication error:", error);
		return null;
	}
}

// Vercel serverless handler
export default async function handler(req, res) {
	// Set CORS headers
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

	// Handle preflight requests
	if (req.method === 'OPTIONS') {
		return res.status(200).end();
	}

	try {
		// Get the essay ID from the URL
		const id = req.query.id;

		if (!id) {
			return res.status(400).json({ message: "Essay ID is required" });
		}

		// Authenticate with PocketBase
		const token = await authenticateWithPocketbase();

		if (!token) {
			return res.status(401).json({
				message: "Authentication failed.",
			});
		}

		if (req.method === 'GET') {
			// Fetch essay from PocketBase
			const essayUrl = `${pocketbaseUrl}/api/collections/essays/records/${id}`;

			const response = await fetch(essayUrl, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error(`Get essay failed: ${errorText}`);
				return res.status(response.status).json({
					message: `Failed to get essay: ${response.statusText}`,
				});
			}

			const essay = await response.json();

			// Add audioUrl if audio file exists
			if (essay.audio_file_id && essay.status === "completed") {
				essay.audioUrl = `/api/essays/${essay.id}/audio`;
			}

			return res.status(200).json(essay);
		}
		else {
			return res.status(405).json({ message: "Method not allowed" });
		}
	} catch (error) {
		console.error("Error handling essay detail request:", error);
		return res.status(500).json({
			message: "Internal server error",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
} 
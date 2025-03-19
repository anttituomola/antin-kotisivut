// Vercel serverless function for /api/essays
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
	res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

	// Handle preflight requests
	if (req.method === 'OPTIONS') {
		return res.status(200).end();
	}

	try {
		// Authenticate with PocketBase
		const token = await authenticateWithPocketbase();

		if (!token) {
			return res.status(401).json({
				message: "Authentication failed.",
			});
		}

		if (req.method === 'GET') {
			// Fetch essays from PocketBase
			const listUrl = `${pocketbaseUrl}/api/collections/essays/records?sort=-created`;

			const response = await fetch(listUrl, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error(`List essays failed: ${errorText}`);
				return res.status(response.status).json({
					message: `Failed to list essays: ${response.statusText}`,
				});
			}

			const essays = await response.json();

			// Process each essay to add audioUrl if needed
			if (essays.items && Array.isArray(essays.items)) {
				for (const essay of essays.items) {
					if (essay.audio_file_id && essay.status === "completed") {
						essay.audioUrl = `/api/essays/${essay.id}/audio`;
					}
				}
			}

			return res.status(200).json(essays);
		}
		else if (req.method === 'POST') {
			const { title, content, voiceId } = req.body;

			if (!content) {
				return res.status(400).json({ message: "Content is required" });
			}

			// Create essay record in PocketBase
			const createUrl = `${pocketbaseUrl}/api/collections/essays/records`;

			const createResponse = await fetch(createUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					title: title || "Untitled Essay",
					content,
					status: "pending",
					audio_file_id: "", // Will be updated after processing
					voiceId: voiceId || "Matthew", // Store the selected voice or default to Matthew
				}),
			});

			if (!createResponse.ok) {
				const errorText = await createResponse.text();
				console.error(`Create essay failed: ${errorText}`);
				return res.status(createResponse.status).json({
					message: `Failed to create essay: ${createResponse.statusText}`,
				});
			}

			const essay = await createResponse.json();
			console.log(`Essay created with ID: ${essay.id}`);

			// We'll trigger processing in a separate function
			// but return success immediately
			fetch(`https://toolbox.anttituomola.fi/api/essays/${essay.id}/process`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					voiceId: voiceId || "Matthew"
				})
			}).catch(err => console.error("Error triggering processing:", err));

			// Return a success response to the client immediately
			return res.status(201).json({
				message: "Essay created successfully and queued for audio processing",
				essayId: essay.id,
			});
		}
		else {
			return res.status(405).json({ message: "Method not allowed" });
		}
	} catch (error) {
		console.error("Error handling essays request:", error);
		return res.status(500).json({
			message: "Internal server error",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
} 
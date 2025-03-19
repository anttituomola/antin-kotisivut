// Vercel serverless function for /api/essays/[id]/process
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import AWS from 'aws-sdk';
import FormData from 'form-data';

// Load environment variables
dotenv.config();

// Configure AWS
AWS.config.update({
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	region: process.env.AWS_REGION || 'us-east-1'
});

const polly = new AWS.Polly();

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

// Convert text to speech using Amazon Polly
async function textToSpeech(text, voiceId = 'Matthew', isLongForm = false) {
	try {
		console.log(`Converting text to speech with voice ${voiceId}, long-form: ${isLongForm}`);

		// Use neural engine for all voices
		const engine = 'neural';

		// Configure the Polly params
		const params = {
			Engine: engine,
			OutputFormat: 'mp3',
			Text: text,
			VoiceId: voiceId,
			TextType: isLongForm ? 'ssml' : 'text', // Use ssml for long-form content
		};

		// If using ssml, wrap the text in <speak> tags
		if (isLongForm) {
			params.Text = `<speak>${text}</speak>`;
		}

		// Synthesize speech
		const result = await polly.synthesizeSpeech(params).promise();

		if (result.AudioStream instanceof Buffer) {
			return result.AudioStream;
		}

		return null;
	} catch (error) {
		console.error('Error converting text to speech:', error);
		return null;
	}
}

// Process essay with Amazon Polly
async function processEssay(essayId, content, token, voiceId = "Matthew") {
	try {
		console.log(`Processing essay ${essayId} with voice ${voiceId}`);

		// Update essay status to "processing"
		const updateUrl = `${pocketbaseUrl}/api/collections/essays/records/${essayId}`;
		await fetch(updateUrl, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				status: "processing",
			}),
		});

		// Generate audio with Amazon Polly - use TextType=ssml for long-form
		const isLongFormVoice = ["Matthew", "Joanna", "Lupe", "Ruth", "Stephen", "Kevin"].includes(voiceId);
		const audioData = await textToSpeech(content, voiceId, isLongFormVoice);

		if (!audioData) {
			throw new Error("Failed to generate audio");
		}

		// Upload the audio file to PocketBase using the proper FormData implementation
		const formData = new FormData();
		formData.append("audio", audioData, {
			filename: `${essayId}.mp3`,
			contentType: "audio/mpeg"
		});

		const fileUrl = `${pocketbaseUrl}/api/files/essays/${essayId}`;
		const fileResponse = await fetch(fileUrl, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				...formData.getHeaders() // Add the form-data headers
			},
			body: formData,
		});

		if (!fileResponse.ok) {
			const errorText = await fileResponse.text();
			console.error(`Upload audio failed: ${errorText}`);
			throw new Error(`Failed to upload audio: ${fileResponse.statusText}`);
		}

		const fileData = await fileResponse.json();
		const audioFileId = fileData.id;

		// Update essay with audio file ID and set status to completed
		await fetch(updateUrl, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				audio_file_id: audioFileId,
				status: "completed",
			}),
		});

		console.log(`Essay ${essayId} processed successfully with audio ID: ${audioFileId}`);
		return { success: true, audioFileId };
	} catch (error) {
		console.error(`Error processing essay ${essayId}:`, error);

		// Update essay status to "error"
		const updateUrl = `${pocketbaseUrl}/api/collections/essays/records/${essayId}`;
		await fetch(updateUrl, {
			method: "PATCH",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				status: "error",
			}),
		});
		return { success: false, error: error.message };
	}
}

// Vercel serverless handler
export default async function handler(req, res) {
	// Set CORS headers
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

	// Handle preflight requests
	if (req.method === 'OPTIONS') {
		return res.status(200).end();
	}

	if (req.method !== 'POST') {
		return res.status(405).json({ message: "Method not allowed" });
	}

	try {
		// Get the essay ID from the URL
		const id = req.query.id;
		const { voiceId } = req.body || {};

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

		// Fetch essay from PocketBase to get content
		const essayUrl = `${pocketbaseUrl}/api/collections/essays/records/${id}`;
		const response = await fetch(essayUrl, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			return res.status(response.status).json({
				message: `Failed to get essay: ${response.statusText}`,
			});
		}

		const essay = await response.json();

		// Update voiceId if a new one is provided
		if (voiceId && voiceId !== essay.voiceId) {
			const updateUrl = `${pocketbaseUrl}/api/collections/essays/records/${id}`;
			await fetch(updateUrl, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					voiceId: voiceId,
				}),
			});
		}

		// Start processing in a background task
		// In Vercel, we can't do true background processing, so we'll
		// just respond to the client immediately and continue processing

		// Send the immediate response
		res.status(200).json({
			message: "Essay audio processing started",
			essayId: id,
		});

		// Process with the selected voice or the existing one
		const selectedVoice = voiceId || essay.voiceId || "Matthew";

		// Now continue processing (client already has response)
		processEssay(id, essay.content, token, selectedVoice)
			.then(result => {
				console.log("Processing completed:", result);
			})
			.catch(err => {
				console.error("Processing error:", err);
			});

	} catch (error) {
		console.error("Error handling processing request:", error);
		return res.status(500).json({
			message: "Internal server error",
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
} 
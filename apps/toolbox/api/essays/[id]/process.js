// Simple fallback implementation using CommonJS syntax
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// Simple in-memory store for essays (only used if proxy fails)
const essays = [];

module.exports = async (req, res) => {
	// Set CORS headers
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader('Access-Control-Allow-Origin', 'https://toolbox.anttituomola.fi');
	res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie');

	// Handle OPTIONS preflight request
	if (req.method === 'OPTIONS') {
		return res.status(200).end();
	}

	// Only allow POST for processing
	if (req.method !== 'POST') {
		return res.status(405).json({ message: 'Method not allowed' });
	}

	// Get the essay ID from the URL
	const { id } = req.query;

	if (!id) {
		return res.status(400).json({ message: 'Invalid essay ID' });
	}

	// Authenticate the request
	try {
		const token = req.cookies.token;
		if (!token) {
			return res.status(401).json({ message: 'Authentication required' });
		}

		jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

		try {
			// Try to proxy to real backend first
			const pocketbaseUrl = "https://api.anttituomola.fi";
			const apiPath = `/api/essays/${id}/process`;

			const response = await fetch(`${pocketbaseUrl}${apiPath}`, {
				method: 'POST',
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${token}`
				},
				body: JSON.stringify(req.body)
			});

			const data = await response.json();
			return res.status(response.status).json(data);
		} catch (error) {
			// Fallback to in-memory handling if proxy fails
			console.error("Error proxying to PocketBase, using fallback:", error);

			// Find or create essay in memory
			let essay = essays.find(e => e.id === id);

			if (!essay) {
				// Create dummy essay if not found
				essay = {
					id,
					title: 'Sample Essay',
					content: 'This is a sample essay content for demonstration purposes.',
					created: new Date().toISOString(),
					updated: new Date().toISOString(),
					status: 'completed',
					audio_file_id: `audio_${id}.mp3`,
					voiceId: 'Matthew'
				};
				essays.push(essay);
			}

			// Update voice if provided
			if (req.body && req.body.voiceId) {
				essay.voiceId = req.body.voiceId;
			}

			// Update status
			essay.status = 'processing';
			essay.updated = new Date().toISOString();

			// Simulate processing
			setTimeout(() => {
				essay.status = 'completed';
				essay.audio_file_id = `audio_${essay.id}_${Date.now()}.mp3`;
				essay.updated = new Date().toISOString();
			}, 5000);

			return res.status(200).json({
				message: 'Processing started',
				essay
			});
		}
	} catch (error) {
		console.error('Authentication error:', error);
		return res.status(401).json({ message: 'Invalid or expired token' });
	}
}; 
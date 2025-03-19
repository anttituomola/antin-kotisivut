// Simple fallback implementation using CommonJS syntax
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// Simple in-memory store for essays (only used if proxy fails)
const essays = [];

module.exports = async (req, res) => {
	// Set CORS headers
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader('Access-Control-Allow-Origin', 'https://toolbox.anttituomola.fi');
	res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie');

	// Handle OPTIONS preflight request
	if (req.method === 'OPTIONS') {
		return res.status(200).end();
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
			const apiPath = `/api/essays/${id}`;

			const response = await fetch(`${pocketbaseUrl}${apiPath}`, {
				method: req.method,
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${token}`
				},
				body: req.method !== 'GET' && req.method !== 'DELETE' ? JSON.stringify(req.body) : undefined
			});

			const data = await response.json();
			return res.status(response.status).json(data);
		} catch (error) {
			// Fallback to in-memory store or dummy data if proxy fails
			console.error("Error proxying to PocketBase, using fallback:", error);

			if (req.method === 'GET') {
				// Try to find in local memory first
				const essay = essays.find(e => e.id === id);

				if (essay) {
					return res.status(200).json(essay);
				} else {
					// Create a dummy essay as fallback
					return res.status(200).json({
						id,
						title: 'Sample Essay',
						content: 'This is a sample essay content for demonstration purposes.',
						created: new Date().toISOString(),
						updated: new Date().toISOString(),
						status: 'completed',
						audio_file_id: `audio_${id}.mp3`,
						voiceId: 'Matthew'
					});
				}
			} else if (req.method === 'DELETE') {
				// Remove from local memory if exists
				const index = essays.findIndex(e => e.id === id);
				if (index !== -1) {
					essays.splice(index, 1);
				}

				return res.status(200).json({ message: 'Essay deleted successfully' });
			}

			return res.status(404).json({ message: 'Essay not found' });
		}
	} catch (error) {
		console.error('Authentication error:', error);
		return res.status(401).json({ message: 'Invalid or expired token' });
	}
}; 
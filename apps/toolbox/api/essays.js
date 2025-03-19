// Simple fallback implementation using CommonJS syntax
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

// Simple in-memory store for essays
const essays = [];

module.exports = async (req, res) => {
	// Set CORS headers
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader('Access-Control-Allow-Origin', 'https://toolbox.anttituomola.fi');
	res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie');

	// Handle OPTIONS preflight request
	if (req.method === 'OPTIONS') {
		return res.status(200).end();
	}

	// Authenticate the request
	try {
		const token = req.cookies.token;
		if (!token) {
			return res.status(401).json({ message: 'Authentication required' });
		}

		jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

		// Handle different HTTP methods
		if (req.method === 'GET') {
			try {
				// Try to proxy to real backend first
				const pocketbaseUrl = "https://api.anttituomola.fi";
				const apiPath = "/api/essays";

				const response = await fetch(`${pocketbaseUrl}${apiPath}`, {
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${token}`
					}
				});

				const data = await response.json();
				return res.status(response.status).json(data);
			} catch (error) {
				// Fallback to in-memory store if proxy fails
				console.error("Error proxying to PocketBase, using fallback:", error);
				return res.status(200).json({ items: essays });
			}
		} else if (req.method === 'POST') {
			const { title, content, voiceId } = req.body;

			if (!content) {
				return res.status(400).json({ message: 'Content is required' });
			}

			// Create a new essay
			const newEssay = {
				id: Date.now().toString(),
				title: title || 'Untitled Essay',
				content,
				voiceId: voiceId || 'Matthew',
				created: new Date().toISOString(),
				updated: new Date().toISOString(),
				status: 'pending'
			};

			essays.push(newEssay);

			// Simulate async processing
			setTimeout(() => {
				const essay = essays.find(e => e.id === newEssay.id);
				if (essay) {
					essay.status = 'completed';
					essay.audio_file_id = `audio_${essay.id}.mp3`;
				}
			}, 5000);

			return res.status(201).json(newEssay);
		}

		return res.status(405).json({ message: 'Method not allowed' });
	} catch (error) {
		console.error('Authentication error:', error);
		return res.status(401).json({ message: 'Invalid or expired token' });
	}
}; 
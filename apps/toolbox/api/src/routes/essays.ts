import express, { Request, Response } from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import path from "path";
import fs from "fs";
import FormData from "form-data";
import {
  textToSpeech,
  saveAudioToFile,
  updateEssayWithAudio,
} from "../services/pollyService";

// Load environment variables
dotenv.config();

const router = express.Router();

// Type definitions for Pocketbase responses
interface PocketbaseAuthResponse {
  token: string;
  admin: {
    id: string;
    email: string;
  };
}

interface PocketbaseEssayRecord {
  id: string;
  title: string;
  content: string;
  status: string;
  audio_file_id: string;
  created: string;
  voiceId?: string;
}

// Pocketbase configuration
const pocketbaseUrl =
  process.env.POCKETBASE_URL || "https://api.anttituomola.fi";
const pocketbaseEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const pocketbasePassword = process.env.POCKETBASE_ADMIN_PASSWORD;

// Validate required environment variables
if (!pocketbaseEmail || !pocketbasePassword) {
  console.error("ERROR: Missing required Pocketbase environment variables");
}

console.log(`Connecting to Pocketbase at: ${pocketbaseUrl}`);

// Function to authenticate with Pocketbase
async function authenticateWithPocketbase() {
  try {
    // Try authenticating with users collection
    try {
      const authUrl = `${pocketbaseUrl}/api/collections/users/auth-with-password`;
      console.log(`Authenticating with Pocketbase at ${authUrl}`);

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
        console.log("User authentication successful");
        return data.token;
      }
    } catch (userAuthError) {
      console.error("User auth error:", userAuthError);
    }

    // If that fails, try with staff collection
    try {
      const altAuthUrl = `${pocketbaseUrl}/api/collections/staff/auth-with-password`;
      console.log(`Trying alternative authentication at ${altAuthUrl}`);

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
        console.log("Alternative authentication successful");
        return altData.token;
      }
    } catch (staffAuthError) {
      console.error("Staff auth error:", staffAuthError);
    }

    console.error("All authentication methods failed");
    return null;
  } catch (error) {
    console.error("Pocketbase authentication error:", error);
    return null;
  }
}

// GET endpoint to list all essays
router.get("/", async (req: Request, res: Response) => {
  try {
    // Authenticate with Pocketbase
    const token = await authenticateWithPocketbase();

    if (!token) {
      return res.status(401).json({
        message: "Authentication failed.",
      });
    }

    // Fetch essays from Pocketbase
    const listUrl = `${pocketbaseUrl}/api/collections/essays/records?sort=-created`;
    console.log(`Fetching essays from: ${listUrl}`);

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
          // Add a direct link to the audio file
          essay.audioUrl = `/api/essays/${essay.id}/audio`;
        }
      }
    }

    return res.json(essays);
  } catch (error) {
    console.error("Error listing essays:", error);
    return res.status(500).json({
      message: "Failed to list essays",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET endpoint to fetch a specific essay
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Authenticate with Pocketbase
    const token = await authenticateWithPocketbase();

    if (!token) {
      return res.status(401).json({
        message: "Authentication failed.",
      });
    }

    // Fetch essay from Pocketbase
    const essayUrl = `${pocketbaseUrl}/api/collections/essays/records/${id}`;
    console.log(`Fetching essay from: ${essayUrl}`);

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

    return res.json(essay);
  } catch (error) {
    console.error("Error getting essay:", error);
    return res.status(500).json({
      message: "Failed to get essay",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST endpoint to create a new essay
router.post("/", async (req: Request, res: Response) => {
  try {
    const { title, content, voiceId } = req.body;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    // Authenticate with Pocketbase
    const token = await authenticateWithPocketbase();

    if (!token) {
      return res.status(401).json({
        message: "Authentication failed.",
      });
    }

    // Create essay record in Pocketbase
    const createUrl = `${pocketbaseUrl}/api/collections/essays/records`;
    console.log(`Creating essay record at: ${createUrl}`);

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

    // Process with Amazon Polly in the background
    processEssayWithPolly(essay.id, content, token, voiceId || "Matthew");

    // Return a success response to the client immediately
    return res.status(201).json({
      message: "Essay created successfully and queued for audio processing",
      essayId: essay.id,
    });
  } catch (error) {
    console.error("Error creating essay:", error);
    return res.status(500).json({
      message: "Failed to create essay",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST endpoint to trigger audio processing
router.post("/:id/process", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { voiceId } = req.body;

    // Authenticate with Pocketbase
    const token = await authenticateWithPocketbase();

    if (!token) {
      return res.status(401).json({
        message: "Authentication failed.",
      });
    }

    // Fetch essay from Pocketbase to get content
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

    // Process with the selected voice or the existing one
    const selectedVoice = voiceId || essay.voiceId || "Matthew";
    processEssayWithPolly(id, essay.content, token, selectedVoice);

    return res.status(200).json({
      message: "Essay audio processing started",
      essayId: id,
    });
  } catch (error) {
    console.error("Error processing essay:", error);
    return res.status(500).json({
      message: "Failed to process essay",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET endpoint to serve the audio file
router.get("/:id/audio", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Authenticate with Pocketbase
    const token = await authenticateWithPocketbase();

    if (!token) {
      return res.status(401).json({
        message: "Authentication failed.",
      });
    }

    // Fetch essay from Pocketbase to get audio_file_id
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

    if (!essay.audio_file_id) {
      return res.status(404).json({
        message: "Audio file not found for this essay",
      });
    }

    // Get the audio file from PocketBase
    const audioUrl = `${pocketbaseUrl}/api/files/essays/${id}/${essay.audio_file_id}`;
    const audioResponse = await fetch(audioUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!audioResponse.ok) {
      return res.status(audioResponse.status).json({
        message: `Failed to fetch audio file: ${audioResponse.statusText}`,
      });
    }

    // Get the content type from the response
    const contentType =
      audioResponse.headers.get("content-type") || "audio/mpeg";

    // Pipe the audio data to the response
    res.setHeader("Content-Type", contentType);
    const audioBuffer = await audioResponse.buffer();
    res.send(audioBuffer);
  } catch (error) {
    console.error("Error serving audio:", error);
    return res.status(500).json({
      message: "Failed to serve audio file",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Helper function to process an essay with Amazon Polly
async function processEssayWithPolly(
  essayId: string,
  content: string,
  token: string,
  voiceId: string = "Matthew"
) {
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
    const isLongFormVoice = [
      "Matthew",
      "Joanna",
      "Lupe",
      "Ruth",
      "Stephen",
      "Kevin",
    ].includes(voiceId);
    const audioData = await textToSpeech(content, voiceId, isLongFormVoice);

    if (!audioData) {
      throw new Error("Failed to generate audio");
    }

    // Save audio to a temporary file
    const audioFilePath = path.join(
      __dirname,
      "../../uploads",
      `${essayId}.mp3`
    );
    const audioDir = path.dirname(audioFilePath);

    // Create the directory if it doesn't exist
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    await saveAudioToFile(audioData, audioFilePath);

    // Upload the audio file to PocketBase using the proper FormData implementation
    const formData = new FormData();
    formData.append("audio", audioData, {
      filename: `${essayId}.mp3`,
      contentType: "audio/mpeg",
    });

    const fileUrl = `${pocketbaseUrl}/api/files/essays/${essayId}`;
    const fileResponse = await fetch(fileUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...formData.getHeaders(), // Add the form-data headers
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

    console.log(
      `Essay ${essayId} processed successfully with audio ID: ${audioFileId}`
    );
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
  }
}

export default router;

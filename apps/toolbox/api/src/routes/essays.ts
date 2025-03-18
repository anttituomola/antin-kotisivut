import express, { Request, Response } from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import path from "path";
import fs from "fs";
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
const pocketbaseUrl = process.env.POCKETBASE_URL;
const pocketbaseEmail = process.env.POCKETBASE_ADMIN_EMAIL;
const pocketbasePassword = process.env.POCKETBASE_ADMIN_PASSWORD;

// Validate required environment variables
if (!pocketbaseUrl || !pocketbaseEmail || !pocketbasePassword) {
  console.error("ERROR: Missing required Pocketbase environment variables");
  console.error(
    `POCKETBASE_URL=${pocketbaseUrl}, POCKETBASE_ADMIN_EMAIL=${pocketbaseEmail}, POCKETBASE_ADMIN_PASSWORD=${
      pocketbasePassword ? "[SET]" : "[NOT SET]"
    }`
  );
}

console.log(`Connecting to Pocketbase at: ${pocketbaseUrl}`);

// Function to authenticate with Pocketbase
async function authenticateWithPocketbase() {
  try {
    // Get token from regular user account
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

    // If regular auth fails, try getting a token by creating a refresh token
    console.log("Standard authentication failed, trying direct admin token");

    // Try with different user collection name
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

    // As a last resort, try authenticating directly via login form
    console.log(
      "All API authentication methods failed. We need to create a proper user account in PocketBase."
    );

    const errorText = await response.text();
    console.error(`Authentication failed: ${errorText}`);
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

    // Process each essay to check for audio files
    if (essays.items && Array.isArray(essays.items)) {
      for (const essay of essays.items) {
        if (essay.audio_file_id && essay.status === "completed") {
          // If we're storing audio files locally
          const audioPath = path.join(
            __dirname,
            "../../uploads",
            `${essay.id}.mp3`
          );

          if (fs.existsSync(audioPath)) {
            essay.audioUrl = `/api/essays/${essay.id}/audio`;
          }
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
        message:
          "Authentication failed. Please set up a user account in PocketBase with access to the essays collection.",
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
      console.error(
        `Create essay failed with status ${createResponse.status}: ${errorText}`
      );
      throw new Error(`Failed to create essay: ${createResponse.statusText}`);
    }

    const essay = await createResponse.json();
    console.log(`Essay created with ID: ${essay.id}`);

    // Queue the essay for processing with Amazon Polly (in a real app, use a job queue)
    // Instead, we'll trigger processing immediately for this example
    try {
      // Process with Amazon Polly in the background
      processEssayWithPolly(essay.id, content, token, voiceId);

      // Return a success response to the client immediately
      return res.status(201).json({
        message: "Essay created successfully and queued for audio processing",
        essayId: essay.id,
      });
    } catch (processError) {
      console.error("Error queuing essay for processing:", processError);
      // Still return a 201 since the essay was created successfully
      return res.status(201).json({
        message:
          "Essay created successfully, but audio processing failed to start",
        essayId: essay.id,
        audioError:
          processError instanceof Error
            ? processError.message
            : "Unknown error",
      });
    }
  } catch (error) {
    console.error("Error creating essay:", error);
    return res.status(500).json({
      message: "Failed to create essay",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET endpoint to retrieve a specific essay by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const essayId = req.params.id;

    // Authenticate with Pocketbase
    const token = await authenticateWithPocketbase();

    if (!token) {
      return res.status(401).json({
        message: "Authentication failed.",
      });
    }

    // Fetch the essay from Pocketbase
    const getUrl = `${pocketbaseUrl}/api/collections/essays/records/${essayId}`;
    const response = await fetch(getUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Get essay failed: ${errorText}`);
      return res.status(response.status).json({
        message: `Failed to retrieve essay: ${response.statusText}`,
      });
    }

    const essay = await response.json();

    // Check if audio file exists
    if (essay.audio_file_id && essay.status === "completed") {
      // If we're storing audio files locally
      const audioPath = path.join(
        __dirname,
        "../../uploads",
        `${essay.id}.mp3`
      );

      if (fs.existsSync(audioPath)) {
        essay.audioUrl = `/api/essays/${essay.id}/audio`;
      }
    }

    return res.json(essay);
  } catch (error) {
    console.error("Error retrieving essay:", error);
    return res.status(500).json({
      message: "Failed to retrieve essay",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// GET endpoint to stream audio for an essay
router.get("/:id/audio", async (req: Request, res: Response) => {
  try {
    const essayId = req.params.id;

    // Path to the audio file
    const audioPath = path.join(__dirname, "../../uploads", `${essayId}.mp3`);

    // Check if the file exists
    if (!fs.existsSync(audioPath)) {
      return res.status(404).json({ message: "Audio file not found" });
    }

    // Set the content type for MP3
    res.setHeader("Content-Type", "audio/mpeg");

    // Stream the file
    const audioStream = fs.createReadStream(audioPath);
    audioStream.pipe(res);
  } catch (error) {
    console.error("Error streaming audio:", error);
    return res.status(500).json({
      message: "Failed to stream audio",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// POST endpoint to manually trigger audio processing for an essay
router.post("/:id/process", async (req: Request, res: Response) => {
  try {
    const essayId = req.params.id;
    const { voiceId } = req.body || {};

    // Authenticate with Pocketbase
    const token = await authenticateWithPocketbase();

    if (!token) {
      return res.status(401).json({
        message: "Authentication failed.",
      });
    }

    // Fetch the essay from Pocketbase
    const getUrl = `${pocketbaseUrl}/api/collections/essays/records/${essayId}`;
    const response = await fetch(getUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        message: `Failed to retrieve essay: ${response.statusText}`,
      });
    }

    const essay = await response.json();

    // If a new voice ID is provided, update the essay with it
    if (voiceId && voiceId !== essay.voiceId) {
      const updateUrl = `${pocketbaseUrl}/api/collections/essays/records/${essayId}`;
      const updateResponse = await fetch(updateUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          voiceId,
        }),
      });

      if (!updateResponse.ok) {
        console.error("Failed to update essay with new voice ID");
      } else {
        console.log(`Updated essay ${essayId} with voice ID: ${voiceId}`);
      }
    }

    // Start processing in the background
    try {
      // Use provided voiceId, essay's voiceId, or default to Matthew
      const selectedVoiceId = voiceId || essay.voiceId || "Matthew";
      processEssayWithPolly(essay.id, essay.content, token, selectedVoiceId);

      return res.json({
        message: "Audio processing started",
        essayId: essay.id,
        voiceId: selectedVoiceId,
      });
    } catch (processError) {
      console.error("Error starting audio processing:", processError);
      return res.status(500).json({
        message: "Failed to start audio processing",
        error:
          processError instanceof Error
            ? processError.message
            : "Unknown error",
      });
    }
  } catch (error) {
    console.error("Error processing essay:", error);
    return res.status(500).json({
      message: "Failed to process essay",
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
    console.log(
      `Starting audio processing for essay ${essayId} with voice ${voiceId}`
    );

    // Check if the selected voice is one that supports generative engine
    const generativeVoices = [
      "Amy",
      "Arthur",
      "Brian",
      "Danielle",
      "Emma",
      "Gabrielle",
      "Kajal",
      "Stephen",
    ];
    const useGenerative = generativeVoices.includes(voiceId);

    // Convert text to speech
    const audioBuffer = await textToSpeech(content, {
      voiceId: voiceId as any,
      useGenerative: useGenerative, // Use generative engine for supported voices
    });

    // Save the audio file
    const fileName = `${essayId}.mp3`;
    const filePath = saveAudioToFile(audioBuffer, fileName);

    console.log(`Audio saved to ${filePath}`);

    // Update the essay in PocketBase
    await updateEssayWithAudio(essayId, fileName, pocketbaseUrl || "", token);

    console.log(`Audio processing completed for essay ${essayId}`);
  } catch (error) {
    console.error(`Error processing essay ${essayId} with Polly:`, error);
    throw error;
  }
}

export default router;

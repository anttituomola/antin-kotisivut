import AWS from "aws-sdk";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import { Readable } from "stream";

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || "us-east-1",
});

const polly = new AWS.Polly();

/**
 * Convert text to speech using Amazon Polly
 * @param text The text to convert to speech
 * @param voiceId The voice ID to use (default: Matthew)
 * @param isLongForm Whether to use TextType=ssml for long-form voices
 * @returns Promise resolving to audio data
 */
export async function textToSpeech(
  text: string,
  voiceId: string = "Matthew",
  isLongForm: boolean = false
): Promise<Buffer | null> {
  try {
    console.log(
      `Converting text to speech with voice ${voiceId}, long-form: ${isLongForm}`
    );

    // Use neural engine for all voices
    const engine = "neural";

    // Configure the Polly params
    const params = {
      Engine: engine,
      OutputFormat: "mp3",
      Text: text,
      VoiceId: voiceId,
      TextType: isLongForm ? "ssml" : "text", // Use ssml for long-form content
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
    console.error("Error converting text to speech:", error);
    return null;
  }
}

/**
 * Save audio data to a file
 * @param audioData The audio data to save
 * @param filePath The path to save the file to
 */
export async function saveAudioToFile(
  audioData: Buffer,
  filePath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, audioData, (err) => {
      if (err) {
        console.error("Error saving audio file:", err);
        reject(err);
      } else {
        console.log(`Audio saved to ${filePath}`);
        resolve();
      }
    });
  });
}

/**
 * Update an essay record in PocketBase with audio file information
 * This is a legacy method, retained for compatibility
 */
export async function updateEssayWithAudio(
  essayId: string,
  fileName: string,
  pocketbaseUrl: string,
  token: string
): Promise<void> {
  try {
    // This is now handled directly in the essay routes
    console.log("Using new audio processing flow, this function is deprecated");
  } catch (error) {
    console.error("Error updating essay with audio:", error);
    throw error;
  }
}

export default {
  textToSpeech,
  saveAudioToFile,
  updateEssayWithAudio,
};

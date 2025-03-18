import {
  PollyClient,
  SynthesizeSpeechCommand,
  OutputFormat,
  Engine,
  VoiceId,
  StartSpeechSynthesisTaskCommand,
  TextType,
} from "@aws-sdk/client-polly";
import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { Readable } from "stream";

dotenv.config();

// AWS Polly configuration
const region = process.env.AWS_REGION || "us-east-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

// Initialize the Polly client
const pollyClient = new PollyClient({
  region,
  credentials: {
    accessKeyId: accessKeyId || "",
    secretAccessKey: secretAccessKey || "",
  },
});

// Interface for text-to-speech options
interface TTSOptions {
  voiceId?: VoiceId;
  engine?: Engine;
  outputFormat?: OutputFormat;
  useLongForm?: boolean;
  useGenerative?: boolean;
}

// Long-form optimized voices
const LONG_FORM_VOICES = [
  VoiceId.Matthew, // US English, Male
  VoiceId.Joanna, // US English, Female
  VoiceId.Lupe, // US Spanish, Female
  VoiceId.Ruth, // US English, Female
  VoiceId.Stephen, // US English, Male
  VoiceId.Kevin, // US English, Male (child)
];

// Voices that support generative engine
const GENERATIVE_VOICES = [
  VoiceId.Amy, // UK English, Female
  VoiceId.Arthur, // UK English, Male
  VoiceId.Brian, // UK English, Male
  VoiceId.Danielle, // US English, Female
  VoiceId.Emma, // UK English, Female
  VoiceId.Gabrielle, // US English, Female
  VoiceId.Kajal, // Indian English, Female
  VoiceId.Stephen, // US English, Male
];

// Default options
const defaultOptions: TTSOptions = {
  voiceId: VoiceId.Matthew, // Matthew is optimized for long-form content
  engine: Engine.NEURAL,
  outputFormat: OutputFormat.MP3,
  useLongForm: true,
  useGenerative: false,
};

/**
 * Convert text to speech using Amazon Polly
 * @param text Text to convert to speech
 * @param options Voice options (optional)
 * @returns Buffer containing the audio data
 */
export async function textToSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<Buffer> {
  try {
    // Merge options with defaults
    const mergedOptions = {
      ...defaultOptions,
      ...options,
    };
    const { voiceId, outputFormat, useLongForm, useGenerative } = mergedOptions;

    // Determine the appropriate engine based on voice and options
    let engine = mergedOptions.engine;
    let finalVoiceId = voiceId || VoiceId.Matthew;

    // If generative is requested and the voice supports it, use generative engine
    if (useGenerative && GENERATIVE_VOICES.includes(finalVoiceId as any)) {
      engine = Engine.GENERATIVE;
      console.log(`Using generative engine for voice: ${finalVoiceId}`);
    }
    // Otherwise, use neural engine and check long-form compatibility
    else {
      engine = Engine.NEURAL;
      // Only check long-form compatibility for non-generative voices
      if (
        useLongForm !== false &&
        !LONG_FORM_VOICES.includes(finalVoiceId as any)
      ) {
        console.log(
          `Voice ${finalVoiceId} doesn't support long-form; using Matthew instead`
        );
        finalVoiceId = VoiceId.Matthew;
      }
    }

    // Set up the parameters for Polly
    const params = {
      Engine: engine,
      OutputFormat: outputFormat,
      Text: text,
      VoiceId: finalVoiceId,
      TextType: TextType.TEXT, // Always use TEXT for simplicity and consistency
    };

    console.log(
      `Using voice: ${finalVoiceId}, Engine: ${engine}, Long-form: ${!!useLongForm}, Generative: ${
        engine === Engine.GENERATIVE
      }`
    );

    // Create and execute the command
    const command = new SynthesizeSpeechCommand(params);
    const { AudioStream } = await pollyClient.send(command);

    if (!AudioStream) {
      throw new Error("No audio stream returned from Polly");
    }

    // Convert the AudioStream to a Buffer
    // The AudioStream is a Uint8Array, we can directly convert it to Buffer
    return Buffer.from(await AudioStream.transformToByteArray());
  } catch (error) {
    console.error("Error converting text to speech:", error);
    throw error;
  }
}

/**
 * For longer texts, use the asynchronous Polly API
 * @param text Long text to convert to speech
 * @param essayId ID of the essay for reference
 * @param options Voice options (optional)
 * @returns URL to the generated audio file
 */
export async function longTextToSpeech(
  text: string,
  essayId: string,
  options: TTSOptions = {}
): Promise<string> {
  try {
    // Merge options with defaults
    const mergedOptions = {
      ...defaultOptions,
      ...options,
    };
    const { voiceId, outputFormat, useLongForm, useGenerative } = mergedOptions;

    // Determine the appropriate engine based on voice and options
    let engine = mergedOptions.engine;
    let finalVoiceId = voiceId || VoiceId.Matthew;

    // If generative is requested and the voice supports it, use generative engine
    if (useGenerative && GENERATIVE_VOICES.includes(finalVoiceId as any)) {
      engine = Engine.GENERATIVE;
      console.log(`Using generative engine for voice: ${finalVoiceId}`);
    }
    // Otherwise, use neural engine and check long-form compatibility
    else {
      engine = Engine.NEURAL;
      // Only check long-form compatibility for non-generative voices
      if (
        useLongForm !== false &&
        !LONG_FORM_VOICES.includes(finalVoiceId as any)
      ) {
        console.log(
          `Voice ${finalVoiceId} doesn't support long-form; using Matthew instead`
        );
        finalVoiceId = VoiceId.Matthew;
      }
    }

    // Set up the parameters for Polly
    const params = {
      Engine: engine,
      OutputFormat: outputFormat,
      Text: text,
      VoiceId: finalVoiceId,
      TextType: TextType.TEXT, // Always use TEXT for simplicity and consistency
      OutputS3BucketName: process.env.AWS_S3_BUCKET_NAME, // Optional: If you want to store in S3
      OutputS3KeyPrefix: `essays/${essayId}`, // Optional: S3 prefix
    };

    console.log(
      `Using voice: ${finalVoiceId}, Engine: ${engine}, Long-form: ${!!useLongForm}, Generative: ${
        engine === Engine.GENERATIVE
      }`
    );

    // Create and execute the command
    const command = new StartSpeechSynthesisTaskCommand(params);
    const response = await pollyClient.send(command);

    // Return the task ID or the output URL
    if (response.SynthesisTask?.OutputUri) {
      return response.SynthesisTask.OutputUri;
    } else if (response.SynthesisTask?.TaskId) {
      return `Task ID: ${response.SynthesisTask.TaskId}`;
    } else {
      throw new Error("No task ID or output URI returned");
    }
  } catch (error) {
    console.error("Error starting speech synthesis task:", error);
    throw error;
  }
}

/**
 * Save audio to the local filesystem
 * @param audioBuffer Audio data buffer
 * @param filename Name of the file to save
 * @returns Path to the saved file
 */
export function saveAudioToFile(audioBuffer: Buffer, filename: string): string {
  const uploadsDir = path.join(__dirname, "../../uploads");

  // Create uploads directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, audioBuffer);
  return filePath;
}

/**
 * Update the essay record in PocketBase with the audio file information
 */
export async function updateEssayWithAudio(
  essayId: string,
  audioFileId: string,
  pocketbaseUrl: string,
  authToken: string
): Promise<void> {
  const updateUrl = `${pocketbaseUrl}/api/collections/essays/records/${essayId}`;

  try {
    const response = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        audio_file_id: audioFileId,
        status: "completed",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update essay: ${errorText}`);
    }

    console.log(`Essay ${essayId} updated with audio file ${audioFileId}`);
  } catch (error) {
    console.error("Error updating essay with audio file:", error);
    throw error;
  }
}

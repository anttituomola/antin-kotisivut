import React, { useState, useEffect } from "react";

interface Essay {
  id: string;
  title: string;
  content: string;
  status: string;
  audio_file_id: string;
  created: string;
  updated: string;
  audioUrl?: string;
}

// Available voices for Polly
interface VoiceOption {
  id: string;
  name: string;
  gender: string;
  language: string;
  longForm: boolean;
  generative: boolean;
}

const VOICE_OPTIONS: VoiceOption[] = [
  {
    id: "Matthew",
    name: "Matthew",
    gender: "Male",
    language: "US English",
    longForm: true,
    generative: false,
  },
  {
    id: "Joanna",
    name: "Joanna",
    gender: "Female",
    language: "US English",
    longForm: true,
    generative: false,
  },
  {
    id: "Stephen",
    name: "Stephen",
    gender: "Male",
    language: "US English",
    longForm: true,
    generative: true,
  },
  {
    id: "Ruth",
    name: "Ruth",
    gender: "Female",
    language: "US English",
    longForm: true,
    generative: false,
  },
  {
    id: "Lupe",
    name: "Lupe",
    gender: "Female",
    language: "US Spanish",
    longForm: true,
    generative: false,
  },
  {
    id: "Kevin",
    name: "Kevin",
    gender: "Male (child)",
    language: "US English",
    longForm: true,
    generative: false,
  },
  {
    id: "Ivy",
    name: "Ivy",
    gender: "Female (child)",
    language: "US English",
    longForm: false,
    generative: false,
  },
  {
    id: "Kendra",
    name: "Kendra",
    gender: "Female",
    language: "US English",
    longForm: false,
    generative: false,
  },
  {
    id: "Brian",
    name: "Brian",
    gender: "Male",
    language: "UK English",
    longForm: false,
    generative: true,
  },
  {
    id: "Amy",
    name: "Amy",
    gender: "Female",
    language: "UK English",
    longForm: false,
    generative: true,
  },
  {
    id: "Arthur",
    name: "Arthur",
    gender: "Male",
    language: "UK English",
    longForm: false,
    generative: true,
  },
  {
    id: "Emma",
    name: "Emma",
    gender: "Female",
    language: "UK English",
    longForm: false,
    generative: true,
  },
  {
    id: "Danielle",
    name: "Danielle",
    gender: "Female",
    language: "US English",
    longForm: false,
    generative: true,
  },
  {
    id: "Kajal",
    name: "Kajal",
    gender: "Female",
    language: "Indian English",
    longForm: false,
    generative: true,
  },
];

interface EssayReaderProps {
  // Props can be added as needed
}

const EssayReader: React.FC<EssayReaderProps> = () => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [voiceId, setVoiceId] = useState("Matthew"); // Default to Matthew (long-form voice)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [essays, setEssays] = useState<Essay[]>([]);
  const [selectedEssay, setSelectedEssay] = useState<Essay | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<"create" | "list">("create");

  // Use only Vercel API routes for all environments
  const API_URL = import.meta.env.DEV
    ? "http://localhost:3001"
    : "https://toolbox.anttituomola.fi";

  const fetchEssays = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/essays`, {
        credentials: "include", // Needed for authentication
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch essays: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      console.log("Essay response data:", data);
      setEssays(data.items || []);
    } catch (error) {
      console.error("Error fetching essays:", error);
      setMessage(
        `Error fetching essays: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEssayDetails = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/api/essays/${id}`, {
        credentials: "include", // Needed for authentication
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch essay details: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      setSelectedEssay(data);
    } catch (error) {
      console.error("Error fetching essay details:", error);
      setMessage(
        `Error fetching essay details: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const triggerProcessing = async (
    id: string,
    selectedVoiceId: string = voiceId
  ) => {
    try {
      // Get the JWT token from cookies for auth
      const token = document.cookie.match(/token=([^;]+)/)?.[1] || "";

      const response = await fetch(`${API_URL}/api/essays/${id}/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ voiceId: selectedVoiceId }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to trigger processing: ${response.status} ${response.statusText}`
        );
      }

      setMessage("Audio processing started. This may take a minute...");
      setTimeout(() => fetchEssayDetails(id), 5000); // Poll for updates
    } catch (error) {
      console.error("Error triggering processing:", error);
      setMessage(
        `Error triggering processing: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setMessage("Please enter some text");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/essays`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title || "Untitled Essay",
          content,
          voiceId: voiceId || "Matthew",
        }),
        credentials: "include", // Needed for authentication
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          `Failed to submit essay: ${response.status} ${response.statusText}${
            errorData ? ` - ${JSON.stringify(errorData)}` : ""
          }`
        );
      }

      const data = await response.json();
      console.log("Essay created:", data);

      setMessage("Essay submitted successfully!");
      setTitle("");
      setContent("");

      // Give the backend a moment to process
      setTimeout(() => {
        fetchEssays();
        setView("list");
      }, 1000);
    } catch (error) {
      setMessage(
        `An error occurred while submitting your essay: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      console.error("Essay submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load essays when component mounts or view changes to list
  useEffect(() => {
    if (view === "list") {
      fetchEssays();
    }
  }, [view]);

  // Initialize on component mount
  useEffect(() => {
    fetchEssays(); // Fetch essays when component mounts
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Essay Reader</h2>

      <div className="mb-4 flex">
        <button
          onClick={() => setView("create")}
          className={`mr-2 px-4 py-2 rounded-md ${
            view === "create"
              ? "bg-indigo-600 text-white"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          Create New
        </button>
        <button
          onClick={() => setView("list")}
          className={`px-4 py-2 rounded-md ${
            view === "list"
              ? "bg-indigo-600 text-white"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          My Essays
        </button>
      </div>

      {message && (
        <div
          className={`p-4 mb-4 rounded-md ${
            message.includes("Error") || message.includes("error")
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {message}
        </div>
      )}

      {view === "create" ? (
        <div>
          <p className="mb-4 text-gray-600">
            Paste in any text and get it converted to audio using Amazon Polly.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Title (Optional)
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter a title for your essay"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="voice"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Voice
              </label>
              <select
                id="voice"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <optgroup label="Long-form Voices (Recommended for articles)">
                  {VOICE_OPTIONS.filter((voice) => voice.longForm).map(
                    (voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} - {voice.gender}, {voice.language}{" "}
                        {voice.generative ? "(Generative)" : ""}
                      </option>
                    )
                  )}
                </optgroup>
                <optgroup label="Generative Voices (High quality)">
                  {VOICE_OPTIONS.filter(
                    (voice) => voice.generative && !voice.longForm
                  ).map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.gender}, {voice.language}{" "}
                      (Generative)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Standard Voices">
                  {VOICE_OPTIONS.filter(
                    (voice) => !voice.longForm && !voice.generative
                  ).map((voice) => (
                    <option key={voice.id} value={voice.id}>
                      {voice.name} - {voice.gender}, {voice.language}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="mb-4">
              <label
                htmlFor="content"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Content
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Paste your essay text here..."
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                isSubmitting ? "opacity-75 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? "Submitting..." : "Convert to Audio"}
            </button>
          </form>
        </div>
      ) : (
        <div>
          {selectedEssay ? (
            <div>
              <button
                onClick={() => setSelectedEssay(null)}
                className="mb-4 flex items-center text-indigo-600 hover:text-indigo-800"
              >
                <svg
                  className="w-4 h-4 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to list
              </button>

              <h3 className="text-xl font-semibold mb-2">
                {selectedEssay.title || "Untitled Essay"}
              </h3>

              <div className="mb-4 text-sm text-gray-500">
                Created: {new Date(selectedEssay.created).toLocaleString()}
                {selectedEssay.updated &&
                  selectedEssay.updated !== selectedEssay.created &&
                  ` • Updated: ${new Date(
                    selectedEssay.updated
                  ).toLocaleString()}`}
              </div>

              {selectedEssay.status === "completed" &&
              selectedEssay.audioUrl ? (
                <div className="mb-6">
                  <h4 className="text-lg font-medium mb-2">Audio</h4>
                  <audio
                    controls
                    className="w-full"
                    src={`${API_URL}${selectedEssay.audioUrl}`}
                  />
                </div>
              ) : selectedEssay.status === "pending" ? (
                <div className="mb-6">
                  <div className="flex items-center mb-4">
                    <span className="mr-2">Status: {selectedEssay.status}</span>
                    <div className="flex gap-2 items-center">
                      <button
                        onClick={() =>
                          triggerProcessing(selectedEssay.id, voiceId)
                        }
                        className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
                        disabled={isSubmitting}
                      >
                        Generate Audio
                      </button>
                      <select
                        value={voiceId}
                        onChange={(e) => setVoiceId(e.target.value)}
                        className="p-1 border rounded text-sm"
                      >
                        <optgroup label="Long-form Voices">
                          {VOICE_OPTIONS.filter((v) => v.longForm).map(
                            (voice) => (
                              <option key={voice.id} value={voice.id}>
                                {voice.name} ({voice.gender}, {voice.language})
                                {voice.generative ? " - Generative" : ""}
                              </option>
                            )
                          )}
                        </optgroup>
                        <optgroup label="Standard Voices">
                          {VOICE_OPTIONS.filter((v) => !v.longForm).map(
                            (voice) => (
                              <option key={voice.id} value={voice.id}>
                                {voice.name} ({voice.gender}, {voice.language})
                                {voice.generative ? " - Generative" : ""}
                              </option>
                            )
                          )}
                        </optgroup>
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <div className="flex items-center mb-4">
                    <span className="mr-2">Status: {selectedEssay.status}</span>
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h4 className="text-lg font-medium mb-2">Content</h4>
                <div className="p-4 bg-gray-50 rounded-md whitespace-pre-wrap">
                  {selectedEssay.content}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-semibold mb-4">My Essays</h3>

              {isLoading ? (
                <div className="text-center py-8">
                  <svg
                    className="animate-spin h-8 w-8 mx-auto text-indigo-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <p className="mt-2 text-gray-600">Loading essays...</p>
                </div>
              ) : essays.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No essays found. Create your first one!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {essays.map((essay) => (
                    <div
                      key={essay.id}
                      className="p-4 border border-gray-200 rounded-md hover:shadow-md cursor-pointer"
                      onClick={() => fetchEssayDetails(essay.id)}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">
                          {essay.title || "Untitled Essay"}
                        </h4>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            essay.status === "completed"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {essay.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(essay.created).toLocaleString()}
                      </p>
                      <p className="mt-2 text-gray-600 line-clamp-2">
                        {essay.content.substring(0, 150)}
                        {essay.content.length > 150 ? "..." : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EssayReader;

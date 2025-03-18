import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import EssayReader from "../components/EssayReader";

export default function Dashboard() {
  const { logout } = useAuth();
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

  // List of available tools
  const tools = [
    {
      id: "essay-reader",
      name: "Essay Reader",
      description: "Convert any text to speech using Amazon Polly",
      component: <EssayReader />,
    },
    // Add more tools here as they become available
  ];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Antti's Toolbox</h1>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
        >
          Logout
        </button>
      </div>

      {activeToolId ? (
        <div className="mb-4">
          <button
            onClick={() => setActiveToolId(null)}
            className="flex items-center px-3 py-2 text-blue-600 hover:text-blue-800"
          >
            <svg
              className="w-5 h-5 mr-1"
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
            Back to Tools
          </button>
          <div className="mt-4">
            {tools.find((tool) => tool.id === activeToolId)?.component}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow"
            >
              <h2 className="text-xl font-semibold mb-2">{tool.name}</h2>
              <p className="text-gray-600 mb-4">{tool.description}</p>
              <button
                onClick={() => setActiveToolId(tool.id)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              >
                Open Tool
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

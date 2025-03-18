import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { logout } = useAuth();

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tool cards will go here */}
        <div className="p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
          <h2 className="text-xl font-semibold mb-2">Sample Tool</h2>
          <p className="text-gray-600 mb-4">
            Description of your tool will go here.
          </p>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
            Open Tool
          </button>
        </div>

        {/* Add more tool cards as needed */}
      </div>
    </div>
  );
}

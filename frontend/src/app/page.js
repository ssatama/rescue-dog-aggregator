export default function Home() {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">Rescue Dog Aggregator</h1>
        <p className="text-gray-600 text-lg">
          Find your perfect rescue dog from multiple organizations, all in one place.
        </p>
        <button className="mt-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Browse Dogs
        </button>
      </div>
    );
  }
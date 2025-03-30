export default function Home() {
    return (
      <div className="p-8">
        <h1 className="text-red-500 text-3xl font-bold">Rescue Dog Aggregator</h1>
        <p className="mt-4 text-blue-500">
          Find your perfect rescue dog from multiple organizations, all in one place.
        </p>
        <button className="mt-4 bg-green-500 text-white px-4 py-2 rounded">
          Browse Dogs
        </button>
      </div>
    );
  }
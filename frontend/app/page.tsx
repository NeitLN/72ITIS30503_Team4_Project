export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <h1 className="text-5xl font-bold mb-4 text-pink-500">
        StyleHub
      </h1>

      <p className="text-zinc-300 text-center max-w-xl mb-8">
        Modern Fashion Marketplace powered by Next.js + Supabase
      </p>

      <div className="flex gap-4">
        <button className="bg-pink-500 hover:bg-pink-600 px-6 py-3 rounded-xl font-semibold transition">
          Shop Now
        </button>

        <button className="border border-zinc-700 hover:border-pink-500 px-6 py-3 rounded-xl transition">
          Explore
        </button>
      </div>
    </main>
  );
}
export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-gray-800">
      <div className="bg-white p-10 rounded-3xl shadow-xl max-w-2xl w-full text-center border border-gray-100">
        <h1 className="text-4xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500">
          Contact StyleHub
        </h1>
        <p className="text-gray-500 mb-8 text-lg">
          We are always ready to assist you. Please leave a message or reach out to us directly.
        </p>

        <div className="flex flex-col md:flex-row justify-center gap-6 mb-8">
          <div className="bg-blue-50 p-6 rounded-2xl flex-1 shadow-sm hover:shadow-md transition-all">
            <span className="text-3xl block mb-2">📧</span>
            <h3 className="font-bold text-lg">Email</h3>
            <p className="text-blue-600 mt-1">support@stylehub.com</p>
          </div>
          <div className="bg-teal-50 p-6 rounded-2xl flex-1 shadow-sm hover:shadow-md transition-all">
            <span className="text-3xl block mb-2">📞</span>
            <h3 className="font-bold text-lg">Hotline</h3>
            <p className="text-teal-600 mt-1">1900 1234</p>
          </div>
        </div>

        <button className="bg-black text-white px-8 py-3 rounded-full font-semibold hover:bg-gray-800 transition-all shadow-md">
          Send us a message
        </button>
      </div>
    </div>
  );
}
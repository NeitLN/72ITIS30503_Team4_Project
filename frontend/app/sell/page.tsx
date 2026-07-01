import { Container } from '../../components/ui/Container';
import { Button } from '../../components/ui/Button';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sell on StyleHub',
  description: 'Clean out your closet and make money selling your pre-loved fashion and streetwear on StyleHub.',
};

export default function SellPage() {
  return (
    <Container className="py-16 max-w-5xl">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Turn your closet into cash</h1>
        <p className="text-xl text-gray-600 mb-8">
          Join thousands of sellers on StyleHub. Whether it&apos;s vintage denim, sold-out local streetwear, or sneakers you don&apos;t wear anymore, give your clothes a second life.
        </p>
        <Button size="lg" disabled className="opacity-80 cursor-not-allowed">Start Selling (Coming Soon)</Button>
        <p className="text-sm text-gray-500 mt-4">Listing submission will be enabled in a future phase.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-20">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
          <h3 className="font-semibold text-lg mb-2">Snap some photos</h3>
          <p className="text-gray-600">Take clear, well-lit photos of your item from multiple angles, including tags and any flaws.</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
          <h3 className="font-semibold text-lg mb-2">Add the details</h3>
          <p className="text-gray-600">Be honest about the condition. Set your price, select the brand, and let buyers know what you&apos;re selling.</p>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
          <h3 className="font-semibold text-lg mb-2">Ship and get paid</h3>
          <p className="text-gray-600">When your item sells, pack it up, ship it out, and the funds will be transferred to you securely.</p>
        </div>
      </div>

      <div className="bg-gray-50 border rounded-xl p-8 max-w-2xl mx-auto relative opacity-60">
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
          <span className="bg-black text-white px-4 py-2 rounded-md font-medium shadow-lg">Upload UI Placeholder</span>
        </div>
        
        <h2 className="text-2xl font-bold mb-6">List an Item</h2>
        
        <form className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photos</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center">
              <span className="text-gray-500">Drag & drop images here</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" className="w-full border-gray-300 border rounded-md px-4 py-2" placeholder="e.g., Vintage Levi's 501" disabled />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select className="w-full border-gray-300 border rounded-md px-4 py-2 bg-white" disabled>
                <option>Select category</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
              <select className="w-full border-gray-300 border rounded-md px-4 py-2 bg-white" disabled>
                <option>Select brand</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
              <select className="w-full border-gray-300 border rounded-md px-4 py-2 bg-white" disabled>
                <option>Like New</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price (VNĐ)</label>
              <input type="number" className="w-full border-gray-300 border rounded-md px-4 py-2" placeholder="0" disabled />
            </div>
          </div>

          <Button type="button" className="w-full mt-4" size="lg" disabled>Publish Listing</Button>
        </form>
      </div>
    </Container>
  );
}

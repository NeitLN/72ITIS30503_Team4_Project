import { Container } from '../../components/ui/Container';
import { Button } from '../../components/ui/Button';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with the StyleHub team.',
};

export default function ContactPage() {
  return (
    <Container className="py-16 max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
        <div>
          <h1 className="text-4xl font-bold mb-6 tracking-tight">Contact Us</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Have a question about an order, a seller, or how StyleHub works? Send us a message and our team will get back to you as soon as possible.
          </p>

          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-black mb-1">Email</h3>
              <a href="mailto:support@stylehub.local" className="text-gray-600 hover:text-black">support@stylehub.local</a>
            </div>
            <div>
              <h3 className="font-semibold text-black mb-1">Office</h3>
              <p className="text-gray-600">Ho Chi Minh City, Vietnam</p>
            </div>
          </div>
          
          <div className="mt-12 p-4 bg-gray-50 border rounded-lg text-sm text-gray-500">
            <strong>Note:</strong> This is a university demo project. The contact form is a UI placeholder and will not send real emails.
          </div>
        </div>

        <div className="bg-white p-6 border rounded-lg shadow-sm">
          <form className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" id="name" className="w-full border-gray-300 border rounded-md px-4 py-2 focus:ring-black focus:border-black" placeholder="Your name" />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" id="email" className="w-full border-gray-300 border rounded-md px-4 py-2 focus:ring-black focus:border-black" placeholder="your@email.com" />
            </div>

            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
              <select id="topic" className="w-full border-gray-300 border rounded-md px-4 py-2 focus:ring-black focus:border-black bg-white">
                <option>General Inquiry</option>
                <option>Report a Seller</option>
                <option>Order Issue</option>
                <option>Technical Support</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea id="message" rows={5} className="w-full border-gray-300 border rounded-md px-4 py-2 focus:ring-black focus:border-black" placeholder="How can we help?"></textarea>
            </div>

            <Button type="button" className="w-full mt-2" size="lg">Send Message</Button>
          </form>
        </div>
      </div>
    </Container>
  );
}

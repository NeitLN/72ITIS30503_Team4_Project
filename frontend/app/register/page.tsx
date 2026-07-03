import { Metadata } from 'next';
import { RegisterForm } from '../../components/auth/RegisterForm';
import { Container } from '../../components/ui/Container';

export const metadata: Metadata = {
  title: 'Register',
  description: 'Join StyleHub to start buying and selling pre-loved streetwear.',
};

export default function RegisterPage() {
  return (
    <Container className="py-16 sm:py-24 max-w-md">
      <div className="border border-neutral-200 bg-white p-6 sm:p-10">
        <h1 className="font-display text-2xl font-black uppercase tracking-tight text-neutral-900 mb-2">
          Join StyleHub
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500 mb-8">
          Create an account to checkout and manage orders.
        </p>
        <RegisterForm />
      </div>
    </Container>
  );
}

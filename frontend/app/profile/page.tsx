import { Metadata } from 'next';
import { ProfileClient } from '../../components/profile/ProfileClient';


export const metadata: Metadata = {
  title: 'Profile Dashboard Demo',
  description: 'View a UI-only buyer and seller profile dashboard for the StyleHub C2C marketplace demo.',
};

export default function ProfilePage() {
  return (
    <main>
      <ProfileClient />
    </main>
  );
}


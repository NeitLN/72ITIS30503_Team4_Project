import { Metadata } from 'next';
import { ProfileClient } from '../../components/profile/ProfileClient';


export const metadata: Metadata = {
  title: 'My Profile',
  description: 'Manage your StyleHub profile: display name, username, bio, location, and avatar.',
};

export default function ProfilePage() {
  return (
    <main>
      <ProfileClient />
    </main>
  );
}


import { Metadata } from 'next';
import { ProfileClient } from '../../components/profile/ProfileClient';
import { siteConfig } from '../../constants/site';

export const metadata: Metadata = {
  title: `My Profile | ${siteConfig.name}`,
  description: 'Manage your StyleHub marketplace activity, active listings, and account overview.',
};

export default function ProfilePage() {
  return (
    <main>
      <ProfileClient />
    </main>
  );
}

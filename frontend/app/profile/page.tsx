import { Metadata } from 'next';
import { ProfileClient } from '../../components/profile/ProfileClient';


export const metadata: Metadata = {
  title: 'Hồ sơ của tôi',
  description: 'Quản lý hồ sơ StyleHub của bạn: tên hiển thị, tên người dùng, tiểu sử, tỉnh/thành phố và ảnh đại diện.',
};

export default function ProfilePage() {
  return (
    <main>
      <ProfileClient />
    </main>
  );
}


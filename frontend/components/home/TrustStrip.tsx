import { Container } from '../ui/Container';

const highlights = [
  {
    title: 'Người bán đã xác thực',
    description: 'Đánh giá, số lượng đã bán và huy hiệu xác thực trên mọi hồ sơ.',
  },
  {
    title: 'Ghi rõ tình trạng',
    description: 'Mỗi tin đăng đều ghi rõ tình trạng — từ mới còn tag đến đã sử dụng nhiều.',
  },
  {
    title: 'Giá niêm yết bằng VNĐ',
    description: 'Giá nội địa, viết theo cách người bán vẫn ghi: 350.000đ.',
  },
  {
    title: 'Cộng đồng thời trang địa phương',
    description: 'Thương hiệu Việt, văn hóa đồ cũ và phong cách đường phố trong một nơi.',
  },
];

export const TrustStrip = () => {
  return (
    <section aria-label="Tín hiệu tin cậy trên chợ" className="border-b border-neutral-200 bg-white">
      <Container>
        <div className="grid grid-cols-1 divide-y divide-neutral-200 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
          {highlights.map((item) => (
            <div key={item.title} className="px-0 py-8 sm:px-6 lg:first:pl-0 lg:last:pr-0">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">{item.description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};

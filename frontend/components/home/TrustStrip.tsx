import { Container } from '../ui/Container';

const highlights = [
  {
    title: 'NGƯỜI BÁN ĐÃ XÁC MINH',
    description: 'Hồ sơ người bán hiển thị đánh giá, số sản phẩm đã bán và trạng thái xác minh.',
  },
  {
    title: 'TÌNH TRẠNG SẢN PHẨM',
    description: 'Mỗi sản phẩm đều có thông tin tình trạng rõ ràng — từ mới nguyên tem đến đã qua sử dụng.',
  },
  {
    title: 'GIÁ HIỂN THỊ BẰNG VNĐ',
    description: 'Giá được hiển thị theo định dạng quen thuộc tại Việt Nam, ví dụ: 350.000đ.',
  },
  {
    title: 'CỘNG ĐỒNG MUA BÁN C2C',
    description: 'Thời trang hằng ngày, streetwear và nhiều phong cách khác — gồm sản phẩm mới và đã qua sử dụng từ người bán trên khắp Việt Nam.',
  },
];

export const TrustStrip = () => {
  return (
    <section aria-label="Marketplace trust signals" className="border-b border-neutral-200 bg-white">
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

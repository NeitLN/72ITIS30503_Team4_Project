import { Container } from '../ui/Container';

/** Editorial statement grounding StyleHub in Vietnamese local fashion culture. */
export const LocalStatement = () => {
  return (
    <section className="border-t border-neutral-200 bg-white py-20 sm:py-28">
      <Container>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-500">
              Thời trang bản địa, vòng đời thứ hai
            </p>
            <h2 className="font-display text-3xl font-black uppercase leading-[1.02] tracking-tight text-neutral-900 sm:text-5xl">
              Làm ở đây.
              <br />
              Mặc vài lần.
              <br />
              Vẫn chất.
            </h2>
          </div>
          <div className="flex flex-col justify-end lg:col-span-5">
            <p className="text-base leading-relaxed text-neutral-600 sm:text-lg">
              StyleHub được xây dựng xung quanh làng thời trang của riêng Việt Nam — các thương hiệu
              streetwear địa phương, văn hóa đồ cũ, và những sinh viên trao đổi đồ giữa các học kỳ.
              Một chiếc hoodie đã hết hàng ở Quận 1 xuất hiện ở đây từ một tủ đồ ở Hà Nội, được ghi
              rõ tình trạng và định giá bằng VNĐ.
            </p>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-400">
              Thương hiệu địa phương · Văn hóa đồ cũ · Streetwear · Ngân sách sinh viên
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
};

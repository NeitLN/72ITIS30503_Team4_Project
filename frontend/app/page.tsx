import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="hero-content">
          <p className="eyebrow">Local brand & second-hand Việt Nam</p>
          <h1>Đồ chất đang chờ <span>một chủ mới.</span></h1>
          <p className="hero-copy">
            Khám phá thời trang local brand được đăng bán trực tiếp bởi cộng đồng.
            Tìm món đồ hợp gu, trò chuyện và thương lượng cùng người bán.
          </p>
          <div className="hero-actions">
            <Link href="/shop" className="primary-button">Khám phá ngay</Link>
            <Link href="/#about" className="secondary-button">Về Chợ Local</Link>
          </div>
          <div className="hero-proof">
            <div><strong>30+</strong><span>Món đồ local</span></div>
            <div><strong>6</strong><span>Danh mục chọn lọc</span></div>
            <div><strong>C2C</strong><span>Kết nối trực tiếp</span></div>
          </div>
        </div>
        <div className="hero-card" aria-label="Featured collection">
          <div className="card-tag">Món đồ nổi bật</div>
          <div className="product-visual marketplace-visual">
            <Image
              alt="DirtyCoins Oversized Tee"
              className="featured-market-image"
              fill
              priority
              sizes="(max-width: 850px) 90vw, 42vw"
              src="/images/products/dirtycoins-oversized-tee.jpg"
            />
          </div>
          <div className="card-copy">
            <span>Đăng bởi Minh Khang</span>
            <strong>DirtyCoins Oversized Tee</strong>
          </div>
        </div>
      </section>

      <section className="content-section" id="news">
        <p className="eyebrow">Hàng mới đăng</p>
        <h2>Mỗi món đồ đều có câu chuyện riêng.</h2>
        <p>Săn những thiết kế local brand độc đáo với mức giá dễ tiếp cận hơn.</p>
      </section>

      <section className="content-section accent-section" id="about">
        <p className="eyebrow">Về Chợ Local</p>
        <h2>Mặc lại đồ đẹp, kết nối cùng gu.</h2>
        <p>Chợ Local là nơi cộng đồng mua bán thời trang Việt trực tiếp, minh bạch và gần gũi.</p>
      </section>

      <section className="content-section" id="contact">
        <p className="eyebrow">Kết nối với chúng tôi</p>
        <h2>Cần hỗ trợ? Chúng tôi ở đây.</h2>
        <p>Liên hệ hello@cholocal.example để được hỗ trợ về bài đăng và giao dịch.</p>
      </section>
    </main>
  );
}

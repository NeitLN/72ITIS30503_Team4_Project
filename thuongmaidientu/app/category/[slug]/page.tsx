export default function CategoryPage({ params }: { params: { slug?: string } }) {
  
  // Bắt lỗi an toàn: Nếu không có link thì mặc định là chuỗi rỗng để không bị crash web
  const rawSlug = params?.slug || "";

  // 1. Kho dữ liệu
  const allProducts = [
    {
      id: 1,
      name: "Vintage Denim Jacket",
      category: "women", 
      displayCategory: "WOMEN",
      tag: "SECOND-HAND",
      price: 18,
      oldPrice: 32,
      imgUrl: "https://images.unsplash.com/photo-1611312449408-fcece27cdbb1?auto=format&fit=crop&w=500&q=80"
    },
    {
      id: 4,
      name: "Soft Summer Dress",
      category: "women",
      displayCategory: "WOMEN",
      tag: "STUDENT-PRICE",
      price: 16,
      oldPrice: 28,
      imgUrl: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=500&q=80"
    },
    {
      id: 5,
      name: "Summer Floral Skirt",
      category: "women",
      displayCategory: "WOMEN",
      tag: "NEW-ARRIVAL",
      price: 24,
      oldPrice: 40,
      imgUrl: "https://images.unsplash.com/photo-1582142407894-ec85a1260a46?auto=format&fit=crop&w=500&q=80"
    },
    {
      id: 10,
      name: "Elegant Silver Bracelet",
      category: "women",
      displayCategory: "WOMEN",
      tag: "GIFT-READY",
      price: 22,
      oldPrice: 45,
      imgUrl: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=500&q=80"
    },
    {
      id: 2,
      name: "Oversized Streetwear Tee",
      category: "men",
      displayCategory: "MEN",
      tag: "STREETWEAR",
      price: 12,
      oldPrice: 22,
      imgUrl: "https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?auto=format&fit=crop&w=500&q=80"
    },
    {
      id: 6,
      name: "Urban Windbreaker",
      category: "men",
      displayCategory: "MEN",
      tag: "STREETWEAR",
      price: 28,
      oldPrice: 50,
      imgUrl: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=500&q=80"
    },
    {
      id: 9,
      name: "Classic Campus Hoodie",
      category: "men",
      displayCategory: "MEN",
      tag: "STUDENT-PRICE",
      price: 14,
      oldPrice: 25,
      imgUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=500&q=80"
    },
    {
      id: 3,
      name: "Minimal Leather Bag",
      category: "accessories",
      displayCategory: "ACCESSORIES",
      tag: "NEW-ARRIVAL",
      price: 20,
      oldPrice: 35,
      imgUrl: "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=500&q=80"
    },
    {
      id: 7,
      name: "Classic Canvas Backpack",
      category: "accessories",
      displayCategory: "ACCESSORIES",
      tag: "STUDENT-PRICE",
      price: 15,
      oldPrice: 25,
      imgUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=500&q=80"
    },
    {
      id: 8,
      name: "Vintage Camera Tote",
      category: "accessories",
      displayCategory: "ACCESSORIES",
      tag: "SECOND-HAND",
      price: 10,
      oldPrice: 18,
      imgUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=500&q=80"
    }
  ];

  // 2. Logic tự động lọc theo danh mục
  const currentSlug = rawSlug.toLowerCase();
  const filteredProducts = allProducts.filter(p => p.category === currentSlug);
  const displayProducts = filteredProducts.length > 0 ? filteredProducts : allProducts;

  return (
    <div className="min-h-screen bg-gray-50 p-8 md:p-16">
      {/* Banner */}
      <div className="bg-black text-white rounded-3xl p-12 mb-10 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <span className="text-sm font-bold tracking-widest uppercase text-gray-400 mb-2 block">
            Explore Fashion Category
          </span>
          <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tight mb-4 text-white">
            {rawSlug || "All Categories"}
          </h1>
          <p className="text-gray-300 max-w-lg mx-auto">
            Discover high-quality, affordable second-hand fashion pieces tailored for your style.
          </p>
        </div>
      </div>

      {/* Danh sách sản phẩm */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {displayProducts.map((item) => (
          <div key={item.id} className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 hover:shadow-xl transition-all cursor-pointer flex flex-col">
            
            <div className="relative h-64 rounded-2xl overflow-hidden mb-4 bg-gray-100">
              <img src={item.imgUrl} alt={item.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              <span className="absolute top-3 left-3 bg-yellow-400 text-black text-[10px] font-black px-3 py-1.5 rounded-md uppercase tracking-wider shadow-sm">
                {item.tag}
              </span>
            </div>

            <div className="flex-1 flex flex-col px-1">
              <span className="text-cyan-600 font-extrabold text-xs uppercase tracking-wider mb-1">
                {item.displayCategory}
              </span>
              <h3 className="font-semibold text-gray-900 text-lg mb-4 leading-tight">
                {item.name}
              </h3>
              
              <div className="flex justify-between items-end mt-auto">
                <div className="flex items-baseline gap-2">
                  <span className="font-black text-2xl text-cyan-600">${item.price}</span>
                  <span className="font-medium text-sm text-gray-400 line-through">${item.oldPrice}</span>
                </div>
                <button className="bg-black text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-gray-800 transition-colors">
                  Details
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
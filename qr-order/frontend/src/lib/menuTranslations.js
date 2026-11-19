/**
 * Bản dịch đa ngôn ngữ cho Thực đơn nhà hàng Nhật (Tiếng Việt & English).
 * Tự động chuyển đổi tên món, mô tả và tên danh mục theo ngôn ngữ đang chọn.
 */

export const categoryTranslations = {
  'Sushi & Sashimi': { en: 'Sushi & Sashimi', vi: 'Sushi & Sashimi' },
  'Ramen & Udon': { en: 'Ramen & Udon', vi: 'Ramen & Udon' },
  'Cơm Nhật - Donburi': { en: 'Japanese Rice - Donburi', vi: 'Cơm Nhật - Donburi' },
  'Món ăn nhẹ Nhật Bản': { en: 'Japanese Appetizers & Snacks', vi: 'Món ăn nhẹ Nhật Bản' },
  'Đồ uống & Tráng miệng': { en: 'Drinks & Desserts', vi: 'Đồ uống & Tráng miệng' },
  // Cafe cũ (dự phòng)
  'Cà phê': { en: 'Coffee', vi: 'Cà phê' },
  'Trà & Nước ép': { en: 'Tea & Juice', vi: 'Trà & Nước ép' },
  'Đồ ăn nhẹ': { en: 'Snacks', vi: 'Đồ ăn nhẹ' },
};

export const menuItemTranslations = {
  'Sushi cá hồi': {
    name: { vi: 'Sushi cá hồi', en: 'Salmon Sushi' },
    description: { vi: '2 miếng sushi cá hồi tươi', en: '2 pcs fresh salmon nigiri' },
  },
  'Sushi cá ngừ': {
    name: { vi: 'Sushi cá ngừ', en: 'Tuna Sushi' },
    description: { vi: '2 miếng sushi cá ngừ', en: '2 pcs fresh tuna nigiri' },
  },
  'Sushi tôm': {
    name: { vi: 'Sushi tôm', en: 'Ebi Sushi' },
    description: { vi: '2 miếng sushi tôm luộc', en: '2 pcs cooked shrimp nigiri' },
  },
  'California Roll': {
    name: { vi: 'California Roll', en: 'California Roll' },
    description: { vi: 'Cuộn sushi thanh cua, bơ và dưa leo', en: 'Crab stick, avocado & cucumber roll' },
  },
  'Salmon Roll': {
    name: { vi: 'Salmon Roll', en: 'Salmon Roll' },
    description: { vi: 'Sushi cuộn cá hồi và rong biển', en: 'Fresh salmon & seaweed sushi roll' },
  },
  'Sashimi cá hồi': {
    name: { vi: 'Sashimi cá hồi', en: 'Salmon Sashimi' },
    description: { vi: '5 lát cá hồi tươi ăn kèm wasabi', en: '5 slices fresh salmon with wasabi' },
  },
  'Sashimi cá ngừ': {
    name: { vi: 'Sashimi cá ngừ', en: 'Tuna Sashimi' },
    description: { vi: '5 lát cá ngừ tươi', en: '5 slices fresh premium tuna sashimi' },
  },
  'Shoyu Ramen': {
    name: { vi: 'Shoyu Ramen', en: 'Shoyu Ramen' },
    description: { vi: 'Mì ramen nước tương Nhật', en: 'Classic ramen in Japanese soy sauce broth' },
  },
  'Miso Ramen': {
    name: { vi: 'Miso Ramen', en: 'Miso Ramen' },
    description: { vi: 'Mì ramen nước dùng miso', en: 'Ramen in rich miso broth' },
  },
  'Tonkotsu Ramen': {
    name: { vi: 'Tonkotsu Ramen', en: 'Tonkotsu Ramen' },
    description: { vi: 'Mì ramen nước dùng xương heo', en: 'Ramen in rich savory pork bone broth' },
  },
  'Spicy Ramen': {
    name: { vi: 'Spicy Ramen', en: 'Spicy Ramen' },
    description: { vi: 'Mì ramen cay kiểu Nhật', en: 'Japanese spicy ramen with rich toppings' },
  },
  'Tempura Udon': {
    name: { vi: 'Tempura Udon', en: 'Tempura Udon' },
    description: { vi: 'Mì udon ăn kèm tôm tempura', en: 'Thick udon noodles with crispy shrimp tempura' },
  },
  'Beef Udon': {
    name: { vi: 'Beef Udon', en: 'Beef Udon' },
    description: { vi: 'Mì udon thịt bò', en: 'Udon noodles in dashi broth with tender beef' },
  },
  'Gyudon': {
    name: { vi: 'Gyudon', en: 'Gyudon (Beef Bowl)' },
    description: { vi: 'Cơm thịt bò xào hành tây', en: 'Simmered beef & onion over rice' },
  },
  'Katsudon': {
    name: { vi: 'Katsudon', en: 'Katsudon (Pork Cutlet Bowl)' },
    description: { vi: 'Cơm thịt heo chiên xù và trứng', en: 'Crispy pork cutlet & simmered egg over rice' },
  },
  'Oyakodon': {
    name: { vi: 'Oyakodon', en: 'Oyakodon (Chicken & Egg Bowl)' },
    description: { vi: 'Cơm gà và trứng kiểu Nhật', en: 'Tender chicken & soft egg over seasoned rice' },
  },
  'Chicken Teriyaki': {
    name: { vi: 'Chicken Teriyaki', en: 'Chicken Teriyaki Rice' },
    description: { vi: 'Cơm gà sốt teriyaki', en: 'Grilled chicken glazed in teriyaki sauce over rice' },
  },
  'Katsu Curry': {
    name: { vi: 'Katsu Curry', en: 'Katsu Curry Rice' },
    description: { vi: 'Cơm cà ri Nhật với thịt chiên xù', en: 'Japanese curry with crispy fried pork cutlet' },
  },
  'Unadon': {
    name: { vi: 'Unadon', en: 'Unadon (Eel Bowl)' },
    description: { vi: 'Cơm lươn nướng sốt Nhật', en: 'Grilled eel with sweet savory tare sauce over rice' },
  },
  'Takoyaki': {
    name: { vi: 'Takoyaki', en: 'Takoyaki (6 pcs)' },
    description: { vi: '6 viên bánh bạch tuộc', en: '6 pcs octopus balls with bonito flakes & mayo' },
  },
  'Gyoza': {
    name: { vi: 'Gyoza', en: 'Gyoza (5 pcs)' },
    description: { vi: '5 bánh xếp Nhật áp chảo', en: '5 pcs pan-fried Japanese dumplings' },
  },
  'Tôm Tempura': {
    name: { vi: 'Tôm Tempura', en: 'Shrimp Tempura' },
    description: { vi: 'Tôm chiên giòn kiểu Nhật', en: 'Crispy deep-fried battered shrimp' },
  },
  'Karaage': {
    name: { vi: 'Karaage', en: 'Chicken Karaage' },
    description: { vi: 'Gà chiên giòn kiểu Nhật', en: 'Japanese-style crispy fried chicken' },
  },
  'Edamame': {
    name: { vi: 'Edamame', en: 'Edamame' },
    description: { vi: 'Đậu nành Nhật luộc', en: 'Boiled young soybeans sprinkled with sea salt' },
  },
  'Korokke': {
    name: { vi: 'Korokke', en: 'Potato Korokke' },
    description: { vi: 'Bánh khoai tây chiên xù', en: 'Crispy panko-breaded potato croquettes' },
  },
  'Trà xanh Nhật': {
    name: { vi: 'Trà xanh Nhật', en: 'Japanese Green Tea' },
    description: { vi: 'Trà xanh nóng hoặc lạnh', en: 'Traditional hot or iced green tea' },
  },
  'Matcha Latte': {
    name: { vi: 'Matcha Latte', en: 'Matcha Latte' },
    description: { vi: 'Matcha Nhật kết hợp sữa tươi', en: 'Pure Uji matcha with fresh steamed milk' },
  },
  'Trà đào': {
    name: { vi: 'Trà đào', en: 'Peach Iced Tea' },
    description: { vi: 'Trà đào thanh mát', en: 'Chilled iced black tea with peach slices' },
  },
  'Ramune': {
    name: { vi: 'Ramune', en: 'Ramune Soda' },
    description: { vi: 'Nước ngọt có ga kiểu Nhật', en: 'Iconic Japanese marble glass bottle soda' },
  },
  'Mochi': {
    name: { vi: 'Mochi', en: 'Mochi (2 pcs)' },
    description: { vi: '2 bánh mochi nhân ngọt', en: '2 pcs sweet soft Japanese rice cakes' },
  },
  'Dorayaki': {
    name: { vi: 'Dorayaki', en: 'Dorayaki' },
    description: { vi: 'Bánh rán Nhật nhân đậu đỏ', en: 'Sweet red bean paste pancake' },
  },
  'Kem Matcha': {
    name: { vi: 'Kem Matcha', en: 'Matcha Ice Cream' },
    description: { vi: 'Kem vị trà xanh Nhật Bản', en: 'Creamy authentic Japanese green tea ice cream' },
  },
};

export function translateCategory(catName, lang) {
  if (lang !== 'en') return catName;
  return categoryTranslations[catName]?.en ?? catName;
}

export function translateMenuItem(item, lang) {
  if (!item) return item;
  if (lang !== 'en') return item;
  const t = menuItemTranslations[item.name];
  if (!t) return item;
  return {
    ...item,
    name: t.name.en ?? item.name,
    description: t.description?.en ?? item.description,
  };
}

export function translateItemName(name, lang) {
  if (!name) return name;
  if (lang !== 'en') return name;
  return menuItemTranslations[name]?.name?.en ?? name;
}


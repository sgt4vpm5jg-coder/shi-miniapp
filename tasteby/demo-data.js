// Примеры страниц авторов для теста. Настоящие страницы появятся на втором этапе.
window.TB_DEMO = (() => {
  const P = "https://vqspkcjedbwhjoqgbizh.supabase.co/storage/v1/object/public/media/products/";
  const it = (img, t, shop) => ({ img: P + img + ".jpg", t, shop });
  const authors = [
    {
      u: "lera", n: "Lera Orlova", bio: "Макияж и всё, что пробую в Reels", col: "Помады из Reels",
      cols: [
        { name: "Помады из Reels", items: [
          it("p61_0", "Помада Pillow Talk Love Effect", "Charlotte Tilbury"),
          it("p62_0", "Тинт для губ и щёк Pillow Talk", "Charlotte Tilbury"),
          it("p64_0", "Жидкая помада Icon Velvet", "Fenty Beauty"),
          it("p63_0", "Масло-стик для губ Soft Pinch", "Rare Beauty"),
          it("p65_0", "Масло для губ с мёдом", "Gisou"),
          it("p66_0", "Бальзам для губ Major Moisture", "Patrick Ta"),
        ] },
        { name: "Румяна", items: [
          it("p76_0", "Румяна-стик Unreal Blush", "Charlotte Tilbury"),
          it("p73_0", "Жидкие румяна Soft Pinch", "Rare Beauty"),
          it("p70_0", "Румяна Make Me Blush", "YSL"),
          it("p78_0", "Румяна-стик Joystick", "Marc Jacobs Beauty"),
        ] },
      ],
    },
    {
      u: "alina", n: "Alina Vetrova", bio: "Мои образы и любимая косметика", col: "Мои образы",
      cols: [
        { name: "Мои образы", items: [
          it("p69_0", "Палетка Palette Couture", "Dior"),
          it("p60_0", "Палетка Médaillon", "Dior"),
          it("p67_0", "Хайлайтер Forever Glow", "Dior"),
          it("p68_0", "Стик Rosy Glow", "Dior"),
          it("p83_0", "Палетка для лица Couture", "YSL"),
          it("p81_0", "Палетка Ambient Lighting", "Hourglass"),
        ] },
        { name: "Глаза", items: [
          it("p54_0", "Тени Diorshow 5 Couleurs", "Dior"),
          it("p58_0", "Тени Born Star", "Marc Jacobs Beauty"),
          it("p57_0", "Кремовые тени Soft Shimmer", "Makeup by Mario"),
          it("p59_0", "Тушь Flashes", "Marc Jacobs Beauty"),
        ] },
      ],
    },
    {
      u: "dan", n: "Dan Lee", bio: "Снимаю контент, советую технику и мелочи", col: "Камера и свет",
      cols: [
        { name: "Камера и свет", items: [
          it("p86_0", "Подсветка для телефона", "Dior"),
          it("p89_0", "Держатель для телефона", "Charlotte Tilbury"),
          it("p87_0", "Складное зеркальце", "Dior"),
          it("p53_0", "Карманная кисть", "rhode"),
        ] },
        { name: "В дорогу", items: [
          it("p85_0", "Мини-набор A.M. Glow", "Glowery"),
          it("p84_0", "Патчи с коллагеном", "numbuzin"),
          it("p52_0", "Маска Watermelon Glow", "Glow Recipe"),
          it("p77_0", "Спрей-фиксатор You Mist", "Fenty Beauty"),
        ] },
      ],
    },
  ];
  return { authors, find: (u) => authors.find((a) => a.u === u) || authors[1] };
})();

const { pickDefaultCover } = require("../utils/bookCatalog");

const BUILTIN_LIBRARY = [
  {
    catalogKey: "builtin-hp-lovecraft-collection",
    filename: "hp-lovecrafts-complete-fiction-hp-lovecraft.pdf",
    title: "H.P. Lovecraft Collection",
    bookAuthor: "H.P. Lovecraft",
    type: "Book",
    category: "Horror",
    subcategory: "Gothic Horror",
    language: "English",
    description: "A curated horror fiction collection featuring eerie cosmic dread, psychological suspense, and classic dark storytelling from H.P. Lovecraft.",
    tags: ["horror", "lovecraft", "fiction", "gothic horror"],
    originalPrice: 799,
    discountPrice: 549,
    previewPages: 10,
    isPremium: true,
    isFeatured: true,
    coverImage: pickDefaultCover("Horror", "Book"),
  },
  {
    catalogKey: "builtin-edgar-allan-poe-collection",
    filename: "edgar-allan-poe-complete-tales-and-poems-edgar-allan-poe-1142.pdf",
    title: "Edgar Allan Poe Collection",
    bookAuthor: "Edgar Allan Poe",
    type: "Book",
    category: "Horror",
    subcategory: "Gothic Horror",
    language: "English",
    description: "A classic gothic horror and poetry collection with suspense, mystery, and literary atmosphere drawn from Edgar Allan Poe's most recognized works.",
    tags: ["horror", "poe", "poetry", "gothic horror"],
    originalPrice: 699,
    discountPrice: 499,
    previewPages: 10,
    isPremium: true,
    isFeatured: true,
    coverImage: pickDefaultCover("Horror", "Book"),
  },
];

module.exports = {
  BUILTIN_LIBRARY,
};

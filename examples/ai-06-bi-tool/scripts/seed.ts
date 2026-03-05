import "dotenv/config";
import { getWritePool } from "../src/database.js";

// Deterministic pseudo-random number generator (mulberry32)
function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function randDate(start: Date, end: Date): string {
  const ts = start.getTime() + rand() * (end.getTime() - start.getTime());
  return new Date(ts).toISOString().slice(0, 19).replace("T", " ");
}

function escape(s: string): string {
  return s.replace(/'/g, "''");
}

// --- Data pools ---

const CATEGORIES = [
  { name: "Electronics", description: "Smartphones, laptops, tablets, and accessories" },
  { name: "Clothing", description: "Men and women apparel, shoes, and accessories" },
  { name: "Home & Kitchen", description: "Furniture, cookware, and home decor" },
  { name: "Books", description: "Fiction, non-fiction, and educational books" },
  { name: "Sports & Outdoors", description: "Fitness equipment, camping gear, and sportswear" },
  { name: "Beauty & Health", description: "Skincare, makeup, vitamins, and wellness products" },
  { name: "Toys & Games", description: "Board games, puzzles, and children toys" },
  { name: "Food & Beverages", description: "Gourmet food, snacks, coffee, and tea" },
  { name: "Office Supplies", description: "Stationery, printers, and desk accessories" },
  { name: "Garden & Tools", description: "Power tools, hand tools, and garden supplies" },
];

const PRODUCT_NAMES: Record<string, string[]> = {
  Electronics: [
    "Wireless Bluetooth Headphones", "USB-C Hub Adapter", "Mechanical Keyboard", "4K Webcam",
    "Portable SSD 1TB", "Smart Watch Pro", "Noise Cancelling Earbuds", "27-inch Monitor",
    "Wireless Mouse", "Phone Stand Charger",
  ],
  Clothing: [
    "Cotton Crew Neck T-Shirt", "Slim Fit Jeans", "Wool Blend Sweater", "Running Sneakers",
    "Waterproof Jacket", "Leather Belt", "Linen Summer Dress", "Denim Shorts",
    "Cashmere Scarf", "Canvas Tote Bag",
  ],
  "Home & Kitchen": [
    "Cast Iron Skillet", "Ceramic Knife Set", "French Press Coffee Maker", "Memory Foam Pillow",
    "Bamboo Cutting Board", "Stainless Steel Water Bottle", "LED Desk Lamp", "Throw Blanket",
    "Spice Rack Organizer", "Non-Stick Baking Sheet",
  ],
  Books: [
    "The Art of Programming", "Modern Web Development", "Science of Cooking",
    "History of the Internet", "Mindful Productivity", "Creative Writing Guide",
    "Data Science Handbook", "Philosophy for Beginners", "Travel Photography Tips",
    "Financial Freedom Blueprint",
  ],
  "Sports & Outdoors": [
    "Yoga Mat Premium", "Resistance Bands Set", "Hiking Backpack 40L", "Camping Hammock",
    "Jump Rope Speed", "Foam Roller", "Trail Running Shoes", "Insulated Water Bottle",
    "Cycling Gloves", "Compression Socks",
  ],
  "Beauty & Health": [
    "Vitamin C Serum", "SPF 50 Sunscreen", "Hair Repair Mask", "Electric Toothbrush",
    "Essential Oils Set", "Collagen Supplement", "Facial Cleansing Brush", "Hand Cream Set",
    "Lip Balm Trio", "Sleep Mask Silk",
  ],
  "Toys & Games": [
    "Strategy Board Game", "1000-Piece Puzzle", "Building Blocks Set", "Card Game Deluxe",
    "Remote Control Car", "Science Experiment Kit", "Wooden Chess Set", "Trivia Game Night",
    "Magnetic Drawing Board", "Plush Teddy Bear",
  ],
  "Food & Beverages": [
    "Single Origin Coffee Beans", "Organic Green Tea", "Dark Chocolate Assortment",
    "Artisan Pasta Set", "Hot Sauce Collection", "Granola Mix", "Dried Fruit Pack",
    "Sparkling Water Variety", "Protein Bar Box", "Honey Sampler",
  ],
  "Office Supplies": [
    "Gel Pen Set 12-Pack", "Sticky Notes Assorted", "Desk Organizer Bamboo",
    "Ergonomic Mouse Pad", "Whiteboard Markers", "Filing Cabinet Portable",
    "Paper Shredder Compact", "Notebook Leather Bound", "Monitor Stand Riser",
    "Cable Management Kit",
  ],
  "Garden & Tools": [
    "Cordless Drill Kit", "Garden Hose 50ft", "Pruning Shears", "LED Solar Lights",
    "Compost Bin", "Raised Garden Bed", "Tool Belt Heavy Duty", "Pressure Washer",
    "Seed Starter Kit", "Wheelbarrow Foldable",
  ],
};

const FIRST_NAMES = [
  "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason", "Isabella", "William",
  "Mia", "James", "Charlotte", "Benjamin", "Amelia", "Lucas", "Harper", "Henry", "Evelyn", "Alexander",
  "Luna", "Daniel", "Chloe", "Michael", "Penelope", "Sebastian", "Layla", "Jack", "Riley", "Owen",
  "Zoey", "Theodore", "Nora", "Aiden", "Lily", "Samuel", "Eleanor", "Ryan", "Hannah", "Leo",
  "Addison", "Nathan", "Aubrey", "Caleb", "Stella", "Christian", "Bella", "Hunter", "Lucy", "Andrew",
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
  "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
  "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
  "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
];

const CITIES = [
  { city: "New York", country: "United States" },
  { city: "Los Angeles", country: "United States" },
  { city: "Chicago", country: "United States" },
  { city: "Houston", country: "United States" },
  { city: "Phoenix", country: "United States" },
  { city: "London", country: "United Kingdom" },
  { city: "Manchester", country: "United Kingdom" },
  { city: "Paris", country: "France" },
  { city: "Lyon", country: "France" },
  { city: "Berlin", country: "Germany" },
  { city: "Munich", country: "Germany" },
  { city: "Toronto", country: "Canada" },
  { city: "Vancouver", country: "Canada" },
  { city: "Sydney", country: "Australia" },
  { city: "Melbourne", country: "Australia" },
  { city: "Tokyo", country: "Japan" },
  { city: "Amsterdam", country: "Netherlands" },
  { city: "Barcelona", country: "Spain" },
  { city: "Milan", country: "Italy" },
  { city: "Stockholm", country: "Sweden" },
];

const REVIEW_COMMENTS = [
  "Great product, exactly what I needed!",
  "Good quality for the price.",
  "Arrived quickly and well packaged.",
  "Decent product but could be better.",
  "Exceeded my expectations!",
  "Works as described, no complaints.",
  "Not what I expected, a bit disappointed.",
  "Solid build quality, would recommend.",
  "Perfect gift idea!",
  "Been using it daily, very happy with it.",
  "The color was slightly different from the picture.",
  "Amazing value, will buy again.",
  "Took a while to get used to but now I love it.",
  "Five stars, absolutely perfect.",
  "Average product, nothing special.",
  "My family loves it!",
  "Good starter option for beginners.",
  "Premium feel, worth every penny.",
  "Broke after two weeks, not happy.",
  "Surprisingly good quality.",
];

const ORDER_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
const STATUS_WEIGHTS = [0.05, 0.1, 0.15, 0.6, 0.1]; // mostly delivered

function weightedStatus(): string {
  const r = rand();
  let cumulative = 0;
  for (let i = 0; i < ORDER_STATUSES.length; i++) {
    cumulative += STATUS_WEIGHTS[i];
    if (r <= cumulative) return ORDER_STATUSES[i];
  }
  return "delivered";
}

// --- Schema creation ---

const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category_id INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  city VARCHAR(100),
  country VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  status ENUM('pending','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
  total DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS carts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cart_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  FOREIGN KEY (cart_id) REFERENCES carts(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  customer_id INT NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
`;

// --- Seed logic ---

async function seed() {
  const pool = getWritePool();

  // Check if already seeded
  const [rows] = await pool.query("SHOW TABLES LIKE 'categories'");
  if (Array.isArray(rows) && rows.length > 0) {
    const [countRows] = await pool.query("SELECT COUNT(*) as cnt FROM categories");
    const count = (countRows as Array<{ cnt: number }>)[0].cnt;
    if (count > 0) {
      console.log("[seed] Database already seeded, skipping");
      await pool.end();
      return;
    }
  }

  console.log("[seed] Creating tables...");
  const statements = CREATE_TABLES.split(";").filter((s) => s.trim());
  for (const stmt of statements) {
    await pool.query(stmt);
  }

  // Categories
  console.log("[seed] Inserting categories...");
  for (const cat of CATEGORIES) {
    await pool.query(
      `INSERT INTO categories (name, description) VALUES ('${escape(cat.name)}', '${escape(cat.description)}')`,
    );
  }

  // Products (100 total, 10 per category)
  console.log("[seed] Inserting products...");
  interface Product { id: number; price: number; categoryId: number }
  const products: Product[] = [];
  let productId = 1;
  for (let catIdx = 0; catIdx < CATEGORIES.length; catIdx++) {
    const catName = CATEGORIES[catIdx].name;
    const names = PRODUCT_NAMES[catName];
    for (let i = 0; i < 10; i++) {
      const price = (randInt(5, 300) + rand() * 0.99).toFixed(2);
      const stock = randInt(0, 200);
      const createdAt = randDate(new Date("2024-01-01"), new Date("2025-06-01"));
      const desc = `High quality ${names[i].toLowerCase()} from our ${catName.toLowerCase()} collection.`;
      await pool.query(
        `INSERT INTO products (name, description, category_id, price, stock, created_at) VALUES ('${escape(names[i])}', '${escape(desc)}', ${catIdx + 1}, ${price}, ${stock}, '${createdAt}')`,
      );
      products.push({ id: productId, price: Number.parseFloat(price), categoryId: catIdx + 1 });
      productId++;
    }
  }

  // Customers (500)
  console.log("[seed] Inserting customers...");
  const usedEmails = new Set<string>();
  const customerValues: string[] = [];
  for (let i = 0; i < 500; i++) {
    const first = pick(FIRST_NAMES);
    const last = pick(LAST_NAMES);
    let email = `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.com`;
    while (usedEmails.has(email)) {
      email = `${first.toLowerCase()}.${last.toLowerCase()}${i}${randInt(100, 999)}@example.com`;
    }
    usedEmails.add(email);
    const loc = pick(CITIES);
    const createdAt = randDate(new Date("2024-01-01"), new Date("2025-06-01"));
    customerValues.push(
      `('${escape(first)}', '${escape(last)}', '${escape(email)}', '${escape(loc.city)}', '${escape(loc.country)}', '${createdAt}')`,
    );
  }
  // Insert in batches of 100
  for (let i = 0; i < customerValues.length; i += 100) {
    const batch = customerValues.slice(i, i + 100);
    await pool.query(
      `INSERT INTO customers (first_name, last_name, email, city, country, created_at) VALUES ${batch.join(",")}`,
    );
  }

  // Orders (750) with order_items
  console.log("[seed] Inserting orders and order items...");
  for (let i = 1; i <= 750; i++) {
    const customerId = randInt(1, 500);
    const status = weightedStatus();
    const createdAt = randDate(new Date("2024-03-01"), new Date("2025-12-01"));
    const itemCount = randInt(1, 5);

    // Generate items first to calculate total
    const items: Array<{ productId: number; quantity: number; unitPrice: number }> = [];
    const usedProducts = new Set<number>();
    for (let j = 0; j < itemCount; j++) {
      let product = pick(products);
      while (usedProducts.has(product.id)) {
        product = pick(products);
      }
      usedProducts.add(product.id);
      const quantity = randInt(1, 3);
      items.push({ productId: product.id, quantity, unitPrice: product.price });
    }

    const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2);

    await pool.query(
      `INSERT INTO orders (customer_id, status, total, created_at) VALUES (${customerId}, '${status}', ${total}, '${createdAt}')`,
    );

    const itemValues = items
      .map(
        (item) => `(${i}, ${item.productId}, ${item.quantity}, ${item.unitPrice.toFixed(2)})`,
      )
      .join(",");
    await pool.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ${itemValues}`,
    );
  }

  // Carts (100 active carts for random customers)
  console.log("[seed] Inserting carts...");
  const cartCustomers = new Set<number>();
  while (cartCustomers.size < 100) {
    cartCustomers.add(randInt(1, 500));
  }
  let cartId = 1;
  for (const customerId of cartCustomers) {
    const createdAt = randDate(new Date("2025-10-01"), new Date("2025-12-01"));
    await pool.query(
      `INSERT INTO carts (customer_id, created_at) VALUES (${customerId}, '${createdAt}')`,
    );

    const itemCount = randInt(1, 4);
    const usedProducts = new Set<number>();
    const cartItemValues: string[] = [];
    for (let j = 0; j < itemCount; j++) {
      let product = pick(products);
      while (usedProducts.has(product.id)) {
        product = pick(products);
      }
      usedProducts.add(product.id);
      cartItemValues.push(`(${cartId}, ${product.id}, ${randInt(1, 3)})`);
    }
    await pool.query(
      `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ${cartItemValues.join(",")}`,
    );
    cartId++;
  }

  // Reviews (around 800 reviews spread across products)
  console.log("[seed] Inserting reviews...");
  const reviewValues: string[] = [];
  const reviewPairs = new Set<string>();
  let reviewCount = 0;
  while (reviewCount < 800) {
    const productIdR = randInt(1, 100);
    const customerId = randInt(1, 500);
    const pairKey = `${productIdR}-${customerId}`;
    if (reviewPairs.has(pairKey)) continue;
    reviewPairs.add(pairKey);

    const rating = randInt(1, 5);
    // Skew ratings: reroll low ratings sometimes for realism
    const finalRating = rating <= 2 && rand() > 0.3 ? randInt(3, 5) : rating;
    const comment = pick(REVIEW_COMMENTS);
    const createdAt = randDate(new Date("2024-06-01"), new Date("2025-12-01"));
    reviewValues.push(
      `(${productIdR}, ${customerId}, ${finalRating}, '${escape(comment)}', '${createdAt}')`,
    );
    reviewCount++;
  }
  for (let i = 0; i < reviewValues.length; i += 100) {
    const batch = reviewValues.slice(i, i + 100);
    await pool.query(
      `INSERT INTO reviews (product_id, customer_id, rating, comment, created_at) VALUES ${batch.join(",")}`,
    );
  }

  console.log("[seed] Done! Inserted:");
  console.log(`  - ${CATEGORIES.length} categories`);
  console.log(`  - ${products.length} products`);
  console.log("  - 500 customers");
  console.log("  - 750 orders");
  console.log("  - 100 carts");
  console.log(`  - ${reviewCount} reviews`);

  await pool.end();
}

seed().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});

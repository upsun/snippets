export const DB_SCHEMA = `
Database: bi_tool (MySQL)

Tables:

1. categories
   - id INT PRIMARY KEY AUTO_INCREMENT
   - name VARCHAR(100) NOT NULL
   - description TEXT

2. products
   - id INT PRIMARY KEY AUTO_INCREMENT
   - name VARCHAR(200) NOT NULL
   - description TEXT
   - category_id INT (FK -> categories.id)
   - price DECIMAL(10,2) NOT NULL
   - stock INT NOT NULL DEFAULT 0
   - created_at DATETIME DEFAULT CURRENT_TIMESTAMP

3. customers
   - id INT PRIMARY KEY AUTO_INCREMENT
   - first_name VARCHAR(100) NOT NULL
   - last_name VARCHAR(100) NOT NULL
   - email VARCHAR(200) NOT NULL UNIQUE
   - city VARCHAR(100)
   - country VARCHAR(100)
   - created_at DATETIME DEFAULT CURRENT_TIMESTAMP

4. orders
   - id INT PRIMARY KEY AUTO_INCREMENT
   - customer_id INT NOT NULL (FK -> customers.id)
   - status ENUM('pending','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending'
   - total DECIMAL(10,2) NOT NULL
   - created_at DATETIME DEFAULT CURRENT_TIMESTAMP

5. order_items
   - id INT PRIMARY KEY AUTO_INCREMENT
   - order_id INT NOT NULL (FK -> orders.id)
   - product_id INT NOT NULL (FK -> products.id)
   - quantity INT NOT NULL
   - unit_price DECIMAL(10,2) NOT NULL

6. carts
   - id INT PRIMARY KEY AUTO_INCREMENT
   - customer_id INT NOT NULL (FK -> customers.id)
   - created_at DATETIME DEFAULT CURRENT_TIMESTAMP

7. cart_items
   - id INT PRIMARY KEY AUTO_INCREMENT
   - cart_id INT NOT NULL (FK -> carts.id)
   - product_id INT NOT NULL (FK -> products.id)
   - quantity INT NOT NULL DEFAULT 1

8. reviews
   - id INT PRIMARY KEY AUTO_INCREMENT
   - product_id INT NOT NULL (FK -> products.id)
   - customer_id INT NOT NULL (FK -> customers.id)
   - rating TINYINT NOT NULL (1 to 5)
   - comment TEXT
   - created_at DATETIME DEFAULT CURRENT_TIMESTAMP

Relationships:
- products.category_id -> categories.id
- orders.customer_id -> customers.id
- order_items.order_id -> orders.id
- order_items.product_id -> products.id
- carts.customer_id -> customers.id
- cart_items.cart_id -> carts.id
- cart_items.product_id -> products.id
- reviews.product_id -> products.id
- reviews.customer_id -> customers.id
`.trim();

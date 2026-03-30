-- MIGRATION: Rename all snake_case columns to camelCase for all relevant tables
-- PRODUCTS TABLE
ALTER TABLE products 
  CHANGE image_url imageUrl LONGTEXT,
  CHANGE low_stock_threshold lowStockThreshold INT DEFAULT 20,
  CHANGE enable_ai_ideas enableAIIdeas BOOLEAN DEFAULT FALSE,
  CHANGE gallery_id galleryId VARCHAR(36),
  CHANGE allow_custom_image_upload allowCustomImageUpload BOOLEAN DEFAULT FALSE,
  CHANGE custom_image_upload_price customImageUploadPrice DECIMAL(10,2) DEFAULT 0.00,
  CHANGE allow_custom_text allowCustomText BOOLEAN DEFAULT FALSE,
  CHANGE custom_text_price_per_char customTextPricePerChar DECIMAL(10,2) DEFAULT 0.00,
  CHANGE custom_text_max_length customTextMaxLength INT DEFAULT 100,
  CHANGE is_archived isArchived BOOLEAN DEFAULT FALSE,
  CHANGE sale_type saleType ENUM('none','percent','fixed') DEFAULT 'none',
  CHANGE sale_value saleValue DECIMAL(10,2) DEFAULT NULL,
  CHANGE sale_start_at saleStartAt DATETIME DEFAULT NULL,
  CHANGE sale_end_at saleEndAt DATETIME DEFAULT NULL,
  CHANGE reorder_pricing_mode reorderPricingMode ENUM('current','historical') DEFAULT 'current',
  CHANGE package_weight packageWeight DECIMAL(10,2) DEFAULT NULL,
  CHANGE package_length packageLength DECIMAL(10,2) DEFAULT NULL,
  CHANGE package_width packageWidth DECIMAL(10,2) DEFAULT NULL,
  CHANGE package_height packageHeight DECIMAL(10,2) DEFAULT NULL,
  CHANGE package_volume packageVolume DECIMAL(10,2) DEFAULT NULL;

-- PRODUCT_OPTION_LISTS TABLE
ALTER TABLE product_option_lists
  CHANGE product_id productId VARCHAR(36),
  CHANGE max_selections maxSelections INT NULL,
  CHANGE list_order listOrder INT NOT NULL DEFAULT 0;

-- PRODUCT_OPTIONS TABLE
ALTER TABLE product_options
  CHANGE list_id listId VARCHAR(36),
  CHANGE price_delta priceDelta DECIMAL(10,2) DEFAULT 0.00,
  CHANGE option_order optionOrder INT NOT NULL DEFAULT 0;

-- GALLERIES TABLE (no changes needed, already camelCase)

-- GALLERY_IMAGES TABLE
ALTER TABLE gallery_images
  CHANGE gallery_id galleryId VARCHAR(36),
  CHANGE image_url imageUrl LONGTEXT;

-- ORDERS TABLE
ALTER TABLE orders
  CHANGE customer_id customerId VARCHAR(36),
  CHANGE shipping_address_id shippingAddressId VARCHAR(36),
  CHANGE order_number orderNumber VARCHAR(50) UNIQUE NOT NULL,
  CHANGE order_data orderData LONGTEXT,
  CHANGE tax_amount taxAmount DECIMAL(10,2),
  CHANGE shipping_cost shippingCost DECIMAL(10,2),
  CHANGE tracking_number trackingNumber VARCHAR(100);

-- ORDER_ITEMS TABLE
ALTER TABLE order_items
  CHANGE order_id orderId VARCHAR(36),
  CHANGE product_id productId VARCHAR(36),
  CHANGE unit_price unitPrice DECIMAL(10,2),
  CHANGE selected_options selectedOptions JSON;

-- CUSTOMER_ADDRESSES TABLE
ALTER TABLE customer_addresses
  CHANGE customer_id customerId VARCHAR(36),
  CHANGE zip_code zipCode VARCHAR(20);

-- STAFF TABLE
ALTER TABLE staff
  CHANGE image_url imageUrl LONGTEXT;

-- Add more ALTER TABLE statements for any other tables as needed.

-- NOTE: You may need to update foreign key constraints and indexes if they reference renamed columns.

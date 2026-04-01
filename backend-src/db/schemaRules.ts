export type ColumnRule = {
  table: string;
  camel: string;
  snake: string;
};

export const APP_SCHEMA_RULES: ColumnRule[] = [
  // Admins
  { table: "admins", camel: "firstName", snake: "first_name" },
  { table: "admins", camel: "lastName", snake: "last_name" },
  { table: "admins", camel: "passwordHash", snake: "password_hash" },
  { table: "admins", camel: "isActive", snake: "is_active" },
  { table: "admins", camel: "createdAt", snake: "created_at" },
  { table: "admins", camel: "lastLogin", snake: "last_login" },

  // Customers
  { table: "customers", camel: "firstName", snake: "first_name" },
  { table: "customers", camel: "lastName", snake: "last_name" },
  { table: "customers", camel: "passwordHash", snake: "password_hash" },
  { table: "customers", camel: "emailPreferences", snake: "email_preferences" },
  { table: "customers", camel: "isActive", snake: "is_active" },
  { table: "customers", camel: "createdAt", snake: "created_at" },
  { table: "customers", camel: "lastLogin", snake: "last_login" },
  { table: "customers", camel: "updatedAt", snake: "updated_at" },

  // Customer addresses
  { table: "customer_addresses", camel: "customerId", snake: "customer_id" },
  { table: "customer_addresses", camel: "firstName", snake: "first_name" },
  { table: "customer_addresses", camel: "lastName", snake: "last_name" },
  { table: "customer_addresses", camel: "fullName", snake: "full_name" },
  {
    table: "customer_addresses",
    camel: "streetAddress",
    snake: "street_address",
  },
  { table: "customer_addresses", camel: "zipCode", snake: "zip_code" },
  { table: "customer_addresses", camel: "isDefault", snake: "is_default" },
  { table: "customer_addresses", camel: "createdAt", snake: "created_at" },

  // Products and options
  { table: "products", camel: "imageUrl", snake: "image_url" },
  { table: "products", camel: "galleryId", snake: "gallery_id" },
  {
    table: "products",
    camel: "allowCustomImageUpload",
    snake: "allow_custom_image_upload",
  },
  {
    table: "products",
    camel: "customImageUploadPrice",
    snake: "custom_image_upload_price",
  },
  { table: "products", camel: "allowCustomText", snake: "allow_custom_text" },
  {
    table: "products",
    camel: "customTextPricePerChar",
    snake: "custom_text_price_per_char",
  },
  {
    table: "products",
    camel: "customTextMaxLength",
    snake: "custom_text_max_length",
  },
  {
    table: "products",
    camel: "lowStockThreshold",
    snake: "low_stock_threshold",
  },
  { table: "products", camel: "enableAIIdeas", snake: "enable_ai_ideas" },
  { table: "products", camel: "isArchived", snake: "is_archived" },
  { table: "products", camel: "saleType", snake: "sale_type" },
  { table: "products", camel: "saleValue", snake: "sale_value" },
  { table: "products", camel: "saleStartAt", snake: "sale_start_at" },
  { table: "products", camel: "saleEndAt", snake: "sale_end_at" },
  {
    table: "products",
    camel: "reorderPricingMode",
    snake: "reorder_pricing_mode",
  },
  { table: "products", camel: "packageWeight", snake: "package_weight" },
  { table: "products", camel: "packageLength", snake: "package_length" },
  { table: "products", camel: "packageWidth", snake: "package_width" },
  { table: "products", camel: "packageHeight", snake: "package_height" },
  { table: "products", camel: "packageVolume", snake: "package_volume" },

  { table: "product_option_lists", camel: "productId", snake: "product_id" },
  {
    table: "product_option_lists",
    camel: "maxSelections",
    snake: "max_selections",
  },
  { table: "product_option_lists", camel: "listOrder", snake: "list_order" },
  { table: "product_option_lists", camel: "createdAt", snake: "created_at" },

  { table: "product_options", camel: "listId", snake: "list_id" },
  { table: "product_options", camel: "priceDelta", snake: "price_delta" },
  { table: "product_options", camel: "optionOrder", snake: "option_order" },
  { table: "product_options", camel: "createdAt", snake: "created_at" },

  // Orders
  { table: "orders", camel: "customerId", snake: "customer_id" },
  { table: "orders", camel: "customerEmail", snake: "customer_email" },
  { table: "orders", camel: "customerName", snake: "customer_name" },
  { table: "orders", camel: "orderNumber", snake: "order_number" },
  { table: "orders", camel: "orderData", snake: "order_data" },
  { table: "orders", camel: "taxAmount", snake: "tax_amount" },
  { table: "orders", camel: "shippingCost", snake: "shipping_cost" },
  { table: "orders", camel: "trackingNumber", snake: "tracking_number" },
  { table: "orders", camel: "createdAt", snake: "created_at" },
  { table: "orders", camel: "updatedAt", snake: "updated_at" },

  // Tickets
  { table: "support_tickets", camel: "ticketNumber", snake: "ticket_number" },
  { table: "support_tickets", camel: "customerId", snake: "customer_id" },
  { table: "support_tickets", camel: "customerName", snake: "customer_name" },
  { table: "support_tickets", camel: "customerEmail", snake: "customer_email" },
  { table: "support_tickets", camel: "orderId", snake: "order_id" },
  { table: "support_tickets", camel: "createdAt", snake: "created_at" },
  { table: "support_tickets", camel: "updatedAt", snake: "updated_at" },

  { table: "ticket_replies", camel: "ticketId", snake: "ticket_id" },
  { table: "ticket_replies", camel: "createdAt", snake: "created_at" },

  // Quotes
  { table: "custom_quotes", camel: "customerId", snake: "customer_id" },
  { table: "custom_quotes", camel: "customerEmail", snake: "customer_email" },
  { table: "custom_quotes", camel: "customerName", snake: "customer_name" },
  { table: "custom_quotes", camel: "quoteNumber", snake: "quote_number" },
  { table: "custom_quotes", camel: "lineItems", snake: "line_items" },
  { table: "custom_quotes", camel: "taxAmount", snake: "tax_amount" },
  { table: "custom_quotes", camel: "shippingCost", snake: "shipping_cost" },
  { table: "custom_quotes", camel: "createdBy", snake: "created_by" },
  { table: "custom_quotes", camel: "createdAt", snake: "created_at" },
  { table: "custom_quotes", camel: "sentAt", snake: "sent_at" },
  { table: "custom_quotes", camel: "acceptedAt", snake: "accepted_at" },
  { table: "custom_quotes", camel: "rejectedAt", snake: "rejected_at" },
  {
    table: "custom_quotes",
    camel: "changeRequestedAt",
    snake: "change_requested_at",
  },
  {
    table: "custom_quotes",
    camel: "changeRequestNote",
    snake: "change_request_note",
  },
  { table: "custom_quotes", camel: "expirationDate", snake: "expiration_date" },

  // Pages
  { table: "pages", camel: "pageType", snake: "page_type" },
  { table: "pages", camel: "contentData", snake: "content_data" },
  { table: "pages", camel: "createdAt", snake: "created_at" },
  { table: "pages", camel: "updatedAt", snake: "updated_at" },

  // Email config
  { table: "email_config", camel: "fromEmail", snake: "from_email" },
  { table: "email_config", camel: "fromName", snake: "from_name" },
  { table: "email_config", camel: "smtpHost", snake: "smtp_host" },
  { table: "email_config", camel: "smtpPort", snake: "smtp_port" },
  { table: "email_config", camel: "smtpSecure", snake: "smtp_secure" },
  { table: "email_config", camel: "smtpUsername", snake: "smtp_username" },
  { table: "email_config", camel: "smtpPassword", snake: "smtp_password" },
  { table: "email_config", camel: "sendgridApiKey", snake: "sendgrid_api_key" },
  { table: "email_config", camel: "mailgunDomain", snake: "mailgun_domain" },
  { table: "email_config", camel: "mailgunApiKey", snake: "mailgun_api_key" },
  { table: "email_config", camel: "createdAt", snake: "created_at" },
  { table: "email_config", camel: "updatedAt", snake: "updated_at" },

  // Password reset tokens
  { table: "password_reset_tokens", camel: "customerId", snake: "customer_id" },
  { table: "password_reset_tokens", camel: "expiresAt", snake: "expires_at" },
  { table: "password_reset_tokens", camel: "createdAt", snake: "created_at" },

  // Misc content tables
  { table: "gallery_images", camel: "galleryId", snake: "gallery_id" },
  { table: "gallery_images", camel: "imageUrl", snake: "image_url" },
  { table: "gallery_images", camel: "createdAt", snake: "created_at" },
  { table: "staff", camel: "imageUrl", snake: "image_url" },
  { table: "staff", camel: "createdAt", snake: "created_at" },
  { table: "staff", camel: "updatedAt", snake: "updated_at" },
  { table: "staff_roles", camel: "createdAt", snake: "created_at" },
  { table: "staff_roles", camel: "updatedAt", snake: "updated_at" },
  { table: "reviews", camel: "rejectionReason", snake: "rejection_reason" },
  { table: "reviews", camel: "approvedAt", snake: "approved_at" },
  { table: "reviews", camel: "createdAt", snake: "created_at" },
];

export const CRITICAL_SCHEMA_RULES: ColumnRule[] = [
  // Core auth + identity
  { table: "admins", camel: "passwordHash", snake: "password_hash" },
  { table: "admins", camel: "isActive", snake: "is_active" },
  { table: "customers", camel: "passwordHash", snake: "password_hash" },
  { table: "customers", camel: "isActive", snake: "is_active" },

  // Core product catalog
  { table: "products", camel: "imageUrl", snake: "image_url" },
  { table: "products", camel: "galleryId", snake: "gallery_id" },
  { table: "product_option_lists", camel: "productId", snake: "product_id" },
  { table: "product_option_lists", camel: "listOrder", snake: "list_order" },
  { table: "product_options", camel: "listId", snake: "list_id" },

  // Core commerce
  { table: "orders", camel: "orderNumber", snake: "order_number" },
  { table: "orders", camel: "orderData", snake: "order_data" },
  { table: "orders", camel: "updatedAt", snake: "updated_at" },

  // Core customer profile
  { table: "customer_addresses", camel: "customerId", snake: "customer_id" },
  {
    table: "customer_addresses",
    camel: "streetAddress",
    snake: "street_address",
  },
  { table: "customer_addresses", camel: "zipCode", snake: "zip_code" },

  // Core notifications
  { table: "email_config", camel: "fromEmail", snake: "from_email" },
  { table: "email_config", camel: "smtpHost", snake: "smtp_host" },
];

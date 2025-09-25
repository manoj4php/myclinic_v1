CREATE TABLE seo_configs (
  id SERIAL PRIMARY KEY,
  path VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255),
  description TEXT,
  canonical_url VARCHAR(512),
  og_title VARCHAR(255),
  og_description TEXT,
  og_image VARCHAR(512),
  og_url VARCHAR(512),
  twitter_card VARCHAR(50),
  twitter_creator VARCHAR(255),
  twitter_site VARCHAR(255),
  twitter_image VARCHAR(512),
  no_index BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Add required_quantity to bundles table
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS required_quantity INTEGER NOT NULL DEFAULT 3;

-- Drop quantity column from bundle_items (not needed anymore)
ALTER TABLE bundle_items DROP COLUMN IF EXISTS quantity;

-- Add comment
COMMENT ON COLUMN bundles.required_quantity IS 'Cantidad de productos que el cliente debe elegir del pool';

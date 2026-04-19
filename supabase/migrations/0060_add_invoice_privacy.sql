-- Migration to add privacy settings to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS is_client_name_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_client_address_public BOOLEAN DEFAULT false;

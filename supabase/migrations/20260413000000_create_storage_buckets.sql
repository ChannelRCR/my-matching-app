-- Create storage buckets if they don't exist
insert into storage.buckets (id, name, public)
values 
  ('kyc_documents', 'kyc_documents', false),
  ('chat_attachments', 'chat_attachments', true),
  ('invoice_evidences', 'invoice_evidences', false),
  ('agreements', 'agreements', false)
on conflict (id) do nothing;

-- Ensure RLS policies for our buckets
-- kyc_documents
create policy "Enable storage access for kyc_documents" 
on storage.objects for all 
using ( bucket_id = 'kyc_documents' ) 
with check ( bucket_id = 'kyc_documents' );

-- chat_attachments
create policy "Enable storage access for chat_attachments" 
on storage.objects for all 
using ( bucket_id = 'chat_attachments' ) 
with check ( bucket_id = 'chat_attachments' );

-- invoice_evidences
create policy "Enable storage access for invoice_evidences" 
on storage.objects for all 
using ( bucket_id = 'invoice_evidences' ) 
with check ( bucket_id = 'invoice_evidences' );

-- agreements
create policy "Enable storage access for agreements" 
on storage.objects for all 
using ( bucket_id = 'agreements' ) 
with check ( bucket_id = 'agreements' );

-- Create the 'documentos' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create RLS policy for public read access
CREATE POLICY "Public read access for documentos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documentos');

-- Create RLS policy for authenticated users to upload
CREATE POLICY "Authenticated users can upload to documentos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documentos' AND auth.role() = 'authenticated');

-- Create RLS policy for authenticated users to update their files
CREATE POLICY "Authenticated users can update in documentos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'documentos' AND auth.role() = 'authenticated');

-- Create RLS policy for authenticated users to delete their files
CREATE POLICY "Authenticated users can delete from documentos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'documentos' AND auth.role() = 'authenticated');
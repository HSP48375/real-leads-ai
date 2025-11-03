-- Create storage bucket for lead CSVs
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-csvs', 'lead-csvs', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for lead-csvs bucket
CREATE POLICY "Lead CSVs are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'lead-csvs');

CREATE POLICY "System can upload lead CSVs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'lead-csvs');
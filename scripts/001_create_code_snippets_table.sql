-- Create table for storing code snippets
CREATE TABLE IF NOT EXISTS public.code_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Untitled',
  code TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'javascript',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_code_snippets_created_at ON public.code_snippets(created_at DESC);

-- Enable RLS (though we'll allow public access for anonymous sharing)
ALTER TABLE public.code_snippets ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read code snippets (for sharing)
CREATE POLICY "Allow public read access to code snippets" 
ON public.code_snippets FOR SELECT 
USING (true);

-- Allow anyone to insert code snippets (for anonymous creation)
CREATE POLICY "Allow public insert access to code snippets" 
ON public.code_snippets FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update code snippets (for editing)
CREATE POLICY "Allow public update access to code snippets" 
ON public.code_snippets FOR UPDATE 
USING (true);

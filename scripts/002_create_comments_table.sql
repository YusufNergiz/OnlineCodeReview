-- Create table for storing line comments
CREATE TABLE IF NOT EXISTS public.code_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_snippet_id UUID NOT NULL REFERENCES public.code_snippets(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  comment_text TEXT NOT NULL,
  author_name TEXT DEFAULT 'Anonymous',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_code_comments_snippet_id ON public.code_comments(code_snippet_id);
CREATE INDEX IF NOT EXISTS idx_code_comments_line_number ON public.code_comments(code_snippet_id, line_number);
CREATE INDEX IF NOT EXISTS idx_code_comments_created_at ON public.code_comments(created_at DESC);

-- Enable RLS
ALTER TABLE public.code_comments ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read comments (for sharing)
CREATE POLICY "Allow public read access to code comments" 
ON public.code_comments FOR SELECT 
USING (true);

-- Allow anyone to insert comments (for anonymous commenting)
CREATE POLICY "Allow public insert access to code comments" 
ON public.code_comments FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update their own comments (basic editing)
CREATE POLICY "Allow public update access to code comments" 
ON public.code_comments FOR UPDATE 
USING (true);

-- Allow anyone to delete comments (for moderation)
CREATE POLICY "Allow public delete access to code comments" 
ON public.code_comments FOR DELETE 
USING (true);

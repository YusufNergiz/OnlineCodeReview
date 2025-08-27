-- Create table for storing code snippets
CREATE TABLE IF NOT EXISTS public.code_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Untitled',
  code TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'javascript',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_language CHECK (
    language IN (
      'javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 
      'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala',
      'json', 'yaml', 'markdown', 'bash', 'sql'
    )
  )
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

-- Create table for anonymous user sessions
CREATE TABLE IF NOT EXISTS public.anonymous_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_anonymous_users_session_id ON public.anonymous_users(session_id);

-- Enable RLS
ALTER TABLE public.anonymous_users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read and create anonymous users
CREATE POLICY "Allow public read access to anonymous users" 
ON public.anonymous_users FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to anonymous users" 
ON public.anonymous_users FOR INSERT 
WITH CHECK (true);

-- Create table for storing line comments
CREATE TABLE IF NOT EXISTS public.code_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_snippet_id UUID NOT NULL REFERENCES public.code_snippets(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  comment_text TEXT NOT NULL,
  author_name TEXT DEFAULT 'Anonymous',
  anonymous_user_id UUID REFERENCES public.anonymous_users(id),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'wontfix')),
  parent_comment_id UUID REFERENCES public.code_comments(id),
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_code_comments_snippet_id ON public.code_comments(code_snippet_id);
CREATE INDEX IF NOT EXISTS idx_code_comments_line_number ON public.code_comments(code_snippet_id, line_number);
CREATE INDEX IF NOT EXISTS idx_code_comments_created_at ON public.code_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_code_comments_user_id ON public.code_comments(anonymous_user_id);
CREATE INDEX IF NOT EXISTS idx_code_comments_parent_id ON public.code_comments(parent_comment_id);

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
USING (anonymous_user_id = auth.uid() OR anonymous_user_id IS NULL);

-- Allow anyone to delete their own comments (for moderation)
CREATE POLICY "Allow public delete access to code comments" 
ON public.code_comments FOR DELETE 
USING (anonymous_user_id = auth.uid() OR anonymous_user_id IS NULL);

-- Create function to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to update last_seen_at
CREATE OR REPLACE FUNCTION update_last_seen_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_code_snippets_updated_at ON public.code_snippets;
CREATE TRIGGER update_code_snippets_updated_at
    BEFORE UPDATE ON public.code_snippets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_code_comments_updated_at ON public.code_comments;
CREATE TRIGGER update_code_comments_updated_at
    BEFORE UPDATE ON public.code_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for last_seen_at
DROP TRIGGER IF EXISTS update_anonymous_users_last_seen_at ON public.anonymous_users;
CREATE TRIGGER update_anonymous_users_last_seen_at
    BEFORE UPDATE ON public.anonymous_users
    FOR EACH ROW
    EXECUTE FUNCTION update_last_seen_at_column();

-- Optional: Create function to clean up old code snippets (commented out by default)
-- CREATE OR REPLACE FUNCTION delete_old_code_snippets()
-- RETURNS void AS $$
-- BEGIN
--   DELETE FROM public.code_snippets
--   WHERE created_at < NOW() - INTERVAL '30 days'
--   AND NOT EXISTS (
--     SELECT 1 FROM public.code_comments
--     WHERE code_snippet_id = code_snippets.id
--     AND created_at > NOW() - INTERVAL '30 days'
--   );
-- END;
-- $$ LANGUAGE plpgsql;

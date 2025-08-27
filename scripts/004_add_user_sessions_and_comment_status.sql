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

-- Add anonymous_user_id to code_comments
ALTER TABLE public.code_comments 
ADD COLUMN IF NOT EXISTS anonymous_user_id UUID REFERENCES public.anonymous_users(id),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'wontfix'));

-- Create index for faster user comment lookups
CREATE INDEX IF NOT EXISTS idx_code_comments_user_id ON public.code_comments(anonymous_user_id);

-- Create function to update last_seen_at
CREATE OR REPLACE FUNCTION update_last_seen_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_seen_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for last_seen_at
DROP TRIGGER IF EXISTS update_anonymous_users_last_seen_at ON public.anonymous_users;
CREATE TRIGGER update_anonymous_users_last_seen_at
    BEFORE UPDATE ON public.anonymous_users
    FOR EACH ROW
    EXECUTE FUNCTION update_last_seen_at_column();

-- Add comment thread support
ALTER TABLE public.code_comments
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.code_comments(id),
ADD COLUMN IF NOT EXISTS is_resolved BOOLEAN DEFAULT FALSE;

-- Create index for faster thread lookups
CREATE INDEX IF NOT EXISTS idx_code_comments_parent_id ON public.code_comments(parent_comment_id);

-- Add language detection and validation
ALTER TABLE public.code_snippets
ADD CONSTRAINT valid_language CHECK (
  language IN (
    'javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 
    'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala'
  )
);

-- Add expiration policy for old code snippets (optional, commented out by default)
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

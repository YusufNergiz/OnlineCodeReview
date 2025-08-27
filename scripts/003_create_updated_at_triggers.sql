-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
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

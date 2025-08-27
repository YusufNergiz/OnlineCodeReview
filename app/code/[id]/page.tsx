import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CodeViewer } from "@/components/code-viewer";

interface CodePageProps {
  params: Promise<{ id: string }>;
}

export default async function CodePage({ params }: CodePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch the code snippet
  const { data: codeSnippet, error } = await supabase
    .from("code_snippets")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !codeSnippet) {
    notFound();
  }

  // Fetch comments for this code snippet
  const { data: comments, error: commentsError } = await supabase
    .from("code_comments")
    .select("*")
    .eq("code_snippet_id", id)
    .order("line_number", { ascending: true })
    .order("created_at", { ascending: true });

  if (commentsError) {
    console.error("Error fetching comments:", commentsError);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <CodeViewer codeSnippet={codeSnippet} comments={comments || []} />
      </div>
    </div>
  );
}

// Generate metadata for better sharing
export async function generateMetadata({ params }: CodePageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: codeSnippet } = await supabase
    .from("code_snippets")
    .select("title")
    .eq("id", id)
    .single();

  return {
    title: codeSnippet?.title
      ? `${codeSnippet.title} - CodeReview`
      : "Code Review",
    description: "Review and comment on shared JavaScript code",
  };
}

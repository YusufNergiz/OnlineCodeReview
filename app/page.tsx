"use client";

import { useState } from "react";
import { CodeEditor } from "@/components/code-editor";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleShare = async (title: string, code: string, language: string) => {
    if (isLoading) return;

    setIsLoading(true);
    toast.promise(
      (async () => {
        try {
          const { data, error } = await supabase
            .from("code_snippets")
            .insert({
              title,
              code,
              language,
            })
            .select()
            .single();

          if (error) throw error;

          // Redirect to the shared code view
          router.push(`/code/${data.id}`);
        } catch (error) {
          console.error("Error saving code:", error);
          throw new Error("Failed to save code. Please try again.");
        } finally {
          setIsLoading(false);
        }
      })(),
      {
        loading: "Creating shareable link...",
        success: "Code saved! Redirecting to review page...",
        error: (err) => err.message || "Failed to create link",
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-foreground">CodeReview</h1>
          <ThemeToggle />
        </div>

        <div className="text-center mb-8">
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Share your JavaScript code with your team for review. Paste your
            code, get a shareable link, and collaborate with line-by-line
            comments.
          </p>
        </div>

        <CodeEditor onSave={handleShare} />

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>No registration required • Anonymous sharing • Secure and fast</p>
        </div>
      </div>
    </div>
  );
}

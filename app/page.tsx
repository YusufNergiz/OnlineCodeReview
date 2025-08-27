"use client";

import { useState } from "react";
import { CodeEditor } from "@/components/code-editor";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSave = async (title: string, code: string, language: string) => {
    setIsLoading(true);
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
      // Could add toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    // For now, just save the code which will redirect to shareable link
    const titleElement = document.querySelector(
      'input[placeholder="Enter code title..."]'
    ) as HTMLInputElement;
    const textareaElement = document.querySelector(
      "textarea"
    ) as HTMLTextAreaElement;

    const languageElement = document.querySelector(
      'button[aria-expanded]'
    ) as HTMLButtonElement;

    if (titleElement && textareaElement && languageElement) {
      handleSave(
        titleElement.value || "Untitled Code Review",
        textareaElement.value,
        languageElement.textContent?.toLowerCase() || "javascript"
      );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            CodeReview
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Share your JavaScript code with your team for review. Paste your
            code, get a shareable link, and collaborate with line-by-line
            comments.
          </p>
        </div>

        <CodeEditor onSave={handleSave} onShare={handleShare} />

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>No registration required • Anonymous sharing • Secure and fast</p>
        </div>
      </div>
    </div>
  );
}

"use client";

import type React from "react";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  MessageSquare,
  Share2,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { InlineComment } from "@/components/inline-comment";
import { highlightCode } from "@/lib/syntax-highlight";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface CodeSnippet {
  id: string;
  title: string;
  code: string;
  language: string;
  created_at: string;
  updated_at: string;
}

interface Comment {
  id: string;
  code_snippet_id: string;
  line_number: number;
  comment_text: string;
  author_name: string;
  created_at: string;
  updated_at: string;
  anonymous_user_id?: string | null;
}

interface CodeViewerProps {
  codeSnippet: CodeSnippet;
  comments: Comment[];
}

export function CodeViewer({
  codeSnippet,
  comments: initialComments,
}: CodeViewerProps) {
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [comments, setComments] = useState(initialComments);
  const [commentHeights, setCommentHeights] = useState<Record<number, number>>(
    {}
  );
  const [commentsHidden, setCommentsHidden] = useState(false);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const supabase = createClient();

  // Ensure we preserve all whitespace and line breaks - memoized to prevent unnecessary re-renders
  const codeLines = useMemo(
    () => codeSnippet.code.replace(/\r\n/g, "\n").split("\n"),
    [codeSnippet.code]
  );

  // Simple text escaping for safe display (fallback when highlighting isn't ready)
  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  // Syntax highlighting for individual lines
  const [highlightedLines, setHighlightedLines] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Ensure we're on the client side before running syntax highlighting
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only run syntax highlighting on the client side
    if (!isClient) return;

    const highlightLines = async () => {
      try {
        // Use the cached highlighter from the existing syntax-highlight.ts
        const { getShikiHighlighter } = await import("@/lib/syntax-highlight");
        const highlighter = await getShikiHighlighter();

        const highlighted = codeLines.map((line) => {
          try {
            // Highlight each line individually
            const html = highlighter.codeToHtml(line, {
              lang: codeSnippet.language as any,
              theme: theme === "dark" ? "github-dark" : "github-light",
            });

            // Extract just the content from the HTML (remove pre/code tags)
            const content = html
              .replace(/<pre[^>]*>.*?<code[^>]*>/, "")
              .replace(/<\/code>.*?<\/pre>/, "");
            return content || line;
          } catch {
            // Fallback to plain text if highlighting fails
            return line;
          }
        });

        setHighlightedLines(highlighted);
      } catch (error) {
        console.error("Failed to load syntax highlighter:", error);
        // Fallback to plain text
        setHighlightedLines(codeLines);
      }
    };

    highlightLines();
  }, [isClient, codeSnippet.code, codeSnippet.language, theme]); // Added isClient to dependencies

  // Group comments by line number
  const commentsByLine = comments.reduce((acc, comment) => {
    if (!acc[comment.line_number]) {
      acc[comment.line_number] = [];
    }
    acc[comment.line_number].push(comment);
    return acc;
  }, {} as Record<number, Comment[]>);

  // Calculate how many empty line numbers we need for each comment section
  const calculateEmptyLines = (lineNumber: number) => {
    const lineComments = commentsByLine[lineNumber] || [];
    const isSelected = selectedLine === lineNumber;
    const commentHeight = commentHeights[lineNumber] || 0;

    if (lineComments.length > 0 || isSelected) {
      // Estimate lines based on comment height (assuming ~24px per line)
      const estimatedLines = Math.max(1, Math.floor(commentHeight / 24));
      return estimatedLines;
    }
    return 0;
  };

  const handleCopy = async () => {
    try {
      // Ensure we preserve all whitespace and formatting from the original code
      const formattedCode = codeSnippet.code.replace(/\r\n/g, "\n");
      await navigator.clipboard.writeText(formattedCode);
      toast.success("Code copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy code:", err);
      toast.error("Failed to copy code");
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!", {
        description: "Share this link with your team to get their review.",
      });
    } catch (err) {
      console.error("Failed to copy URL:", err);
      toast.error("Failed to copy link", {
        description: "Please try again or copy the URL manually.",
      });
    }
  };

  const handleLineClick = (lineNumber: number) => {
    setSelectedLine(selectedLine === lineNumber ? null : lineNumber);
  };

  const handleAddComment = async (
    lineNumber: number,
    text: string,
    authorName: string
  ) => {
    try {
      const { data: comment, error } = await supabase
        .from("code_comments")
        .insert({
          code_snippet_id: codeSnippet.id,
          line_number: lineNumber,
          comment_text: text,
          author_name: authorName,
        })
        .select()
        .single();

      if (error) throw error;

      setComments((prev) => [...prev, comment]);
      setSelectedLine(null);
      toast.success("Comment added successfully!");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
      throw error;
    }
  };

  // Callback to update comment heights for calculating empty line numbers
  const handleCommentHeightChange = useCallback(
    (lineNumber: number, height: number) => {
      setCommentHeights((prev) => ({
        ...prev,
        [lineNumber]: height,
      }));
    },
    []
  );

  // Sync scroll between line numbers and code
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (lineNumbersRef.current && codeRef.current) {
      const scrollTop = e.currentTarget.scrollTop;
      if (e.currentTarget === codeRef.current) {
        lineNumbersRef.current.scrollTop = scrollTop;
      } else {
        codeRef.current.scrollTop = scrollTop;
      }
    }
  };

  // Generate line numbers with empty spaces for comments
  const generateLineNumbers = () => {
    const lineNumbers = [];
    let currentLineNumber = 1;

    for (let i = 0; i < codeLines.length; i++) {
      const lineNumber = i + 1;
      const hasComments = commentsByLine[lineNumber]?.length > 0;
      const isSelected = selectedLine === lineNumber;

      // Add the actual line number
      lineNumbers.push(
        <div
          key={`line-${lineNumber}`}
          className={`text-right min-w-[3rem] cursor-pointer hover:bg-muted/70 px-2 py-0 rounded transition-colors ${
            hasComments && !commentsHidden
              ? "bg-blue-500/20 text-blue-600 font-semibold"
              : ""
          } ${isSelected && !commentsHidden ? "bg-blue-500/30" : ""}`}
          onClick={() => handleLineClick(lineNumber)}
        >
          {lineNumber}
          {hasComments && !commentsHidden && (
            <span className="ml-1 text-blue-500">●</span>
          )}
        </div>
      );

      // Add empty line numbers for comment space
      if ((hasComments || isSelected) && !commentsHidden) {
        const emptyLines = calculateEmptyLines(lineNumber);
        for (let j = 0; j < emptyLines + 1; j++) {
          // One extra line to ensure the code line and line number are in the same line
          lineNumbers.push(
            <div
              key={`empty-${lineNumber}-${j}`}
              className="min-h-[24px] px-2 py-0"
            />
          );
        }
      }
    }

    return lineNumbers;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">New Review</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {codeSnippet.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Created {formatDistanceToNow(new Date(codeSnippet.created_at))}{" "}
              ago
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCommentsHidden(!commentsHidden)}
            className="flex-1 sm:flex-none"
          >
            {commentsHidden ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Show Comments</span>
                <span className="sm:hidden">Show</span>
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Hide Comments</span>
                <span className="sm:hidden">Hide</span>
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy} className="flex-1 sm:flex-none">
            <Copy className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Copy Code</span>
            <span className="sm:hidden">Copy</span>
          </Button>
          <Button size="sm" onClick={handleShare} className="flex-1 sm:flex-none">
            <Share2 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Copy Link</span>
            <span className="sm:hidden">Share</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => theme === "dark" ? setTheme("light") : setTheme("dark")}
            className="flex-1 sm:flex-none"
          >
            {theme === "dark" ? "🌞" : "🌙"}
          </Button>
        </div>
      </div>

      {/* Code Display */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <Badge variant="secondary">{codeSnippet.language}</Badge>
            <div className="text-sm text-muted-foreground">
              {codeLines.length} lines • {codeSnippet.code.length} characters
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative border rounded-lg overflow-hidden bg-muted/30">
            <div
              className="flex overflow-hidden"
              style={{
                minHeight: "600px",
              }}
            >
              {/* Line numbers - hidden on mobile for better space usage */}
              <div
                ref={lineNumbersRef}
                className="hidden sm:block flex-shrink-0 bg-muted/50 text-muted-foreground text-sm font-mono leading-6 px-3 py-4 select-none overflow-y-auto"
                onScroll={handleScroll}
              >
                {generateLineNumbers()}
              </div>

              {/* Code content */}
              <div ref={codeRef} className="flex-1 overflow-y-auto sm:overflow-visible" onScroll={handleScroll}>
                <div className="p-4 text-sm font-mono leading-6 text-foreground [&_pre]:!bg-transparent">
                  {codeLines.map((line, index) => {
                    const lineNumber = index + 1;
                    const lineComments = commentsByLine[lineNumber] || [];
                    const isSelected = selectedLine === lineNumber;

                    return (
                      <div key={lineNumber}>
                        {/* Code line */}
                        <div
                          className={`cursor-pointer hover:bg-muted/50 px-2 py-0 rounded transition-colors ${
                            lineComments.length > 0 && !commentsHidden
                              ? "bg-blue-500/10"
                              : ""
                          } ${
                            isSelected && !commentsHidden
                              ? "bg-blue-500/20"
                              : ""
                          }`}
                          onClick={() => handleLineClick(lineNumber)}
                        >
                          <div
                            className="whitespace-pre"
                            style={{
                              minHeight: "24px",
                              display: "flex",
                              alignItems: "center",
                            }}
                            dangerouslySetInnerHTML={{
                              __html:
                                isClient && highlightedLines[index]
                                  ? highlightedLines[index]
                                  : escapeHtml(line) || "\u00A0",
                            }}
                          />
                        </div>

                        {/* Inline comments */}
                        {(lineComments.length > 0 || isSelected) &&
                          !commentsHidden && (
                            <InlineComment
                              comments={lineComments}
                              onAddComment={async (text, authorName) => {
                                await handleAddComment(
                                  lineNumber,
                                  text,
                                  authorName
                                );
                              }}
                              onCancel={() => setSelectedLine(null)}
                              isNew={isSelected}
                              onHeightChange={(height) =>
                                handleCommentHeightChange(lineNumber, height)
                              }
                            />
                          )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

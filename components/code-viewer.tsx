"use client";

import type React from "react";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, MessageSquare, Share2, ArrowLeft, Eye, EyeOff } from "lucide-react";
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
  const [highlightedCode, setHighlightedCode] = useState("");
  const [commentHeights, setCommentHeights] = useState<Record<number, number>>(
    {}
  );
  const [commentsHidden, setCommentsHidden] = useState(false);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const supabase = createClient();

  // Ensure we preserve all whitespace and line breaks
  const codeLines = codeSnippet.code.replace(/\r\n/g, '\n').split("\n");

  // Apply syntax highlighting
  useEffect(() => {
    const highlight = async () => {
      const html = await highlightCode({
        code: codeSnippet.code,
        lang: codeSnippet.language as any,
        theme: theme === "dark" ? "github-dark" : "github-light",
        lineNumbers: false,
      });
      setHighlightedCode(html);
    };
    highlight();
  }, [codeSnippet.code, codeSnippet.language, theme]);

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
      const formattedCode = codeSnippet.code.replace(/\r\n/g, '\n');
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
            hasComments && !commentsHidden ? "bg-blue-500/20 text-blue-600 font-semibold" : ""
          } ${isSelected && !commentsHidden ? "bg-blue-500/30" : ""}`}
          onClick={() => handleLineClick(lineNumber)}
        >
          {lineNumber}
          {hasComments && !commentsHidden && <span className="ml-1 text-blue-500">●</span>}
        </div>
      );

      // Add empty line numbers for comment space
      if ((hasComments || isSelected) && !commentsHidden) {
        const emptyLines = calculateEmptyLines(lineNumber);
        for (let j = 0; j < emptyLines; j++) {
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
    <div className="w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              New Review
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {codeSnippet.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              Created {formatDistanceToNow(new Date(codeSnippet.created_at))}{" "}
              ago
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCommentsHidden(!commentsHidden)}
          >
            {commentsHidden ? (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Show Comments
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Hide Comments
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Code
          </Button>
          <Button size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
        </div>
      </div>

      {/* Code Display */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{codeSnippet.language}</Badge>
            <div className="text-sm text-muted-foreground">
              {codeLines.length} lines • {codeSnippet.code.length} characters
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative border rounded-lg overflow-hidden bg-muted/30">
            <div className="flex max-h-[600px] overflow-hidden">
              {/* Line numbers */}
              <div
                ref={lineNumbersRef}
                className="flex-shrink-0 bg-muted/50 text-muted-foreground text-sm font-mono leading-6 px-3 py-4 select-none overflow-y-auto"
                onScroll={handleScroll}
              >
                {generateLineNumbers()}
              </div>

              {/* Code content */}
              <div
                ref={codeRef}
                className="flex-1 overflow-y-auto"
                onScroll={handleScroll}
              >
                <div className="p-4 text-sm font-mono leading-6 text-foreground [&_pre]:!bg-transparent whitespace-pre">
                  {codeLines.map((line, index) => {
                    const lineNumber = index + 1;
                    const lineComments = commentsByLine[lineNumber] || [];
                    const isSelected = selectedLine === lineNumber;

                    return (
                      <div key={lineNumber}>
                        {/* Code line */}
                        <div
                          className={`cursor-pointer hover:bg-muted/50 px-2 py-0 rounded transition-colors ${
                            lineComments.length > 0 && !commentsHidden ? "bg-blue-500/10" : ""
                          } ${isSelected && !commentsHidden ? "bg-blue-500/20" : ""}`}
                          onClick={() => handleLineClick(lineNumber)}
                        >
                          <div
                            className="shiki-line whitespace-pre"
                            dangerouslySetInnerHTML={{
                              __html:
                                highlightedCode.split("\n")[index] || "&nbsp;",
                            }}
                          />
                        </div>

                        {/* Inline comments */}
                        {(lineComments.length > 0 || isSelected) && !commentsHidden && (
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

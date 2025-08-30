"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { User, Send, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

interface InlineCommentProps {
  comments: Comment[];
  onAddComment: (text: string, authorName: string) => Promise<void>;
  onCancel: () => void;
  isNew?: boolean;
  onHeightChange?: (height: number) => void;
}

export function InlineComment({
  comments,
  onAddComment,
  onCancel,
  isNew = false,
  onHeightChange,
}: InlineCommentProps) {
  const [newComment, setNewComment] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentRef = useRef<HTMLDivElement>(null);

  // Track height changes and report to parent
  useEffect(() => {
    const measureHeight = () => {
      if (commentRef.current && onHeightChange) {
        const height = commentRef.current.offsetHeight;
        onHeightChange(height);
      }
    };

    // Use a small delay to ensure DOM has updated
    const timeoutId = setTimeout(measureHeight, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [comments.length, isNew, newComment.length, authorName.length]);

  // Set up ResizeObserver separately to avoid dependency issues
  useEffect(() => {
    if (!commentRef.current || !onHeightChange) return;

    const resizeObserver = new ResizeObserver(() => {
      if (commentRef.current && onHeightChange) {
        const height = commentRef.current.offsetHeight;
        onHeightChange(height);
      }
    });

    resizeObserver.observe(commentRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []); // Empty dependency array - only set up once

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddComment(newComment.trim(), authorName.trim() || "Anonymous");
      setNewComment("");
      setAuthorName("");
    } catch (error) {
      console.error("Error adding comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      ref={commentRef}
      className="pl-12 border-l-2 border-blue-500/20 bg-blue-500/5 py-3 mt-2 mb-4"
    >
      {/* Existing comments */}
      {comments.map((comment) => (
        <div key={comment.id} className="mb-4 last:mb-0 pl-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{comment.author_name}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at))} ago
            </span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none pl-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {comment.comment_text}
            </ReactMarkdown>
          </div>
        </div>
      ))}

      {/* New comment form */}
      {isNew && (
        <div className="pl-4 space-y-3">
          <Input
            placeholder="Your name (optional)"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="text-sm max-w-md"
          />
          <Textarea
            placeholder="Write your comment or question about this line... (Markdown supported)"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[100px] text-sm"
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!newComment.trim() || isSubmitting}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? "Adding..." : "Add Comment"}
            </Button>
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

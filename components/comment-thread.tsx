"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Send, User, Edit2, Trash2, Check, X } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { getOrCreateSession } from "@/lib/session"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Comment {
  id: string
  code_snippet_id: string
  line_number: number
  comment_text: string
  author_name: string
  created_at: string
  updated_at: string
  anonymous_user_id?: string | null
}

interface CommentThreadProps {
  codeSnippetId: string
  selectedLine: number | null
  commentsByLine: Record<number, Comment[]>
  onLineSelect: (line: number | null) => void
}

export function CommentThread({ codeSnippetId, selectedLine, commentsByLine, onLineSelect }: CommentThreadProps) {
  const [newComment, setNewComment] = useState("")
  const [authorName, setAuthorName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [comments, setComments] = useState(commentsByLine)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editedContent, setEditedContent] = useState("")
  const [anonymousUserId, setAnonymousUserId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const initSession = async () => {
      const userId = await getOrCreateSession();
      setAnonymousUserId(userId);
    };
    initSession();
  }, []);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !selectedLine) return

    setIsSubmitting(true)
    try {
      const { data, error } = await supabase
        .from("code_comments")
        .insert({
          code_snippet_id: codeSnippetId,
          line_number: selectedLine,
          comment_text: newComment.trim(),
          author_name: authorName.trim() || "Anonymous",
          anonymous_user_id: anonymousUserId,
        })
        .select()
        .single()

      if (error) throw error

      // Update local state
      const updatedComments = { ...comments }
      if (!updatedComments[selectedLine]) {
        updatedComments[selectedLine] = []
      }
      updatedComments[selectedLine].push(data)
      setComments(updatedComments)

      // Clear form
      setNewComment("")
      setAuthorName("")
    } catch (error) {
      console.error("Error adding comment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditComment = async (commentId: string) => {
    if (!editedContent.trim()) return

    try {
      const { error } = await supabase
        .from("code_comments")
        .update({
          comment_text: editedContent.trim(),
        })
        .eq("id", commentId)

      if (error) throw error

      // Update local state
      const updatedComments = { ...comments }
      Object.keys(updatedComments).forEach((lineNumber) => {
        updatedComments[Number(lineNumber)] = updatedComments[Number(lineNumber)].map((comment) =>
          comment.id === commentId
            ? { ...comment, comment_text: editedContent.trim() }
            : comment
        )
      })
      setComments(updatedComments)

      // Clear edit state
      setEditingComment(null)
      setEditedContent("")
    } catch (error) {
      console.error("Error updating comment:", error)
    }
  }

  const handleDeleteComment = async (commentId: string, lineNumber: number) => {
    try {
      const { error } = await supabase
        .from("code_comments")
        .delete()
        .eq("id", commentId)

      if (error) throw error

      // Update local state
      const updatedComments = { ...comments }
      updatedComments[lineNumber] = updatedComments[lineNumber].filter(
        (comment) => comment.id !== commentId
      )
      if (updatedComments[lineNumber].length === 0) {
        delete updatedComments[lineNumber]
      }
      setComments(updatedComments)
    } catch (error) {
      console.error("Error deleting comment:", error)
    }
  }

  const startEditing = (comment: Comment) => {
    setEditingComment(comment.id)
    setEditedContent(comment.comment_text)
  }

  const allComments = Object.entries(comments)
    .flatMap(([lineNumber, lineComments]) =>
      lineComments.map((comment) => ({
        ...comment,
        line_number: Number(lineNumber),
      }))
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Comments ({allComments.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new comment form */}
          {selectedLine && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/30">
              <div className="flex items-center gap-2">
                <Badge>{`Line ${selectedLine}`}</Badge>
                <span className="text-sm text-muted-foreground">Add a comment</span>
              </div>

              <Input
                placeholder="Your name (optional)"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="text-sm"
              />

              <Textarea
                placeholder="Write your comment or question about this line... (Markdown supported)"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] text-sm"
              />

              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSubmitComment} disabled={!newComment.trim() || isSubmitting}>
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Adding..." : "Add Comment"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => onLineSelect(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Instruction when no line selected */}
          {!selectedLine && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Click on a line number to add a comment</p>
            </div>
          )}

          {/* Comments list */}
          {allComments.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">All Comments</h3>
              {allComments.map((comment) => (
                <Card key={comment.id} className="bg-muted/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge>{`Line ${comment.line_number}`}</Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {comment.author_name}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at))} ago
                      </span>
                    </div>
                    {editingComment === comment.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="min-h-[80px] text-sm"
                          placeholder="Edit your comment... (Markdown supported)"
                        />
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleEditComment(comment.id)}
                            className="h-7"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingComment(null)
                              setEditedContent("")
                            }}
                            className="h-7"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {comment.comment_text}
                          </ReactMarkdown>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => onLineSelect(comment.line_number)}
                          >
                            Go to line
                          </Button>
                          {comment.anonymous_user_id === anonymousUserId && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => startEditing(comment)}
                              >
                                <Edit2 className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this comment? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteComment(comment.id, comment.line_number)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Empty state */}
          {allComments.length === 0 && !selectedLine && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-2">No comments yet</p>
              <p className="text-xs">Be the first to review this code!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments by line */}
      {Object.keys(comments).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comments by Line</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(comments)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([lineNumber, lineComments]) => (
                <div key={lineNumber} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      className="cursor-pointer"
                      onClick={() => onLineSelect(Number(lineNumber))}
                    >
                      Line {lineNumber}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {lineComments.length} comment{lineComments.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="space-y-2 ml-4">
                    {lineComments.map((comment) => (
                      <div key={comment.id} className="bg-muted/20 p-3 rounded text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-3 w-3" />
                          <span className="font-medium text-xs">{comment.author_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at))} ago
                          </span>
                        </div>
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {comment.comment_text}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
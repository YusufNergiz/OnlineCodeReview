"use client";

import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Copy, Save, Share2, Code2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSupportedLanguages } from "@/lib/syntax-highlight";
import { useTheme } from "next-themes";
import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  initialCode?: string;
  initialTitle?: string;
  initialLanguage?: string;
  onSave?: (title: string, code: string, language: string) => void;
  readOnly?: boolean;
}

const DEFAULT_CODE = `// Welcome to CodeReview!
// Paste your code here and share it with your team

function example() {
  console.log('Hello, World!');
  return 'Ready for review!';
}

example();`;

export function CodeEditor({
  initialCode = DEFAULT_CODE,
  initialTitle = "Untitled Code Review",
  initialLanguage = "javascript",
  onSave,
  readOnly = false,
}: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [title, setTitle] = useState(initialTitle);
  const [language, setLanguage] = useState(initialLanguage);
  const [isMobile, setIsMobile] = useState(false);
  const { theme } = useTheme();
  const supportedLanguages = getSupportedLanguages();

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSave = () => {
    if (onSave) {
      // Get the code directly from Monaco Editor to preserve formatting
      const model = (window as any).monaco?.editor?.getModels()[0];
      // Ensure we preserve all whitespace
      const formattedCode = model
        ? model.getValue().replace(/\n/g, "\n")
        : code;
      onSave(title, formattedCode, language);
    }
  };

  const handleCopy = async () => {
    try {
      // Get the code directly from Monaco Editor to preserve formatting
      const model = (window as any).monaco?.editor?.getModels()[0];
      const formattedCode = model ? model.getValue() : code;
      await navigator.clipboard.writeText(formattedCode);
      // Could add toast notification here
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value);
    }
  };

  return (
    <Card className="w-full max-w-6xl mx-auto px-4 sm:px-6">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 w-full">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold bg-transparent border-none px-0 focus-visible:ring-0"
              placeholder="Enter code title..."
              readOnly={readOnly}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <Code2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {supportedLanguages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleCopy} className="flex-1 sm:flex-none">
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
            <Button size="sm" onClick={handleSave} className="flex-1 sm:flex-none">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative border rounded-lg overflow-hidden bg-muted/30">
          <Editor
            height={isMobile ? "300px" : "400px"}
            defaultLanguage={language}
            language={language}
            value={code}
            theme={theme === "dark" ? "vs-dark" : "light"}
            onChange={handleEditorChange}
            options={{
              readOnly,
              minimap: { enabled: !isMobile }, // Disable minimap on mobile
              fontSize: isMobile ? 16 : 14, // Larger font on mobile
              lineNumbers: "on",
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: "on",
              lineNumbersMinChars: isMobile ? 2 : 3, // Fewer chars on mobile
              scrollbar: {
                vertical: "visible",
                horizontal: "visible",
                useShadows: false,
                verticalScrollbarSize: isMobile ? 16 : 10, // Larger scrollbar on mobile
                horizontalScrollbarSize: isMobile ? 16 : 10,
              },
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false,
              padding: { top: 10, bottom: 10 },
            }}
          />
        </div>

        {/* Code stats */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-2 text-sm text-muted-foreground bg-muted/30 border-t">
          <div className="text-center sm:text-left">
            Lines: {code.split("\n").length} | Characters: {code.length}
          </div>
          <div className="text-center sm:text-right">{language.charAt(0).toUpperCase() + language.slice(1)}</div>
        </div>
      </CardContent>
    </Card>
  );
}

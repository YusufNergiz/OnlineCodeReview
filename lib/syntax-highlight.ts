import * as shiki from 'shiki';
import { cache } from 'react';

type Lang = keyof typeof shiki.bundledLanguages;

// Cache the highlighter instance
export const getShikiHighlighter = cache(async () => {
  const highlighter = await shiki.createHighlighter({
    themes: ['github-dark', 'github-light'],
    langs: [
      'javascript',
      'typescript',
      'jsx',
      'tsx',
      'html',
      'css',
      'scss',
      'less',
      'python',
      'java',
      'cpp',
      'csharp',
      'go',
      'rust',
      'ruby',
      'php',
      'swift',
      'kotlin',
      'scala',
      'json',
      'yaml',
      'markdown',
      'bash',
      'sql',
    ],
  });
  return highlighter;
});

export interface HighlightOptions {
  code: string;
  lang: Lang;
  theme?: 'github-dark' | 'github-light';
  lineNumbers?: boolean;
}

export async function highlightCode({
  code,
  lang,
  theme = 'github-dark',
  lineNumbers = true,
}: HighlightOptions): Promise<string> {
  const highlighter = await getShikiHighlighter();
  
  // Ensure we preserve whitespace in the code
  const preservedCode = code.replace(/\r\n/g, '\n');
  
  return highlighter.codeToHtml(preservedCode, {
    lang,
    theme,
    transformers: [{
      pre(node) {
        node.properties.class = 'shiki whitespace-pre';
        node.properties.style = 'background: transparent';
        return node;
      },
      code(node) {
        node.properties.class = 'whitespace-pre';
        return node;
      },
      line(node) {
        node.properties.class = 'whitespace-pre';
        return node;
      }
    }]
  });
}

// Helper to get supported languages
export function getSupportedLanguages(): Lang[] {
  return [
    'javascript',
    'typescript',
    'jsx',
    'tsx',
    'html',
    'css',
    'scss',
    'less',
    'python',
    'java',
    'cpp',
    'csharp',
    'go',
    'rust',
    'ruby',
    'php',
    'swift',
    'kotlin',
    'scala',
    'json',
    'yaml',
    'markdown',
    'bash',
    'sql',
  ] as Lang[];
}
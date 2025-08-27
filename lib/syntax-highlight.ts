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
  const html = await highlighter.codeToHtml(code, {
    lang,
    theme,
  });

  if (!lineNumbers) {
    return html;
  }

  // Add line numbers to the HTML
  const lines = html.split('\n');
  const lineNumbersHtml = lines.map((line, i) => {
    if (line.includes('<pre') || line.includes('</pre>')) {
      return line;
    }
    return line.replace(
      '<span class="line">',
      `<span class="line" data-line="${i + 1}">`
    );
  });

  return lineNumbersHtml.join('\n');
}

// Helper to get supported languages
export function getSupportedLanguages(): Lang[] {
  return [
    'javascript',
    'typescript',
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
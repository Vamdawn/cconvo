/**
 * Translates the latest CHANGELOG.md section to Chinese.
 * Invoked by release-it hook: after:@release-it/conventional-changelog:beforeRelease
 *
 * Environment variables:
 *   LLM_API_KEY  - API key for OpenAI-compatible endpoint
 *   LLM_API_URL  - API base URL (default: https://api.openai.com/v1)
 *   LLM_MODEL    - Model name (default: gpt-4o-mini)
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const CHANGELOG_EN = 'CHANGELOG.md';
const CHANGELOG_ZH = 'CHANGELOG.zh-CN.md';

const SECTION_MAP: Record<string, string> = {
  '✨ Features': '✨ 新功能',
  '🐛 Bug Fixes': '🐛 问题修复',
  '⚡ Performance': '⚡ 性能优化',
  '♻️ Refactoring': '♻️ 重构',
  '📝 Documentation': '📝 文档',
  '💄 Styles': '💄 样式',
  '🔧 Chores': '🔧 杂项',
  '✅ Tests': '✅ 测试',
  '🔄 CI': '🔄 持续集成',
  '⏪ Reverts': '⏪ 回退',
};

export function extractLatestSection(content: string): string | null {
  // Split on version headings, return the first one
  const sections = content.split(/\n(?=## \[\d+\.\d+\.\d+\])/);
  const first = sections.find(s => s.startsWith('## ['));
  return first ? first.trim() : null;
}

export function replaceSectionHeaders(text: string): string {
  let result = text;
  for (const [en, zh] of Object.entries(SECTION_MAP)) {
    result = result.replaceAll(`### ${en}`, `### ${zh}`);
  }
  return result;
}

async function translateWithLLM(text: string): Promise<string | null> {
  const apiKey = process.env.LLM_API_KEY;
  const apiUrl = process.env.LLM_API_URL || 'https://api.openai.com/v1';
  const model = process.env.LLM_MODEL || 'gpt-4o-mini';

  if (!apiKey) {
    console.log('[translate-changelog] LLM_API_KEY not set, using fallback');
    return null;
  }

  const prompt = `Translate the following changelog section from English to Chinese.
Rules:
- Translate commit descriptions to natural, concise Chinese
- Keep ALL markdown formatting, links, commit hashes, version numbers unchanged
- Keep emoji prefixes unchanged
- Do NOT translate code identifiers, file paths, or technical terms that are better kept in English
- Output ONLY the translated markdown, no explanations

${text}`;

  try {
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error(`[translate-changelog] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error(`[translate-changelog] API call failed:`, error);
    return null;
  }
}

function fallbackTranslate(section: string): string {
  // Replace section headers with Chinese equivalents, keep commit messages in English
  let result = replaceSectionHeaders(section);
  // Add a pending marker at the top
  const lines = result.split('\n');
  lines.splice(1, 0, '', '> [Translation pending] 此版本的详细翻译待补充');
  return lines.join('\n');
}

async function main() {
  console.log('[translate-changelog] Reading CHANGELOG.md...');

  const enContent = readFileSync(CHANGELOG_EN, 'utf-8');
  const latestSection = extractLatestSection(enContent);

  if (!latestSection) {
    console.log('[translate-changelog] No version section found, skipping');
    return;
  }

  console.log(`[translate-changelog] Found section: ${latestSection.split('\n')[0]}`);

  // Try AI translation, fall back to header-only translation
  let translatedSection = await translateWithLLM(latestSection);
  if (!translatedSection) {
    console.log('[translate-changelog] Using fallback translation (headers only)');
    translatedSection = fallbackTranslate(latestSection);
  } else {
    // Ensure section headers are correctly translated even if LLM missed some
    translatedSection = replaceSectionHeaders(translatedSection);
  }

  // Read or create zh-CN changelog
  const zhHeader = '# Changelog';

  let zhContent: string;
  if (existsSync(CHANGELOG_ZH)) {
    zhContent = readFileSync(CHANGELOG_ZH, 'utf-8');
    // Remove old header lines (up to first ## section)
    const firstSectionIdx = zhContent.indexOf('\n## [');
    if (firstSectionIdx !== -1) {
      const existingSections = zhContent.substring(firstSectionIdx);
      zhContent = `${zhHeader}\n${translatedSection}\n${existingSections}`;
    } else {
      zhContent = `${zhHeader}\n\n${translatedSection}\n`;
    }
  } else {
    zhContent = `${zhHeader}\n\n${translatedSection}\n`;
  }

  writeFileSync(CHANGELOG_ZH, zhContent, 'utf-8');
  console.log(`[translate-changelog] Updated ${CHANGELOG_ZH}`);
}

// Only run main() when executed directly (not when imported for testing)
const isDirectRun = process.argv[1]?.endsWith('translate-changelog.ts');
if (isDirectRun) {
  main().catch((error) => {
    console.error('[translate-changelog] Fatal error:', error);
    // Don't exit with error code — translation failure should not block release
    process.exit(0);
  });
}

import { promises as fs } from 'node:fs';
import path from 'node:path';

export function geminiSkillsConfigured(): boolean {
  const configured = String(process.env.GEMINI_SKILLS_ROOT ?? '').trim();
  return Boolean(configured);
}

export type GeminiSkill = {
  name: string;
  description: string;
  path: string;
};

function root(): string {
  const value = String(process.env.GEMINI_SKILLS_ROOT ?? '').trim();
  if (!value) throw new Error('GEMINI_SKILLS_ROOT_NOT_CONFIGURED');
  return value;
}

function frontMatter(content: string, field: string): string {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*/);
  if (!match) return '';
  const line = match[1].split('\n').find(value => value.trimStart().startsWith(`${field}:`));
  if (!line) return '';
  return line.slice(line.indexOf(':') + 1).trim().replace(/^["']|["']$/g, '');
}

async function walk(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const output: string[] = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(full));
    else if (entry.isFile() && entry.name === 'SKILL.md') output.push(full);
  }
  return output;
}

export async function listGeminiSkills(): Promise<GeminiSkill[]> {
  const files = await walk(root());
  const skills: GeminiSkill[] = [];
  for (const file of files.sort()) {
    const content = await fs.readFile(file, 'utf8');
    const name = frontMatter(content, 'name') || path.basename(path.dirname(file));
    const description = frontMatter(content, 'description');
    skills.push({ name, description, path: file });
  }
  return skills;
}

export async function describeGeminiSkill(name: string): Promise<GeminiSkill & { instructions: string }> {
  const requested = String(name ?? '').trim();
  if (!requested) throw new Error('GEMINI_SKILL_NAME_REQUIRED');
  const candidates = await listGeminiSkills();
  const selected = candidates.find(skill => skill.name === requested);
  if (!selected) throw new Error(`GEMINI_SKILL_NOT_FOUND:${requested}`);
  const instructions = await fs.readFile(selected.path, 'utf8');
  return { ...selected, instructions };
}

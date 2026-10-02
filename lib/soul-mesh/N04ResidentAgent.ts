export const N04_RESIDENT_AGENT = {
  id: 'N04.resident',
  name: 'Agent-Tools Steward',
  nucleus: 'N04',
  version: '1.0.0',
  role: 'tools-documents-artifacts-execution',
  executionMode: 'embedded-local-worker',
  lifecycle: 'BOUND',
  repositoryWrite: false,
  superpowers: {
    revision: '8ca22dba9a94f28898bbce59f2537ff4d87c747d',
    mode: 'development-methodology-and-skill-pack',
    runtimePolicyEngine: false,
  },
  skills: ['writing-plans','executing-plans','test-driven-development','verification-before-completion'],
  publishedCapabilities: ['mesh.health','mesh.discovery','mesh.resident.describe@1.0.0','tool.run','document.create','document.edit','artifact.analyze','workflow.execute'],
  authority: 'N04 owns tool/document/artifact execution; external tool frameworks remain adapters.',
  evidence: 'soul-evidence/1',
} as const;

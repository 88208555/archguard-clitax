#!/usr/bin/env node
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dispatchOfficialSkillCli, runIntakeHandshake } from './installer.mjs'

const INTAKE_QUESTIONS = [
  {
    id: 'project',
    prompt: 'Which project must ArchGuard protect?',
    required: true,
    example: 'CLI.Tax web and server workspace',
  },
  {
    id: 'templateId',
    prompt: 'Which stack template matches this project?',
    required: true,
    example: 'react-ts-vite',
  },
  {
    id: 'strictStandard',
    prompt: 'Should standard-level findings block writes? yes or no.',
    required: true,
    example: 'no',
  },
]

await dispatchOfficialSkillCli({
  packageRoot: dirname(fileURLToPath(import.meta.url)),
  runCommand: (context) => runIntakeHandshake(context, {
    questions: INTAKE_QUESTIONS,
    outputFile: 'ARCHGUARD-REQUIREMENTS.json',
    afterCapabilities(output) {
      const instruction = output.nextStep?.instruction
      if (typeof instruction === 'string' && instruction.trim()) console.log(instruction)
    },
  }),
})

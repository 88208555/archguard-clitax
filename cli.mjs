#!/usr/bin/env node
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dispatchOfficialSkillCli, runIntakeHandshake } from './installer.mjs'
import {
  checkpointFileAndRollback,
  createBlockSnapshot,
  initializeCheckpointLedger,
} from './archguard-local-runner.mjs'

const LOCAL_COMMANDS = new Set(['ledger-init', 'snapshot', 'checkpoint'])

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

function requiredArgument(args, index, name) {
  const value = args[index]?.trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function runLocalCommand(command, args) {
  if (command === 'ledger-init') {
    return initializeCheckpointLedger({
      repositoryRoot: requiredArgument(args, 0, 'repositoryRoot'),
      ledgerPath: requiredArgument(args, 1, 'ledgerPath'),
    })
  }
  if (command === 'snapshot') {
    return createBlockSnapshot({
      repositoryRoot: requiredArgument(args, 0, 'repositoryRoot'),
      targetPath: requiredArgument(args, 1, 'targetPath'),
      snapshotPath: requiredArgument(args, 2, 'snapshotPath'),
    })
  }
  return checkpointFileAndRollback({
    repositoryRoot: requiredArgument(args, 0, 'repositoryRoot'),
    contractPath: requiredArgument(args, 1, 'contractPath'),
    targetPath: requiredArgument(args, 2, 'targetPath'),
    snapshotPath: requiredArgument(args, 3, 'snapshotPath'),
    ledgerPath: requiredArgument(args, 4, 'ledgerPath'),
    blockId: requiredArgument(args, 5, 'blockId'),
    chainId: requiredArgument(args, 6, 'chainId'),
    gatePassPath: requiredArgument(args, 7, 'gatePassPath'),
  })
}

function localCommandExitCode(command, result) {
  if (command !== 'checkpoint') return 0
  return result?.status === 'succeeded'
    && result?.output?.checkpoint?.writeAllowed === true ? 0 : 2
}

const command = process.argv[2] ?? 'help'
if (LOCAL_COMMANDS.has(command)) {
  try {
    const result = await runLocalCommand(command, process.argv.slice(3))
    console.log(JSON.stringify(result))
    process.exitCode = localCommandExitCode(command, result)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
} else {
  await dispatchOfficialSkillCli({
    packageRoot: dirname(fileURLToPath(import.meta.url)),
    extraUsageLines: [
      'Local trusted execution:',
      '  cli-archguard ledger-init <repositoryRoot> <ledgerPath>',
      '  cli-archguard snapshot <repositoryRoot> <targetPath> <snapshotPath>',
      '  cli-archguard checkpoint <repositoryRoot> <contractPath> <targetPath> <snapshotPath> <ledgerPath> <blockId> <chainId> <gatePassPath>',
    ],
    runCommand: (context) => runIntakeHandshake(context, {
      questions: INTAKE_QUESTIONS,
      outputFile: 'ARCHGUARD-REQUIREMENTS.json',
      afterCapabilities(output) {
        const instruction = output.nextStep?.instruction
        if (typeof instruction === 'string' && instruction.trim()) console.log(instruction)
      },
    }),
  })
}

export { localCommandExitCode }

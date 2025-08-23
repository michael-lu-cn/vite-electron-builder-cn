import { execSync } from 'node:child_process'
import packageJson from '../../package.json' with { type: 'json' }

const viteVersion = packageJson.devDependencies['create-vite'] ?? 'latest'
// 固定使用 React + TypeScript + SWC 模板
const template = 'react-swc-ts'

try {
  execSync(`npm create vite@${viteVersion} renderer -- --template ${template}`, {
    stdio: 'inherit',
  })
  console.log('✅ React + TypeScript + SWC 项目创建成功！')
} catch (error) {
  console.error(
    'Failed to execute the `npm create vite` command. Please check the Vite version and your network connection.'
  )
  console.error('Error details:', error.message)
  process.exit(1)
}

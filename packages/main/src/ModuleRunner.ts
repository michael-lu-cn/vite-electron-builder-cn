import { app } from 'electron'
import type { AppModule } from './AppModule.js'
import type { ModuleContext } from './ModuleContext.js'

class ModuleRunner implements PromiseLike<void> {
  #promise: Promise<void>

  constructor() {
    this.#promise = Promise.resolve()
  }

  // 提供一个 run 方法来执行所有模块
  async run(): Promise<void> {
    return this.#promise
  }

  init(module: AppModule) {
    const p = module.enable(this.#createModuleContext())

    if (p instanceof Promise) {
      this.#promise = this.#promise.then(() => p)
    }

    return this
  }

  #createModuleContext(): ModuleContext {
    return {
      app,
    }
  }
}

export function createModuleRunner() {
  return new ModuleRunner()
}

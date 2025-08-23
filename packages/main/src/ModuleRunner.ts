import { app } from 'electron'
import type { AppModule } from './AppModule.js'
import type { ModuleContext } from './ModuleContext.js'

class ModuleRunner implements PromiseLike<void> {
  #promise: Promise<void>

  constructor() {
    this.#promise = Promise.resolve()
  }

  // 实现 PromiseLike 接口
  // biome-ignore lint/suspicious/noThenProperty: Required for PromiseLike interface
  then<TResult1 = void, TResult2 = never>(
    // biome-ignore lint/suspicious/noConfusingVoidType: Required for PromiseLike interface
    onfulfilled?: ((value: void) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.#promise.then(onfulfilled, onrejected)
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

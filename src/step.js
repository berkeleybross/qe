const START = Symbol()

const commands = {}
const stepStarts = {}

export function addStepStart(name, options, callback) {
  if (stepStarts.hasOwnProperty(name)) {
    throw new Error(
      `The step start '${name}' already exists. Use replaceStepStart instead.`
    )
  }

  stepStarts[name] = callback
  StepRunner.prototype[name] = function(...args) {
    return this[START]().pipe(function() {
      return callback.apply(this, args)
    })
  }
}

export function replaceStepStart(name, options, callback) {
  if (!stepStarts.hasOwnProperty(name)) {
    throw new Error(
      `The step start '${name}' cannot be replaced because it hasn't been added. Use addStepStart instead.`
    )
  }

  let original = stepStarts[name]
  stepStarts[name] = callback
  StepRunner.prototype[name] = function(...args) {
    return this[START].pipe(function() {
      return callback.apply(this, [original, ...args])
    })
  }
}

export function addCommand(name, options, callback) {
  if (commands.hasOwnProperty(name)) {
    throw new Error(
      `The command '${name}' already exists. Use replaceCommand instead.`
    )
  }

  commands[name] = callback
  Step.prototype[name] = function(...args) {
    return this.pipe(function(subject) {
      return callback.apply(this, [subject, ...args])
    })
  }
}

export function replaceCommand(name, options, callback) {
  if (!commands.hasOwnProperty(name)) {
    throw new Error(
      `The command '${name}' cannot be replaced because it hasn't been added. Use addCommand instead.`
    )
  }

  let original = commands[name]
  stepStarts[name] = callback
  Step.prototype[name] = function(...args) {
    return this.pipe(function(subject) {
      return callback.apply(this, [original, subject, ...args])
    })
  }
}

export class StepRunner {
  constructor(context = {}) {
    this.context = context
    this.steps = []
  }

  [START]() {
    let step = new Step()
    this.steps.push(step)
    return step
  }

  async run(callback, subject) {
    let result = callback.call(this, subject)

    if (result && typeof result.then === 'function') {
      result = await result

      if (this.steps.length > 0) {
        throw new UnretryableError("Can't mix steps and async functions")
      }

      return result
    } else {
      let lastSubject = result

      for (const step of this.steps) {
        lastSubject = await runStep(step, this.context)
      }

      return lastSubject
    }
  }
}

class Step {
  constructor() {
    this.commands = []
  }

  pipe(command) {
    this.commands.push(command)
    return this
  }
}

function sleep(milliseconds) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, milliseconds)
  })
}

async function runStep(step, context) {
  let lastError = null
  let cancelled = context.cancelToken && context.cancelToken.cancelled
  while (!cancelled) {
    try {
      let subject

      for (const callback of step.commands) {
        let innerStep = new StepRunner(context)
        subject = await innerStep.run(callback, subject)
      }

      return subject
    } catch (e) {
      if (e.name === 'UnretryableError') {
        throw e
      }

      lastError = e
    }

    cancelled = context.cancelToken && context.cancelToken.cancelled
    if (!cancelled) {
      await sleep(50)
    }
  }

  if (lastError !== null) {
    throw lastError
  }
}

class UnretryableError extends Error {
  constructor(message) {
    super(message)
    this.name = 'UnretryableError'
  }
}

import { StepRunner, addStepStart } from '~/src/step'
import { CancellationTokenSource } from '~/src/cancel-token'

beforeAll(() => {
  addStepStart('start', null, () => {})
})

it('Does not error', async () => {
  let sut = new StepRunner()
  await sut.run(() => {}, {})
})

it('Runs single step', async () => {
  let callback = jest.fn()

  let sut = new StepRunner()
  await sut.run(function() {
    this.start().pipe(callback)
  })

  expect(callback).toHaveBeenCalled()
})

it('Runs nested steps', async () => {
  let callback = jest.fn()

  let sut = new StepRunner()
  await sut.run(function() {
    this.start().pipe(function() {
      this.start().pipe(callback)
    })
  })

  expect(callback).toHaveBeenCalled()
})

it('Runs multiple steps', async () => {
  let callback = jest.fn()

  let sut = new StepRunner()
  await sut.run(function() {
    this.start().pipe(callback)
    this.start().pipe(callback)
  })

  expect(callback).toHaveBeenCalledTimes(2)
})

it('Allows commands to return promises', async () => {
  let sut = new StepRunner()
  let result = await sut.run(function() {
    this.start().pipe(async function() {
      return 41
    })
  })

  await expect(result).toBe(41)
})

it('Does not allow steps and promises in same command', async () => {
  let sut = new StepRunner()
  let act = sut.run(function() {
    this.start().pipe(async function() {
      this.start()
    })
  })

  await expect(act).rejects.toThrow("Can't mix steps and async functions")
})

it('Runs nested steps before subsequent steps', async () => {
  let order = ''

  let sut = new StepRunner()
  await sut.run(function() {
    this.start().pipe(function() {
      this.start()
        .pipe(() => {
          order += 'a'
        })
        .pipe(() => {
          order += 'c'
        })
    })
    this.start().pipe(() => {
      order += 'b'
    })
  })

  expect(order).toBe('acb')
})

it('Chains multiple commands in a step', async () => {
  let callback = jest.fn()

  let sut = new StepRunner()
  await sut.run(function() {
    this.start()
      .pipe(callback)
      .pipe(callback)
  })

  expect(callback).toHaveBeenCalledTimes(2)
})

it('Retries step if it fails', async () => {
  let calls = 0

  let sut = new StepRunner()
  let result = await sut.run(function() {
    this.start().pipe(() => {
      if (calls++ < 2) {
        throw new Error('Test error')
      }

      return true
    })
  })

  expect(result).toBe(true)
})

it('Does not call subsequent commands if a prior command fails', async () => {
  let calls = 0
  let callback = jest.fn()

  let sut = new StepRunner()
  await sut.run(function() {
    this.start()
      .pipe(() => {
        if (calls++ < 2) {
          throw new Error('Test error')
        }
      })
      .pipe(callback)
  })

  expect(callback).toHaveBeenCalledTimes(1)
})

it('Can cancel step', async () => {
  let cts = new CancellationTokenSource()

  let calls = 0
  let callback = jest.fn(() => {
    if (++calls > 2) {
      cts.cancel()
    }

    throw new Error('Command error message')
  })

  let sut = new StepRunner({ cancelToken: cts.token })
  let run = sut.run(function() {
    this.start().pipe(callback)
  })

  await expect(run).rejects.toThrow('Command error message')
  expect(callback).toHaveBeenCalledTimes(3)
})

it('Can cancel inner step', async () => {
  let cts = new CancellationTokenSource()

  let calls = 0
  let callback = jest.fn(() => {
    throw new Error('Command error message')
  })

  let sut = new StepRunner({ cancelToken: cts.token })
  let run = sut.run(function() {
    this.start().pipe(function() {
      this.start()
        .pipe(() => {
          if (++calls > 2) {
            cts.cancel()
          }
        })
        .pipe(callback)
    })
  })

  await expect(run).rejects.toThrow('Command error message')
  expect(callback).toHaveBeenCalledTimes(3)
})

it('Passes returned subject from one command to another', async () => {
  let callbackA = jest.fn(() => 42)
  let callbackB = jest.fn(x => x + 2)

  let sut = new StepRunner()
  let result = await sut.run(function() {
    this.start()
      .pipe(callbackA)
      .pipe(callbackB)
  })

  expect(callbackA).toBeCalledWith(undefined)
  expect(callbackB).toBeCalledWith(42)
  expect(result).toBe(44)
})

it('Calls command after a nested step with the result of the last nested step', async () => {
  let callback = jest.fn(x => x + 2)

  let sut = new StepRunner()
  await sut.run(function() {
    this.start()
      .pipe(function() {
        this.start().pipe(() => 40)
        this.start().pipe(() => 42)
      })
      .pipe(callback)
  })

  expect(callback).toBeCalledWith(42)
})

it("Calls command after a nested step with the result of the last nested step's command", async () => {
  let callback = jest.fn(x => x + 2)

  let sut = new StepRunner()
  await sut.run(function() {
    this.start()
      .pipe(function() {
        this.start()
          .pipe(() => 42)
          .pipe(x => x + 2)
      })
      .pipe(callback)
  })

  expect(callback).toBeCalledWith(44)
})

it('Retries nested steps without retrying outer steps', async () => {
  let calls = 0
  let outerCallback = jest.fn()
  let innerCallback = jest.fn()

  let sut = new StepRunner()
  await sut.run(function() {
    this.start()
      .pipe(outerCallback)
      .pipe(function() {
        this.start()
          .pipe(innerCallback)
          .pipe(() => {
            if (calls++ < 2) {
              throw new Error('Test error')
            }
          })
      })
  })

  expect(outerCallback).toBeCalledTimes(1)
  expect(innerCallback).toBeCalledTimes(3)
})

it('Retries nested steps without retrying outer steps', async () => {
  let calls = 0
  let outerCallback = jest.fn()
  let innerCallback = jest.fn()

  let sut = new StepRunner()
  await sut.run(function() {
    this.start()
      .pipe(outerCallback)
      .pipe(function() {
        this.start()
          .pipe(innerCallback)
          .pipe(() => {
            if (calls++ < 2) {
              throw new Error('Test error')
            }
          })
      })
  })

  expect(outerCallback).toBeCalledTimes(1)
  expect(innerCallback).toBeCalledTimes(3)
})

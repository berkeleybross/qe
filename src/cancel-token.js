const CANCEL = Symbol()

export class CancellationToken {
  constructor() {
    this.callbacks = []
    this.cancelReason = null
  }

  throwIfCancelled() {
    if (this.cancelReason !== null) {
      throw new Error(this.cancelReason)
    }
  }

  [CANCEL](reason) {
    if (reason) {
      this.cancelReason = 'Promise was cancelled: ' + reason
    } else {
      this.cancelReason = 'Promise was cancelled'
    }

    for (let callback of this.callbacks) {
      callback(new Error(this.cancelReason))
    }
  }

  onCancel(callback) {
    this.callbacks.push(callback)
  }

  get cancelled() {
    return this.cancelReason !== null
  }

  toJSON() {
    return { cancelled: this.cancelled }
  }
}

export class CancellationTokenSource {
  constructor() {
    this.token = new CancellationToken()
  }

  cancel(reason) {
    this.token[CANCEL](reason)
  }

  get cancelled() {
    return this.token.cancelled
  }
}

export function cancelAfterTimeout(milliseconds) {
  let result = new CancellationTokenSource()

  setTimeout(() => {
    result.cancel(`Timed out after ${milliseconds}ms`)
  }, milliseconds)

  return result.token
}

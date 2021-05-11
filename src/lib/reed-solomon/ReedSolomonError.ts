export default class ReedSolomonError extends Error {
  // public readonly commonType: string;
  // public readonly isOperational: boolean;

  constructor(/*commonType: string,*/ description: string/*, isOperational: boolean*/) {
    super(description)

    Object.setPrototypeOf(this, new.target.prototype) // restore prototype chain

    // this.commonType = commonType
    // this.isOperational = isOperational

    Error.captureStackTrace(this)
  }
}

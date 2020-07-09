const Environment = require('../index')

declare global {
  interface Window {
    Inxt: any
  }
}

self.Inxt = Environment

export default Environment 
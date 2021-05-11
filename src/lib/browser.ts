const Environment = require('../index');

declare global {
  interface Window {
    Inxt: any;
    Fetch: any;
  }
}

self.Inxt = Environment;

export default Environment;

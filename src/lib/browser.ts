import { Environment } from '..';
declare global {
  interface Window {
    Inxt: any;
    Fetch: any;
  }
}

self.Inxt = Environment;

export default Environment;

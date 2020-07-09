import fetch from 'node-fetch'

class AuthMethod {
  static BasicAuth: string = "1"
}

export function authmethod(authMethod: string) {
  if (authMethod === AuthMethod.BasicAuth) {
    
  }
}

export function request(method: string, path: string, params: any) {

}
function request(method: string, url: string) {
  return fetch(url, {
    method: method || 'GET'
  })
}
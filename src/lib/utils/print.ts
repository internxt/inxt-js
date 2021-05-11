const log = (color: string, msg: string) => console.log(color + '%s\x1b[0m', msg)
const red   = (msg: string): void => log('\x1b[41m', msg)
const green = (msg: string): void => log('\x1b[32m', msg)
const blue  = (msg: string): void => log('\x1b[44m', msg)

export const print = { red, green, blue }

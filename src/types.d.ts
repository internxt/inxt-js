interface Environment {
  config: EnvironmentConfig
}

interface EnvironmentConfig {
  bridgeUrl?: string
  bridgeUser: string
  bridgePass: string
  encryptionKey?: string
  logLevel?: number
}
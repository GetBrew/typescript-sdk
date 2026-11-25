declare const __SDK_VERSION__: string | undefined

export const SDK_NAME = 'brew.new-sdk'

export const SDK_VERSION: string =
  typeof __SDK_VERSION__ === 'string' && __SDK_VERSION__.length > 0
    ? __SDK_VERSION__
    : '0.0.0-dev'

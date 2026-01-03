import { setupServer } from 'msw/node'
import { openaiHandlers } from './openai'
import { fxApiHandlers } from './fx-api'

/**
 * MSW server instance with all default handlers.
 * Used in test setup to intercept HTTP requests.
 */
export const server = setupServer(...openaiHandlers, ...fxApiHandlers)

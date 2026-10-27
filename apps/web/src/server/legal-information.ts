import 'server-only'

import {
  legalCatalogueSchema,
  legalDisclosuresReady,
  supportContact,
} from '@curiofold/config/server'
import source from '../content/legal.json'

export function getLegalCatalogue() {
  return legalCatalogueSchema.parse(source)
}

/** Configuration gate, not a substitute for legal/accounting or launch approval. */
export function isLiveCommerceDisclosureReady(): boolean {
  const parsed = legalCatalogueSchema.safeParse(source)
  return (
    parsed.success &&
    legalDisclosuresReady(parsed.data) &&
    supportContact(process.env.CURIOFOLD_SUPPORT_EMAIL) !== null
  )
}

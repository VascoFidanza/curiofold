export type Result<Value, Failure> =
  Readonly<{ ok: true; value: Value }> | Readonly<{ error: Failure; ok: false }>

export function succeed<Value>(value: Value): Result<Value, never> {
  return { ok: true, value }
}

export function fail<Failure>(error: Failure): Result<never, Failure> {
  return { error, ok: false }
}

export {
  can,
  safeReturnPath,
  staffRoles,
  type AccountState,
  type AuthorizationContext,
  type Capability,
  type StaffRole,
} from './identity'

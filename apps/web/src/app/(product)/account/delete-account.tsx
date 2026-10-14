'use client'

import { useState } from 'react'

export function DeleteAccount() {
  const [confirmation, setConfirmation] = useState('')
  const [status, setStatus] = useState('')
  const [pending, setPending] = useState(false)
  async function checkStatus() {
    try {
      const response = await fetch('/api/v1/account/deletion', {
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('Status unavailable')
      const result = (await response.json()) as { status: string }
      setStatus(
        result.status === 'retention_review'
          ? 'Account access has been revoked and reading history removed. Financial records and unused paid credits remain protected pending retention and financial review.'
          : result.status === 'operator_review'
            ? 'Your account remains blocked. Cleanup needs operator attention; your request has not been lost.'
            : 'Your account is blocked. Cleanup is pending or retrying. Financial records and unused paid credits remain protected.',
      )
    } catch {
      setStatus(
        'Status is temporarily unavailable. Your accepted deletion request remains recorded.',
      )
    }
  }
  async function submit() {
    if (pending || confirmation !== 'DELETE') return
    setPending(true)
    try {
      const response = await fetch('/api/v1/account/deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation }),
      })
      const result = (await response.json()) as { code: string }
      if (response.status === 202 || result.code === 'account_disabled') {
        setStatus(
          'Your deletion request was accepted. Account access is blocked. Identity deactivation and privacy cleanup are pending processing. Purchase records and unused paid credits are preserved for review.',
        )
        return
      }
      setStatus(
        result.code === 'recent_sign_in_required'
          ? 'Sign out and sign in again to verify your identity, then retry within 15 minutes.'
          : 'We could not accept the request. Please try again.',
      )
    } catch {
      setStatus(
        'We could not confirm the request. Reload Account to check access before retrying.',
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <section aria-labelledby="delete-heading">
      <h2 id="delete-heading">Delete your account</h2>
      <p>
        Access stops when your request is accepted. Reading history will be
        removed. Financial records, purchase evidence and unused paid credits
        are preserved while applicable obligations are reviewed.
      </p>
      <label>
        Type DELETE to confirm
        <input
          value={confirmation}
          onChange={(event) => {
            setConfirmation(event.target.value)
          }}
          autoComplete="off"
        />
      </label>
      <button
        type="button"
        disabled={
          pending ||
          confirmation !== 'DELETE' ||
          status.startsWith('Your deletion')
        }
        onClick={() => void submit()}
      >
        {pending ? 'Submitting…' : 'Request account deletion'}
      </button>
      <p role="status">{status}</p>
      {status ? (
        <button type="button" onClick={() => void checkStatus()}>
          Check deletion status
        </button>
      ) : null}
    </section>
  )
}

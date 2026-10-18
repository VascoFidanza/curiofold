import Link from 'next/link'
import { PageFrame } from '@curiofold/ui'
import { supportContact } from '@curiofold/config/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Help and support' }

export default function SupportPage() {
  const email = supportContact(process.env.CURIOFOLD_SUPPORT_EMAIL)
  return (
    <PageFrame>
      <h1>Help and support</h1>
      <section aria-labelledby="account-help">
        <h2 id="account-help">Your account and purchases</h2>
        <p>
          <Link href="/account">Open your account</Link> to view your credits
          and purchase history, export your data or request account deletion.
        </p>
        <p>
          <Link href="/library">Visit your Library</Link> to find owned Stories
          and resume reading.
        </p>
      </section>
      <section aria-labelledby="contact-help">
        <h2 id="contact-help">Payment, privacy or Story questions</h2>
        {email ? (
          <p>
            Email <a href={`mailto:${email}`}>{email}</a>.
          </p>
        ) : (
          <p>
            A support contact has not yet been configured for this environment.
            Do not send personal information through an unverified channel.
          </p>
        )}
        <p>
          For payment enquiries, include the order reference shown in your
          purchase history and describe what happened. Never send card details,
          passwords or sign-in codes.
        </p>
        <p>
          You can use the same contact for data-access questions, deletion
          processing, refund enquiries or factual corrections. Account deletion
          does not itself settle unresolved payments or refund requests.
        </p>
      </section>
    </PageFrame>
  )
}

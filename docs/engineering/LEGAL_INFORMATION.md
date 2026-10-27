# Legal information publishing — technical framework

`/legal` links to the five fixed document routes: `terms`, `privacy`, `refunds`,
`cookies` and `business`. Footer, Help, credit top-up and the unowned Story panel
provide entry points. This is a publishing/configuration framework, **not legal
approval, fiscal compliance or authorization to accept live payments**.

## Controlled source

Edit `apps/web/src/content/legal.json` through the normal reviewed Git workflow.
The schema is `packages/config/src/legal.ts`; unknown fields/routes/schema versions
fail validation. All five current records are drafts with no invented legal copy,
business identity, VAT rate, contact address or complaints information.

Each document has `status`, `version`, `effectiveOn`, `approvalReference` and
plain-text `sections` (heading and paragraphs). An approved document requires all
metadata and nonempty text. `effectiveOn` is a UTC calendar date. Only an approved,
currently effective document is rendered; draft/future text and internal review
references are not included in the public view. React renders text, not arbitrary
HTML, MDX or executable markup. Previous versions remain in Git history; this
does not yet provide a consent ledger or historical-policy download service.

## Approval boundary

The Product Owner must supply genuine business/support information and obtain
the required qualified legal/accounting review. Record its evidence in
`approvalReference`; only then may the owner authorize `status: approved` for the
exact reviewed version. Agents must not self-approve policies or fabricate review
references. Metadata validation cannot prove legal correctness or reviewer identity.

Review covers the existing OD-007/010/011 decisions: terms, privacy and retention,
refunds/withdrawal and prepaid value, invoicing/tax/jurisdictions, cookie disclosures/
consent where applicable, and business/consumer information. This is an input
checklist for professionals, not a new legal interpretation or final copy.

## Live-payment safeguard

Creating a **new live-key Stripe Checkout** requires the existing production
environment + explicit activation flag, all five effective approved documents,
and a valid configured `CURIOFOLD_SUPPORT_EMAIL`. Missing/malformed/draft/future
configuration fails before Stripe session creation. Sandbox Checkout, existing-order
reads, webhook fulfilment and reconciliation are not disabled. No new environment
variable, key, webhook, payment object or service is required.

This checks configuration, not whether the mailbox is monitored, policies comply
with law, or launch has been approved. Real support delivery/reply, fiscal
integration and approved policy-dependent consent/refund behavior remain launch
requirements. There is no assumed non-refundable purchase, automatic consent,
approved VAT rate or live activation in this change.

## Validation

Schema tests cover missing approval metadata, empty text, unknown fields/routes,
draft/future suppression and every required document. Rendering tests cover honest
unavailability, version/date semantics, escaped markup and hidden review references.
Provider tests prove live refusal, preserved recovery and unchanged Sandbox access.
The three-browser suite checks navigation, keyboard, axe and mobile reflow.

Local validation: 431 unit tests plus 11 publication tests, build/bundle scan and
46 browser tests passed (two intentional touch skips). An initial CPU-count-based
parallel run hit five dev-server navigation/test deadlines; the new legal case
passed unchanged in isolation in all engines. The complete unchanged suite then
passed with two workers in 39.2 seconds, without retries or higher deadlines.
The shared dev compiler now has that explicit worker bound for reproducibility;
this UI suite is not a cold-start performance benchmark.

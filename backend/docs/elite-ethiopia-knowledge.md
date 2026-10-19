# Elite Ethiopia — assistant knowledge (product facts)

Elite Ethiopia is a digital marketplace in Ethiopia connecting clients, freelancers, and digital-product sellers. Members use accounts, wallets, messaging, jobs, services, products, contracts, reviews, and disputes inside the web app.

## Roles

- **Client** — posts jobs, hires freelancers, buys services and digital products, manages contracts and payments.
- **Freelancer** — lists services, finds jobs, sends proposals, accepts hire invitations, delivers work under contracts.
- **Seller** — lists and sells digital products (courses, files, and similar).
- **Admin / super-admin** — platform operations (users, listings, disputes, settings). Not a public self-serve signup role.

## Getting started

- Sign up on the site and pick a role.
- Email verification may be required depending on server configuration.
- Complete profile details (including phone for clients where required).
- ID verification can be submitted from profile; admin approval may be required before some actions.
- Use **Contact** (/contact) for help the assistant cannot resolve.

## Jobs (clients)

- Clients create jobs as **draft** or **open** (published).
- Publishing an **open** job runs trust and payment checks (see Job publish requirements).
- Budget types include fixed, range, and hourly. Published jobs need a positive budget or hourly rate.
- Clients review proposals or send hire invitations; accepted work moves into contracts.
- Job posting coin rewards are tied to completed work, not merely publishing a listing.

## Job publish requirements (defaults)

Platform admins can change these in admin settings. Unless stated otherwise, defaults are:

- Account must be active; email verified.
- ID verification approved when required by settings.
- Profile completeness at least 60% (default).
- Phone number on profile.
- Wallet topped up at least once (payment verified).
- Wallet balance at least the greater of **100 Br** (default minimum) and the job budget.
- At most **10** open jobs per client and **5** new open jobs per **24 hours** (defaults).
- Post Job page shows a preflight checklist before publish.

## Jobs (freelancers)

- Browse open public jobs from the freelancer dashboard.
- Public listings show jobs from clients who meet trust checks; cards can show trust signals (email, ID, payment verified, member since).
- Apply with a proposal (bid and cover letter) or respond to hire invitations.
- Earnings and contracts are managed in the dashboard; messaging supports coordination.

## Services and orders

- Freelancers publish **services** with pricing and delivery expectations.
- Clients place **service orders** through the marketplace flow.

## Digital products

- Sellers publish **digital products**; buyers purchase through the product flow.
- Sellers receive payout after purchase; platform commission is deducted from seller earnings (not added as a hidden fee on the buyer price in the product flow).

## Wallet and payments

- Each member can have an on-platform **wallet** (balance in Birr).
- Clients top up the wallet; first successful top-up marks payment as verified for clients.
- Freelancers and sellers receive net payouts after platform commission on completed jobs and product sales.
- Commission defaults to **10%**; admins can change it. Both sides see the full agreed price; commission is applied at payout.
- Wallet supports top-up, withdraw, transfer, and transaction history in the dashboard.
- This is an on-platform balance system; exact external payment rails (for example Telebirr) depend on deployment and integration.

## Coins and rewards

Coins are separate from the Birr wallet. Default earning rules (code-level; exchange rate is admin-configurable):

- Client earns coins after a job-related reward event tied to completed work (not only posting).
- Freelancer earns coins when awarded a job (proposal accepted or hire invitation accepted).
- Seller earns coins on product sale.
- Coins can be applied at checkout up to **30%** of order total (subject to balance).
- Default exchange rate: **20 coins = 1 Birr**; admins set the rate in admin settings.

## Commission and fees

- Platform commission is configurable by admins (default **10%**).
- Shown transparently: buyers/clients see full job or product price; freelancers/sellers see that commission is deducted from their earnings on payout.
- Do not state a different percentage unless the user was told a specific current rate in the app.

## Trust, disputes, and safety

- **Disputes** can be opened between parties for supported order types; admins review in the admin console.
- Freelancers can **report** a job for admin review.
- Admins can close jobs and suspend accounts from listings management.
- For fraud, payment failure, or account lockouts, direct users to in-app Disputes/Wallet/Messages or Contact.

## Messaging and notifications

- Authenticated members message each other in the dashboard.
- Notifications cover proposals, hires, contracts, payments, verification, and system events.

## Public assistant (this chat)

- Available on public/marketing pages, not inside admin or the signed-in dashboard.
- Answers from this knowledge file and platform documentation; it does not access live account data.
- For account-specific balances, verification status, or disputes, use the dashboard or Contact.

## Support

- **Contact page:** /contact
- Account, payment, or dispute issues: use in-app tools first, then Contact for human follow-up.

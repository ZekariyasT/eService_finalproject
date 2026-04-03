export type InvitationStatusTab = 'pending' | 'cancelled' | 'accepted'

export function invitationStatusTab(status: string): InvitationStatusTab {
  if (status === 'pending') return 'pending'
  if (status === 'accepted') return 'accepted'
  return 'cancelled'
}

export function filterInvitationsByTab<T extends { status: string }>(
  invitations: T[],
  tab: InvitationStatusTab,
): T[] {
  return invitations.filter((invitation) => invitationStatusTab(invitation.status) === tab)
}

export function countInvitationsByTab<T extends { status: string }>(
  invitations: T[],
  tab: InvitationStatusTab,
): number {
  return filterInvitationsByTab(invitations, tab).length
}

import type { RowDataPacket } from 'mysql2'
import { randomUUID } from 'node:crypto'
import { getPool } from '../utils/pool.js'

export interface MessageRow {
  id: string
  senderId: string
  receiverId: string
  body: string
  attachmentStoragePath: string | null
  attachmentOriginalName: string | null
  createdAt: string
  readAt: string | null
}

function mapRow(r: RowDataPacket): MessageRow {
  return {
    id: r.id,
    senderId: r.sender_id,
    receiverId: r.receiver_id,
    body: String(r.body ?? ''),
    attachmentStoragePath: r.attachment_storage_path ?? null,
    attachmentOriginalName: r.attachment_original_name ?? null,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    readAt: r.read_at ? (r.read_at instanceof Date ? r.read_at.toISOString() : String(r.read_at)) : null,
  }
}

export async function listConversationPeers(userId: string): Promise<
  Array<{ peerId: string; peerName: string; lastMessage: string; lastAt: string }>
> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `
    SELECT u.id AS peerId, u.name AS peerName, lm.body AS lastMessage, lm.created_at AS lastAt
    FROM users u
    INNER JOIN (
      SELECT
        peer_id,
        body,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY peer_id ORDER BY created_at DESC) AS rn
      FROM (
        SELECT
          CASE WHEN m.sender_id = :uid THEN m.receiver_id ELSE m.sender_id END AS peer_id,
          CASE
            WHEN m.attachment_original_name IS NOT NULL AND TRIM(COALESCE(m.body,'')) = ''
              THEN CONCAT('📎 ', m.attachment_original_name)
            WHEN m.attachment_original_name IS NOT NULL
              THEN CONCAT(TRIM(m.body), ' · 📎 ', m.attachment_original_name)
            ELSE COALESCE(m.body, '')
          END AS body,
          m.created_at
        FROM messages m
        WHERE m.sender_id = :uid OR m.receiver_id = :uid
      ) t
    ) lm ON lm.peer_id = u.id AND lm.rn = 1
    ORDER BY lm.created_at DESC
    `,
    { uid: userId }
  )
  return (rows as RowDataPacket[]).map((r) => ({
    peerId: r.peerId as string,
    peerName: r.peerName as string,
    lastMessage: r.lastMessage as string,
    lastAt: r.lastAt instanceof Date ? r.lastAt.toISOString() : String(r.lastAt),
  }))
}

export async function listMessagesBetween(userId: string, peerId: string): Promise<MessageRow[]> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM messages
     WHERE (sender_id = :userId AND receiver_id = :peerId)
        OR (sender_id = :peerId AND receiver_id = :userId)
     ORDER BY created_at ASC`,
    { userId, peerId }
  )
  return rows.map(mapRow)
}

export async function insertMessage(
  senderId: string,
  receiverId: string,
  body: string,
  attachment?: { storagePath: string; originalName: string } | null
): Promise<MessageRow> {
  const pool = getPool()
  const id = randomUUID()
  await pool.execute(
    `INSERT INTO messages (id, sender_id, receiver_id, body, attachment_storage_path, attachment_original_name)
     VALUES (:id, :sender_id, :receiver_id, :body, :attachment_storage_path, :attachment_original_name)`,
    {
      id,
      sender_id: senderId,
      receiver_id: receiverId,
      body,
      attachment_storage_path: attachment?.storagePath ?? null,
      attachment_original_name: attachment?.originalName ?? null,
    }
  )
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM messages WHERE id = :id`, { id })
  return mapRow(rows[0]!)
}

export async function getMessageIfParticipant(messageId: string, userId: string): Promise<MessageRow | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM messages WHERE id = :id AND (sender_id = :uid OR receiver_id = :uid) LIMIT 1`,
    { id: messageId, uid: userId }
  )
  return rows.length ? mapRow(rows[0]!) : null
}

/** Mark inbound messages from peer as read (opening a thread). */
export async function markReceivedFromPeerRead(userId: string, peerId: string): Promise<void> {
  const pool = getPool()
  await pool.execute(
    `UPDATE messages
     SET read_at = CURRENT_TIMESTAMP
     WHERE receiver_id = :userId AND sender_id = :peerId AND read_at IS NULL`,
    { userId, peerId }
  )
}

export async function countUnreadReceived(userId: string): Promise<number> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS c FROM messages WHERE receiver_id = :userId AND read_at IS NULL`,
    { userId }
  )
  const c = (rows[0] as { c?: unknown })?.c
  return typeof c === 'number' ? c : Number(c ?? 0)
}
